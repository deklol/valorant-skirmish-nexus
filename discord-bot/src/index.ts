import { Client, Collection, GatewayIntentBits, Partials } from 'discord.js';
import dotenv from 'dotenv';
import { supabase } from './utils/supabase.js';
import { loadCommands } from './handlers/commandHandler.js';
import { loadEvents } from './handlers/eventHandler.js';
import { startCronJobs } from './utils/cronJobs.js';
import { syncBotCommands } from './utils/deployCommands.js';

dotenv.config();

// Create Discord client with necessary intents
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.DirectMessages
  ],
  partials: [
    Partials.Message,
    Partials.Channel,
    Partials.Reaction,
    Partials.User
  ]
});

// Add commands collection to client
declare module 'discord.js' {
  interface Client {
    commands: Collection<string, any>;
  }
}

client.commands = new Collection();

// Initialize bot
async function startBot() {
  try {
    console.log('🤖 Starting Tournament Discord Bot...');
    
    // Test Supabase connection
    const { data, error } = await supabase.from('tournaments').select('count').limit(1);
    if (error) {
      console.error('❌ Supabase connection failed:', error.message);
      process.exit(1);
    }
    console.log('✅ Supabase connection established');

    // Load commands and events
    await loadCommands(client);
    await loadEvents(client);
    
    // Login to Discord
    await client.login(process.env.DISCORD_BOT_TOKEN);
    
    console.log('🎉 Tournament Bot is online and ready!');
    
    // Sync slash commands (only run this once or when commands change)
    setTimeout(async () => {
      await syncBotCommands(client);
      console.log('🔄 Slash commands synced');
    }, 5000);
    
    // Start background jobs
    startCronJobs(client);
    
  } catch (error) {
    console.error('💥 Failed to start bot:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('👋 Shutting down bot gracefully...');
  client.destroy();
  process.exit(0);
});

process.on('unhandledRejection', (error) => {
  console.error('Unhandled promise rejection:', error);
});

// Start the bot
startBot();