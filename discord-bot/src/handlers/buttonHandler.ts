/**
 * Button Interaction Handler for Quick Match System
 */
import { QuickMatchManager } from '../utils/quickMatchManager';
import { db } from '../utils/supabase';
import { createQuickMatchEmbed, createMapVotingEmbed } from '../utils/embeds';
import { handleUserRegistration } from '../utils/userRegistration';
import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle } from 'discord.js';

export async function handleButtonInteraction(interaction: any) {
  const customId = interaction.customId;
  const channelId = interaction.channel.id;
  const userId = interaction.user.id;

  console.log(`🔘 Button interaction: ${customId} from user ${userId} in channel ${channelId}`);

  try {
    // Quick Match buttons
    if (customId.startsWith('qm_')) {
      await handleQuickMatchButton(interaction, customId, channelId, userId);
    }
    // Map voting buttons
    else if (customId.startsWith('vote_')) {
      await handleMapVoteButton(interaction, customId, channelId, userId);
    }
    // Legacy buttons (for backwards compatibility)
    else if (['queue_join', 'queue_leave', 'queue_refresh'].includes(customId)) {
      await handleLegacyButton(interaction, customId, channelId, userId);
    }
  } catch (error) {
    console.error('Button interaction error:', error);
    
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({
        content: '❌ An error occurred while processing your request.',
        ephemeral: true
      });
    }
  }
}

async function handleQuickMatchButton(interaction: any, customId: string, channelId: string, userId: string) {
  const action = customId.replace('qm_', '');
  const session = await QuickMatchManager.getActiveSession(channelId);

  switch (action) {
    case 'join':
      await handleJoinQueue(interaction, session, userId);
      break;
      
    case 'leave':
      await handleLeaveQueue(interaction, session, userId);
      break;
      
    case 'balance':
      await handleRunBalance(interaction, session, channelId);
      break;
      
    case 'refresh':
      await handleRefresh(interaction, session);
      break;
      
    case 'submit_score':
      await handleSubmitScore(interaction, session);
      break;
      
    case 'cancel':
      await handleCancelLobby(interaction, session);
      break;
      
    case 'new_lobby':
      await handleNewLobby(interaction, channelId);
      break;
  }
}

async function handleJoinQueue(interaction: any, session: any, userId: string) {
  await interaction.deferReply({ ephemeral: true });

  // Check if user is registered
  const { data: user } = await db.findUserByDiscordId(userId);
  
  if (!user) {
    await interaction.editReply({
      content: '⚠️ You need to sign up and link your Riot ID on TLRHub before joining Quick Matches.',
      components: [
        new ActionRowBuilder()
          .addComponents(
            new ButtonBuilder()
              .setLabel('Sign Up on TLRHub')
              .setStyle(ButtonStyle.Link)
              .setURL('https://tlrhub.com') // Replace with actual signup URL
              .setEmoji('🔗')
          )
      ]
    });
    return;
  }

  if (!user.riot_id) {
    await interaction.editReply({
      content: '⚠️ You need to link your Riot ID before joining Quick Matches. Please visit TLRHub to complete your profile.',
      components: [
        new ActionRowBuilder()
          .addComponents(
            new ButtonBuilder()
              .setLabel('Complete Profile')
              .setStyle(ButtonStyle.Link)
              .setURL('https://tlrhub.com/profile') // Replace with actual profile URL
              .setEmoji('👤')
          )
      ]
    });
    return;
  }

  // Add to queue
  const { error } = await db.addToQuickMatchQueue(user.id);
  
  if (error && !error.message.includes('duplicate')) {
    await interaction.editReply({
      content: '❌ Failed to join queue. Please try again.'
    });
    return;
  }

  // Update the embed
  await updateLobbyMessage(interaction, session);
  
  await interaction.editReply({
    content: '✅ You have been added to the Quick Match queue!'
  });
}

