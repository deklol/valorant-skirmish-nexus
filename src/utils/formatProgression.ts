/**
 * Format-specific match progression logic
 * Handles winner advancement for all bracket types
 */

import { supabase } from "@/integrations/supabase/client";
import { BracketType } from "./formatGenerators";
import { calculateBracketStructure, findNextMatchPosition, getWinnerSlot } from "./bracketCalculations";

export interface ProgressionResult {
  success: boolean;
  tournamentCompleted: boolean;
  nextMatchId?: string;
  nextMatchReady?: boolean;
  error?: string;
}

// ============================================================================
// SINGLE ELIMINATION PROGRESSION
// ============================================================================

export async function advanceSingleEliminationWinner(
  matchId: string,
  winnerId: string,
  tournamentId: string
): Promise<ProgressionResult> {
  try {
    // Get current match and all tournament matches
    const [matchResult, allMatchesResult, teamsResult] = await Promise.all([
      supabase.from('matches').select('*').eq('id', matchId).single(),
      supabase.from('matches').select('*').eq('tournament_id', tournamentId).order('round_number').order('match_number'),
      supabase.from('teams').select('id').eq('tournament_id', tournamentId)
    ]);
    
    if (matchResult.error || !matchResult.data) {
      return { success: false, tournamentCompleted: false, error: 'Match not found' };
    }
    
    const match = matchResult.data;
    const allMatches = allMatchesResult.data || [];
    const teamCount = teamsResult.data?.length || 0;
    
    const bracketStructure = calculateBracketStructure(teamCount);
    
    // Check if this is the final match
    if (match.round_number === bracketStructure.totalRounds && match.match_number === 1) {
      return { success: true, tournamentCompleted: true };
    }
    
    // Find next match
    const nextPos = findNextMatchPosition(match.round_number, match.match_number, bracketStructure);
    if (!nextPos) {
      return { success: true, tournamentCompleted: true };
    }
    
    const nextMatch = allMatches.find(m => 
      m.round_number === nextPos.round && m.match_number === nextPos.matchNumber
    );
    
    if (!nextMatch) {
      return { success: false, tournamentCompleted: false, error: 'Next match not found' };
    }
    
    // Advance winner
    const slot = getWinnerSlot(match.match_number);
    const { error: updateError } = await supabase
      .from('matches')
      .update({ [slot]: winnerId })
      .eq('id', nextMatch.id);
    
    if (updateError) {
      return { success: false, tournamentCompleted: false, error: updateError.message };
    }
    
    // Check if next match is now ready
    const updatedNextMatch = await supabase
      .from('matches')
      .select('team1_id, team2_id')
      .eq('id', nextMatch.id)
      .single();
    
    const isReady = !!(updatedNextMatch.data?.team1_id && updatedNextMatch.data?.team2_id);
    
    return { 
      success: true, 
      tournamentCompleted: false, 
      nextMatchId: nextMatch.id,
      nextMatchReady: isReady 
    };
    
  } catch (error: any) {
    return { success: false, tournamentCompleted: false, error: error.message };
  }
}

// ============================================================================
// DOUBLE ELIMINATION PROGRESSION
// ============================================================================

