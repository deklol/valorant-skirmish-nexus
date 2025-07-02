
// More robust tournament completion. 
import { supabase } from "@/integrations/supabase/client";

/**
 * Complete an entire tournament. Handles winner, losers, and all stats robustly.
 */
export const completeTournament = async (tournamentId: string, winnerTeamId: string): Promise<boolean> => {
  try {
    // Mark tournament itself as completed
    await supabase
      .from('tournaments')
      .update({ status: 'completed' })
      .eq('id', tournamentId);

    // Mark the team as winner
    await supabase
      .from('teams')
      .update({ status: 'winner' })
      .eq('id', winnerTeamId);

    // Mark ALL other teams in this tournament as eliminated (exclude the winner)
    await supabase
      .from('teams')
      .update({ status: 'eliminated' })
      .eq('tournament_id', tournamentId)
      .neq('id', winnerTeamId);

    // Tournament statistics are now handled automatically by database triggers
    // The handle_tournament_completion() trigger will automatically:
    // - Award tournament wins to all winning team members
    // - Increment tournaments_played for all participants
    console.log('📊 Tournament statistics will be updated automatically by database triggers');

    return true;
  } catch (err) {
    console.error('Tournament Finalization Error', err);
    return false;
  }
};
