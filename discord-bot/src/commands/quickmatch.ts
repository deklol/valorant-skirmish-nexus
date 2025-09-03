import { SlashCommandBuilder } from 'discord.js';
import { getSupabase } from '../utils/supabase.js';
import { createQuickMatchEmbed } from '../utils/embeds.js';
import { handleUserRegistration } from '../utils/userRegistration.js';

export default {
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
      const { data: user } = await getSupabase().from('users').select('*').eq('discord_id', interaction.user.id).maybeSingle();
      
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
  const { error } = await getSupabase().from('quick_match_queue').upsert({
    user_id: user.id,
    joined_at: new Date().toISOString(),
    is_active: true
  });
  
  if (error) {
    // User might already be in queue, just show current status
    console.log('User might already be in queue');
  }
  
  // Show queue status
  const queueData = await getSupabase().from('quick_match_queue').select(`
    *,
    users!inner(
      id,
      discord_username, 
      discord_id, 
      current_rank, 
      peak_rank,
      weight_rating,
      manual_rank_override,
      manual_weight_override,
      use_manual_override,
      tournaments_won,
      last_tournament_win
    )
  `).eq('is_active', true).order('joined_at', { ascending: true });
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
  await getSupabase().from('quick_match_queue').update({ is_active: false }).eq('user_id', user.id);
  
  await interaction.editReply({
    content: '✅ You have been removed from the quick match queue.'
  });
}

async function handleStatusCommand(interaction: any) {
  const queueData = await getSupabase().from('quick_match_queue').select(`
    *,
    users!inner(
      id,
      discord_username, 
      discord_id, 
      current_rank, 
      peak_rank,
      weight_rating,
      manual_rank_override,
      manual_weight_override,
      use_manual_override,
      tournaments_won,
      last_tournament_win
    )
  `).eq('is_active', true).order('joined_at', { ascending: true });
  const { embed, components } = createQuickMatchEmbed(queueData);
  
  await interaction.editReply({
    embeds: [embed],
    components: [components]
  });
}