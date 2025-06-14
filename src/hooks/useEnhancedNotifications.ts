
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

  const sendNotification = async ({
    type,
    title,
    message,
    data = {},
    tournamentId,
    matchId,
    teamId,
    userIds = []
  }: {
    type: string;
    title: string;
    message: string;
    data?: any;
    tournamentId?: string;
    matchId?: string;
    teamId?: string;
    userIds?: string[];
  }) => {
    try {
      if (userIds.length > 0) {
        for (const userId of userIds) {
          const { data: hasEnabled } = await supabase
            .rpc('user_has_notification_enabled', {
              p_user_id: userId,
              p_notification_type: type
            });

          if (hasEnabled) {
            await createNotification(
              userId,
              type,
              title,
              message,
              data,
              tournamentId,
              matchId,
              teamId
            );
          }
        }
      }
    } catch (error) {
      console.error('Error sending notification:', error);
    }
  };

  const notifyMatchReady = async (matchId: string, team1Id: string, team2Id: string) => {
    try {
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

      const { data: participants } = await supabase
        .from('tournament_signups')
        .select('user_id')
        .eq('tournament_id', tournamentId);

      const tournamentName = tournament?.name || 'Tournament';
      const winnerName = winnerTeam?.name || 'Winner';

      for (const participant of participants || []) {
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

  const notifyTeamAssigned = async (teamId: string, teamName: string, userIds: string[], tournamentName?: string) => {
    await sendNotification({
      type: 'team_assigned',
      title: 'Team Assignment',
      message: `You have been assigned to team "${teamName}"${tournamentName ? ` in ${tournamentName}` : ''}`,
      data: { teamName, tournamentName },
      teamId,
      userIds
    });
  };

  const notifyTournamentCreated = async (tournamentId: string, tournamentName: string) => {
    const { data: users } = await supabase
      .from('user_notification_preferences')
      .select('user_id')
      .eq('new_tournament_posted', true);

    if (users) {
      await sendNotification({
        type: 'new_tournament_posted',
        title: 'New Tournament Available',
        message: `${tournamentName} is now open for registration!`,
        tournamentId,
        userIds: users.map(u => u.user_id)
      });
    }
  };

  return {
    createNotification,
    sendNotification,
    notifyMatchReady,
    notifyMatchComplete,
    notifyTournamentWinner,
    notifyMapVetoReady,
    notifyTeamAssigned,
    notifyTournamentCreated
  };
};
