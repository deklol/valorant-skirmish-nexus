import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { getSupabase } from '../utils/supabase.js';
import { createTournamentEmbed } from '../utils/embeds.js';

export default {
  data: new SlashCommandBuilder()
    .setName('tournaments')
    .setDescription('View active tournaments')
    .addStringOption(option =>
      option.setName('status')
        .setDescription('Filter tournaments by status')
        .setRequired(false)
        .addChoices(
          { name: 'Open Registration', value: 'open' },
          { name: 'Live/Active', value: 'live' },
          { name: 'Balancing', value: 'balancing' },
          { name: 'All Active', value: 'all' }
        )),

  async execute(interaction: any) {
    await interaction.deferReply();
    
    try {
      const statusFilter = interaction.options.getString('status') || 'all';
      
      const { data: tournaments, error } = await getSupabase()
        .from('tournaments')
        .select('*')
        .in('status', ['open', 'live', 'balancing'])
        .order('start_time', { ascending: true });
      
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
        filteredTournaments = tournaments.filter((t: any) => t.status === statusFilter);
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
        const { data: signupsData } = await getSupabase()
          .from('tournament_signups')
          .select(`
            *,
            users!inner(discord_username, current_rank, riot_id)
          `)
          .eq('tournament_id', tournament.id);
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