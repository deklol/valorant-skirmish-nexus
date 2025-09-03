import { Client, MessageFlags } from 'discord.js';  
import { readdirSync } from 'fs';
import { join } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export async function loadCommands(client: Client) {
  const commandsPath = join(__dirname, '..', 'commands');
  const commandFiles = readdirSync(commandsPath).filter(file => 
    (file.endsWith('.js') || file.endsWith('.ts')) && !file.endsWith('.d.ts')
  );

  for (const file of commandFiles) {
    const filePath = join(commandsPath, file);
    const fileURL = pathToFileURL(filePath).href;
    
    try {
      const commandModule = await import(fileURL);
      const command = commandModule.default;
      
      if ('data' in command && 'execute' in command) {
        client.commands.set(command.data.name, command);
        console.log(`✅ Loaded command: ${command.data.name}`);
      } else {
        console.log(`⚠️ Command at ${filePath} is missing required "data" or "execute" property.`);
      }
    } catch (error) {
      console.error(`❌ Error loading command ${file}:`, error);
    }
  }
  
  console.log(`📝 Loaded ${client.commands.size} commands`);
}

export const commandHandler = {
  async handle(interaction: any) {
    const command = interaction.client.commands.get(interaction.commandName);

    if (!command) {
      console.error(`No command matching ${interaction.commandName} was found.`);
      return;
    }

    try {
      await command.execute(interaction);
    } catch (error) {
      console.error(`Error executing ${interaction.commandName}:`, error);
      
      const errorMessage = {
        content: 'There was an error while executing this command!',
        flags: MessageFlags.Ephemeral
      };

      if (interaction.replied || interaction.deferred) {
        await interaction.followUp(errorMessage);
      } else {
        await interaction.reply(errorMessage);
      }
    }
  },

  async handleAutocomplete(interaction: any) {
    const command = interaction.client.commands.get(interaction.commandName);

    if (!command || !command.autocomplete) {
      return;
    }

    try {
      await command.autocomplete(interaction);
    } catch (error) {
      console.error(`Error handling autocomplete for ${interaction.commandName}:`, error);
    }
  }
};