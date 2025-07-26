import { supabase } from '@/integrations/supabase/client';
import { 
  triggerTournamentStartNotifications,
  triggerMatchStartNotifications,
  triggerCheckInReminderNotifications,
  triggerTeamAssignmentNotifications,
  triggerTournamentRegistrationOpenNotifications,
  triggerAchievementEarnedNotifications
} from '@/utils/notificationTriggers';

export class NotificationService {
  // Tournament status change handlers
  static async handleTournamentStatusChange(tournamentId: string, oldStatus: string, newStatus: string) {
    console.log(`Tournament ${tournamentId} status changed from ${oldStatus} to ${newStatus}`);
    
    switch (newStatus) {
      case 'open':
        // When tournament becomes open, notify all users about registration
        await triggerTournamentRegistrationOpenNotifications(tournamentId);
        break;
        
      case 'live':
        // When tournament starts, notify all participants
        await triggerTournamentStartNotifications(tournamentId);
        break;
        
      case 'balancing':
        // When balancing starts, notify participants about team assignment process
        await this.notifyBalancingStarted(tournamentId);
        break;
        
      case 'completed':
        // When tournament completes, notify about results
        await this.notifyTournamentCompleted(tournamentId);
        break;
    }
  }

  // Match status change handlers
  static async handleMatchStatusChange(matchId: string, oldStatus: string, newStatus: string) {
    console.log(`Match ${matchId} status changed from ${oldStatus} to ${newStatus}`);
    
    if (newStatus === 'live') {
      // Get match details
      const { data: match } = await supabase
        .from('matches')
        .select('team1_id, team2_id')
        .eq('id', matchId)
        .single();
        
      if (match && match.team1_id && match.team2_id) {
        await triggerMatchStartNotifications(matchId);
      }
    }
  }

  // Team assignment notifications
  static async handleTeamAssignment(tournamentId: string, teamId: string, userIds: string[]) {
    await triggerTeamAssignmentNotifications(tournamentId);
  }

  // Achievement notifications
  static async handleAchievementEarned(userId: string, achievementId: string) {
    await triggerAchievementEarnedNotifications(userId, achievementId);
  }

  // Check-in reminder scheduling
  static async scheduleCheckInReminders(tournamentId: string) {
    // This would ideally be handled by a scheduled job
    // For now, we can trigger it manually when check-in period starts
    await triggerCheckInReminderNotifications(tournamentId);
  }

  // Helper notification methods
  private static async notifyBalancingStarted(tournamentId: string) {
    try {
      const { data: tournament } = await supabase
        .from('tournaments')
        .select('name')
        .eq('id', tournamentId)
        .single();

      const { data: signups } = await supabase
        .from('tournament_signups')
        .select('user_id')
        .eq('tournament_id', tournamentId);

      if (tournament && signups) {
        for (const signup of signups) {
          await supabase
            .from('notifications')
            .insert({
              user_id: signup.user_id,
              type: 'tournament_balancing',
              title: 'Team Balancing Started',
              message: `Team balancing has started for ${tournament.name}. Teams will be assigned shortly!`,
              data: { tournamentId },
              tournament_id: tournamentId
            });
        }
      }
    } catch (error) {
      console.error('Error notifying balancing started:', error);
    }
  }

  private static async notifyTournamentCompleted(tournamentId: string) {
    try {
      const { data: tournament } = await supabase
        .from('tournaments')
        .select('name')
        .eq('id', tournamentId)
        .single();

      const { data: winnerTeam } = await supabase
        .from('teams')
        .select('name, id')
        .eq('tournament_id', tournamentId)
        .eq('status', 'winner')
        .single();

      const { data: signups } = await supabase
        .from('tournament_signups')
        .select('user_id')
        .eq('tournament_id', tournamentId);

      if (tournament && signups) {
        for (const signup of signups) {
          // Check if user was on winning team
          const { data: isWinner } = await supabase
            .from('team_members')
            .select('id')
            .eq('team_id', winnerTeam?.id)
            .eq('user_id', signup.user_id)
            .single();

          await supabase
            .from('notifications')
            .insert({
              user_id: signup.user_id,
              type: 'tournament_complete',
              title: isWinner ? 'Tournament Victory!' : 'Tournament Complete',
              message: isWinner 
                ? `Congratulations! You won ${tournament.name}!`
                : `${tournament.name} has ended. Winner: ${winnerTeam?.name || 'Unknown'}`,
              data: { 
                tournamentId, 
                isWinner: !!isWinner,
                winnerTeam: winnerTeam?.name 
              },
              tournament_id: tournamentId
            });
        }
      }
    } catch (error) {
      console.error('Error notifying tournament completed:', error);
    }
  }
}

// Hook into database changes via triggers or manual calls
export const initializeNotificationService = () => {
  console.log('Notification service initialized');
  
  // In a real implementation, you'd set up database triggers or webhooks
  // For now, this can be called manually when events occur
};