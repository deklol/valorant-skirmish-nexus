import { SlashCommandBuilder } from 'discord.js';
import { getSupabase } from '../utils/supabase';
import { createLeaderboardEmbed } from '../utils/embeds';

export default {
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
      
      const { data, error } = await getSupabase()
        .from('users')
        .select('id, discord_username, current_rank, rank_points, tournaments_won, tournaments_played, wins, losses')
        .eq('is_phantom', false)
        .order('tournaments_won', { ascending: false })
        .order('wins', { ascending: false })
        .limit(limit);
      
      const leaderboardData = { data, error };
      
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