export async function advanceDoubleEliminationWinner(
  matchId: string,
  winnerId: string,
  loserId: string,
  tournamentId: string
): Promise<ProgressionResult> {
  try {
    const [matchResult, allMatchesResult, teamsResult] = await Promise.all([
      supabase.from('matches').select('*').eq('id', matchId).single(),
      supabase.from('matches').select('*').eq('tournament_id', tournamentId).order('round_number').order('match_number'),
      supabase.from('teams').select('id').eq('tournament_id', tournamentId)
    ]);
    
    if (matchResult.error || !matchResult.data) {
      return { success: false, tournamentCompleted: false, error: 'Match not found' };
    }
    
    const match = matchResult.data;
    const allMatches = allMatchesResult.data || [];
    const teamCount = teamsResult.data?.length || 0;
    
    const bracketPosition = match.bracket_position || 'winners';
    const round = match.round_number;
    const matchNumber = match.match_number;
    
    // Find all winners and losers bracket matches
    const winnersMatches = allMatches.filter(m => m.round_number > 0 && m.bracket_position !== 'losers' && m.bracket_position !== 'grand_final');
    const losersMatches = allMatches.filter(m => m.round_number < 0 || m.bracket_position === 'losers');
    const grandFinalMatches = allMatches.filter(m => m.bracket_position === 'grand_final');
    
    const maxWinnersRound = Math.max(...winnersMatches.map(m => m.round_number));
    
    if (bracketPosition === 'winners' || round > 0) {
      // Winner advances in winners bracket
      const nextWinnersRound = round + 1;
      const nextMatchNumber = Math.ceil(matchNumber / 2);
      const slot = getWinnerSlot(matchNumber);
      
      // Check if advancing to grand final
      if (round === maxWinnersRound) {
        // Winners final winner goes to grand final as team1
        const grandFinal = grandFinalMatches.find(m => m.notes?.includes('Grand Final') && !m.notes?.includes('Reset'));
        if (grandFinal) {
          await supabase.from('matches').update({ team1_id: winnerId }).eq('id', grandFinal.id);
        }
      } else {
        // Normal winners bracket advancement
        const nextMatch = winnersMatches.find(m => m.round_number === nextWinnersRound && m.match_number === nextMatchNumber);
        if (nextMatch) {
          await supabase.from('matches').update({ [slot]: winnerId }).eq('id', nextMatch.id);
        }
      }
      
      // Loser drops to losers bracket
      // Losers Round 1 = losers from Winners Round 1
      // Losers Round 2 = losers from Winners Round 2 vs winners of Losers Round 1
      const losersRound = -round; // Convention: losers round is negative of winners round they dropped from
      const losersMatch = losersMatches.find(m => m.round_number === losersRound);
      
      if (losersMatch) {
        // Find empty slot in losers bracket
        if (!losersMatch.team1_id) {
          await supabase.from('matches').update({ team1_id: loserId }).eq('id', losersMatch.id);
        } else if (!losersMatch.team2_id) {
          await supabase.from('matches').update({ team2_id: loserId }).eq('id', losersMatch.id);
        }
      }
      
    } else if (bracketPosition === 'losers' || round < 0) {
      // Loser is eliminated (second loss)
      // Winner advances in losers bracket
      const nextLosersRound = round - 1; // More negative = further in losers
      const losersRoundCount = losersMatches.filter(m => m.round_number === round).length;
      
      // Check if this is losers final
      const isLosersFinal = losersMatches.filter(m => m.round_number === nextLosersRound).length === 0;
      
      if (isLosersFinal) {
        // Losers final winner goes to grand final as team2
        const grandFinal = grandFinalMatches.find(m => m.notes?.includes('Grand Final') && !m.notes?.includes('Reset'));
        if (grandFinal) {
          await supabase.from('matches').update({ team2_id: winnerId }).eq('id', grandFinal.id);
        }
      } else {
        // Normal losers bracket advancement
        const nextMatchNumber = Math.ceil(matchNumber / 2);
        const nextMatch = losersMatches.find(m => m.round_number === nextLosersRound && m.match_number === nextMatchNumber);
        
        if (nextMatch) {
          const slot = getWinnerSlot(matchNumber);
          await supabase.from('matches').update({ [slot]: winnerId }).eq('id', nextMatch.id);
        }
      }
      
    } else if (bracketPosition === 'grand_final') {
      // Grand final logic
      const isReset = match.notes?.includes('Reset');
      
      if (!isReset) {
        // First grand final
        // If winners bracket team wins, tournament over
        // If losers bracket team wins, play reset
        const resetMatch = grandFinalMatches.find(m => m.notes?.includes('Reset'));
        
        if (winnerId === match.team1_id) {
          // Winners bracket champion wins - tournament complete
          return { success: true, tournamentCompleted: true };
        } else {
          // Losers bracket champion wins - reset needed
          if (resetMatch) {
            await supabase.from('matches').update({ 
              team1_id: match.team1_id, 
              team2_id: winnerId,
              status: 'pending'
            }).eq('id', resetMatch.id);
          }
          return { success: true, tournamentCompleted: false, nextMatchId: resetMatch?.id };
        }
      } else {
        // Reset match - whoever wins is champion
        return { success: true, tournamentCompleted: true };
      }
    }
    
    return { success: true, tournamentCompleted: false };
    
  } catch (error: any) {
    return { success: false, tournamentCompleted: false, error: error.message };
  }
}

// ============================================================================
// SWISS PROGRESSION
// ============================================================================

interface SwissStanding {
  teamId: string;
  wins: number;
  losses: number;
  points: number; // Usually 3 for win, 1 for draw, 0 for loss
  buchholz: number; // Tiebreaker: sum of opponents' scores
  opponentsPlayed: string[];
}

