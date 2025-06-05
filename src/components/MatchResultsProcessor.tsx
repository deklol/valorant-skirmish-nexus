
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

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

    // Get team members for statistics update
    const { data: winnerMembers } = await supabase
      .from('team_members')
      .select('user_id')
      .eq('team_id', winnerId);

    const { data: loserMembers } = await supabase
      .from('team_members')
      .select('user_id')
      .eq('team_id', loserId);

    // Update winner statistics using direct SQL since types aren't updated yet
    if (winnerMembers) {
      for (const member of winnerMembers) {
        await supabase
          .rpc('increment_user_wins' as any, { 
            user_id: member.user_id 
          });
      }
    }

    // Update loser statistics
    if (loserMembers) {
      for (const member of loserMembers) {
        await supabase
          .rpc('increment_user_losses' as any, { 
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
        await supabase
          .rpc('increment_user_tournament_wins' as any, { 
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
        await supabase
          .rpc('increment_user_tournaments_played' as any, { 
            user_id: signup.user_id 
          });
      }
    }

  } catch (error) {
    console.error('Error completing tournament:', error);
  }
};

export default processMatchResults;
