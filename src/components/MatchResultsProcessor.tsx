
// SINGLE authoritative result processor for matches & bracket progression (atomic & robust)
// This must be used by all admin overrides, user result submissions, and auto-tournament logic!

import { supabase } from "@/integrations/supabase/client";
import { completeTournament } from "@/utils/completeTournament";

// Used for type clarity, these should match DB types but not reference module-level types directly for cross-module safety
export type MatchResultsProcessorInput = {
  matchId: string;
  winnerId: string;
  loserId: string;
  tournamentId: string;
  scoreTeam1?: number;
  scoreTeam2?: number;
  onComplete?: () => void;
};

export type NotificationFunctions = {
  toast?: (args: { title: string; description?: string; variant?: "default" | "destructive" }) => void;
  notifyMatchComplete?: (matchId: string, winnerId: string, loserId: string) => Promise<void>;
  notifyTournamentWinner?: (tournamentId: string, winnerTeamId: string) => Promise<void>;
  notifyMatchReady?: (matchId: string, team1Id: string, team2Id: string) => Promise<void>;
};

/**
 * Determines if this match is the final of the bracket and all prior rounds are complete.
 */
function isBracketFinalMatch(currentMatch: any, allMatches: any[]): boolean {
  // Compute maximum round
  const roundNumbers = allMatches.map(m => m.round_number);
  const maxRound = roundNumbers.length ? Math.max(...roundNumbers) : 1;

  // This is a candidate final if: 
  // - It's in the max round
  // - All matches in ALL prior rounds are completed
  const priorRounds = allMatches.filter(m => m.round_number < maxRound);
  const allPriorRoundsCompleted = priorRounds.every(m => m.status === 'completed');
  const isFinalMatch = currentMatch.round_number === maxRound;
  // Only allow final completion if this IS the final & all prior are done
  return isFinalMatch && allPriorRoundsCompleted;
}

/**
 * Process match results (admin or user): marks match complete, updates winner, advances bracket, updates stats.
 * Accepts toast/notif functions as dependency injection for strong React compatibility.
 */
export async function processMatchResults(
  {
    matchId,
    winnerId,
    loserId,
    tournamentId,
    scoreTeam1,
    scoreTeam2,
    onComplete,
  }: MatchResultsProcessorInput,
  {
    toast,
    notifyMatchComplete,
    notifyTournamentWinner,
    notifyMatchReady,
  }: NotificationFunctions = {} // all optional for BC
) {
  // If nothing passed, provide no-op fallback toasts/notifications (for non-component code)
  const safeToast = toast ?? (() => {});
  const safeNotifyMatchComplete = notifyMatchComplete ?? (() => Promise.resolve());
  const safeNotifyTournamentWinner = notifyTournamentWinner ?? (() => Promise.resolve());
  const safeNotifyMatchReady = notifyMatchReady ?? (() => Promise.resolve());

  console.log('🏆 Processing match results:', { matchId, winnerId, loserId, tournamentId });

  try {
    // Step 1: Mark match as completed with all details
    console.log('📝 Updating match with winner and completion details...');
    const { error: updateMatchError } = await supabase
      .from('matches')
      .update({
        winner_id: winnerId,
        status: 'completed',
        completed_at: new Date().toISOString(),
        ...(scoreTeam1 !== undefined && scoreTeam2 !== undefined && { 
          score_team1: scoreTeam1, 
          score_team2: scoreTeam2 
        })
      })
      .eq('id', matchId);

    if (updateMatchError) {
      console.error('❌ Failed to update match:', updateMatchError);
      throw updateMatchError;
    }
    console.log('✅ Match marked as completed with winner:', winnerId);

    // Step 2: Fetch full context
    const { data: match, error: matchError } = await supabase
      .from('matches')
      .select('*')
      .eq('id', matchId)
      .single();

    if (matchError || !match) {
      console.error('❌ Failed to fetch match after update:', matchError);
      throw new Error('Match not found after update');
    }

    const { data: allMatches, error: allMatchesError } = await supabase
      .from('matches')
      .select('id, status, round_number, match_number, team1_id, team2_id, winner_id')
      .eq('tournament_id', tournamentId)
      .order('round_number', { ascending: true })
      .order('match_number', { ascending: true });

    if (allMatchesError || !allMatches) {
      console.error('❌ Failed to fetch all matches:', allMatchesError);
      throw new Error('Could not load all matches in tournament');
    }

    console.log('📊 Tournament context:', { 
      totalMatches: allMatches.length, 
      completedMatches: allMatches.filter(m => m.status === 'completed').length,
      currentMatchRound: match.round_number,
      maxRound: Math.max(...allMatches.map(m => m.round_number))
    });

    // Step 3: Determine if this is the final match
    const isThisFinalMatch = isBracketFinalMatch(match, allMatches);
    console.log('🏁 Is this the final match?', isThisFinalMatch);

    if (isThisFinalMatch) {
      // FINAL MATCH - Complete tournament
      console.log('🎉 Tournament is complete! Setting winner and completing tournament...');
      
      // Mark the winner as "winner", eliminate the loser
      if (winnerId) {
        const { error: winnerError } = await supabase
          .from('teams')
          .update({ status: 'winner' })
          .eq('id', winnerId);
        if (winnerError) console.error('Warning: Failed to update winner status:', winnerError);
        else console.log('👑 Winner team status updated');
      }
      
      if (loserId) {
        const { error: loserError } = await supabase
          .from('teams')
          .update({ status: 'eliminated' })
          .eq('id', loserId);
        if (loserError) console.error('Warning: Failed to update loser status:', loserError);
        else console.log('❌ Loser team eliminated');
      }

      // Complete tournament
      console.log('🏆 Completing tournament...');
      await completeTournament(tournamentId, winnerId);
      await safeNotifyTournamentWinner(tournamentId, winnerId);
      
      safeToast({
        title: "Tournament Complete!",
        description: "Congratulations to the tournament winner!"
      });
    } else {
      // REGULAR MATCH - Advance winner to next round
      console.log('⬆️ Advancing winner to next round...');
      const advancementResult = await advanceWinnerToNextRound(match, winnerId, tournamentId, allMatches);
      
      if (advancementResult.success) {
        console.log('✅ Winner advanced successfully');
        if (advancementResult.matchReady) {
          console.log('🔔 Next match is now ready with both teams');
          // Notify that a new match is ready
          if (advancementResult.nextMatchTeams) {
            await safeNotifyMatchReady(
              advancementResult.nextMatchId!,
              advancementResult.nextMatchTeams.team1Id,
              advancementResult.nextMatchTeams.team2Id
            );
          }
        }
      } else {
        console.warn('⚠️ Winner advancement had issues:', advancementResult.error);
      }

      // Eliminate the loser
      if (loserId) {
        const { error: loserError } = await supabase
          .from('teams')
          .update({ status: 'eliminated' })
          .eq('id', loserId);
        if (loserError) console.error('Warning: Failed to eliminate loser:', loserError);
        else console.log('❌ Loser team eliminated');
      }
    }

    // Step 4: Update player statistics
    console.log('📈 Updating player statistics...');
    await updatePlayerStatistics(winnerId, loserId);

    // Step 5: Notify match completion
    await safeNotifyMatchComplete(matchId, winnerId, loserId);

    safeToast({
      title: "Match Results Processed",
      description: isThisFinalMatch ? "Tournament completed!" : "Statistics and tournament progress updated"
    });
    
    console.log('✅ Match processing complete');
    if (onComplete) onComplete();
  } catch (error: any) {
    console.error('❌ Match Result Processing Error:', error);
    safeToast({
      title: "Match Result Processing Error",
      description: error.message || "Failed to record and process results",
      variant: "destructive",
    });
  }
}

