import { getSupabase } from './supabase';

export class QuickMatchManager {
  static async createSession(channelId: string, createdBy: string) {
    const { data, error } = await getSupabase()
      .from('quick_match_sessions')
      .insert({
        discord_channel_id: channelId,
        created_by: createdBy,
        status: 'waiting',
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create session: ${error.message}`);
    }

    return data;
  }

  static async getActiveSession(channelId: string) {
    const { data, error } = await getSupabase()
      .from('quick_match_sessions')
      .select('*')
      .eq('discord_channel_id', channelId)
      .eq('is_active', true)
      .maybeSingle();

    if (error) {
      console.error('Error getting active session:', error);
      return null;
    }

    return data;
  }

  static async updateSession(sessionId: string, updates: any) {
    const { data, error } = await getSupabase()
      .from('quick_match_sessions')
      .update(updates)
      .eq('id', sessionId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update session: ${error.message}`);
    }

    return data;
  }

  static async cancelSession(sessionId: string) {
    const { error } = await getSupabase()
      .from('quick_match_sessions')
      .update({ 
        is_active: false, 
        status: 'cancelled',
        ended_at: new Date().toISOString()
      })
      .eq('id', sessionId);

    if (error) {
      throw new Error(`Failed to cancel session: ${error.message}`);
    }

    // Also deactivate queue entries
    await getSupabase()
      .from('quick_match_queue')
      .update({ is_active: false })
      .eq('is_active', true);
  }

  static async balanceTeams(sessionId: string, queuePlayers: any[]) {
    const { balanceQuickMatchTeams, convertPlayersForBalancing } = await import('./teamBalancer.js');
    
    // Convert players for balancing
    const balancerPlayers = await convertPlayersForBalancing(queuePlayers);
    
    // Balance the teams
    const balanceResult = await balanceQuickMatchTeams(balancerPlayers);
    
    // Split players into teams based on assignments
    const teamA: any[] = [];
    const teamB: any[] = [];
    
    balanceResult.assignments.forEach((assignment, index) => {
      const player = queuePlayers[balancerPlayers[index].index];
      if (assignment.teamIndex === 0) {
        teamA.push(player);
      } else {
        teamB.push(player);
      }
    });
    
    // Update session with team data
    await this.updateSession(sessionId, {
      status: 'voting',
      team_a_data: teamA,
      team_b_data: teamB,
      balance_analysis: balanceResult
    });
    
    return {
      teamA,
      teamB,
      balanceAnalysis: balanceResult
    };
  }

  static async submitMapVote(sessionId: string, userId: string, discordId: string, mapId: string) {
    const { error } = await getSupabase()
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

  static async getSessionVotes(sessionId: string) {
    const { data, error } = await getSupabase()
      .from('quick_match_votes')
      .select('*')
      .eq('session_id', sessionId);

    if (error) {
      console.error('Error getting session votes:', error);
      return [];
    }

    return data || [];
  }

  static async calculateMapVotingResults(sessionId: string) {
    const votes = await this.getSessionVotes(sessionId);
    
    // Count votes for each map
    const voteCounts: Record<string, number> = {};
    votes.forEach((vote: any) => {
      voteCounts[vote.map_id] = (voteCounts[vote.map_id] || 0) + 1;
    });
    
    // Find the map with the most votes
    let winningMapId = '';
    let maxVotes = 0;
    
    Object.entries(voteCounts).forEach(([mapId, count]) => {
      if (count > maxVotes) {
        maxVotes = count;
        winningMapId = mapId;
      }
    });
    
    // Get map details
    const { data: winningMap } = await getSupabase()
      .from('maps')
      .select('*')
      .eq('id', winningMapId)
      .single();
    
    return {
      winningMap,
      votes: voteCounts,
      totalVotes: votes.length
    };
  }

  static async createMatch(sessionId: string, teamAData: any[], teamBData: any[], selectedMapId: string) {
    // Create teams in database first
    const { data: teamA, error: teamAError } = await getSupabase()
      .from('teams')
      .insert({
        name: 'Team A',
        tournament_id: null // Quick matches don't belong to tournaments
      })
      .select()
      .single();

    if (teamAError) {
      throw new Error(`Failed to create Team A: ${teamAError.message}`);
    }

    const { data: teamB, error: teamBError } = await getSupabase()
      .from('teams')
      .insert({
        name: 'Team B',
        tournament_id: null
      })
      .select()
      .single();

    if (teamBError) {
      throw new Error(`Failed to create Team B: ${teamBError.message}`);
    }

    // Add team members
    const teamAMembers = teamAData.map((player, index) => ({
      team_id: teamA.id,
      user_id: player.users?.id || player.user_id,
      is_captain: index === 0
    }));

    const teamBMembers = teamBData.map((player, index) => ({
      team_id: teamB.id,
      user_id: player.users?.id || player.user_id,
      is_captain: index === 0
    }));

    await getSupabase().from('team_members').insert([...teamAMembers, ...teamBMembers]);

    // Create the match
    const { data: match, error: matchError } = await getSupabase()
      .from('matches')
      .insert({
        team1_id: teamA.id,
        team2_id: teamB.id,
        tournament_id: null,
        status: 'live',
        match_number: 1,
        round_number: 1,
        best_of: 1,
        started_at: new Date().toISOString()
      })
      .select()
      .single();

    if (matchError) {
      throw new Error(`Failed to create match: ${matchError.message}`);
    }

    // Add the selected map to the match
    await getSupabase()
      .from('match_maps')
      .insert({
        match_id: match.id,
        map_id: selectedMapId,
        map_order: 1,
        started_at: new Date().toISOString()
      });

    // Update session with match ID and set status to in_progress
    await this.updateSession(sessionId, {
      match_id: match.id,
      selected_map_id: selectedMapId,
      status: 'in_progress',
      started_at: new Date().toISOString()
    });

    return match.id;
  }

  static async completeMatch(sessionId: string, matchId: string, winningTeamId: string, teamAScore: number, teamBScore: number) {
    // Update match with results
    const { error: matchError } = await getSupabase()
      .from('matches')
      .update({
        status: 'completed',
        winner_id: winningTeamId,
        score_team1: teamAScore,
        score_team2: teamBScore,
        completed_at: new Date().toISOString()
      })
      .eq('id', matchId);

    if (matchError) {
      throw new Error(`Failed to complete match: ${matchError.message}`);
    }

    // Update match_maps with scores
    const { error: mapError } = await getSupabase()
      .from('match_maps')
      .update({
        team1_score: teamAScore,
        team2_score: teamBScore,
        winner_team_id: winningTeamId,
        completed_at: new Date().toISOString()
      })
      .eq('match_id', matchId);

    if (mapError) {
      console.error('Error updating match maps:', mapError);
    }

    // Update session status
    await this.updateSession(sessionId, {
      status: 'completed',
      completed_at: new Date().toISOString()
    });

    console.log(`✅ Match ${matchId} completed with winner ${winningTeamId}`);
  }
}