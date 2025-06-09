
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNotifications } from "@/hooks/useNotifications";

interface MatchResultsProcessorProps {
  matchId: string;
  winnerId: string;
  loserId: string;
  tournamentId: string;
  onComplete: () => void;
}

export const processMatchResults = async ({ 
  matchId, 
  winnerId, 
  loserId, 
  tournamentId,
  onComplete 
}: MatchResultsProcessorProps) => {
  const { toast } = useToast();
  const { notifyMatchReady } = useNotifications();

  try {
    // Update match as completed
    await supabase
      .from('matches')
      .update({ 
        winner_id: winnerId,
        status: 'completed',
        completed_at: new Date().toISOString()
      })
      .eq('id', matchId);

    // Get current match details for advancement
    const { data: match } = await supabase
      .from('matches')
      .select('round_number, match_number')
      .eq('id', matchId)
      .single();

    if (match) {
      // Advance winner to next round
      await advanceWinnerToNextRound(winnerId, match, tournamentId);
    }

    // Get team members for statistics update
    const { data: winnerMembers } = await supabase
      .from('team_members')
      .select('user_id')
      .eq('team_id', winnerId);

    const { data: loserMembers } = await supabase
      .from('team_members')
      .select('user_id')
      .eq('team_id', loserId);

    // Update winner statistics
    if (winnerMembers) {
      for (const member of winnerMembers) {
        await supabase.rpc('increment_user_wins', { 
          user_id: member.user_id 
        });
      }
    }

    // Update loser statistics
    if (loserMembers) {
      for (const member of loserMembers) {
        await supabase.rpc('increment_user_losses', { 
          user_id: member.user_id 
        });
      }
    }

    // Check if tournament is complete
    const { data: remainingMatches } = await supabase
      .from('matches')
      .select('id')
      .eq('tournament_id', tournamentId)
      .neq('status', 'completed');

    if (!remainingMatches || remainingMatches.length === 0) {
      await completeTournament(tournamentId, winnerId);
    }

    onComplete();
    
    toast({
      title: "Match Results Processed",
      description: "Statistics and tournament progress updated",
    });

  } catch (error) {
    console.error('Error processing match results:', error);
    toast({
      title: "Error",
      description: "Failed to process match results",
      variant: "destructive",
    });
  }
};

const advanceWinnerToNextRound = async (winnerId: string, currentMatch: any, tournamentId: string) => {
  try {
    // Find the next round match that this winner should advance to
    const nextRound = currentMatch.round_number + 1;
    const nextMatchNumber = Math.ceil(currentMatch.match_number / 2);

    const { data: nextMatch } = await supabase
      .from('matches')
      .select('*')
      .eq('tournament_id', tournamentId)
      .eq('round_number', nextRound)
      .eq('match_number', nextMatchNumber)
      .single();

    if (nextMatch) {
      // Determine if winner goes to team1 or team2 slot
      const isOddMatch = currentMatch.match_number % 2 === 1;
      const updateField = isOddMatch ? 'team1_id' : 'team2_id';

      await supabase
        .from('matches')
        .update({ [updateField]: winnerId })
        .eq('id', nextMatch.id);

      // Check if both teams are now assigned to the next match
      const { data: updatedMatch } = await supabase
        .from('matches')
        .select('team1_id, team2_id')
        .eq('id', nextMatch.id)
        .single();

      if (updatedMatch?.team1_id && updatedMatch?.team2_id) {
        // Both teams assigned, notify them that match is ready
        const { notifyMatchReady } = useNotifications();
        await notifyMatchReady(nextMatch.id, updatedMatch.team1_id, updatedMatch.team2_id);
      }
    }
  } catch (error) {
    console.error('Error advancing winner:', error);
  }
};

const completeTournament = async (tournamentId: string, winnerTeamId: string) => {
  try {
    // Update tournament status
    await supabase
      .from('tournaments')
      .update({ 
        status: 'completed',
        end_time: new Date().toISOString()
      })
      .eq('id', tournamentId);

    // Award tournament win to team members
    const { data: winnerMembers } = await supabase
      .from('team_members')
      .select('user_id')
      .eq('team_id', winnerTeamId);

    if (winnerMembers) {
      for (const member of winnerMembers) {
        await supabase.rpc('increment_user_tournament_wins', { 
          user_id: member.user_id 
        });
      }
    }

    // Update all participants' tournament count
    const { data: allSignups } = await supabase
      .from('tournament_signups')
      .select('user_id')
      .eq('tournament_id', tournamentId);

    if (allSignups) {
      for (const signup of allSignups) {
        await supabase.rpc('increment_user_tournaments_played', { 
          user_id: signup.user_id 
        });
      }
    }

  } catch (error) {
    console.error('Error completing tournament:', error);
  }
};

export default processMatchResults;
