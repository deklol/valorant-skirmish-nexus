
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export const useEnhancedNotifications = () => {
  const { user } = useAuth();

  const createNotification = async (
    userId: string,
    type: string,
    title: string,
    message: string,
    data: any = {},
    tournamentId?: string,
    matchId?: string,
    teamId?: string
  ) => {
    try {
      await supabase.rpc('create_notification', {
        p_user_id: userId,
        p_type: type,
        p_title: title,
        p_message: message,
        p_data: data,
        p_tournament_id: tournamentId,
        p_match_id: matchId,
        p_team_id: teamId
      });
    } catch (error) {
      console.error('Error creating notification:', error);
    }
  };

  const notifyMatchReady = async (matchId: string, team1Id: string, team2Id: string) => {
    try {
      // Get team members for both teams
      const { data: team1Members } = await supabase
        .from('team_members')
        .select('user_id, team:teams!inner(name)')
        .eq('team_id', team1Id);

      const { data: team2Members } = await supabase
        .from('team_members')
        .select('user_id, team:teams!inner(name)')
        .eq('team_id', team2Id);

      const team1Name = team1Members?.[0]?.team?.name || 'Team 1';
      const team2Name = team2Members?.[0]?.team?.name || 'Team 2';

      // Notify all team members
      const allMembers = [...(team1Members || []), ...(team2Members || [])];
      
      for (const member of allMembers) {
        await createNotification(
          member.user_id,
          'match_ready',
          'Match Ready',
          `Your match between ${team1Name} vs ${team2Name} is ready to start!`,
          { matchId, team1Id, team2Id },
          undefined,
          matchId
        );
      }
    } catch (error) {
      console.error('Error notifying match ready:', error);
    }
  };

  const notifyMatchComplete = async (matchId: string, winnerId: string, loserId: string) => {
    try {
      // Get team details
      const { data: winnerTeam } = await supabase
        .from('teams')
        .select('name')
        .eq('id', winnerId)
        .single();

      const { data: loserTeam } = await supabase
        .from('teams')
        .select('name')
        .eq('id', loserId)
        .single();

      // Get all team members
      const { data: allMembers } = await supabase
        .from('team_members')
        .select('user_id, team_id')
        .in('team_id', [winnerId, loserId]);

      const winnerName = winnerTeam?.name || 'Winner';
      const loserName = loserTeam?.name || 'Loser';

      for (const member of allMembers || []) {
        const isWinner = member.team_id === winnerId;
        await createNotification(
          member.user_id,
          'match_complete',
          isWinner ? 'Match Won!' : 'Match Complete',
          isWinner 
            ? `Congratulations! Your team won against ${loserName}`
            : `Your match against ${winnerName} has completed`,
          { matchId, winnerId, loserId, isWinner },
          undefined,
          matchId,
          member.team_id
        );
      }
    } catch (error) {
      console.error('Error notifying match complete:', error);
    }
  };

  const notifyTournamentWinner = async (tournamentId: string, winnerTeamId: string) => {
    try {
      // Get tournament and winner team details
      const { data: tournament } = await supabase
        .from('tournaments')
        .select('name')
        .eq('id', tournamentId)
        .single();

      const { data: winnerTeam } = await supabase
        .from('teams')
        .select('name')
        .eq('id', winnerTeamId)
        .single();

      // Get all tournament participants
      const { data: participants } = await supabase
        .from('tournament_signups')
        .select('user_id')
        .eq('tournament_id', tournamentId);

      const tournamentName = tournament?.name || 'Tournament';
      const winnerName = winnerTeam?.name || 'Winner';

      // Notify all participants
      for (const participant of participants || []) {
        // Check if this user is part of the winning team
        const { data: isWinner } = await supabase
          .from('team_members')
          .select('id')
          .eq('team_id', winnerTeamId)
          .eq('user_id', participant.user_id)
          .single();

        await createNotification(
          participant.user_id,
          'tournament_complete',
          isWinner ? 'Tournament Victory!' : 'Tournament Complete',
          isWinner 
            ? `Congratulations! You won ${tournamentName}!`
            : `${tournamentName} has ended. Winner: ${winnerName}`,
          { tournamentId, winnerTeamId, isWinner: !!isWinner },
          tournamentId
        );
      }
    } catch (error) {
      console.error('Error notifying tournament winner:', error);
    }
  };

  const notifyMapVetoReady = async (matchId: string, team1Id: string, team2Id: string) => {
    try {
      // Get team members
      const { data: allMembers } = await supabase
        .from('team_members')
        .select('user_id, team_id, team:teams!inner(name)')
        .in('team_id', [team1Id, team2Id]);

      for (const member of allMembers || []) {
        await createNotification(
          member.user_id,
          'map_veto_ready',
          'Map Veto Started',
          `Map veto phase has started for your match. Join to select maps!`,
          { matchId, team1Id, team2Id },
          undefined,
          matchId,
          member.team_id
        );
      }
    } catch (error) {
      console.error('Error notifying map veto ready:', error);
    }
  };

  return {
    notifyMatchReady,
    notifyMatchComplete,
    notifyTournamentWinner,
    notifyMapVetoReady,
    createNotification
  };
};
