import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { db, supabase } from '../utils/supabase';
import { handleUserRegistration } from '../utils/userRegistration';

export default {
  data: new SlashCommandBuilder()
    .setName('update-profile')
    .setDescription('Update your tournament profile information')
    .addStringOption(option =>
      option.setName('current_rank')
        .setDescription('Your current competitive rank')
        .setRequired(false)
        .addChoices(
          { name: 'Iron 1', value: 'Iron 1' },
          { name: 'Iron 2', value: 'Iron 2' },
          { name: 'Iron 3', value: 'Iron 3' },
          { name: 'Bronze 1', value: 'Bronze 1' },
          { name: 'Bronze 2', value: 'Bronze 2' },
          { name: 'Bronze 3', value: 'Bronze 3' },
          { name: 'Silver 1', value: 'Silver 1' },
          { name: 'Silver 2', value: 'Silver 2' },
          { name: 'Silver 3', value: 'Silver 3' },
          { name: 'Gold 1', value: 'Gold 1' },
          { name: 'Gold 2', value: 'Gold 2' },
          { name: 'Gold 3', value: 'Gold 3' },
          { name: 'Platinum 1', value: 'Platinum 1' },
          { name: 'Platinum 2', value: 'Platinum 2' },
          { name: 'Platinum 3', value: 'Platinum 3' },
          { name: 'Diamond 1', value: 'Diamond 1' },
          { name: 'Diamond 2', value: 'Diamond 2' },
          { name: 'Diamond 3', value: 'Diamond 3' },
          { name: 'Ascendant 1', value: 'Ascendant 1' },
          { name: 'Ascendant 2', value: 'Ascendant 2' },
          { name: 'Ascendant 3', value: 'Ascendant 3' },
          { name: 'Immortal 1', value: 'Immortal 1' },
          { name: 'Immortal 2', value: 'Immortal 2' },
          { name: 'Immortal 3', value: 'Immortal 3' },
          { name: 'Radiant', value: 'Radiant' }
        ))
    .addStringOption(option =>
      option.setName('peak_rank')
        .setDescription('Your highest achieved rank')
        .setRequired(false)
        .addChoices(
          { name: 'Iron 1', value: 'Iron 1' },
          { name: 'Iron 2', value: 'Iron 2' },
          { name: 'Iron 3', value: 'Iron 3' },
          { name: 'Bronze 1', value: 'Bronze 1' },
          { name: 'Bronze 2', value: 'Bronze 2' },
          { name: 'Bronze 3', value: 'Bronze 3' },
          { name: 'Silver 1', value: 'Silver 1' },
          { name: 'Silver 2', value: 'Silver 2' },
          { name: 'Silver 3', value: 'Silver 3' },
          { name: 'Gold 1', value: 'Gold 1' },
          { name: 'Gold 2', value: 'Gold 2' },
          { name: 'Gold 3', value: 'Gold 3' },
          { name: 'Platinum 1', value: 'Platinum 1' },
          { name: 'Platinum 2', value: 'Platinum 2' },
          { name: 'Platinum 3', value: 'Platinum 3' },
          { name: 'Diamond 1', value: 'Diamond 1' },
          { name: 'Diamond 2', value: 'Diamond 2' },
          { name: 'Diamond 3', value: 'Diamond 3' },
          { name: 'Ascendant 1', value: 'Ascendant 1' },
          { name: 'Ascendant 2', value: 'Ascendant 2' },
          { name: 'Ascendant 3', value: 'Ascendant 3' },
          { name: 'Immortal 1', value: 'Immortal 1' },
          { name: 'Immortal 2', value: 'Immortal 2' },
          { name: 'Immortal 3', value: 'Immortal 3' },
          { name: 'Radiant', value: 'Radiant' }
        ))
    .addStringOption(option =>
      option.setName('riot_id')
        .setDescription('Your Riot ID (e.g., PlayerName#1234)')
        .setRequired(false)),

  async execute(interaction: any) {
    await interaction.deferReply({ ephemeral: true });
    
    try {
      // Check if user is registered
      const { data: user } = await db.findUserByDiscordId(interaction.user.id);
      
      if (!user) {
        await interaction.deleteReply();
        await handleUserRegistration(interaction);
        return;
      }
      
      const currentRank = interaction.options.getString('current_rank');
      const peakRank = interaction.options.getString('peak_rank');
      const riotId = interaction.options.getString('riot_id');
      
      // Validate Riot ID if provided
      if (riotId && !isValidRiotId(riotId)) {
        await interaction.editReply('❌ Invalid Riot ID format. Please use the format: PlayerName#1234');
        return;
      }
      
      // Build update object
      const updates: any = {};
      if (currentRank) updates.current_rank = currentRank;
      if (peakRank) updates.peak_rank = peakRank;
      if (riotId) updates.riot_id = riotId;
      
      if (Object.keys(updates).length === 0) {
        await interaction.editReply('❌ Please provide at least one field to update.');
        return;
      }
      
      // Update user profile
      const { data: updatedUser, error } = await db.updateUser(interaction.user.id, updates);
      
      if (error) {
        await interaction.editReply('❌ Failed to update profile. Please try again.');
        return;
      }
      
      // Try to scrape new rank data if Riot ID was updated
      if (riotId) {
        try {
          await supabase.functions.invoke('scrape-rank', {
            body: {
              riot_id: riotId,
              user_id: user.id
            }
          });
        } catch (scrapeError) {
          console.log('Rank scraping failed after update:', scrapeError);
        }
      }
      
      const embed = new EmbedBuilder()
        .setTitle('✅ Profile Updated!')
        .setDescription('Your tournament profile has been successfully updated.')
        .setColor(0x00FF00);
      
      const updatedFields = [];
      if (currentRank) updatedFields.push(`**Current Rank:** ${currentRank}`);
      if (peakRank) updatedFields.push(`**Peak Rank:** ${peakRank}`);
      if (riotId) updatedFields.push(`**Riot ID:** ${riotId}`);
      
      if (updatedFields.length > 0) {
        embed.addFields([
          {
            name: '📝 Updated Fields',
            value: updatedFields.join('\n'),
            inline: false
          }
        ]);
      }
      
      await interaction.editReply({ embeds: [embed] });
      
    } catch (error) {
      console.error('Update profile command error:', error);
      await interaction.editReply('❌ An error occurred while updating your profile.');
    }
  },
};

function isValidRiotId(riotId: string): boolean {
  const riotIdRegex = /^.+#[0-9]{3,5}$/;
  return riotIdRegex.test(riotId) && riotId.length >= 5 && riotId.length <= 30;
}