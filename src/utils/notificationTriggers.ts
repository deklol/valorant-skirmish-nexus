import { supabase } from '@/integrations/supabase/client';
import { useEnhancedNotifications } from '@/hooks/useEnhancedNotifications';

// Tournament Event Triggers
export const triggerTournamentStartNotifications = async (tournamentId: string) => {
  console.log('Triggering tournament start notifications for:', tournamentId);
  
  try {
    const { data: tournament } = await supabase
      .from('tournaments')
      .select('name')
      .eq('id', tournamentId)
      .single();

    if (!tournament) return;

    // Get all tournament participants
    const { data: signups } = await supabase
      .from('tournament_signups')
      .select('user_id')
      .eq('tournament_id', tournamentId);

    if (!signups) return;

    // Send notifications to all participants
    for (const signup of signups) {
      await supabase
        .from('notifications')
        .insert({
          user_id: signup.user_id,
          type: 'tournament_started',
          title: 'Tournament Started!',
          message: `${tournament.name} has begun! Check your matches and be ready to play.`,
          data: { tournamentId },
          tournament_id: tournamentId
        });
    }

    console.log(`Sent tournament start notifications to ${signups.length} participants`);
  } catch (error) {
    console.error('Error triggering tournament start notifications:', error);
  }
};

// Match Event Triggers
export const triggerMatchStartNotifications = async (matchId: string) => {
  console.log('Triggering match start notifications for:', matchId);
  
  try {
    const { data: match } = await supabase
      .from('matches')
      .select(`
        id,
        tournaments(name),
        team1:teams!team1_id(name),
        team2:teams!team2_id(name),
        team1_id,
        team2_id
      `)
      .eq('id', matchId)
      .single();

    if (!match) return;

    // Get all team members for both teams
    const { data: allMembers } = await supabase
      .from('team_members')
      .select('user_id, team_id')
      .in('team_id', [match.team1_id, match.team2_id]);

    if (!allMembers) return;

    const team1Name = match.team1?.name || 'Team 1';
    const team2Name = match.team2?.name || 'Team 2';
    const tournamentName = match.tournaments?.name || 'Tournament';

    // Send notifications to all team members
    for (const member of allMembers) {
      await supabase
        .from('notifications')
        .insert({
          user_id: member.user_id,
          type: 'match_started',
          title: 'Match Started!',
          message: `Your match in ${tournamentName} has started: ${team1Name} vs ${team2Name}`,
          data: { 
            matchId, 
            team1Name, 
            team2Name, 
            tournamentName,
            userTeamId: member.team_id 
          },
          match_id: matchId,
          team_id: member.team_id
        });
    }

    console.log(`Sent match start notifications to ${allMembers.length} players`);
  } catch (error) {
    console.error('Error triggering match start notifications:', error);
  }
};

// Check-in Reminder Notifications
export const triggerCheckInReminderNotifications = async (tournamentId: string) => {
  console.log('Triggering check-in reminder notifications for:', tournamentId);
  
  try {
    const { data: tournament } = await supabase
      .from('tournaments')
      .select('name, check_in_ends_at')
      .eq('id', tournamentId)
      .single();

    if (!tournament) return;

    // Get signed up users who haven't checked in
    const { data: signups } = await supabase
      .from('tournament_signups')
      .select('user_id')
      .eq('tournament_id', tournamentId)
      .eq('is_checked_in', false);

    if (!signups) return;

    const checkInEndsAt = new Date(tournament.check_in_ends_at || '').toLocaleTimeString();

    // Send notifications to all non-checked-in participants
    for (const signup of signups) {
      await supabase
        .from('notifications')
        .insert({
          user_id: signup.user_id,
          type: 'tournament_checkin_time',
          title: 'Check-In Required!',
          message: `Don't forget to check in for ${tournament.name}! Check-in ends at ${checkInEndsAt}.`,
          data: { tournamentId, checkInEndsAt },
          tournament_id: tournamentId
        });
    }

    console.log(`Sent check-in reminders to ${signups.length} participants`);
  } catch (error) {
    console.error('Error triggering check-in reminder notifications:', error);
  }
};

