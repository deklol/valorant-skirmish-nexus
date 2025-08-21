import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { db } from '../utils/supabase';
import { createTournamentEmbed } from '../utils/embeds';

module.exports = {
  data: new SlashCommandBuilder()
    .setName('tournaments')
    .setDescription('View active tournaments')
    .addStringOption(option =>
      option.setName('status')
        .setDescription('Filter tournaments by status')
        .setRequired(false)
        .addChoices(
          { name: 'Open Registration', value: 'open_registration' },
          { name: 'Check-in', value: 'check_in' },
          { name: 'In Progress', value: 'in_progress' },
          { name: 'All Active', value: 'all' }
        )),

  async execute(interaction: any) {
    await interaction.deferReply();
    
    try {
      const statusFilter = interaction.options.getString('status') || 'all';
      
      const { data: tournaments, error } = await db.getActiveTournaments();
      
      if (error) {
        await interaction.editReply('❌ Failed to fetch tournaments.');
        return;
      }
      
      if (!tournaments || tournaments.length === 0) {
        const embed = new EmbedBuilder()
          .setTitle('🏆 Tournaments')
          .setDescription('No active tournaments found.')
          .setColor(0x999999);
          
        await interaction.editReply({ embeds: [embed] });
        return;
      }
      
      // Filter tournaments if specific status requested
      let filteredTournaments = tournaments;
      if (statusFilter !== 'all') {
        filteredTournaments = tournaments.filter(t => t.status === statusFilter);
      }
      
      if (filteredTournaments.length === 0) {
        const embed = new EmbedBuilder()
          .setTitle('🏆 Tournaments')
          .setDescription(`No tournaments found with status: ${statusFilter}`)
          .setColor(0x999999);
          
        await interaction.editReply({ embeds: [embed] });
        return;
      }
      
      // Show tournaments (limit to 5 for display)
      const tournamentsToShow = filteredTournaments.slice(0, 5);
      
      for (const tournament of tournamentsToShow) {
        const signupsData = await db.getTournamentSignups(tournament.id);
        const { embed, components } = createTournamentEmbed(tournament, signupsData);
        
        await interaction.followUp({
          embeds: [embed],
          components: [components]
        });
      }
      
      if (filteredTournaments.length > 5) {
        await interaction.followUp({
          content: `📝 Showing first 5 of ${filteredTournaments.length} tournaments. Use filters to narrow results.`,
          ephemeral: true
        });
      }
      
      // Delete the "thinking" message
      await interaction.deleteReply();
      
    } catch (error) {
      console.error('Tournaments command error:', error);
      await interaction.editReply('❌ An error occurred while fetching tournaments.');
    }
  },
};