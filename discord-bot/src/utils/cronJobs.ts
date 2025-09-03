import cron from 'node-cron';
import { Client, TextChannel } from 'discord.js';
import { getSupabase } from './supabase.js';
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
  
  // Check for day-of tournament reminders every minute
  cron.schedule('* * * * *', async () => {
    await checkDayOfTournamentReminders(client);
  });
}

async function checkTournamentRegistrationOpening(client: Client) {
  try {
    const { data: tournaments } = await getSupabase()
      .from('tournaments')
      .select('*')
      .in('status', ['open', 'live', 'balancing'])
      .order('start_time', { ascending: true });
    
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
          const { data: signups } = await getSupabase()
            .from('tournament_signups')
            .select(`
              *,
              users!inner(discord_username, current_rank, riot_id)
            `)
            .eq('tournament_id', tournament.id);
          const embed = createTournamentEmbed(tournament, signups || []);
          
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
    const { data: tournaments } = await getSupabase()
      .from('tournaments')
      .select('*')
      .in('status', ['open', 'live', 'balancing'])
      .order('start_time', { ascending: true });
    
    if (!tournaments) return;
    
    const now = new Date();
    
    for (const tournament of tournaments) {
      if (tournament.status !== 'check_in' || !tournament.check_in_starts_at) continue;
      
      const checkInStart = new Date(tournament.check_in_starts_at);
      const timeDiff = checkInStart.getTime() - now.getTime();
      
      // Send reminder 30 minutes before check-in
      if (timeDiff > 0 && timeDiff < 30 * 60 * 1000) {
        const { data: signups } = await getSupabase()
          .from('tournament_signups')
          .select(`
            *,
            users!inner(discord_username, discord_id, current_rank, riot_id)
          `)
          .eq('tournament_id', tournament.id);
        
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

async function checkDayOfTournamentReminders(client: Client) {
  try {
    const now = new Date();
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Get tournaments scheduled for today that haven't sent day-of reminders
    const { data: tournaments } = await getSupabase()
      .from('tournaments')
      .select('*')
      .gte('start_time', today.toISOString())
      .lt('start_time', tomorrow.toISOString())
      .eq('day_of_reminder_sent', false)
      .in('status', ['open', 'check_in', 'live', 'balancing']);

    if (!tournaments || tournaments.length === 0) return;

    for (const tournament of tournaments) {
      const tournamentDate = new Date(tournament.start_time);
      
      // Calculate reminder time: 2:00 PM on tournament day
      const reminderTime = new Date(tournamentDate);
      reminderTime.setHours(14, 0, 0, 0); // 2:00 PM exact
      
      // Account for the -1 hour adjustment (same as in embeds.ts)
      const adjustedReminderTime = new Date(reminderTime.getTime() - 3600000); // -1 hour
      
      // Check if current time is within 1 minute of reminder time
      const timeDiff = Math.abs(now.getTime() - adjustedReminderTime.getTime());
      const isReminderTime = timeDiff < 60000; // Within 1 minute
      
      if (isReminderTime) {
        console.log(`🎮 Sending day-of reminders for tournament: ${tournament.name}`);
        
        // Get registered users with Discord IDs
        const { data: signedUpUsers } = await getSupabase()
          .from('tournament_signups')
          .select(`
            *,
            users!inner(discord_id, discord_username)
          `)
          .eq('tournament_id', tournament.id)
          .not('users.discord_id', 'is', null);

        if (signedUpUsers && signedUpUsers.length > 0) {
          let sentCount = 0;
          
          for (const signup of signedUpUsers) {
            try {
              const user = client.users.cache.get(signup.users.discord_id);
              if (user) {
                await user.send({
                  embeds: [{
                    title: '🎮 Tournament Day Reminder',
                    description: `Tournament check-in is happening TODAY!\n\n` +
                                `🌐 **Check in here:** https://tlrhub.pro/tournament/${tournament.id}\n\n` +
                                `⏰ **Important:** Make sure to check in on the website before the tournament starts.\n\n` +
                                `❓ **Need help?** Contact the tournament admins (do not reply to this bot).`,
                    color: 0xFF9500,
                    fields: [
                      {
                        name: '🏆 Tournament',
                        value: tournament.name,
                        inline: false
                      }
                    ],
                    footer: {
                      text: 'TLR Hub Tournament System'
                    },
                    timestamp: new Date().toISOString()
                  }]
                });
                
                sentCount++;
                console.log(`✅ Sent day-of reminder to ${signup.users.discord_username}`);
                
                // 10-second delay between DMs to avoid rate limits
                if (sentCount < signedUpUsers.length) {
                  await new Promise(resolve => setTimeout(resolve, 10000));
                }
              }
            } catch (error) {
              // User might have DMs disabled
              console.log(`❌ Could not send day-of reminder to ${signup.users.discord_username}: ${error instanceof Error ? error.message : String(error)}`);
            }
          }
          
          console.log(`📊 Day-of reminders sent: ${sentCount}/${signedUpUsers.length} for tournament ${tournament.name}`);
        }
        
        // Mark reminder as sent
        await getSupabase()
          .from('tournaments')
          .update({ day_of_reminder_sent: true })
          .eq('id', tournament.id);
          
        console.log(`✅ Marked day-of reminder as sent for tournament: ${tournament.name}`);
      }
    }
  } catch (error) {
    console.error('Error checking day-of tournament reminders:', error);
  }
}

async function cleanupQuickMatchQueue() {
  try {
    // Remove users who have been in queue for more than 2 hours
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
    
    const { error } = await getSupabase()
      .from('quick_match_queue')
      .update({ is_active: false })
      .lt('joined_at', twoHoursAgo);
      
    console.log('🧹 Cleaned up old quick match queue entries');
  } catch (error) {
    console.error('Error cleaning up quick match queue:', error);
  }
}