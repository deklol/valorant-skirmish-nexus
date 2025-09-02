import cron from 'node-cron';
import { Client, TextChannel } from 'discord.js';
import { db, supabase } from './supabase.js';
import { createTournamentEmbed } from './embeds.js';

export function startCronJobs(client: Client) {
  console.log('⏰ Starting scheduled jobs...');
  
  // Check for tournaments starting registration every 5 minutes
  cron.schedule('*/5 * * * *', async () => {
    await checkTournamentRegistrationOpening(client);
  });
  
  // Check for check-in reminders every minute
  cron.schedule('* * * * *', async () => {
    await checkTournamentCheckInReminders(client);
  });
  
  // Clean up old quick match queue entries every hour
  cron.schedule('0 * * * *', async () => {
    await cleanupQuickMatchQueue();
  });
}

async function checkTournamentRegistrationOpening(client: Client) {
  try {
    const { data: tournaments } = await db.getActiveTournaments();
    
    if (!tournaments) return;
    
    const now = new Date();
    const channelId = process.env.TOURNAMENT_CHANNEL_ID;
    
    if (!channelId) return;
    
    for (const tournament of tournaments) {
      // Check if registration just opened (within last 5 minutes)
      const registrationStart = new Date(tournament.registration_opens_at);
      const timeDiff = now.getTime() - registrationStart.getTime();
      
      if (timeDiff > 0 && timeDiff < 5 * 60 * 1000 && tournament.status === 'open_registration') {
        const channel = client.channels.cache.get(channelId) as TextChannel;
        
        if (channel?.isTextBased()) {
          const embed = createTournamentEmbed(tournament, await db.getTournamentSignups(tournament.id));
          
          await channel.send({
            content: `🎮 **NEW TOURNAMENT REGISTRATION OPEN!** @here`,
            embeds: [embed.embed],
            components: [embed.components]
          });
        }
      }
    }
  } catch (error) {
    console.error('Error checking tournament registration:', error);
  }
}

async function checkTournamentCheckInReminders(client: Client) {
  try {
    const { data: tournaments } = await db.getActiveTournaments();
    
    if (!tournaments) return;
    
    const now = new Date();
    
    for (const tournament of tournaments) {
      if (tournament.status !== 'check_in' || !tournament.check_in_starts_at) continue;
      
      const checkInStart = new Date(tournament.check_in_starts_at);
      const timeDiff = checkInStart.getTime() - now.getTime();
      
      // Send reminder 30 minutes before check-in
      if (timeDiff > 0 && timeDiff < 30 * 60 * 1000) {
        const { data: signups } = await db.getTournamentSignups(tournament.id);
        
        if (signups) {
          for (const signup of signups) {
            if (!signup.is_checked_in) {
              try {
                const user = client.users.cache.get(signup.users.discord_id);
                if (user) {
                  await user.send({
                    embeds: [{
                      title: '⏰ Tournament Check-in Reminder',
                      description: `Check-in for **${tournament.name}** starts in 30 minutes!\n\nUse \`/checkin ${tournament.id}\` to check in when ready.`,
                      color: 0xFF9500,
                      timestamp: new Date().toISOString()
                    }]
                  });
                }
              } catch (error) {
                // User might have DMs disabled
                console.log(`Could not DM user ${signup.users.discord_username}`);
              }
            }
          }
        }
      }
    }
  } catch (error) {
    console.error('Error checking check-in reminders:', error);
  }
}

async function cleanupQuickMatchQueue() {
  try {
    // Remove users who have been in queue for more than 2 hours
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
    
    await supabase
      .from('quick_match_queue')
      .update({ is_active: false })
      .lt('joined_at', twoHoursAgo);
      
    console.log('🧹 Cleaned up old quick match queue entries');
  } catch (error) {
    console.error('Error cleaning up quick match queue:', error);
  }
}