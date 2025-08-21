import { SlashCommandBuilder } from 'discord.js';
import { db } from '../utils/supabase';
import { createLeaderboardEmbed } from '../utils/embeds';

module.exports = {
  data: new SlashCommandBuilder()
    .setName('leaderboard')
    .setDescription('View the tournament leaderboard')
    .addIntegerOption(option =>
      option.setName('limit')
        .setDescription('Number of players to show (default: 10)')
        .setRequired(false)
        .setMinValue(5)
        .setMaxValue(25)),

  async execute(interaction: any) {
    await interaction.deferReply();
    
    try {
      const limit = interaction.options.getInteger('limit') || 10;
      
      const leaderboardData = await db.getLeaderboard(limit);
      
      if (!leaderboardData.data || leaderboardData.data.length === 0) {
        await interaction.editReply('❌ No players found in the leaderboard.');
        return;
      }
      
      const embed = createLeaderboardEmbed(leaderboardData);
      
      embed.setFooter({ 
        text: `Showing top ${leaderboardData.data.length} players • Rankings update in real-time` 
      });
      
      await interaction.editReply({ embeds: [embed] });
      
    } catch (error) {
      console.error('Leaderboard command error:', error);
      await interaction.editReply('❌ An error occurred while fetching the leaderboard.');
    }
  },
};