async function handleLeaveQueue(interaction: any, session: any, userId: string) {
  await interaction.deferReply({ ephemeral: true });

  const { data: user } = await db.findUserByDiscordId(userId);
  
  if (!user) {
    await interaction.editReply({content: '❌ User not found.'});
    return;
  }

  await db.removeFromQuickMatchQueue(user.id);
  
  // Update the embed
  await updateLobbyMessage(interaction, session);
  
  await interaction.editReply({
    content: '✅ You have been removed from the Quick Match queue.'
  });
}

async function handleRunBalance(interaction: any, session: any, channelId: string) {
  await interaction.deferReply({ ephemeral: true });

  if (!session) {
    await interaction.editReply({content: '❌ No active session found.'});
    return;
  }

  // Get current queue
  const queueData = await db.getQuickMatchQueue();
  const queue = queueData.data;

  if (!queue || queue.length !== 10) {
    await interaction.editReply({content: `❌ Need exactly 10 players to balance teams. Currently have ${queue?.length || 0}.`});
    return;
  }

  // Update session status to balancing
  await QuickMatchManager.updateSession(session.id, { status: 'balancing' });
  await updateLobbyMessage(interaction, session);

  await interaction.editReply({content: '⚖️ Balancing teams...'});

  try {
    // Balance the teams
    const { teamA, teamB, balanceAnalysis } = await QuickMatchManager.balanceTeams(session.id, queue);
    
    // Clear the queue since players are now in teams
    await db.clearQuickMatchQueue();
    
    // Update lobby message with balanced teams
    const updatedSession = await QuickMatchManager.getActiveSession(channelId);
    await updateLobbyMessage(interaction, updatedSession);
    
    // Start map voting
    await startMapVoting(interaction, updatedSession);
    
    console.log(`✅ Teams balanced for session ${session.id}`);
    
  } catch (error) {
    console.error('Team balancing error:', error);
    await QuickMatchManager.updateSession(session.id, { status: 'waiting' });
    await interaction.followUp({
      content: '❌ Failed to balance teams. Please try again.',
      ephemeral: true
    });
  }
}

async function startMapVoting(interaction: any, session: any) {
  // Get available maps
  const { data: maps } = await db.getActiveMaps();
  
  if (!maps || maps.length === 0) {
    await interaction.followUp({
      content: '❌ No maps available for voting.',
      ephemeral: true
    });
    return;
  }

  // Create map voting embed
  const { embed, components } = createMapVotingEmbed(maps, [], session.id);
  
  // Send map voting message
  await interaction.followUp({
    embeds: [embed],
    components: components
  });
}

async function handleMapVoteButton(interaction: any, customId: string, channelId: string, userId: string) {
  await interaction.deferReply({ ephemeral: true });

  const mapId = customId.replace('vote_', '');
  const session = await QuickMatchManager.getActiveSession(channelId);

  if (!session || session.status !== 'voting') {
    await interaction.editReply({content: '❌ Voting is not currently active.'});
    return;
  }

  // Check if user is in one of the teams
  const { data: user } = await db.findUserByDiscordId(userId);
  if (!user) {
    await interaction.editReply({content: '❌ User not found.'});
    return;
  }

  const isInTeamA = session.team_a_data.some((p: any) => p.user_id === user.id || p.users?.id === user.id);
  const isInTeamB = session.team_b_data.some((p: any) => p.user_id === user.id || p.users?.id === user.id);

  if (!isInTeamA && !isInTeamB) {
    await interaction.editReply({content: '❌ You are not part of this match.'});
    return;
  }

  try {
    // Submit vote
    await QuickMatchManager.submitMapVote(session.id, user.id, userId, mapId);
    
    await interaction.editReply({content: '✅ Your vote has been recorded!'});
    
    // Check if all players have voted
    const votes = await QuickMatchManager.getSessionVotes(session.id);
    if (votes.length >= 10) {
      // Calculate results and start match
      await finalizeMapVoting(interaction, session);
    }
    
  } catch (error) {
    console.error('Map voting error:', error);
    await interaction.editReply({content: '❌ Failed to record your vote.'});
  }
}