export async function generateSwissNextRound(
  tournamentId: string,
  currentRound: number,
  bestOf: number = 1
): Promise<{ success: boolean; matchesCreated: number; error?: string }> {
  try {
    // Get tournament info
    const { data: tournament } = await supabase
      .from('tournaments')
      .select('swiss_rounds')
      .eq('id', tournamentId)
      .single();
    
    const totalRounds = tournament?.swiss_rounds || 5;
    
    if (currentRound >= totalRounds) {
      return { success: true, matchesCreated: 0 }; // Tournament complete
    }
    
    // Calculate current standings
    const { data: completedMatches } = await supabase
      .from('matches')
      .select('*')
      .eq('tournament_id', tournamentId)
      .eq('status', 'completed')
      .lte('round_number', currentRound);
    
    const { data: teams } = await supabase
      .from('teams')
      .select('id')
      .eq('tournament_id', tournamentId);
    
    if (!teams) return { success: false, matchesCreated: 0, error: 'No teams found' };
    
    // Calculate standings
    const standings: Map<string, SwissStanding> = new Map();
    
    teams.forEach(team => {
      standings.set(team.id, {
        teamId: team.id,
        wins: 0,
        losses: 0,
        points: 0,
        buchholz: 0,
        opponentsPlayed: []
      });
    });
    
    completedMatches?.forEach(match => {
      if (match.team1_id && match.team2_id) {
        const team1Standing = standings.get(match.team1_id);
        const team2Standing = standings.get(match.team2_id);
        
        if (team1Standing && team2Standing) {
          team1Standing.opponentsPlayed.push(match.team2_id);
          team2Standing.opponentsPlayed.push(match.team1_id);
          
          if (match.winner_id === match.team1_id) {
            team1Standing.wins++;
            team1Standing.points += 3;
            team2Standing.losses++;
          } else if (match.winner_id === match.team2_id) {
            team2Standing.wins++;
            team2Standing.points += 3;
            team1Standing.losses++;
          }
        }
      }
    });
    
    // Calculate Buchholz (sum of opponents' scores)
    standings.forEach(standing => {
      standing.buchholz = standing.opponentsPlayed.reduce((sum, oppId) => {
        const oppStanding = standings.get(oppId);
        return sum + (oppStanding?.points || 0);
      }, 0);
    });
    
    // Sort by points, then Buchholz
    const sortedTeams = Array.from(standings.values()).sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      return b.buchholz - a.buchholz;
    });
    
    // Pair teams (Swiss pairing - avoid rematches)
    const paired: Set<string> = new Set();
    const newMatches: any[] = [];
    const nextRound = currentRound + 1;
    let matchNumber = 1;
    
    for (const team of sortedTeams) {
      if (paired.has(team.teamId)) continue;
      
      // Find opponent with similar score that hasn't been played
      for (const opponent of sortedTeams) {
        if (opponent.teamId === team.teamId) continue;
        if (paired.has(opponent.teamId)) continue;
        if (team.opponentsPlayed.includes(opponent.teamId)) continue;
        
        // Pair these teams
        newMatches.push({
          tournament_id: tournamentId,
          round_number: nextRound,
          match_number: matchNumber++,
          team1_id: team.teamId,
          team2_id: opponent.teamId,
          status: 'pending',
          best_of: bestOf,
          score_team1: 0,
          score_team2: 0,
          bracket_position: 'swiss',
          notes: `Swiss Round ${nextRound} of ${totalRounds}`
        });
        
        paired.add(team.teamId);
        paired.add(opponent.teamId);
        break;
      }
    }
    
    // Handle bye if odd number of unpaired teams
    const unpaired = sortedTeams.filter(t => !paired.has(t.teamId));
    if (unpaired.length === 1) {
      newMatches.push({
        tournament_id: tournamentId,
        round_number: nextRound,
        match_number: matchNumber,
        team1_id: unpaired[0].teamId,
        team2_id: null,
        status: 'completed',
        best_of: bestOf,
        score_team1: 1,
        score_team2: 0,
        winner_id: unpaired[0].teamId,
        bracket_position: 'swiss',
        notes: 'Bye'
      });
    }
    
    if (newMatches.length > 0) {
      const { error } = await supabase.from('matches').insert(newMatches);
      if (error) {
        return { success: false, matchesCreated: 0, error: error.message };
      }
    }
    
    return { success: true, matchesCreated: newMatches.length };
    
  } catch (error: any) {
    return { success: false, matchesCreated: 0, error: error.message };
  }
}

