import { 
  ActionRowBuilder, 
  ModalBuilder, 
  TextInputBuilder, 
  TextInputStyle, 
  EmbedBuilder,
  ButtonBuilder,
  ButtonStyle
} from 'discord.js';
import { db } from './supabase.js';

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
  
  // Direct users to web app for registration instead of Discord modal
  const embed = new EmbedBuilder()
    .setTitle('🔗 Account Linking Required')
    .setDescription('To participate in tournaments, you need to link your Discord account to your tournament profile.')
    .setColor(0xFF9500)
    .addFields([
      {
        name: '📋 How to get started:',
        value: '1. Visit our website to sign up or login\n2. Link your Discord account in your profile\n3. Return here to participate in tournaments',
        inline: false
      },
      {
        name: '🌐 Website Link:',
        value: 'Please visit our tournament website to create your account and link Discord.',
        inline: false
      }
    ])
    .setFooter({ 
      text: 'Once linked, you can participate in all tournaments and matches!' 
    });
  
  const button = new ActionRowBuilder<ButtonBuilder>()
    .addComponents(
      new ButtonBuilder()
        .setLabel('Visit Tournament Website')
        .setStyle(ButtonStyle.Link)
        .setURL(process.env.WEB_APP_URL || 'https://your-tournament-site.com')
        .setEmoji('🌐')
    );
  
  await interaction.reply({
    embeds: [embed],
    components: [button],
    ephemeral: true
  });
}