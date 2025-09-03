import { Client } from 'discord.js';
import { readdirSync } from 'fs';
import { join } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export async function loadEvents(client: Client) {
  const eventsPath = join(__dirname, '..', 'events');
  const eventFiles = readdirSync(eventsPath).filter(file => 
    file.endsWith('.js') && !file.endsWith('.d.ts')
  );

  for (const file of eventFiles) {
    const filePath = join(eventsPath, file);
    const fileURL = pathToFileURL(filePath).href;
    
    try {
      const eventModule = await import(fileURL);
      const event = eventModule.default;
      
      if (event.once) {
        client.once(event.name, (...args) => event.execute(...args));
      } else {
        client.on(event.name, (...args) => event.execute(...args));
      }
      
      console.log(`✅ Loaded event: ${event.name}`);
    } catch (error) {
      console.error(`❌ Error loading event ${file}:`, error);
    }
  }
  
  console.log(`🎭 Loaded ${eventFiles.length} events`);
}