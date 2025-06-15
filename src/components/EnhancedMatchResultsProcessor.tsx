
import { supabase } from "@/integrations/supabase/client";

interface MatchResultsProcessorProps {
  matchId: string;
  winnerId: string;
  loserId: string;
  tournamentId: string;
  onComplete: () => void;
  toast: (opts: { title: string; description: string; variant?: "default" | "destructive" }) => void;
  notifyMatchComplete: (matchId: string, winnerId: string, loserId: string) => Promise<void>;
  notifyTournamentWinner: (tournamentId: string, winnerId: string) => Promise<void>;
  notifyMatchReady: (matchId: string, team1Id: string, team2Id: string) => Promise<void>;
}

export const processMatchResults = async ({
  matchId,
  winnerId,
  loserId,
  tournamentId,
  onComplete,
  toast,
  notifyMatchComplete,
  notifyTournamentWinner,
  notifyMatchReady
}: MatchResultsProcessorProps) => {
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

    // Get current match details and tournament info
    const { data: match } = await supabase
      .from('matches')
      .select(`
        *,
        tournament:tournaments!matches_tournament_id_fkey (
          name,
          status,
          max_teams
        )
      `)
      .eq('id', matchId)
      .single();

    if (!match) throw new Error('Match not found');

    // Get all matches in tournament to check completion status
    const { data: allMatches } = await supabase
      .from('matches')
      .select('id, status, round_number, winner_id')
      .eq('tournament_id', tournamentId)
      .order('round_number', { ascending: false });

    const completedMatches = allMatches?.filter(m => m.status === 'completed') || [];
    const pendingMatches = allMatches?.filter(m => m.status !== 'completed') || [];

    // Check if this is the final match (highest round number with winner)
    const maxRound = Math.max(...(allMatches?.map(m => m.round_number) || [0]));
    const finalRoundMatches = allMatches?.filter(m => m.round_number === maxRound) || [];
    const isTournamentComplete = finalRoundMatches.length === 1 && finalRoundMatches[0].winner_id;

    // Advance winner to next round if not tournament complete
    if (!isTournamentComplete && match) {
      await advanceWinnerToNextRound(winnerId, match, tournamentId);
    }

    // Update team member statistics
    await updatePlayerStatistics(winnerId, loserId);

    // Notify match completion
    await notifyMatchComplete(matchId, winnerId, loserId);

    // Handle tournament completion
    if (isTournamentComplete) {
      await completeTournament(tournamentId, winnerId);
      await notifyTournamentWinner(tournamentId, winnerId);

      toast({
        title: "Tournament Complete!",
        description: "Congratulations to the tournament winner!"
      });
    } else {
      // Check for newly ready matches
      const { data: readyMatches } = await supabase
        .from('matches')
        .select('id, team1_id, team2_id')
        .eq('tournament_id', tournamentId)
        .eq('status', 'pending')
        .not('team1_id', 'is', null)
        .not('team2_id', 'is', null);

      // Notify about ready matches
      if (readyMatches) {
        for (const readyMatch of readyMatches) {
          if (readyMatch.team1_id && readyMatch.team2_id) {
            await notifyMatchReady(readyMatch.id, readyMatch.team1_id, readyMatch.team2_id);
          }
        }
      }
    }

    onComplete();

    toast({
      title: "Match Results Processed",
      description: "Statistics and tournament progress updated"
    });
  } catch (error) {
    console.error('Error processing match results:', error);
    toast({
      title: "Error",
      description: "Failed to process match results",
      variant: "destructive"
    });
  }
};

const advanceWinnerToNextRound = async (winnerId: string, currentMatch: any, tournamentId: string) => {
  try {
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
      const isOddMatch = currentMatch.match_number % 2 === 1;
      const updateField = isOddMatch ? 'team1_id' : 'team2_id';

      await supabase
        .from('matches')
        .update({ [updateField]: winnerId })
        .eq('id', nextMatch.id);

      // Check if both teams are now assigned
      const { data: updatedMatch } = await supabase
        .from('matches')
        .select('team1_id, team2_id')
        .eq('id', nextMatch.id)
        .single();

      if (updatedMatch?.team1_id && updatedMatch?.team2_id) {
        // Update match status to pending (ready to play)
        await supabase
          .from('matches')
          .update({ status: 'pending' })
          .eq('id', nextMatch.id);
      }
    }
  } catch (error) {
    console.error('Error advancing winner:', error);
  }
};

const updatePlayerStatistics = async (winnerTeamId: string, loserTeamId: string) => {
  try {
    // Get team members
    const { data: winnerMembers } = await supabase
      .from('team_members')
      .select('user_id')
      .eq('team_id', winnerTeamId);

    const { data: loserMembers } = await supabase
      .from('team_members')
      .select('user_id')
      .eq('team_id', loserTeamId);

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
  } catch (error) {
    console.error('Error updating player statistics:', error);
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
