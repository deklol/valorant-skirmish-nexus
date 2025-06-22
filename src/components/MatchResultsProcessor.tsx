
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
    // Use unified bracket service for all progression logic
    const result = await UnifiedBracketService.advanceMatchWinner(
      matchId,
      winnerId,
      loserId,
      tournamentId,
      scoreTeam1,
      scoreTeam2
    );

    if (!result.success) {
      throw new Error(result.error || 'Failed to advance match winner');
    }

    // Update player statistics
    console.log('📈 Updating player statistics...');
    await updatePlayerStatistics(winnerId, loserId);

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
        description: "Winner advanced to next round successfully"
      });
    } else {
      safeToast({
        title: "Match Results Processed",
        description: "Statistics and tournament progress updated"
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

async function updatePlayerStatistics(winnerTeamId: string, loserTeamId: string) {
  try {
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