async function advanceWinnerToNextRound(
  currentMatch: any, 
  winnerId: string, 
  tournamentId: string,
  allMatches: any[]
): Promise<{
  success: boolean;
  error?: string;
  matchReady?: boolean;
  nextMatchId?: string;
  nextMatchTeams?: { team1Id: string; team2Id: string };
}> {
  try {
    const nextRound = currentMatch.round_number + 1;
    const nextMatchNumber = Math.ceil(currentMatch.match_number / 2);

    console.log(`🔄 Looking for next match: Round ${nextRound}, Match #${nextMatchNumber}`);

    // Find the next match from our loaded data
    const nextMatch = allMatches.find(m => 
      m.round_number === nextRound && m.match_number === nextMatchNumber
    );

    if (!nextMatch) {
      console.log('ℹ️ No next match found (probably tournament final)');
      return { success: true, error: 'No next match exists - likely tournament final' };
    }

    // Determine which slot to place the winner (odd match numbers go to team1, even to team2)
    const isOdd = currentMatch.match_number % 2 === 1;
    const updateField = isOdd ? 'team1_id' : 'team2_id';
    
    console.log(`📍 Assigning winner ${winnerId} to ${updateField} in match ${nextMatch.id}`);
    
    // Update the next match with the winner
    const { error: updateError } = await supabase
      .from('matches')
      .update({ [updateField]: winnerId })
      .eq('id', nextMatch.id);

    if (updateError) {
      console.error('❌ Failed to advance winner:', updateError);
      return { success: false, error: updateError.message };
    }

    // Check if both teams are now assigned to the next match
    const { data: updatedMatch, error: fetchError } = await supabase
      .from('matches')
      .select('team1_id, team2_id, status')
      .eq('id', nextMatch.id)
      .single();

    if (fetchError) {
      console.error('❌ Failed to fetch updated match:', fetchError);
      return { success: false, error: fetchError.message };
    }

    if (updatedMatch.team1_id && updatedMatch.team2_id) {
      console.log('🔥 Both teams assigned, setting match to live');
      
      // Set the match as live since both teams are ready
      const { error: statusError } = await supabase
        .from('matches')
        .update({ status: 'live' })
        .eq('id', nextMatch.id);

      if (statusError) {
        console.error('❌ Failed to set match to live:', statusError);
        return { success: false, error: statusError.message };
      }

      return {
        success: true,
        matchReady: true,
        nextMatchId: nextMatch.id,
        nextMatchTeams: {
          team1Id: updatedMatch.team1_id,
          team2Id: updatedMatch.team2_id
        }
      };
    }

    return { success: true, matchReady: false };
  } catch (err: any) {
    console.error("❌ Bracket Advancement Error:", err);
    return { success: false, error: err.message };
  }
}

async function updatePlayerStatistics(winnerTeamId: string, loserTeamId: string) {
  try {
    // Add win/loss for all members of winner & loser
    const { data: winnerMembers } = await supabase
      .from('team_members')
      .select('user_id')
      .eq('team_id', winnerTeamId);

    const { data: loserMembers } = await supabase
      .from('team_members')
      .select('user_id')
      .eq('team_id', loserTeamId);

    if (winnerMembers) {
      for (const w of winnerMembers) {
        await supabase.rpc('increment_user_wins', { user_id: w.user_id });
      }
      console.log(`📊 Updated wins for ${winnerMembers.length} players`);
    }
    if (loserMembers) {
      for (const l of loserMembers) {
        await supabase.rpc('increment_user_losses', { user_id: l.user_id });
      }
      console.log(`📊 Updated losses for ${loserMembers.length} players`);
    }
  } catch (err) {
    console.error('📊 Player Stats Update Error', err);
  }
}

export default processMatchResults;
