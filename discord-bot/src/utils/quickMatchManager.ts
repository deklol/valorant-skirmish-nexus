/**
 * Quick Match Session Manager
 * Handles all quick match operations and database interactions
 */
import { supabase } from './supabase.js';
import { balanceQuickMatchTeams, convertPlayersForBalancing } from './teamBalancer.js';

export interface QuickMatchSession {
  id: string;
  discord_channel_id: string;
  discord_message_id?: string;
  status: 'waiting' | 'balancing' | 'voting' | 'in_progress' | 'completed' | 'cancelled';
  created_by?: string;
  created_at: string;
  updated_at: string;
  completed_at?: string;
  team_a_data: any[];
  team_b_data: any[];
  balance_analysis: any;
  selected_map_id?: string;
  match_id?: string;
  session_data: any;
}

export interface MapVote {
  user_id: string;
  discord_id: string;
  map_id: string;
  voted_at: string;
}

export class QuickMatchManager {
  
  /**
   * Create a new quick match session
   */
  static async createSession(channelId: string, createdBy?: string): Promise<QuickMatchSession> {
    const { data, error } = await supabase
      .from('quick_match_sessions')
      .insert({
        discord_channel_id: channelId,
        status: 'waiting',
        created_by: createdBy,
        team_a_data: [],
        team_b_data: [],
        balance_analysis: {},
        session_data: {}
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create session: ${error.message}`);
    }

    return data;
  }

  /**
   * Get active session for a channel
   */
  static async getActiveSession(channelId: string): Promise<QuickMatchSession | null> {
    const { data, error } = await supabase
      .from('quick_match_sessions')
      .select('*')
      .eq('discord_channel_id', channelId)
      .in('status', ['waiting', 'balancing', 'voting', 'in_progress'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('Error getting active session:', error);
      return null;
    }

    return data;
  }

  /**
   * Update session status and data
   */
  static async updateSession(
    sessionId: string, 
    updates: Partial<QuickMatchSession>
  ): Promise<QuickMatchSession> {
    const { data, error } = await supabase
      .from('quick_match_sessions')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', sessionId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update session: ${error.message}`);
    }

    return data;
  }

  /**
   * Balance teams for a session
   */
  static async balanceTeams(sessionId: string, queuePlayers: any[]): Promise<{
    teamA: any[];
    teamB: any[];
    balanceAnalysis: any;
  }> {
    console.log(`🎯 Balancing teams for session ${sessionId} with ${queuePlayers.length} players`);

    if (queuePlayers.length !== 10) {
      throw new Error(`Expected 10 players, got ${queuePlayers.length}`);
    }

    // Convert players for balancing
    const balancerPlayers = await convertPlayersForBalancing(queuePlayers);
    
    // Run the balancing algorithm
    const balanceResult = await balanceQuickMatchTeams(balancerPlayers);
    
    // Split players into teams based on assignments
    const teamA: any[] = [];
    const teamB: any[] = [];
    
    balanceResult.assignments.forEach((assignment, playerIndex) => {
      const originalPlayer = queuePlayers[balancerPlayers[playerIndex].index];
      if (assignment.teamIndex === 0) {
        teamA.push({
          ...originalPlayer,
          evidenceWeight: balancerPlayers[playerIndex].evidenceWeight,
          isElite: balancerPlayers[playerIndex].isElite
        });
      } else {
        teamB.push({
          ...originalPlayer,
          evidenceWeight: balancerPlayers[playerIndex].evidenceWeight,
          isElite: balancerPlayers[playerIndex].isElite
        });
      }
    });

    const balanceAnalysis = {
      teamAWeight: balanceResult.balance.teamWeights[0],
      teamBWeight: balanceResult.balance.teamWeights[1],
      balanceScore: balanceResult.balance.score,
      variance: balanceResult.balance.variance,
      algorithm: balanceResult.metadata.algorithm,
      iterations: balanceResult.metadata.iterations,
      warnings: balanceResult.metadata.warnings,
      timestamp: new Date().toISOString()
    };

    // Update session with balanced teams
    await this.updateSession(sessionId, {
      status: 'voting',
      team_a_data: teamA,
      team_b_data: teamB,
      balance_analysis: balanceAnalysis
    });

    console.log(`✅ Teams balanced - Team A: ${balanceAnalysis.teamAWeight}, Team B: ${balanceAnalysis.teamBWeight}, Difference: ${balanceAnalysis.balanceScore}`);

    return {
      teamA,
      teamB,
      balanceAnalysis
    };
  }

  /**
   * Submit a map vote
   */
  static async submitMapVote(
    sessionId: string,
    userId: string,
    discordId: string,
    mapId: string
  ): Promise<void> {
    const { error } = await supabase
      .from('quick_match_votes')
      .upsert({
        session_id: sessionId,
        user_id: userId,
        discord_id: discordId,
        map_id: mapId,
        voted_at: new Date().toISOString()
      });

    if (error) {
      throw new Error(`Failed to submit vote: ${error.message}`);
    }
  }

