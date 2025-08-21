import { SlashCommandBuilder } from 'discord.js';
import { db } from '../utils/supabase';
import { createQuickMatchEmbed } from '../utils/embeds';
import { handleUserRegistration } from '../utils/userRegistration';

module.exports = {
  data: new SlashCommandBuilder()
    .setName('quickmatch')
    .setDescription('Join the quick match queue for instant 10-man games')
    .addSubcommand(subcommand =>
      subcommand
        .setName('queue')
        .setDescription('View or join the quick match queue'))
    .addSubcommand(subcommand =>
      subcommand
        .setName('leave')
        .setDescription('Leave the quick match queue'))
    .addSubcommand(subcommand =>
      subcommand
        .setName('status')
        .setDescription('Check current queue status')),

  async execute(interaction: any) {
    await interaction.deferReply();
    
    const subcommand = interaction.options.getSubcommand();
    
    try {
      // Check if user is registered
      const { data: user } = await db.findUserByDiscordId(interaction.user.id);
      
      if (!user && subcommand !== 'status') {
        await interaction.deleteReply();
        await handleUserRegistration(interaction);
        return;
      }
      
      switch (subcommand) {
        case 'queue':
          await handleQueueCommand(interaction, user);
          break;
          
        case 'leave':
          await handleLeaveCommand(interaction, user);
          break;
          
        case 'status':
          await handleStatusCommand(interaction);
          break;
      }
      
    } catch (error) {
      console.error('Quick match command error:', error);
      await interaction.editReply('❌ An error occurred while processing your request.');
    }
  },
};

async function handleQueueCommand(interaction: any, user: any) {
  // Add user to queue
  const { error } = await db.addToQuickMatchQueue(user.id);
  
  if (error) {
    // User might already be in queue, just show current status
    console.log('User might already be in queue');
  }
  
  // Show queue status
  const queueData = await db.getQuickMatchQueue();
  const { embed, components } = createQuickMatchEmbed(queueData);
  
  await interaction.editReply({
    embeds: [embed],
    components: [components]
  });
  
  if (!error) {
    await interaction.followUp({
      content: '✅ You have been added to the quick match queue!',
      ephemeral: true
    });
  }
}

async function handleLeaveCommand(interaction: any, user: any) {
  await db.removeFromQuickMatchQueue(user.id);
  
  await interaction.editReply({
    content: '✅ You have been removed from the quick match queue.'
  });
}

async function handleStatusCommand(interaction: any) {
  const queueData = await db.getQuickMatchQueue();
  const { embed, components } = createQuickMatchEmbed(queueData);
  
  await interaction.editReply({
    embeds: [embed],
    components: [components]
  });
}