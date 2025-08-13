
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface NotificationTrigger {
  type: string;
  title: string;
  message: string;
  data?: any;
  tournamentId?: string;
  matchId?: string;
  teamId?: string;
  userIds?: string[];
}

export const useNotifications = () => {
  const { user } = useAuth();

  const sendNotification = async ({
    type,
    title,
    message,
    data = {},
    tournamentId,
    matchId,
    teamId,
    userIds = []
  }: NotificationTrigger) => {
    try {
      // Check if Notification Test Mode is enabled
      let targetUserIds = userIds;
      try {
        const { data: settings } = await supabase
          .from('app_settings')
          .select('notification_test_mode')
          .limit(1)
          .maybeSingle();

        if (settings?.notification_test_mode) {
          const { data: admins } = await supabase
            .from('users')
            .select('id')
            .eq('role', 'admin');
          targetUserIds = admins?.map((a: { id: string }) => a.id) || [];
        }
      } catch (modeErr) {
        console.error('Error checking notification test mode:', modeErr);
      }

      // If specific user IDs provided (or overridden by test mode), send to those users
      if (targetUserIds.length > 0) {
        for (const uid of targetUserIds) {
          // Use enhanced notification function with push and email support
          await supabase.rpc('create_enhanced_notification', {
            p_user_id: uid,
            p_type: type,
            p_title: title,
            p_message: message,
            p_data: data,
            p_tournament_id: tournamentId,
            p_match_id: matchId,
            p_team_id: teamId,
            p_send_push: true,
            p_send_email: ['tournament_created', 'match_ready', 'tournament_checkin_time'].includes(type),
            p_email_subject: title,
          });
        }

        // Trigger push notifications for immediate delivery
        try {
          await supabase.functions.invoke('send-push-notification', {
            body: {
              userIds: targetUserIds,
              payload: {
                title,
                body: message,
                data: data || {},
                tag: type,
              }
            }
          });
        } catch (pushError) {
          console.error('Error sending push notifications:', pushError);
        }
      }
    } catch (error) {
      console.error('Error sending notification:', error);
    }
  };

  // Tournament notifications
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

  const notifySignupsOpen = async (tournamentId: string, tournamentName: string) => {
    const { data: users } = await supabase
      .from('user_notification_preferences')
      .select('user_id')
      .eq('tournament_signups_open', true);

    if (users) {
      await sendNotification({
        type: 'tournament_signups_open',
        title: 'Tournament Registration Open',
        message: `Registration for ${tournamentName} is now open!`,
        tournamentId,
        userIds: users.map(u => u.user_id)
      });
    }
  };

  const notifyCheckinTime = async (tournamentId: string, tournamentName: string) => {
    const { data: participants } = await supabase
      .from('tournament_signups')
      .select('user_id')
      .eq('tournament_id', tournamentId);

    if (participants) {
      await sendNotification({
        type: 'tournament_checkin_time',
        title: 'Tournament Check-in Started',
        message: `Check-in for ${tournamentName} is now open!`,
        tournamentId,
        userIds: participants.map(p => p.user_id)
      });
    }
  };

  const notifyTeamAssigned = async (teamId: string, teamName: string, userIds: string[]) => {
    await sendNotification({
      type: 'team_assigned',
      title: 'Team Assignment',
      message: `You have been assigned to team: ${teamName}`,
      teamId,
      userIds
    });
  };

  const notifyMatchAssigned = async (matchId: string, teamId: string, tournamentName: string) => {
    const { data: members } = await supabase
      .from('team_members')
      .select('user_id')
      .eq('team_id', teamId);

    if (members) {
      await sendNotification({
        type: 'match_assigned',
        title: 'Match Assignment',
        message: `Your team has a new match in ${tournamentName}`,
        matchId,
        teamId,
        userIds: members.map(m => m.user_id)
      });
    }
  };

  const notifyMatchReady = async (matchId: string, team1Id: string, team2Id: string) => {
    const { data: team1Members } = await supabase
      .from('team_members')
      .select('user_id')
      .eq('team_id', team1Id);

    const { data: team2Members } = await supabase
      .from('team_members')
      .select('user_id')
      .eq('team_id', team2Id);

    const allMembers = [
      ...(team1Members?.map(m => m.user_id) || []),
      ...(team2Members?.map(m => m.user_id) || [])
    ];

    if (allMembers.length > 0) {
      await sendNotification({
        type: 'match_ready',
        title: 'Match Ready',
        message: 'Your match is ready to start!',
        matchId,
        userIds: allMembers
      });
    }
  };

  const notifyPostResults = async (matchId: string, captainIds: string[]) => {
    await sendNotification({
      type: 'post_results',
      title: 'Post Match Results',
      message: 'Please post the results for your completed match',
      matchId,
      userIds: captainIds
    });
  };

  return {
    sendNotification,
    notifyTournamentCreated,
    notifySignupsOpen,
    notifyCheckinTime,
    notifyTeamAssigned,
    notifyMatchAssigned,
    notifyMatchReady,
    notifyPostResults
  };
};
