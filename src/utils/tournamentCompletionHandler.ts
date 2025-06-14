
import { supabase } from "@/integrations/supabase/client";

export const handleTournamentCompletion = async (tournamentId: string) => {
  try {
    console.log(`Handling tournament completion for tournament: ${tournamentId}`);
    
    // Get the final match (highest round number) to determine the winner
    const { data: finalMatch, error: matchError } = await supabase
      .from('matches')
      .select(`
        winner_id,
        round_number,
        teams!matches_winner_id_fkey (
          id,
          name
        )
      `)
      .eq('tournament_id', tournamentId)
      .eq('status', 'completed')
      .not('winner_id', 'is', null)
      .order('round_number', { ascending: false })
      .limit(1)
      .single();

    if (matchError) {
      console.error('Error finding final match:', matchError);
      return false;
    }

    if (!finalMatch?.winner_id) {
      console.log('No winner found for tournament');
      return false;
    }

    // Update the winning team's status
    const { error: teamUpdateError } = await supabase
      .from('teams')
      .update({ status: 'winner' })
      .eq('id', finalMatch.winner_id);

    if (teamUpdateError) {
      console.error('Error updating winning team status:', teamUpdateError);
      return false;
    }

    // Get all members of the winning team
    const { data: teamMembers, error: membersError } = await supabase
      .from('team_members')
      .select(`
        user_id,
        users!team_members_user_id_fkey (
          id,
          discord_username
        )
      `)
      .eq('team_id', finalMatch.winner_id);

    if (membersError) {
      console.error('Error fetching team members:', membersError);
      return false;
    }

    // Increment tournament wins for all team members
    if (teamMembers) {
      for (const member of teamMembers) {
        if (member.users?.id) {
          const { error: incrementError } = await supabase.rpc('increment_user_tournament_wins', {
            user_id: member.users.id
          });

          if (incrementError) {
            console.error(`Error incrementing tournament wins for user ${member.users.discord_username}:`, incrementError);
          } else {
            console.log(`Successfully incremented tournament wins for user: ${member.users.discord_username}`);
          }
        }
      }
    }

    // Update tournament status to completed
    const { error: tournamentUpdateError } = await supabase
      .from('tournaments')
      .update({ status: 'completed' })
      .eq('id', tournamentId);

    if (tournamentUpdateError) {
      console.error('Error updating tournament status:', tournamentUpdateError);
      return false;
    }

    console.log('Tournament completion handled successfully');
    return true;

  } catch (error) {
    console.error('Error handling tournament completion:', error);
    return false;
  }
};