// Team Assignment Notifications
export const triggerTeamAssignmentNotifications = async (tournamentId: string) => {
  console.log('Triggering team assignment notifications for:', tournamentId);
  
  try {
    const { data: tournament } = await supabase
      .from('tournaments')
      .select('name')
      .eq('id', tournamentId)
      .single();

    if (!tournament) return;

    // Get all teams and their members for this tournament
    const { data: teams } = await supabase
      .from('teams')
      .select(`
        id,
        name,
        team_members(user_id)
      `)
      .eq('tournament_id', tournamentId);

    if (!teams) return;

    // Send notifications to all team members
    for (const team of teams) {
      for (const member of team.team_members || []) {
        await supabase
          .from('notifications')
          .insert({
            user_id: member.user_id,
            type: 'team_assigned',
            title: 'Team Assignment Complete!',
            message: `You have been assigned to "${team.name}" in ${tournament.name}. Good luck!`,
            data: { 
              tournamentId, 
              teamId: team.id, 
              teamName: team.name,
              tournamentName: tournament.name 
            },
            tournament_id: tournamentId,
            team_id: team.id
          });
      }
    }

    console.log(`Sent team assignment notifications for ${teams.length} teams`);
  } catch (error) {
    console.error('Error triggering team assignment notifications:', error);
  }
};

// Tournament Registration Open Notifications - Enhanced to notify ALL users
export const triggerTournamentRegistrationOpenNotifications = async (tournamentId: string) => {
  console.log('Triggering tournament registration open notifications for:', tournamentId);
  
  try {
    const { data: tournament } = await supabase
      .from('tournaments')
      .select('name, start_time')
      .eq('id', tournamentId)
      .single();

    if (!tournament) return;

    // Get ALL users by default (tournament is open to everyone)
    const { data: users } = await supabase
      .from('users')
      .select('id')
      .eq('is_banned', false);

    if (!users) return;

    const startTime = new Date(tournament.start_time || '').toLocaleString();

    // Send notifications to all users
    for (const user of users) {
      await supabase
        .from('notifications')
        .insert({
          user_id: user.id,
          type: 'tournament_signups_open',
          title: 'New Tournament Available!',
          message: `Registration is now open for ${tournament.name}! Tournament starts ${startTime}.`,
          data: { tournamentId, startTime },
          tournament_id: tournamentId
        });
    }

    console.log(`Sent tournament registration notifications to ${users.length} users`);
  } catch (error) {
    console.error('Error triggering tournament registration notifications:', error);
  }
};

// Achievement Earned Notifications
export const triggerAchievementEarnedNotifications = async (userId: string, achievementId: string) => {
  console.log('Triggering achievement earned notification for:', userId, achievementId);
  
  try {
    const { data: achievement } = await supabase
      .from('achievements')
      .select('name, description, points')
      .eq('id', achievementId)
      .single();

    if (!achievement) return;

    await supabase
      .from('notifications')
      .insert({
        user_id: userId,
        type: 'achievement_earned',
        title: 'Achievement Unlocked!',
        message: `You earned "${achievement.name}" - ${achievement.description}. +${achievement.points} points!`,
        data: { achievementId, achievementName: achievement.name, points: achievement.points }
      });

    console.log(`Sent achievement notification to user ${userId}`);
  } catch (error) {
    console.error('Error triggering achievement notification:', error);
  }
};

// Export all trigger functions
export const notificationTriggers = {
  triggerTournamentStartNotifications,
  triggerMatchStartNotifications,
  triggerCheckInReminderNotifications,
  triggerTeamAssignmentNotifications,
  triggerTournamentRegistrationOpenNotifications,
  triggerAchievementEarnedNotifications
};