async function finalizeMapVoting(interaction: any, session: any) {
  try {
    // Calculate voting results
    const results = await QuickMatchManager.calculateMapVotingResults(session.id);
    
    if (!results.winningMap) {
      await interaction.followUp({
        content: '❌ No winning map found. Please try voting again.',
        ephemeral: true
      });
      return;
    }

    // Create match in database
    const matchId = await QuickMatchManager.createMatch(
      session.id,
      session.team_a_data,
      session.team_b_data,
      results.winningMap.id
    );

    // Update lobby message
    const updatedSession = await QuickMatchManager.getActiveSession(interaction.channel.id);
    await updateLobbyMessage(interaction, updatedSession);

    // Announce match start
    const embed = new EmbedBuilder()
      .setTitle('🎮 Match Started!')
      .setDescription(`Match is now live on **${results.winningMap.display_name}**!`)
      .setColor(0x00D4AA)
      .addFields([
        {
          name: '🔗 Match Details',
          value: `[View Match](https://tlrhub.com/match/${matchId})`,
          inline: false
        }
      ]);

    await interaction.followUp({
      embeds: [embed]
    });

    console.log(`🎮 Match started: ${matchId} on ${results.winningMap.display_name}`);
    
  } catch (error) {
    console.error('Match creation error:', error);
    await interaction.followUp({
      content: '❌ Failed to create match. Please contact an admin.',
      ephemeral: true
    });
  }
}

async function handleSubmitScore(interaction: any, session: any) {
  if (!session || session.status !== 'in_progress') {
    await interaction.reply({
      content: '❌ No match in progress.',
      ephemeral: true
    });
    return;
  }

  // Create score submission modal
  const modal = new ModalBuilder()
    .setCustomId(`score_submit_${session.id}`)
    .setTitle('Submit Match Score');

  const teamAScoreInput = new TextInputBuilder()
    .setCustomId('team_a_score')
    .setLabel('Team A Score')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('Enter Team A score (e.g., 13)')
    .setRequired(true);

  const teamBScoreInput = new TextInputBuilder()
    .setCustomId('team_b_score')
    .setLabel('Team B Score')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('Enter Team B score (e.g., 11)')
    .setRequired(true);

  const firstActionRow = new ActionRowBuilder().addComponents(teamAScoreInput);
  const secondActionRow = new ActionRowBuilder().addComponents(teamBScoreInput);

  modal.addComponents(firstActionRow, secondActionRow);

  await interaction.showModal(modal);
}

async function handleRefresh(interaction: any, session: any) {
  await interaction.deferUpdate();
  await updateLobbyMessage(interaction, session);
}

async function handleCancelLobby(interaction: any, session: any) {
  await interaction.deferReply({ ephemeral: true });

  if (!session) {
    await interaction.editReply({content: '❌ No active session found.'});
    return;
  }

  await QuickMatchManager.cancelSession(session.id);
  await db.clearQuickMatchQueue();
  
  await interaction.editReply({content: '✅ Lobby has been cancelled.'});
  
  // Update the original message
  await updateLobbyMessage(interaction, { ...session, status: 'cancelled' });
}

async function handleNewLobby(interaction: any, channelId: string) {
  await interaction.deferReply({ ephemeral: true });

  // Create new session
  const session = await QuickMatchManager.createSession(channelId, interaction.user.id);
  
  await interaction.editReply({content: '✅ New lobby created!'});
  
  // Update the message with new lobby
  await updateLobbyMessage(interaction, session);
}

async function handleLegacyButton(interaction: any, customId: string, channelId: string, userId: string) {
  // Map legacy button IDs to new ones
  const mapping: Record<string, string> = {
    'queue_join': 'qm_join',
    'queue_leave': 'qm_leave', 
    'queue_refresh': 'qm_refresh'
  };
  
  const newCustomId = mapping[customId];
  if (newCustomId) {
    await handleQuickMatchButton(interaction, newCustomId, channelId, userId);
  }
}

async function updateLobbyMessage(interaction: any, session: any) {
  try {
    const queueData = await db.getQuickMatchQueue();
    const { embed, components } = createQuickMatchEmbed(queueData, session);
    
    // Update the original message
    if (interaction.message) {
      await interaction.message.edit({
        embeds: [embed],
        components: components
      });
    }
  } catch (error) {
    console.error('Error updating lobby message:', error);
  }
}