
import { supabase } from "@/integrations/supabase/client";

/**
 * Complete an entire tournament: mark status, update winner team, update stats for all users.
 * Returns true if completed, else false.
 */
export const completeTournament = async (tournamentId: string, winnerTeamId: string): Promise<boolean> => {
  try {
    await supabase
      .from('tournaments')
      .update({
        status: 'completed',
      })
      .eq('id', tournamentId);

    // Mark the team as winner (for tournament history/audit)
    await supabase
      .from('teams')
      .update({ status: 'winner' })
      .eq('id', winnerTeamId);

    // Award all winner team members with tournament win, and increment tournaments_played for all signups
    const { data: winnerMembers } = await supabase
      .from('team_members')
      .select('user_id')
      .eq('team_id', winnerTeamId);

    if (winnerMembers) {
      for (const w of winnerMembers) {
        await supabase.rpc('increment_user_tournament_wins', { user_id: w.user_id });
      }
    }

    // All participants get "played"
    const { data: allSignups } = await supabase
      .from('tournament_signups')
      .select('user_id')
      .eq('tournament_id', tournamentId);
    if (allSignups) {
      for (const s of allSignups) {
        await supabase.rpc('increment_user_tournaments_played', { user_id: s.user_id });
      }
    }

    return true;
  } catch (err) {
    // For now, log. Could require a repair-audit later
    console.error('Tournament Finalization Error', err);
    return false;
  }
};
