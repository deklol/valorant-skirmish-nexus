import { Events, Interaction, EmbedBuilder } from 'discord.js';
import { db, supabase } from '../utils/supabase';
import { createTournamentEmbed, createQuickMatchEmbed } from '../utils/embeds';
import { handleUserRegistration } from '../utils/userRegistration';

export default {
  name: Events.InteractionCreate,
  async execute(interaction: Interaction) {
    // Handle slash commands
    if (interaction.isChatInputCommand()) {
      const command = interaction.client.commands.get(interaction.commandName);

      if (!command) {
        console.error(`No command matching ${interaction.commandName} was found.`);
        return;
      }

      try {
        await command.execute(interaction);
      } catch (error) {
        console.error(`Error executing ${interaction.commandName}:`, error);
        
        const errorEmbed = new EmbedBuilder()
          .setTitle('❌ Command Error')
          .setDescription('There was an error executing this command. Please try again later.')
          .setColor(0xFF0000);

        if (interaction.replied || interaction.deferred) {
          await interaction.followUp({ embeds: [errorEmbed], ephemeral: true });
        } else {
          await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }
      }
    }
    
    // Handle button interactions
    else if (interaction.isButton()) {
      const [action, ...params] = interaction.customId.split('_');
      
      try {
        // Check if user is registered
        const { data: user } = await db.findUserByDiscordId(interaction.user.id);
        
        // If user not registered and not registering, start registration
        if (!user && action !== 'register') {
          await handleUserRegistration(interaction);
          return;
        }
        
        switch (action) {
          case 'signup':
            await handleTournamentSignup(interaction, params[0], user);
            break;
            
          case 'withdraw':
            await handleTournamentWithdraw(interaction, params[0], user);
            break;
            
          case 'info':
            await handleTournamentInfo(interaction, params[0]);
            break;
            
          case 'queue':
            if (params[0] === 'join') {
              await handleQueueJoin(interaction, user);
            } else if (params[0] === 'leave') {
              await handleQueueLeave(interaction, user);
            } else if (params[0] === 'refresh') {
              await handleQueueRefresh(interaction);
            }
            break;
            
        case 'register':
          await handleUserRegistration(interaction);
          break;
            
          default:
            await interaction.reply({ 
              content: 'Unknown button interaction.', 
              ephemeral: true 
            });
        }
      } catch (error) {
        console.error('Button interaction error:', error);
        
        const errorEmbed = new EmbedBuilder()
          .setTitle('❌ Action Error')
          .setDescription('There was an error processing your request. Please try again.')
          .setColor(0xFF0000);
          
        await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
      }
    }
  },
};

async function handleTournamentSignup(interaction: any, tournamentId: string, user: any) {
  if (!user) {
    await handleUserRegistration(interaction);
    return;
  }
  
  // Check if tournament exists and is open for registration
  const { data: tournament, error: tournamentError } = await db.getTournamentById(tournamentId);
  
  if (tournamentError || !tournament) {
    await interaction.reply({
      content: '❌ Tournament not found.',
      ephemeral: true
    });
    return;
  }
  
  if (tournament.status !== 'open') {
    await interaction.reply({
      content: '❌ Registration is not open for this tournament.',
      ephemeral: true
    });
    return;
  }
  
  // Check if user already signed up
  const { data: existingSignup } = await supabase
    .from('tournament_signups')
    .select('id')
    .eq('user_id', user.id)
    .eq('tournament_id', tournamentId)
    .maybeSingle();
    
  if (existingSignup) {
    await interaction.reply({
      content: '❌ You are already signed up for this tournament.',
      ephemeral: true
    });
    return;
  }
  
  // Check if tournament is full
  const { data: signups } = await db.getTournamentSignups(tournamentId);
  if (signups && signups.length >= tournament.max_players) {
    await interaction.reply({
      content: '❌ This tournament is full.',
      ephemeral: true
    });
    return;
  }
  
  // Sign up user
  const { error } = await db.signupUserForTournament(user.id, tournamentId);
  
  if (error) {
    await interaction.reply({
      content: '❌ Failed to sign up for tournament. Please try again.',
      ephemeral: true
    });
    return;
  }
  
  // Update the embed with new signup count
  const updatedSignups = await db.getTournamentSignups(tournamentId);
  const { embed, components } = createTournamentEmbed(tournament, updatedSignups);
  
  await interaction.update({
    embeds: [embed],
    components: [components]
  });
  
  // Send success message
  await interaction.followUp({
    content: `✅ Successfully signed up for **${tournament.name}**!`,
    ephemeral: true
  });
}

