/**
 * Tournament Button Interaction Handler
 */
import { getSupabase } from '../utils/supabase.js';
import { createTournamentEmbed } from '../utils/embeds.js';
import { handleUserRegistration } from '../utils/userRegistration.js';
import { EmbedBuilder, MessageFlags } from 'discord.js';

export async function handleTournamentButton(interaction: any, customId: string, channelId: string, userId: string) {
  const [action, tournamentId] = customId.split('_');
  
  console.log(`🏆 Tournament button interaction: ${action} for tournament ${tournamentId} from user ${userId}`);

  try {
    switch (action) {
      case 'signup':
        await handleTournamentSignup(interaction, tournamentId, userId);
        break;
        
      case 'withdraw':
        await handleTournamentWithdraw(interaction, tournamentId, userId);
        break;
        
      case 'refresh':
        await handleTournamentRefresh(interaction, tournamentId);
        break;
    }
  } catch (error) {
    console.error('Tournament button interaction error:', error);
    
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({
        content: '❌ An error occurred while processing your request.',
        flags: MessageFlags.Ephemeral
      });
    }
  }
}

async function handleTournamentSignup(interaction: any, tournamentId: string, userId: string) {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  // Check if user is registered
  const { data: user } = await getSupabase()
    .from('users')
    .select('*')
    .eq('discord_id', userId)
    .maybeSingle();
    
  if (!user) {
    await interaction.editReply({
      content: '⚠️ You need to register first. Please use `/profile` or `/update-profile` to get started.',
    });
    return;
  }

  // Get tournament info
  const { data: tournament } = await getSupabase()
    .from('tournaments')
    .select('*')
    .eq('id', tournamentId)
    .maybeSingle();
    
  if (!tournament) {
    await interaction.editReply('❌ Tournament not found.');
    return;
  }

  // Check if registration is open
  if (tournament.status !== 'open') {
    await interaction.editReply('❌ Registration is not currently open for this tournament.');
    return;
  }

  // Check if already signed up
  const { data: existingSignup } = await getSupabase()
    .from('tournament_signups')
    .select('id')
    .eq('user_id', user.id)
    .eq('tournament_id', tournament.id)
    .maybeSingle();
    
  if (existingSignup) {
    await interaction.editReply('❌ You are already signed up for this tournament.');
    return;
  }

  // Check if tournament is full
  const { data: signups } = await getSupabase()
    .from('tournament_signups')
    .select(`
      *,
      users!inner(discord_username, current_rank, riot_id)
    `)
    .eq('tournament_id', tournament.id);
    
  if (signups && signups.length >= tournament.max_players) {
    await interaction.editReply('❌ This tournament is full.');
    return;
  }

  // Sign up user
  const { error } = await getSupabase()
    .from('tournament_signups')
    .insert({
      user_id: user.id,
      tournament_id: tournament.id,
      signed_up_at: new Date().toISOString()
    });

  if (error) {
    await interaction.editReply('❌ Failed to sign up for tournament. Please try again.');
    return;
  }

  // Update the original tournament message
  await updateTournamentMessage(interaction, tournament);

  await interaction.editReply('✅ Successfully signed up for the tournament!');
}

async function handleTournamentWithdraw(interaction: any, tournamentId: string, userId: string) {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  // Check if user is registered
  const { data: user } = await getSupabase()
    .from('users')
    .select('*')
    .eq('discord_id', userId)
    .maybeSingle();
    
  if (!user) {
    await interaction.editReply('❌ User not found.');
    return;
  }

  // Get tournament info
  const { data: tournament } = await getSupabase()
    .from('tournaments')
    .select('*')
    .eq('id', tournamentId)
    .maybeSingle();
    
  if (!tournament) {
    await interaction.editReply('❌ Tournament not found.');
    return;
  }

  // Check if user is signed up
  const { data: existingSignup } = await getSupabase()
    .from('tournament_signups')
    .select('id')
    .eq('user_id', user.id)
    .eq('tournament_id', tournament.id)
    .maybeSingle();
    
  if (!existingSignup) {
    await interaction.editReply('❌ You are not signed up for this tournament.');
    return;
  }

  // Withdraw user
  const { error } = await getSupabase()
    .from('tournament_signups')
    .delete()
    .eq('user_id', user.id)
    .eq('tournament_id', tournament.id);

  if (error) {
    await interaction.editReply('❌ Failed to withdraw from tournament. Please try again.');
    return;
  }

  // Update the original tournament message
  await updateTournamentMessage(interaction, tournament);

  await interaction.editReply('✅ Successfully withdrawn from the tournament.');
}

async function handleTournamentRefresh(interaction: any, tournamentId: string) {
  await interaction.deferUpdate();

  // Get tournament info
  const { data: tournament } = await getSupabase()
    .from('tournaments')
    .select('*')
    .eq('id', tournamentId)
    .maybeSingle();
    
  if (!tournament) {
    return;
  }

  // Update the tournament message
  await updateTournamentMessage(interaction, tournament);
}

async function updateTournamentMessage(interaction: any, tournament: any) {
  try {
    // Get updated signup data
    const { data: signupsData } = await getSupabase()
      .from('tournament_signups')
      .select(`
        *,
        users!inner(discord_username, current_rank, riot_id)
      `)
      .eq('tournament_id', tournament.id);

    const { embed, components } = createTournamentEmbed(tournament, signupsData);
    
    // Update the original message
    if (interaction.message) {
      await interaction.message.edit({
        embeds: [embed],
        components: [components]
      });
    }
  } catch (error) {
    console.error('Error updating tournament message:', error);
  }
}