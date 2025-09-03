import { commandHandler } from '../handlers/commandHandler.js';
import { handleButtonInteraction } from '../handlers/buttonHandler.js';
import { handleModalSubmit } from '../handlers/modalHandler.js';

export default {
  name: 'interactionCreate',
  async execute(interaction: any) {
    if (interaction.isCommand()) {
      await commandHandler.handle(interaction);
    } else if (interaction.isButton()) {
      await handleButtonInteraction(interaction);
    } else if (interaction.isModalSubmit()) {
      await handleModalSubmit(interaction);
    } else if (interaction.isAutocomplete()) {
      await commandHandler.handleAutocomplete(interaction);
    }
  },
};