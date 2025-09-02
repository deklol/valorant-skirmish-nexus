/**
 * Modal Interaction Handler for Quick Match System
 */
import { QuickMatchManager } from '../utils/quickMatchManager';
import { EmbedBuilder } from 'discord.js';
import { supabase } from '../utils/supabase';

export async function handleModalInteraction(interaction: any) {
  const customId = interaction.customId;
  
  console.log(`📝 Modal interaction: ${customId} from user ${interaction.user.id}`);

  try {
    if (customId.startsWith('score_submit_')) {
      await handleScoreSubmission(interaction, customId);
    }
  } catch (error) {
    console.error('Modal interaction error:', error);
    
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({
        content: '❌ An error occurred while processing your submission.',
        ephemeral: true
      });
    }
  }
}

async function handleScoreSubmission(interaction: any, customId: string) {
  await interaction.deferReply({ ephemeral: true });
  
  const sessionId = customId.replace('score_submit_', '');
  const session = await QuickMatchManager.getActiveSession(interaction.channel.id);
  
  if (!session || session.id !== sessionId || session.status !== 'in_progress') {
    await interaction.editReply({
      content: '❌ Invalid session or match not in progress.'
    });
    return;
  }

  const teamAScore = parseInt(interaction.fields.getTextInputValue('team_a_score'));
  const teamBScore = parseInt(interaction.fields.getTextInputValue('team_b_score'));
  
  if (isNaN(teamAScore) || isNaN(teamBScore)) {
    await interaction.editReply({
      content: '❌ Invalid scores. Please enter valid numbers.'
    });
    return;
  }

  if (teamAScore < 0 || teamBScore < 0) {
    await interaction.editReply({
      content: '❌ Scores cannot be negative.'
    });
    return;
  }

  // Determine winner (first to 13 wins, or higher score in case of overtime)
  let winningTeamId: string;
  if (teamAScore > teamBScore) {
    // Team A wins - get the team ID from the first player
    const teamAPlayer = session.team_a_data[0];
    // We need to get the actual team ID from the match
    const { data: match } = await supabase
      .from('matches')
      .select('team1_id, team2_id')
      .eq('id', session.match_id)
      .single();
    
    winningTeamId = match?.team1_id;
  } else if (teamBScore > teamAScore) {
    // Team B wins
    const { data: match } = await supabase
      .from('matches')
      .select('team1_id, team2_id')
      .eq('id', session.match_id)
      .single();
    
    winningTeamId = match?.team2_id;
  } else {
    await interaction.editReply({
      content: '❌ Match cannot end in a tie. Please enter the correct scores.'
    });
    return;
  }

  if (!session.match_id) {
    await interaction.editReply({
      content: '❌ No match ID found for this session.'
    });
    return;
  }

  try {
    // Complete the match
    await QuickMatchManager.completeMatch(
      sessionId,
      session.match_id,
      winningTeamId,
      teamAScore,
      teamBScore
    );

    // Create results embed
    const winnerName = teamAScore > teamBScore ? 'Team A' : 'Team B';
    const embed = new EmbedBuilder()
      .setTitle('🏆 Match Completed!')
      .setDescription(`**${winnerName}** wins the match!`)
      .setColor(0x52C41A)
      .addFields([
        {
          name: '📊 Final Score',
          value: `Team A: ${teamAScore}\nTeam B: ${teamBScore}`,
          inline: true
        },
        {
          name: '🔗 Match Details',
          value: `[View Full Match](https://tlrhub.com/match/${session.match_id})`,
          inline: false
        }
      ]);

    await interaction.editReply({
      embeds: [embed]
    });

    // Update the main lobby message
    const updatedSession = await QuickMatchManager.getActiveSession(interaction.channel.id);
    await updateLobbyMessage(interaction, updatedSession);

    console.log(`🏆 Match completed: ${session.match_id}, Winner: ${winnerName} (${teamAScore}-${teamBScore})`);
    
  } catch (error) {
    console.error('Error completing match:', error);
    await interaction.editReply({
      content: '❌ Failed to record match results. Please contact an admin.'
    });
  }
}

async function updateLobbyMessage(interaction: any, session: any) {
  try {
    const { createQuickMatchEmbed } = await import('../utils/embeds');
    const { db } = await import('../utils/supabase');
    
    const queueData = await db.getQuickMatchQueue();
    const { embed, components } = createQuickMatchEmbed(queueData, session);
    
    // Find the original lobby message and update it
    const messages = await interaction.channel.messages.fetch({ limit: 50 });
    const lobbyMessage = messages.find((msg: any) => 
      msg.author.id === interaction.client.user.id && 
      msg.embeds[0]?.title?.includes('Quick Match')
    );
    
    if (lobbyMessage) {
      await lobbyMessage.edit({
        embeds: [embed],
        components: components
      });
    }
  } catch (error) {
    console.error('Error updating lobby message:', error);
  }
}