import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { QuickMatchManager } from '../utils/quickMatchManager';
import { getSupabase } from '../utils/supabase';
import { createQuickMatchEmbed } from '../utils/embeds';

export default {
  data: new SlashCommandBuilder()
    .setName('quick-match')
    .setDescription('Manage Quick Match lobbies')
    .addSubcommand(subcommand =>
      subcommand
        .setName('start')
        .setDescription('Start a new Quick Match lobby'))
    .addSubcommand(subcommand =>
      subcommand
        .setName('end')
        .setDescription('End the current Quick Match lobby')
        .addStringOption(option =>
          option.setName('session_id')
            .setDescription('Session ID to end (optional)')
            .setRequired(false)))
    .addSubcommand(subcommand =>
      subcommand
        .setName('clear')
        .setDescription('Clear the queue and end lobby'))
    .addSubcommand(subcommand =>
      subcommand
        .setName('status')
        .setDescription('Check current lobby status'))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

  async execute(interaction: any) {
    await interaction.deferReply();
    
    const subcommand = interaction.options.getSubcommand();
    const channelId = interaction.channel.id;
    
    try {
      switch (subcommand) {
        case 'start':
          await handleStartCommand(interaction, channelId);
          break;
          
        case 'end':
          await handleEndCommand(interaction, channelId);
          break;
          
        case 'clear':
          await handleClearCommand(interaction, channelId);
          break;
          
        case 'status':
          await handleStatusCommand(interaction, channelId);
          break;
      }
      
    } catch (error) {
      console.error('Quick match command error:', error);
      await interaction.editReply('❌ An error occurred while processing your request.');
    }
  },
};

async function handleStartCommand(interaction: any, channelId: string) {
  // Check if there's already an active session
  const existingSession = await QuickMatchManager.getActiveSession(channelId);
  
  if (existingSession) {
    await interaction.editReply({
      content: '⚠️ There is already an active Quick Match lobby in this channel.',
      ephemeral: true
    });
    return;
  }

  // Create new session
  const session = await QuickMatchManager.createSession(channelId, interaction.user.id);
  
  // Get current queue
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
  
  // Create initial embed
  const { embed, components } = createQuickMatchEmbed(queueData, session);
  
  // Send lobby message
  const message = await interaction.editReply({
    embeds: [embed],
    components: components
  });

  // Update session with message ID
  await QuickMatchManager.updateSession(session.id, {
    discord_message_id: message.id
  });

  console.log(`✅ Quick Match lobby started in channel ${channelId}, session ${session.id}`);
}

async function handleEndCommand(interaction: any, channelId: string) {
  const sessionId = interaction.options.getString('session_id');
  
  let session;
  if (sessionId) {
    session = { id: sessionId };
  } else {
    session = await QuickMatchManager.getActiveSession(channelId);
  }
  
  if (!session) {
    await interaction.editReply({
      content: '❌ No active Quick Match lobby found in this channel.',
      ephemeral: true
    });
    return;
  }

  // Cancel the session
  await QuickMatchManager.cancelSession(session.id);
  
  await interaction.editReply({
    content: '✅ Quick Match lobby has been ended.',
    ephemeral: true
  });

  console.log(`✅ Quick Match lobby ended in channel ${channelId}, session ${session.id}`);
}

async function handleClearCommand(interaction: any, channelId: string) {
  // Clear the queue
  await getSupabase().from('quick_match_queue').update({ is_active: false }).eq('is_active', true);
  
  // End any active session
  const session = await QuickMatchManager.getActiveSession(channelId);
  if (session) {
    await QuickMatchManager.cancelSession(session.id);
  }
  
  await interaction.editReply({
    content: '✅ Queue cleared and lobby ended.',
    ephemeral: true
  });

  console.log(`✅ Queue cleared and lobby ended in channel ${channelId}`);
}

async function handleStatusCommand(interaction: any, channelId: string) {
  const session = await QuickMatchManager.getActiveSession(channelId);
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
  
  const { embed, components } = createQuickMatchEmbed(queueData, session);
  
  await interaction.editReply({
    embeds: [embed],
    components: components
  });
}