import { SlashCommandBuilder } from 'discord.js';
import { db } from '../utils/supabase';
import { createUserProfileEmbed } from '../utils/embeds';
import { handleUserRegistration } from '../utils/userRegistration';

module.exports = {
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
      const { data: user, error } = await db.findUserByDiscordId(targetUser.id);
      
      if (error || !user) {
        if (isOwnProfile) {
          await interaction.deleteReply();
          await handleUserRegistration(interaction);
          return;
        } else {
          await interaction.editReply(`❌ User **${targetUser.username}** is not registered.`);
          return;
        }
      }
      
      // Get user statistics
      const stats = await db.getUserStats(user.id);
      
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