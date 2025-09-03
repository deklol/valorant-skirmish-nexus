import { REST, Routes, Client } from 'discord.js';
import { readdirSync } from 'fs';
import { join } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export async function syncBotCommands(client: Client) {
  const commands = [];
  
  try {
    const commandsPath = join(__dirname, '..', 'commands');
    const commandFiles = readdirSync(commandsPath).filter(file => 
      file.endsWith('.js') && !file.endsWith('.d.ts')
    );

    for (const file of commandFiles) {
      const filePath = join(commandsPath, file);
      const fileURL = pathToFileURL(filePath).href;
      
      try {
        const commandModule = await import(fileURL);
        const command = commandModule.default;
        
        if ('data' in command && 'execute' in command) {
          commands.push(command.data.toJSON());
        }
      } catch (importError) {
        console.error(`❌ Error importing command ${file}:`, importError);
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