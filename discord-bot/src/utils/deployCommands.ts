import { REST, Routes, Client } from 'discord.js';
import { readdirSync } from 'fs';
import { join } from 'path';

export async function syncBotCommands(client: Client) {
  const commands = [];
  
  try {
    const commandsPath = join(__dirname, '..', 'commands');
    const commandFiles = readdirSync(commandsPath).filter(file => file.endsWith('.js') || file.endsWith('.ts'));

    for (const file of commandFiles) {
      const filePath = join(commandsPath, file);
      const command = require(filePath);
      
      if ('data' in command && 'execute' in command) {
        commands.push(command.data.toJSON());
      }
    }

    const rest = new REST().setToken(process.env.DISCORD_BOT_TOKEN!);

    console.log(`🔄 Started refreshing ${commands.length} application (/) commands.`);

    // Deploy commands globally or to specific guild
    const clientId = process.env.DISCORD_CLIENT_ID!;
    const guildId = process.env.DISCORD_GUILD_ID;

    if (guildId) {
      // Deploy to specific guild (faster for testing)
      await rest.put(
        Routes.applicationGuildCommands(clientId, guildId),
        { body: commands }
      );
      console.log(`✅ Successfully reloaded ${commands.length} guild commands.`);
    } else {
      // Deploy globally (takes up to 1 hour to propagate)
      await rest.put(
        Routes.applicationCommands(clientId),
        { body: commands }
      );
      console.log(`✅ Successfully reloaded ${commands.length} global commands.`);
    }

  } catch (error) {
    console.error('❌ Error deploying commands:', error);
  }
}