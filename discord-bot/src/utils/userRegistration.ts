import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } from 'discord.js';
import { getSupabase } from './supabase.js';

export async function handleUserRegistration(interaction: any) {
  // Check if user already exists
  const { data: existingUser } = await getSupabase()
    .from('users')
    .select('*')
    .eq('discord_id', interaction.user.id)
    .maybeSingle();

  if (existingUser) {
    return await interaction.reply({
      content: '✅ You are already registered!',
      flags: MessageFlags.Ephemeral
    });
  }

  // Create registration embed
  const embed = new EmbedBuilder()
    .setTitle('🎮 Tournament Registration')
    .setDescription('Welcome to the tournament system! Click the button below to register and start participating in tournaments.')
    .setColor(0x00AE86)
    .addFields([
      {
        name: '📋 What happens next?',
        value: '• You\'ll be registered in our system\n• You can sign up for tournaments\n• Update your rank and Riot ID\n• Track your tournament history',
        inline: false
      }
    ]);

  const button = new ActionRowBuilder<ButtonBuilder>()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('register_confirm')
        .setLabel('Register Now')
        .setStyle(ButtonStyle.Success)
        .setEmoji('✅')
    );

  // If this is a button interaction, reply normally
  if (interaction.isButton()) {
    if (interaction.customId === 'register_confirm') {
      await registerUser(interaction);
      return;
    }
    
    await interaction.reply({
      embeds: [embed],
      components: [button],
      flags: MessageFlags.Ephemeral
    });
  } else {
    // For other interactions, reply with registration prompt
    await interaction.reply({
      embeds: [embed],
      components: [button],
      flags: MessageFlags.Ephemeral
    });
  }
}

async function registerUser(interaction: any) {
  try {
    const userData = {
      discord_id: interaction.user.id,
      discord_username: interaction.user.username,
      discord_display_name: interaction.user.displayName || interaction.user.username,
      discord_avatar_url: interaction.user.displayAvatarURL(),
      current_rank: 'Unranked',
      peak_rank: 'Unranked',
      weight_rating: 150, // Default weight
      is_phantom: false,
      registration_date: new Date().toISOString()
    };

    const { data: newUser, error } = await getSupabase()
      .from('users')
      .insert(userData)
      .select()
      .single();

    if (error) {
      throw error;
    }

    const successEmbed = new EmbedBuilder()
      .setTitle('✅ Registration Successful!')
      .setDescription(`Welcome to the tournament system, **${interaction.user.username}**!`)
      .setColor(0x00FF00)
      .addFields([
        {
          name: '🎯 Next Steps',
          value: '• Use `/update-profile` to set your rank and Riot ID\n• Use `/tournaments` to see available tournaments\n• Use `/profile` to view your tournament stats',
          inline: false
        }
      ]);

    await interaction.update({
      embeds: [successEmbed],
      components: []
    });

  } catch (error) {
    console.error('Registration error:', error);
    
    const errorEmbed = new EmbedBuilder()
      .setTitle('❌ Registration Failed')
      .setDescription('There was an error registering your account. Please try again later.')
      .setColor(0xFF0000);

    await interaction.update({
      embeds: [errorEmbed],
      components: []
    });
  }
}