async function handleTournamentWithdraw(interaction: any, tournamentId: string, user: any) {
  if (!user) {
    await interaction.reply({
      content: '❌ You need to register first.',
      ephemeral: true
    });
    return;
  }
  
  const { error } = await db.removeSignup(user.id, tournamentId);
  
  if (error) {
    await interaction.reply({
      content: '❌ You are not signed up for this tournament.',
      ephemeral: true
    });
    return;
  }
  
  // Update the embed
  const { data: tournament } = await db.getTournamentById(tournamentId);
  const updatedSignups = await db.getTournamentSignups(tournamentId);
  const { embed, components } = createTournamentEmbed(tournament, updatedSignups);
  
  await interaction.update({
    embeds: [embed],
    components: [components]
  });
  
  await interaction.followUp({
    content: `✅ Successfully withdrawn from **${tournament.name}**.`,
    ephemeral: true
  });
}

async function handleTournamentInfo(interaction: any, tournamentId: string) {
  const { data: tournament } = await db.getTournamentById(tournamentId);
  const { data: signups } = await db.getTournamentSignups(tournamentId);
  
  if (!tournament) {
    await interaction.reply({
      content: '❌ Tournament not found.',
      ephemeral: true
    });
    return;
  }
  
  const embed = new EmbedBuilder()
    .setTitle(`ℹ️ ${tournament.name} - Detailed Info`)
    .setColor(0x0099FF)
    .addFields([
      {
        name: '📋 Description',
        value: tournament.description || 'No description provided',
        inline: false
      },
      {
        name: '👥 Current Signups',
        value: signups ? signups.map((s: any) => s.users.discord_username).join(', ') || 'None' : 'None',
        inline: false
      }
    ]);
  
  await interaction.reply({
    embeds: [embed],
    ephemeral: true
  });
}

async function handleQueueJoin(interaction: any, user: any) {
  if (!user) {
    await handleUserRegistration(interaction);
    return;
  }
  
  // Add to queue
  const { error } = await db.addToQuickMatchQueue(user.id);
  
  if (error) {
    await interaction.reply({
      content: '❌ Failed to join queue. You might already be in queue.',
      ephemeral: true
    });
    return;
  }
  
  // Update queue display
  const queueData = await db.getQuickMatchQueue();
  const { embed, components } = createQuickMatchEmbed(queueData);
  
  await interaction.update({
    embeds: [embed],
    components: [components]
  });
  
  await interaction.followUp({
    content: '✅ Joined the quick match queue!',
    ephemeral: true
  });
  
  // Check if we have 10 players for auto-match creation
  if (queueData.data && queueData.data.length >= 10) {
    // TODO: Implement auto-match creation with team balancing
    console.log('🎮 Ready to create 10-man match!');
  }
}

async function handleQueueLeave(interaction: any, user: any) {
  if (!user) {
    await interaction.reply({
      content: '❌ You are not in the queue.',
      ephemeral: true
    });
    return;
  }
  
  await db.removeFromQuickMatchQueue(user.id);
  
  // Update queue display
  const queueData = await db.getQuickMatchQueue();
  const { embed, components } = createQuickMatchEmbed(queueData);
  
  await interaction.update({
    embeds: [embed],
    components: [components]
  });
  
  await interaction.followUp({
    content: '✅ Left the quick match queue.',
    ephemeral: true
  });
}

async function handleQueueRefresh(interaction: any) {
  const queueData = await db.getQuickMatchQueue();
  const { embed, components } = createQuickMatchEmbed(queueData);
  
  await interaction.update({
    embeds: [embed],
    components: [components]
  });
}