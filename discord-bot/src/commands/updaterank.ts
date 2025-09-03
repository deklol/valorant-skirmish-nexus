import { SlashCommandBuilder, EmbedBuilder, MessageFlags } from 'discord.js';
import { getSupabase } from '../utils/supabase.js';
import { handleUserRegistration } from '../utils/userRegistration.js';

export default {
  data: new SlashCommandBuilder()
    .setName('updaterank')
    .setDescription('Update your current rank by scraping your Riot account'),

  async execute(interaction: any) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    
    try {
      // Check if user is registered
      const { data: user } = await getSupabase()
        .from('users')
        .select('*')
        .eq('discord_id', interaction.user.id)
        .maybeSingle();
      
      if (!user) {
        await handleUserRegistration(interaction);
        return;
      }

      // Check if user has Riot ID
      if (!user.riot_id) {
        await interaction.editReply('❌ You need to set your Riot ID first. Use `/update-profile riot_id:YourName#1234` to add it.');
        return;
      }

      const loadingEmbed = new EmbedBuilder()
        .setTitle('🔄 Updating Rank...')
        .setDescription('Scraping your current rank from Riot servers. This may take a moment.')
        .setColor(0xFF9500);

      await interaction.editReply({ embeds: [loadingEmbed] });

      // Call the scrape-rank function
      const { data: scrapeResult, error: scrapeError } = await getSupabase().functions.invoke('scrape-rank', {
        body: {
          riot_id: user.riot_id,
          user_id: user.id
        }
      });

      if (scrapeError || !scrapeResult?.success) {
        const errorEmbed = new EmbedBuilder()
          .setTitle('❌ Rank Update Failed')
          .setDescription(`Failed to scrape rank data: ${scrapeError?.message || scrapeResult?.error || 'Unknown error'}`)
          .setColor(0xFF0000);

        await interaction.editReply({ embeds: [errorEmbed] });
        return;
      }

      // Get updated user data
      const { data: updatedUser } = await getSupabase()
        .from('users')
        .select('current_rank, weight_rating, peak_rank')
        .eq('id', user.id)
        .single();

      const successEmbed = new EmbedBuilder()
        .setTitle('✅ Rank Updated Successfully!')
        .setDescription('Your rank has been scraped and updated from your Riot account.')
        .setColor(0x00FF00)
        .addFields([
          {
            name: '🏆 Current Rank',
            value: scrapeResult.current_rank || 'Unrated',
            inline: true
          },
          {
            name: '⚖️ Weight Rating',
            value: scrapeResult.weight_rating?.toString() || '150',
            inline: true
          },
          {
            name: '🎯 Riot ID',
            value: user.riot_id,
            inline: true
          }
        ]);

      if (scrapeResult.peak_rank_updated) {
        successEmbed.addFields([
          {
            name: '🌟 Peak Rank Updated!',
            value: `New peak rank: ${scrapeResult.current_rank}`,
            inline: false
          }
        ]);
      }

      await interaction.editReply({ embeds: [successEmbed] });
      
    } catch (error) {
      console.error('Update rank command error:', error);
      
      const errorEmbed = new EmbedBuilder()
        .setTitle('❌ Error')
        .setDescription('An error occurred while updating your rank. Please try again later.')
        .setColor(0xFF0000);

      await interaction.editReply({ embeds: [errorEmbed] });
    }
  },
};