  /**
   * Get all votes for a session
   */
  static async getSessionVotes(sessionId: string): Promise<MapVote[]> {
    const { data, error } = await supabase
      .from('quick_match_votes')
      .select(`
        user_id,
        discord_id,
        map_id,
        voted_at,
        maps!inner(name, display_name)
      `)
      .eq('session_id', sessionId)
      .order('voted_at', { ascending: false });

    if (error) {
      console.error('Error getting session votes:', error);
      return [];
    }

    return data || [];
  }

  /**
   * Calculate map voting results
   */
  static async calculateMapVotingResults(sessionId: string): Promise<{
    winningMap: any;
    voteCount: Record<string, number>;
    totalVotes: number;
  }> {
    const votes = await this.getSessionVotes(sessionId);
    
    // Count votes per map
    const mapVotes: Record<string, { count: number; mapData: any }> = {};
    
    votes.forEach(vote => {
      if (!mapVotes[vote.map_id]) {
        mapVotes[vote.map_id] = {
          count: 0,
          mapData: (vote as any).maps
        };
      }
      mapVotes[vote.map_id].count++;
    });

    // Find winning map (most votes)
    let winningMapId = '';
    let maxVotes = 0;
    
    Object.entries(mapVotes).forEach(([mapId, data]) => {
      if (data.count > maxVotes) {
        maxVotes = data.count;
        winningMapId = mapId;
      }
    });

    // Handle ties by random selection
    const tiedMaps = Object.entries(mapVotes).filter(([, data]) => data.count === maxVotes);
    if (tiedMaps.length > 1) {
      const randomIndex = Math.floor(Math.random() * tiedMaps.length);
      winningMapId = tiedMaps[randomIndex][0];
    }

    const voteCount: Record<string, number> = {};
    Object.entries(mapVotes).forEach(([mapId, data]) => {
      voteCount[mapId] = data.count;
    });

    return {
      winningMap: mapVotes[winningMapId]?.mapData || null,
      voteCount,
      totalVotes: votes.length
    };
  }

  /**
   * Create a match entry in the database
   */
  static async createMatch(
    sessionId: string,
    teamA: any[],
    teamB: any[],
    selectedMapId: string
  ): Promise<string> {
    // Create teams first
    const { data: teamAData, error: teamAError } = await supabase
      .from('teams')
      .insert({
        name: 'Team A',
        tournament_id: null, // Quick matches don't belong to tournaments
        status: 'active'
      })
      .select()
      .single();

    if (teamAError) {
      throw new Error(`Failed to create Team A: ${teamAError.message}`);
    }

    const { data: teamBData, error: teamBError } = await supabase
      .from('teams')
      .insert({
        name: 'Team B',
        tournament_id: null,
        status: 'active'
      })
      .select()
      .single();

    if (teamBError) {
      throw new Error(`Failed to create Team B: ${teamBError.message}`);
    }

    // Add team members
    const teamAMembers = teamA.map(player => ({
      team_id: teamAData.id,
      user_id: player.user_id,
      is_captain: false
    }));

    const teamBMembers = teamB.map(player => ({
      team_id: teamBData.id,
      user_id: player.user_id,
      is_captain: false
    }));

    await supabase.from('team_members').insert([...teamAMembers, ...teamBMembers]);

    // Create the match
    const { data: matchData, error: matchError } = await supabase
      .from('matches')
      .insert({
        tournament_id: null,
        team1_id: teamAData.id,
        team2_id: teamBData.id,
        status: 'live',
        match_number: 1,
        round_number: 1,
        best_of: 1,
        notes: `Quick Match - Generated by Discord Bot at ${new Date().toISOString()}`
      })
      .select()
      .single();

    if (matchError) {
      throw new Error(`Failed to create match: ${matchError.message}`);
    }

    // Update session with match ID
    await this.updateSession(sessionId, {
      status: 'in_progress',
      match_id: matchData.id,
      selected_map_id: selectedMapId
    });

    return matchData.id;
  }

  /**
   * Complete a match with results
   */
  static async completeMatch(
    sessionId: string,
    matchId: string,
    winningTeamId: string,
    scoreTeam1: number,
    scoreTeam2: number
  ): Promise<void> {
    // Update match with results
    const { error: matchError } = await supabase
      .from('matches')
      .update({
        status: 'completed',
        winner_id: winningTeamId,
        score_team1: scoreTeam1,
        score_team2: scoreTeam2,
        completed_at: new Date().toISOString()
      })
      .eq('id', matchId);

    if (matchError) {
      throw new Error(`Failed to complete match: ${matchError.message}`);
    }

    // Update session
    await this.updateSession(sessionId, {
      status: 'completed',
      completed_at: new Date().toISOString()
    });
  }

  /**
   * Cancel a session
   */
  static async cancelSession(sessionId: string): Promise<void> {
    await this.updateSession(sessionId, {
      status: 'cancelled',
      completed_at: new Date().toISOString()
    });
  }

  /**
   * Get available maps for voting
   */
  static async getAvailableMaps(): Promise<any[]> {
    const { data, error } = await supabase
      .from('maps')
      .select('*')
      .eq('is_active', true)
      .order('display_name');

    if (error) {
      console.error('Error getting maps:', error);
      return [];
    }

    return data || [];
  }
}