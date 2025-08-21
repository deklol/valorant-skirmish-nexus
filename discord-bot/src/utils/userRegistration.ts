import { 
  ActionRowBuilder, 
  ModalBuilder, 
  TextInputBuilder, 
  TextInputStyle, 
  EmbedBuilder,
  ButtonBuilder,
  ButtonStyle
} from 'discord.js';
import { db, supabase } from './supabase';

export async function handleUserRegistration(interaction: any) {
  // Check if user already exists
  const { data: existingUser } = await db.findUserByDiscordId(interaction.user.id);
  
  if (existingUser) {
    await interaction.reply({
      content: '✅ You are already registered!',
      ephemeral: true
    });
    return;
  }
  
  if (interaction.isButton()) {
    // Show registration modal
    const modal = new ModalBuilder()
      .setCustomId('registration_modal')
      .setTitle('Tournament Registration');

    const riotIdInput = new TextInputBuilder()
      .setCustomId('riot_id')
      .setLabel('Riot ID (e.g., PlayerName#1234)')
      .setStyle(TextInputStyle.Short)
      .setRequired(true)
      .setPlaceholder('YourName#1234');

    const currentRankInput = new TextInputBuilder()
      .setCustomId('current_rank')
      .setLabel('Current Rank (e.g., Gold 2, Diamond 1)')
      .setStyle(TextInputStyle.Short)
      .setRequired(false)
      .setPlaceholder('Gold 2');

    const peakRankInput = new TextInputBuilder()
      .setCustomId('peak_rank')
      .setLabel('Peak Rank (highest rank achieved)')
      .setStyle(TextInputStyle.Short)
      .setRequired(false)
      .setPlaceholder('Platinum 3');

    const firstActionRow = new ActionRowBuilder<TextInputBuilder>().addComponents(riotIdInput);
    const secondActionRow = new ActionRowBuilder<TextInputBuilder>().addComponents(currentRankInput);
    const thirdActionRow = new ActionRowBuilder<TextInputBuilder>().addComponents(peakRankInput);

    modal.addComponents(firstActionRow, secondActionRow, thirdActionRow);

    await interaction.showModal(modal);
    return;
  }
  
  if (interaction.isModalSubmit() && interaction.customId === 'registration_modal') {
    await interaction.deferReply({ ephemeral: true });
    
    const riotId = interaction.fields.getTextInputValue('riot_id');
    const currentRank = interaction.fields.getTextInputValue('current_rank') || null;
    const peakRank = interaction.fields.getTextInputValue('peak_rank') || null;
    
    // Validate Riot ID format
    if (!isValidRiotId(riotId)) {
      await interaction.editReply({
        content: '❌ Invalid Riot ID format. Please use the format: PlayerName#1234'
      });
      return;
    }
    
    try {
      // Create user in database
      const userData = {
        discord_id: interaction.user.id,
        discord_username: interaction.user.username,
        discord_avatar_url: interaction.user.displayAvatarURL(),
        riot_id: riotId,
        current_rank: currentRank,
        peak_rank: peakRank
      };
      
      const { data: newUser, error } = await db.createUser(userData);
      
      if (error) {
        console.error('Registration error:', error);
        await interaction.editReply({
          content: '❌ Registration failed. This Riot ID might already be taken.'
        });
        return;
      }
      
      // Try to scrape rank data if possible
      if (riotId && process.env.SUPABASE_URL) {
        try {
          await supabase.functions.invoke('scrape-rank', {
            body: {
              riot_id: riotId,
              user_id: newUser.id
            }
          });
        } catch (scrapeError) {
          console.log('Rank scraping failed, using manual input:', scrapeError);
        }
      }
      
      const embed = new EmbedBuilder()
        .setTitle('✅ Registration Complete!')
        .setDescription(`Welcome to the tournament system, **${interaction.user.username}**!`)
        .setColor(0x00FF00)
        .addFields([
          {
            name: '🎮 Riot ID',
            value: riotId,
            inline: true
          },
          {
            name: '🎯 Current Rank',
            value: currentRank || 'Not specified',
            inline: true
          },
          {
            name: '⭐ Peak Rank',
            value: peakRank || 'Not specified',
            inline: true
          }
        ])
        .setFooter({ 
          text: 'You can now participate in tournaments and quick matches!' 
        });
      
      await interaction.editReply({
        embeds: [embed]
      });
      
    } catch (error) {
      console.error('User registration error:', error);
      await interaction.editReply({
        content: '❌ Registration failed due to a system error. Please try again later.'
      });
    }
    
    return;
  }
  
  // Show initial registration prompt
  const embed = new EmbedBuilder()
    .setTitle('🎮 Tournament Registration Required')
    .setDescription('You need to register before you can participate in tournaments or quick matches.')
    .setColor(0xFF9500)
    .addFields([
      {
        name: '📋 What we need:',
        value: '• Your Riot ID (for rank verification)\n• Current competitive rank\n• Peak rank achieved',
        inline: false
      },
      {
        name: '✨ Benefits:',
        value: '• Tournament participation\n• Quick match access\n• Rank tracking\n• Statistics & leaderboards',
        inline: false
      }
    ]);
  
  const button = new ActionRowBuilder<ButtonBuilder>()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('register_start')
        .setLabel('Register Now')
        .setStyle(ButtonStyle.Primary)
        .setEmoji('📝')
    );
  
  await interaction.reply({
    embeds: [embed],
    components: [button],
    ephemeral: true
  });
}

function isValidRiotId(riotId: string): boolean {
  // Riot ID format: PlayerName#1234 (3-5 digits after #)
  const riotIdRegex = /^.+#[0-9]{3,5}$/;
  return riotIdRegex.test(riotId) && riotId.length >= 5 && riotId.length <= 30;
}