import { Events, Client, ActivityType } from 'discord.js';

export default {
  name: Events.ClientReady,
  once: true,
  execute(client: Client) {
    console.log(`🤖 ${client.user?.tag} is now online!`);
    
    // Set bot status
    client.user?.setActivity('Tournament matches', { 
      type: ActivityType.Watching 
    });
    
    // Log guild information
    console.log(`🏠 Connected to ${client.guilds.cache.size} server(s)`);
    client.guilds.cache.forEach(guild => {
      console.log(`  - ${guild.name} (${guild.memberCount} members)`);
    });
  },
};