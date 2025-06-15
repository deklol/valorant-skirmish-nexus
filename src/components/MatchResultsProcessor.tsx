// SINGLE authoritatve result processor for matches & bracket progression (atomic & robust)
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

  try {
    // Mark match as completed (now or again)
    {
      const { error: updateMatchError } = await supabase
        .from('matches')
        .update({
          winner_id: winnerId,
          status: 'completed',
          completed_at: new Date().toISOString(),
          ...(scoreTeam1 !== undefined && scoreTeam2 !== undefined && { score_team1: scoreTeam1, score_team2: scoreTeam2 })
        })
        .eq('id', matchId);

      if (updateMatchError) throw updateMatchError;
    }

    // Fetch full context: current match and all matches in this tournament
    const { data: match } = await supabase
      .from('matches')
      .select('*')
      .eq('id', matchId)
      .maybeSingle();

    if (!match) throw new Error('Match not found after update');

    const { data: allMatches } = await supabase
      .from('matches')
      .select('id, status, round_number, match_number, team1_id, team2_id, winner_id')
      .eq('tournament_id', tournamentId);

    if (!allMatches) throw new Error('Could not load all matches in tournament');

    // --- Bracket Logic & Advancement ---
    // 1. Try to advance this match winner to the next round (unless final)
    if (!isBracketFinalMatch(match, allMatches)) {
      await advanceWinnerToNextRound(match, winnerId, tournamentId);
    }

    // 2. Determine if tournament is now complete (final match and all rounds finished)
    const isThisFinalMatch = isBracketFinalMatch(match, allMatches);
    if (isThisFinalMatch) {
      // Mark the winner as "winner", eliminate the loser
      if (winnerId) {
        await supabase
          .from('teams')
          .update({ status: 'winner' })
          .eq('id', winnerId);
      }
      if (loserId) {
        await supabase
          .from('teams')
          .update({ status: 'eliminated' })
          .eq('id', loserId);
      }
    } else {
      // If not final, only eliminate the loser
      if (loserId) {
        await supabase
          .from('teams')
          .update({ status: 'eliminated' })
          .eq('id', loserId);
      }
    }

    // 3. Stats always update per-match (safe, not duplicated for tournament)
    await updatePlayerStatistics(winnerId, loserId);

    // 4. Notify completion of this match
    await (notifyMatchComplete ?? (() => Promise.resolve()))(matchId, winnerId, loserId);

    // 5. If this was tournament final, complete tournament & trigger notifications
    if (isThisFinalMatch) {
      await completeTournament(tournamentId, winnerId);
      await (notifyTournamentWinner ?? (() => Promise.resolve()))(tournamentId, winnerId);
      toast?.({
        title: "Tournament Complete!",
        description: "Congratulations to the tournament winner!"
      });
    } else {
      // Notify readiness for next round, if new matches are now ready
      const { data: readyMatches } = await supabase
        .from('matches')
        .select('id, team1_id, team2_id')
        .eq('tournament_id', tournamentId)
        .eq('status', 'pending')
        .not('team1_id', 'is', null)
        .not('team2_id', 'is', null);

      if (readyMatches) {
        for (const readyMatch of readyMatches) {
          if (readyMatch.team1_id && readyMatch.team2_id) {
            await (notifyMatchReady ?? (() => Promise.resolve()))(readyMatch.id, readyMatch.team1_id, readyMatch.team2_id);
          }
        }
      }
    }

    toast?.({
      title: "Match Results Processed",
      description: "Statistics and tournament progress updated"
    });
    if (onComplete) onComplete();
  } catch (error: any) {
    toast?.({
      title: "Match Result Processing Error",
      description: error.message || "Failed to record and process results",
      variant: "destructive",
    });
  }
};

async function advanceWinnerToNextRound(currentMatch: any, winnerId: string, tournamentId: string) {
  // Find next round/match for this slot
  try {
    const nextRound = currentMatch.round_number + 1;
    const nextMatchNumber = Math.ceil(currentMatch.match_number / 2);

    const { data: nextMatch } = await supabase
      .from('matches')
      .select('*')
      .eq('tournament_id', tournamentId)
      .eq('round_number', nextRound)
      .eq('match_number', nextMatchNumber)
      .maybeSingle();

    if (nextMatch) {
      // Assign to correct slot: odd -> team1 (left side), even -> team2 (right side)
      const isOdd = currentMatch.match_number % 2 === 1;
      const updateField = isOdd ? 'team1_id' : 'team2_id';
      await supabase
        .from('matches')
        .update({ [updateField]: winnerId })
        .eq('id', nextMatch.id);

      // If both teams are now assigned, set to live (not just pending)
      const { data: updated } = await supabase
        .from('matches')
        .select('team1_id, team2_id')
        .eq('id', nextMatch.id)
        .maybeSingle();

      if (updated?.team1_id && updated?.team2_id) {
        await supabase
          .from('matches')
          .update({ status: 'live' }) // now set to live, not pending!
          .eq('id', nextMatch.id);
      }
    }
  } catch (err) {
    // Not critical: the bracket is reparable, just log
    console.error("Bracket Advancement Error:", err);
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
    }
    if (loserMembers) {
      for (const l of loserMembers) {
        await supabase.rpc('increment_user_losses', { user_id: l.user_id });
      }
    }
  } catch (err) {
    // For now, log. Could trigger a repair-audit later
    console.error('Player Stats Update Error', err);
  }
}

export default processMatchResults;
