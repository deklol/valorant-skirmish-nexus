import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';

// Rank configuration matching your app
const RANK_CONFIG: Record<string, { emoji: string; primary: string; skill: string }> = {
  'Iron 1': { emoji: '⬛', primary: '#4A4A4A', skill: 'Developing' },
  'Iron 2': { emoji: '⬛', primary: '#4A4A4A', skill: 'Developing' },
  'Iron 3': { emoji: '⬛', primary: '#4A4A4A', skill: 'Developing' },
  'Bronze 1': { emoji: '🟫', primary: '#A97142', skill: 'Beginner' },
  'Bronze 2': { emoji: '🟫', primary: '#A97142', skill: 'Beginner' },
  'Bronze 3': { emoji: '🟫', primary: '#A97142', skill: 'Beginner' },
  'Silver 1': { emoji: '⬜', primary: '#C0C0C0', skill: 'Beginner' },
  'Silver 2': { emoji: '⬜', primary: '#C0C0C0', skill: 'Beginner' },
  'Silver 3': { emoji: '⬜', primary: '#C0C0C0', skill: 'Beginner' },
  'Gold 1': { emoji: '🟨', primary: '#FFD700', skill: 'Beginner' },
  'Gold 2': { emoji: '🟨', primary: '#FFD700', skill: 'Beginner' },
  'Gold 3': { emoji: '🟨', primary: '#FFD700', skill: 'Beginner' },
  'Platinum 1': { emoji: '🟦', primary: '#5CA3E4', skill: 'Intermediate' },
  'Platinum 2': { emoji: '🟦', primary: '#5CA3E4', skill: 'Intermediate' },
  'Platinum 3': { emoji: '🟦', primary: '#5CA3E4', skill: 'Intermediate' },
  'Diamond 1': { emoji: '🟪', primary: '#8d64e2', skill: 'Intermediate' },
  'Diamond 2': { emoji: '🟪', primary: '#8d64e2', skill: 'Intermediate' },
  'Diamond 3': { emoji: '🟪', primary: '#8d64e2', skill: 'Intermediate' },
  'Ascendant 1': { emoji: '🟩', primary: '#84FF6F', skill: 'Intermediate' },
  'Ascendant 2': { emoji: '🟩', primary: '#84FF6F', skill: 'Intermediate' },
  'Ascendant 3': { emoji: '🟩', primary: '#84FF6F', skill: 'Intermediate' },
  'Immortal 1': { emoji: '🟥', primary: '#A52834', skill: 'High Skilled' },
  'Immortal 2': { emoji: '🟥', primary: '#A52834', skill: 'Elite' },
  'Immortal 3': { emoji: '🟥', primary: '#A52834', skill: 'Elite' },
  'Radiant': { emoji: '✨', primary: '#FFF176', skill: 'Elite' },
  'Unrated': { emoji: '❓', primary: '#9CA3AF', skill: 'Unknown' },
  'Unranked': { emoji: '❓', primary: '#9CA3AF', skill: 'Unknown' }
};

export function getRankEmoji(rank: string): string {
  return RANK_CONFIG[rank]?.emoji || '❓';
}

export function getRankColor(rank: string): number {
  const color = RANK_CONFIG[rank]?.primary || '#9CA3AF';
  return parseInt(color.replace('#', ''), 16);
}

export function createTournamentEmbed(tournament: any, signupsData: any) {
  const { data: signups } = signupsData;
  const signupCount = signups?.length || 0;
  
  const embed = new EmbedBuilder()
    .setTitle(`🏆 ${tournament.name}`)
    .setDescription(tournament.description || 'No description provided')
    .setColor(0x00AE86)
    .addFields([
      {
        name: '📅 Start Time',
        value: tournament.start_time ? `<t:${Math.floor(new Date(tournament.start_time).getTime() / 1000)}:F>` : 'TBD',
        inline: true
      },
      {
        name: '👥 Players',
        value: `${signupCount}/${tournament.max_players}`,
        inline: true
      },
      {
        name: '🎯 Format',
        value: `${tournament.match_format} • ${tournament.bracket_type}`,
        inline: true
      },
      {
        name: '💰 Prize Pool',
        value: tournament.prize_pool || 'Glory & Honor',
        inline: true
      },
      {
        name: '📝 Registration',
        value: tournament.registration_opens_at && tournament.registration_closes_at 
          ? `<t:${Math.floor(new Date(tournament.registration_opens_at).getTime() / 1000)}:f> - <t:${Math.floor(new Date(tournament.registration_closes_at).getTime() / 1000)}:f>`
          : 'Open Now',
        inline: false
      }
    ]);

  if (tournament.banner_image_url) {
    embed.setImage(tournament.banner_image_url);
  }

  const components = new ActionRowBuilder<ButtonBuilder>()
    .addComponents([
      new ButtonBuilder()
        .setCustomId(`signup_${tournament.id}`)
        .setLabel('Sign Up')
        .setStyle(ButtonStyle.Success)
        .setEmoji('✅'),
      new ButtonBuilder()
        .setCustomId(`withdraw_${tournament.id}`)
        .setLabel('Withdraw')
        .setStyle(ButtonStyle.Danger)
        .setEmoji('❌'),
      new ButtonBuilder()
        .setCustomId(`info_${tournament.id}`)
        .setLabel('More Info')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('ℹ️')
    ]);

  return { embed, components };
}

