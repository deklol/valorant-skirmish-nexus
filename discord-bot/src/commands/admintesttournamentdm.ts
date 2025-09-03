import { SlashCommandBuilder, EmbedBuilder, MessageFlags } from 'discord.js';
import { getSupabase } from '../utils/supabase.js';

export default {
  data: new SlashCommandBuilder()
    .setName('admintesttournamentdm')
    .setDescription('Test the tournament reminder DM (Admin only)'),

  async execute(interaction: any) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    try {
      // Check if user is admin
      const { data: user } = await getSupabase()
        .from('users')
        .select('role')
        .eq('discord_id', interaction.user.id)
        .maybeSingle();

      if (!user || user.role !== 'admin') {
        await interaction.editReply('❌ This command is only available to administrators.');
        return;
      }

      // Send test DM to the admin
      try {
        await interaction.user.send({
          embeds: [{
            title: '🎮 Tournament Day Reminder - TEST',
            description: '**This is a test of the tournament reminder system.**\n\n' +
                        'Tournament check-in is happening TODAY!\n\n' +
                        '🌐 **Check in here:** https://tlrhub.pro/tournament/test-id\n\n' +
                        '⏰ **Important:** Make sure to check in on the website before the tournament starts.\n\n' +
                        '❓ **Need help?** Contact the tournament admins (do not reply to this bot).',
            color: 0xFF9500,
            footer: {
              text: 'TLR Hub Tournament System - Test Message'
            },
            timestamp: new Date().toISOString()
          }]
        });

        const successEmbed = new EmbedBuilder()
          .setTitle('✅ Test DM Sent')
          .setDescription('Tournament reminder test DM has been sent to your inbox!')
          .setColor(0x00FF00)
          .addFields([
            {
              name: '📋 Template Used',
              value: 'Day-of tournament reminder template with test data',
              inline: false
            }
          ]);

        await interaction.editReply({ embeds: [successEmbed] });

      } catch (dmError) {
        await interaction.editReply('❌ Could not send test DM. Please check that your DMs are enabled.');
      }

    } catch (error) {
      console.error('Admin test tournament DM error:', error);
      await interaction.editReply('❌ An error occurred while sending the test DM.');
    }
  },
};