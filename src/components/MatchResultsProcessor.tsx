
// SINGLE authoritative result processor using unified bracket service
import { supabase } from "@/integrations/supabase/client";
import { UnifiedBracketService } from "@/services/unifiedBracketService";

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
 * Process match results using the unified bracket progression service
 * CRITICAL FIX: All progression now routes through UnifiedBracketService
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
  }: NotificationFunctions = {}
) {
  const safeToast = toast ?? (() => {});
  const safeNotifyMatchComplete = notifyMatchComplete ?? (() => Promise.resolve());
  const safeNotifyTournamentWinner = notifyTournamentWinner ?? (() => Promise.resolve());
  const safeNotifyMatchReady = notifyMatchReady ?? (() => Promise.resolve());

  console.log('🏆 Processing match results with unified service:', { matchId, winnerId, loserId, tournamentId });

  try {
    // CRITICAL FIX: Use the new security definer function for match advancement
    const { data: advancementData, error: advancementError } = await supabase.rpc('advance_match_winner_secure', {
      p_match_id: matchId,
      p_winner_id: winnerId,
      p_loser_id: loserId,
      p_tournament_id: tournamentId,
      p_score_team1: scoreTeam1,
      p_score_team2: scoreTeam2
    });

    if (advancementError) {
      throw new Error(`Match advancement failed: ${advancementError.message}`);
    }

    const result = advancementData as {
      success: boolean;
      tournamentComplete: boolean;
      winner?: string;
      nextMatchReady?: boolean;
      nextMatchId?: string;
      error?: string;
    };

    if (!result.success) {
      throw new Error(result.error || 'Failed to advance match winner');
    }

    // Statistics are now handled automatically by database triggers
    console.log('📈 Player statistics will be updated automatically by database triggers');
    
    // Trigger achievement check for both teams
    try {
      const { data: team1Members } = await supabase
        .from('team_members')
        .select('user_id')
        .eq('team_id', winnerId);
        
      const { data: team2Members } = await supabase
        .from('team_members')
        .select('user_id')
        .eq('team_id', loserId);

      // Check achievements for all players involved
      const allPlayerIds = [
        ...(team1Members?.map(m => m.user_id) || []),
        ...(team2Members?.map(m => m.user_id) || [])
      ].filter(Boolean);

      for (const playerId of allPlayerIds) {
        await supabase.rpc('check_and_award_achievements', { p_user_id: playerId });
      }
    } catch (error) {
      console.error('Error checking achievements:', error);
    }

    // Send notifications based on result
    await safeNotifyMatchComplete(matchId, winnerId, loserId);

    if (result.tournamentComplete && result.winner) {
      console.log('🎉 Tournament completed!');
      await safeNotifyTournamentWinner(tournamentId, result.winner);
      
      safeToast({
        title: "Tournament Complete!",
        description: "Congratulations to the tournament winner!"
      });
    } else if (result.nextMatchReady && result.nextMatchId) {
      console.log('🔔 Next match is ready');
      // Could notify about next match being ready if needed
      
      safeToast({
        title: "Match Results Processed",
        description: "Winner advanced to next round successfully using unified bracket logic"
      });
    } else {
      safeToast({
        title: "Match Results Processed",
        description: "Statistics and tournament progress updated using unified bracket logic"
      });
    }
    
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

// REMOVED: Statistics are now handled automatically by database triggers
// This function is no longer needed as the handle_match_completion() trigger
// automatically updates wins/losses for all team members when a match is completed

export default processMatchResults;