export function createUserProfileEmbed(user: any, stats: any) {
  const rankEmoji = getRankEmoji(user.current_rank || 'Unranked');
  const peakRankEmoji = getRankEmoji(user.peak_rank || 'Unranked');
  
  const embed = new EmbedBuilder()
    .setTitle(`${rankEmoji} ${user.discord_username}`)
    .setDescription(`**Riot ID:** ${user.riot_id || 'Not set'}`)
    .setColor(getRankColor(user.current_rank || 'Unranked'))
    .addFields([
      {
        name: '🎯 Current Rank',
        value: `${rankEmoji} ${user.current_rank || 'Unranked'}`,
        inline: true
      },
      {
        name: '⭐ Peak Rank',
        value: `${peakRankEmoji} ${user.peak_rank || 'Unranked'}`,
        inline: true
      },
      {
        name: '⚖️ Weight Rating',
        value: `${user.weight_rating || 150}`,
        inline: true
      }
    ]);

  if (stats?.data) {
    const winRate = stats.data.wins + stats.data.losses > 0 
      ? ((stats.data.wins / (stats.data.wins + stats.data.losses)) * 100).toFixed(1)
      : '0.0';
    
    embed.addFields([
      {
        name: '🏅 Tournament Stats',
        value: `**Tournaments Won:** ${stats.data.tournaments_won || 0}\n**Tournaments Played:** ${stats.data.tournaments_played || 0}`,
        inline: true
      },
      {
        name: '⚔️ Match Record',
        value: `**Wins:** ${stats.data.wins || 0}\n**Losses:** ${stats.data.losses || 0}\n**Win Rate:** ${winRate}%`,
        inline: true
      }
    ]);
  }

  if (user.discord_avatar_url) {
    embed.setThumbnail(user.discord_avatar_url);
  }

  return embed;
}

export function createQuickMatchEmbed(queueData: any) {
  const { data: queue } = queueData;
  const queueCount = queue?.length || 0;
  
  const embed = new EmbedBuilder()
    .setTitle('⚡ Quick Match Queue')
    .setDescription('Join the queue for instant 10-man matches!')
    .setColor(0xFF6B35)
    .addFields([
      {
        name: '👥 Players in Queue',
        value: `${queueCount}/10`,
        inline: true
      },
      {
        name: '⏱️ Estimated Wait',
        value: queueCount < 5 ? '5-10 minutes' : queueCount < 8 ? '2-5 minutes' : 'Ready soon!',
        inline: true
      }
    ]);

  if (queue && queue.length > 0) {
    const playerList = queue
      .slice(0, 10)
      .map((player: any, index: number) => {
        const rankEmoji = getRankEmoji(player.users.current_rank);
        return `${index + 1}. ${rankEmoji} ${player.users.discord_username}`;
      })
      .join('\n');
    
    embed.addFields([
      {
        name: '📋 Queue List',
        value: playerList || 'No players in queue',
        inline: false
      }
    ]);
  }

  const components = new ActionRowBuilder<ButtonBuilder>()
    .addComponents([
      new ButtonBuilder()
        .setCustomId('queue_join')
        .setLabel('Join Queue')
        .setStyle(ButtonStyle.Success)
        .setEmoji('⚡'),
      new ButtonBuilder()
        .setCustomId('queue_leave')
        .setLabel('Leave Queue')
        .setStyle(ButtonStyle.Danger)
        .setEmoji('🚪'),
      new ButtonBuilder()
        .setCustomId('queue_refresh')
        .setLabel('Refresh')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('🔄')
    ]);

  return { embed, components };
}

export function createLeaderboardEmbed(leaderboardData: any) {
  const { data: players } = leaderboardData;
  
  const embed = new EmbedBuilder()
    .setTitle('🏆 Tournament Leaderboard')
    .setDescription('Top players by tournament wins and match record')
    .setColor(0xFFD700);

  if (players && players.length > 0) {
    const leaderboard = players
      .slice(0, 10)
      .map((player: any, index: number) => {
        const rankEmoji = getRankEmoji(player.current_rank);
        const winRate = player.wins + player.losses > 0 
          ? ((player.wins / (player.wins + player.losses)) * 100).toFixed(0)
          : '0';
        
        const trophy = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`;
        
        return `${trophy} ${rankEmoji} **${player.discord_username}**\n` +
               `🏆 ${player.tournaments_won} tournaments • ⚔️ ${player.wins}W-${player.losses}L (${winRate}%)`;
      })
      .join('\n\n');
    
    embed.setDescription(leaderboard);
  } else {
    embed.setDescription('No players found in leaderboard.');
  }

  return embed;
}