import { Events, Interaction, EmbedBuilder } from 'discord.js';
import { getSupabase } from '../utils/supabase.js';
import { createTournamentEmbed, createQuickMatchEmbed } from '../utils/embeds.js';
import { handleUserRegistration } from '../utils/userRegistration.js';

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
        const { data: user } = await getSupabase()
          .from('users')
          .select('*')
          .eq('discord_id', interaction.user.id)
          .maybeSingle();
        
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
  const { data: tournament, error: tournamentError } = await getSupabase()
    .from('tournaments')
    .select('*')
    .eq('id', tournamentId)
    .maybeSingle();
  
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
  const { data: existingSignup } = await getSupabase()
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
  const { data: signups } = await getSupabase()
    .from('tournament_signups')
    .select(`
      *,
      users!inner(discord_username, current_rank, riot_id)
    `)
    .eq('tournament_id', tournamentId);
  if (signups && signups.length >= tournament.max_players) {
    await interaction.reply({
      content: '❌ This tournament is full.',
      ephemeral: true
    });
    return;
  }
  
  // Sign up user
  const { error } = await getSupabase()
    .from('tournament_signups')
    .insert({
      user_id: user.id,
      tournament_id: tournamentId,
      signed_up_at: new Date().toISOString()
    })
    .select()
    .single();
  
  if (error) {
    await interaction.reply({
      content: '❌ Failed to sign up for tournament. Please try again.',
      ephemeral: true
    });
    return;
  }
  
  // Update the embed with new signup count
  const { data: updatedSignups } = await getSupabase()
    .from('tournament_signups')
    .select(`
      *,
      users!inner(discord_username, current_rank, riot_id)
    `)
    .eq('tournament_id', tournamentId);
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
  
  const { error } = await getSupabase()
    .from('tournament_signups')
    .delete()
    .eq('user_id', user.id)
    .eq('tournament_id', tournamentId);
  
  if (error) {
    await interaction.reply({
      content: '❌ You are not signed up for this tournament.',
      ephemeral: true
    });
    return;
  }
  
  // Update the embed
  const { data: tournament } = await getSupabase()
    .from('tournaments')
    .select('*')
    .eq('id', tournamentId)
    .maybeSingle();
  const { data: updatedSignups } = await getSupabase()
    .from('tournament_signups')
    .select(`
      *,
      users!inner(discord_username, current_rank, riot_id)
    `)
    .eq('tournament_id', tournamentId);
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
  const { data: tournament } = await getSupabase()
    .from('tournaments')
    .select('*')
    .eq('id', tournamentId)
    .maybeSingle();
  const { data: signups } = await getSupabase()
    .from('tournament_signups')
    .select(`
      *,
      users!inner(discord_username, current_rank, riot_id)
    `)
    .eq('tournament_id', tournamentId);
  
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
  const { error } = await getSupabase()
    .from('quick_match_queue')
    .upsert({
      user_id: user.id,
      joined_at: new Date().toISOString(),
      is_active: true
    })
    .select()
    .single();
  
  if (error) {
    await interaction.reply({
      content: '❌ Failed to join queue. You might already be in queue.',
      ephemeral: true
    });
    return;
  }
  
  // Update queue display
  const { data: queueData } = await getSupabase()
    .from('quick_match_queue')
    .select(`
      *,
      users!inner(
        id,
        discord_username, 
        discord_id, 
        current_rank, 
        peak_rank,
        weight_rating,
        manual_rank_override,
        manual_weight_override,
        use_manual_override,
        tournaments_won,
        last_tournament_win
      )
    `)
    .eq('is_active', true)
    .order('joined_at', { ascending: true });
  const { embed, components } = createQuickMatchEmbed({ data: queueData });
  
  await interaction.update({
    embeds: [embed],
    components: [components]
  });
  
  await interaction.followUp({
    content: '✅ Joined the quick match queue!',
    ephemeral: true
  });
  
  // Check if we have 10 players for auto-match creation
  if (queueData && queueData.length >= 10) {
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
  
  await getSupabase()
    .from('quick_match_queue')
    .update({ is_active: false })
    .eq('user_id', user.id);
  
  // Update queue display
  const { data: queueData } = await getSupabase()
    .from('quick_match_queue')
    .select(`
      *,
      users!inner(
        id,
        discord_username, 
        discord_id, 
        current_rank, 
        peak_rank,
        weight_rating,
        manual_rank_override,
        manual_weight_override,
        use_manual_override,
        tournaments_won,
        last_tournament_win
      )
    `)
    .eq('is_active', true)
    .order('joined_at', { ascending: true });
  const { embed, components } = createQuickMatchEmbed({ data: queueData });
  
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
  const { data: queueData } = await getSupabase()
    .from('quick_match_queue')
    .select(`
      *,
      users!inner(
        id,
        discord_username, 
        discord_id, 
        current_rank, 
        peak_rank,
        weight_rating,
        manual_rank_override,
        manual_weight_override,
        use_manual_override,
        tournaments_won,
        last_tournament_win
      )
    `)
    .eq('is_active', true)
    .order('joined_at', { ascending: true });
  const { embed, components } = createQuickMatchEmbed({ data: queueData });
  
  await interaction.update({
    embeds: [embed],
    components: [components]
  });
}