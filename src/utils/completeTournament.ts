
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

    // Award all winner team members with tournament win
    const { data: winnerMembers } = await supabase
      .from('team_members')
      .select('user_id')
      .eq('team_id', winnerTeamId);

    if (winnerMembers) {
      for (const w of winnerMembers) {
        await supabase.rpc('increment_user_tournament_wins', { user_id: w.user_id });
      }
    }

    // All participants in teams get tournaments_played incremented (fix: not just signups table)
    const { data: allTeamMembers } = await supabase
      .from('team_members')
      .select('user_id, team_id')
      .in('team_id', [
        winnerTeamId,
        // Get all team ids for this tournament except null
        ...(await (async () => {
          const { data: otherTeams } = await supabase
            .from('teams')
            .select('id')
            .eq('tournament_id', tournamentId)
            .neq('id', winnerTeamId);
          return otherTeams ? otherTeams.map(t => t.id) : [];
        })())
      ]);

    if (allTeamMembers) {
      for (const s of allTeamMembers) {
        await supabase.rpc('increment_user_tournaments_played', { user_id: s.user_id });
      }
    }

    return true;
  } catch (err) {
    console.error('Tournament Finalization Error', err);
    return false;
  }
};