// ============================================================================
// ROUND ROBIN (No progression needed - all matches pre-generated)
// ============================================================================

// Round robin doesn't need progression logic since all matches are pre-generated
// Just needs standings calculation

export async function getRoundRobinStandings(tournamentId: string): Promise<{
  standings: Array<{
    teamId: string;
    teamName: string;
    played: number;
    wins: number;
    losses: number;
    draws: number;
    points: number;
    goalsFor: number;
    goalsAgainst: number;
    goalDifference: number;
  }>;
  error?: string;
}> {
  try {
    const [matchesResult, teamsResult] = await Promise.all([
      supabase.from('matches').select('*').eq('tournament_id', tournamentId).eq('status', 'completed'),
      supabase.from('teams').select('id, name').eq('tournament_id', tournamentId)
    ]);
    
    const matches = matchesResult.data || [];
    const teams = teamsResult.data || [];
    
    const standingsMap = new Map<string, any>();
    
    teams.forEach(team => {
      standingsMap.set(team.id, {
        teamId: team.id,
        teamName: team.name,
        played: 0,
        wins: 0,
        losses: 0,
        draws: 0,
        points: 0,
        goalsFor: 0,
        goalsAgainst: 0,
        goalDifference: 0
      });
    });
    
    matches.forEach(match => {
      if (!match.team1_id || !match.team2_id) return; // Skip bye matches
      
      const team1 = standingsMap.get(match.team1_id);
      const team2 = standingsMap.get(match.team2_id);
      
      if (team1 && team2) {
        team1.played++;
        team2.played++;
        
        team1.goalsFor += match.score_team1 || 0;
        team1.goalsAgainst += match.score_team2 || 0;
        team2.goalsFor += match.score_team2 || 0;
        team2.goalsAgainst += match.score_team1 || 0;
        
        if (match.winner_id === match.team1_id) {
          team1.wins++;
          team1.points += 3;
          team2.losses++;
        } else if (match.winner_id === match.team2_id) {
          team2.wins++;
          team2.points += 3;
          team1.losses++;
        } else {
          // Draw
          team1.draws++;
          team2.draws++;
          team1.points += 1;
          team2.points += 1;
        }
      }
    });
    
    // Calculate goal difference and sort
    const standings = Array.from(standingsMap.values())
      .map(s => ({
        ...s,
        goalDifference: s.goalsFor - s.goalsAgainst
      }))
      .sort((a, b) => {
        if (b.points !== a.points) return b.points - a.points;
        if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
        return b.goalsFor - a.goalsFor;
      });
    
    return { standings };
    
  } catch (error: any) {
    return { standings: [], error: error.message };
  }
}

// ============================================================================
// UNIFIED PROGRESSION HANDLER
// ============================================================================

export async function handleMatchProgression(
  matchId: string,
  winnerId: string,
  loserId: string,
  tournamentId: string,
  bracketType: BracketType
): Promise<ProgressionResult> {
  switch (bracketType) {
    case 'single_elimination':
      return advanceSingleEliminationWinner(matchId, winnerId, tournamentId);
      
    case 'double_elimination':
      return advanceDoubleEliminationWinner(matchId, winnerId, loserId, tournamentId);
      
    case 'swiss':
      // Swiss doesn't auto-advance - check if round complete and generate next
      const { data: match } = await supabase
        .from('matches')
        .select('round_number')
        .eq('id', matchId)
        .single();
        
      if (match) {
        const { data: roundMatches } = await supabase
          .from('matches')
          .select('status')
          .eq('tournament_id', tournamentId)
          .eq('round_number', match.round_number);
        
        const allComplete = roundMatches?.every(m => m.status === 'completed');
        
        if (allComplete) {
          const result = await generateSwissNextRound(tournamentId, match.round_number);
          if (result.matchesCreated === 0) {
            // No more rounds - tournament complete
            return { success: true, tournamentCompleted: true };
          }
        }
      }
      return { success: true, tournamentCompleted: false };
      
    case 'round_robin':
      // Round robin doesn't need progression - all matches pre-generated
      // Check if all matches complete
      const { data: rrMatches } = await supabase
        .from('matches')
        .select('status')
        .eq('tournament_id', tournamentId);
      
      const allRRComplete = rrMatches?.every(m => m.status === 'completed');
      return { success: true, tournamentCompleted: allRRComplete || false };
      
    default:
      return { success: false, tournamentCompleted: false, error: `Unknown bracket type: ${bracketType}` };
  }
}
