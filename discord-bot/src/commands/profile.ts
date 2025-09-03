import { SlashCommandBuilder } from 'discord.js';
import { getSupabase } from '../utils/supabase.js';
import { createUserProfileEmbed } from '../utils/embeds.js';
import { handleUserRegistration } from '../utils/userRegistration.js';

export default {
  data: new SlashCommandBuilder()
    .setName('profile')
    .setDescription('View your tournament profile and statistics')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('View another user\'s profile')
        .setRequired(false)),

  async execute(interaction: any) {
    await interaction.deferReply();
    
    const targetUser = interaction.options.getUser('user') || interaction.user;
    const isOwnProfile = targetUser.id === interaction.user.id;
    
    try {
      // Find user in database
      const { data: user, error } = await getSupabase()
        .from('users')
        .select('*')
        .eq('discord_id', targetUser.id)
        .maybeSingle();
      
      if (error || !user) {
        if (isOwnProfile) {
          await handleUserRegistration(interaction);
          return;
        } else {
          await interaction.editReply(`❌ User **${targetUser.username}** is not registered.`);
          return;
        }
      }
      
      // Get user statistics
      const { data: stats } = await getSupabase()
        .from('users')
        .select('wins, losses, tournaments_played, tournaments_won, current_rank, peak_rank, weight_rating')
        .eq('id', user.id)
        .single();
      
      // Create and send profile embed
      const embed = createUserProfileEmbed(user, stats);
      
      // Add additional info for own profile
      if (isOwnProfile) {
        embed.addFields([
          {
            name: '💡 Tip',
            value: 'Use `/update-profile` to change your rank information or `/update-riot-id` to change your Riot ID.',
            inline: false
          }
        ]);
      }
      
      await interaction.editReply({ embeds: [embed] });
      
    } catch (error) {
      console.error('Profile command error:', error);
      await interaction.editReply('❌ An error occurred while fetching the profile.');
    }
  },
};