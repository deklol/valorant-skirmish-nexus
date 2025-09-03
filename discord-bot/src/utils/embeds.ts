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
  const signups = signupsData || [];
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

  // Add registered users list if there are signups
  if (signups && signups.length > 0) {
    const usersList = signups
      .map((signup: any) => {
        const user = signup.users;
        if (!user) return null;
        const rankEmoji = getRankEmoji(user.current_rank || 'Unranked');
        return `${rankEmoji} ${user.discord_username} (${user.current_rank || 'Unranked'})`;
      })
      .filter(Boolean)
      .slice(0, 20) // Limit to 20 users to avoid embed limit
      .join('\n');
    
    if (usersList) {
      embed.addFields([
        {
          name: '📋 Registered Players',
          value: usersList + (signups.length > 20 ? `\n... and ${signups.length - 20} more` : ''),
          inline: false
        }
      ]);
    }
  }

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
        .setCustomId(`refresh_${tournament.id}`)
        .setLabel('Refresh')
        .setStyle(ButtonStyle.Success)
        .setEmoji('🔄'),
      new ButtonBuilder()
        .setURL(`https://tlrhub.pro/tournament/${tournament.id}`)
        .setLabel('More Info')
        .setStyle(ButtonStyle.Link)
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

export function createQuickMatchEmbed(queueData: any, session?: any) {
  const { data: queue } = queueData;
  const queueCount = queue?.length || 0;
  
  // Determine embed based on session status
  let title = '⚡ Valorant Quick Match Lobby';
  let description = 'Click below to join the queue. 10 players required to start.';
  let color = 0xFF6B35;
  
  if (session) {
    switch (session.status) {
      case 'waiting':
        description = 'Click below to join the queue. 10 players required to start.';
        break;
      case 'balancing':
        title = '⚖️ Balancing Teams...';
        description = 'Teams are being balanced. Please wait...';
        color = 0xFFD700;
        break;
      case 'voting':
        title = '🗳️ Map Voting Active';
        description = 'Teams have been balanced! Vote for the map below.';
        color = 0x9D4EDD;
        break;
      case 'in_progress':
        title = '🎮 Match In Progress';
        description = `Match ongoing on **${session.selected_map?.display_name || 'Selected Map'}**. Click below when match is finished.`;
        color = 0x00D4AA;
        break;
      case 'completed':
        title = '✅ Match Completed';
        description = 'Match has been completed. Results recorded!';
        color = 0x52C41A;
        break;
    }
  }
  
  const embed = new EmbedBuilder()
    .setTitle(title)
    .setDescription(description)
    .setColor(color)
    .addFields([
      {
        name: '👥 Players in Queue',
        value: `${queueCount}/10`,
        inline: true
      },
      {
        name: '⏱️ Status',
        value: session?.status === 'waiting' ? 
          (queueCount < 5 ? 'Waiting for players' : queueCount < 8 ? 'Almost ready!' : 'Ready to balance!') :
          session?.status || 'Waiting',
        inline: true
      }
    ]);

  // Add queue list if players are present
  if (queue && queue.length > 0 && session?.status === 'waiting') {
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

  // Add team display if balanced
  if (session?.team_a_data && session?.team_b_data && session.status !== 'waiting') {
    const teamAList = session.team_a_data
      .map((player: any, index: number) => {
        const rankEmoji = getRankEmoji(player.users?.current_rank || player.current_rank);
        const username = player.users?.discord_username || player.discord_username;
        const weight = player.evidenceWeight || player.weight_rating || 150;
        return `${index + 1}. ${rankEmoji} ${username} (${weight})`;
      })
      .join('\n');

    const teamBList = session.team_b_data
      .map((player: any, index: number) => {
        const rankEmoji = getRankEmoji(player.users?.current_rank || player.current_rank);
        const username = player.users?.discord_username || player.discord_username;
        const weight = player.evidenceWeight || player.weight_rating || 150;
        return `${index + 1}. ${rankEmoji} ${username} (${weight})`;
      })
      .join('\n');

    embed.addFields([
      {
        name: '🔴 Team A',
        value: teamAList || 'No players',
        inline: true
      },
      {
        name: '🔵 Team B', 
        value: teamBList || 'No players',
        inline: true
      }
    ]);

    // Add balance analysis
    if (session.balance_analysis) {
      const balance = session.balance_analysis;
      embed.addFields([
        {
          name: '⚖️ Balance Analysis',
          value: `Team A: ${Math.round(balance.teamAWeight || 0)} pts\nTeam B: ${Math.round(balance.teamBWeight || 0)} pts\nDifference: ${Math.round(balance.balanceScore || 0)} pts`,
          inline: false
        }
      ]);
    }
  }

  // Create appropriate buttons based on status
  const components = createQuickMatchButtons(session, queueCount);

  return { embed, components };
}

function createQuickMatchButtons(session: any, queueCount: number) {
  const buttons: any[] = [];
  
  if (!session || session.status === 'waiting') {
    buttons.push(
      new ButtonBuilder()
        .setCustomId('qm_join')
        .setLabel('Join Queue')
        .setStyle(ButtonStyle.Success)
        .setEmoji('⚡'),
      new ButtonBuilder()
        .setCustomId('qm_leave')
        .setLabel('Leave Queue')
        .setStyle(ButtonStyle.Danger)
        .setEmoji('🚪')
    );

    if (queueCount >= 10) {
      buttons.push(
        new ButtonBuilder()
          .setCustomId('qm_balance')
          .setLabel('Run Autobalance')
          .setStyle(ButtonStyle.Primary)
          .setEmoji('⚖️')
      );
    }

    buttons.push(
      new ButtonBuilder()
        .setCustomId('qm_refresh')
        .setLabel('Refresh')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('🔄')
    );
  }

  if (session?.status === 'voting') {
    // Map voting buttons will be added separately
    buttons.push(
      new ButtonBuilder()
        .setCustomId('qm_refresh')
        .setLabel('Refresh')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('🔄')
    );
  }

  if (session?.status === 'in_progress') {
    buttons.push(
      new ButtonBuilder()
        .setCustomId('qm_submit_score')
        .setLabel('Submit Score')
        .setStyle(ButtonStyle.Primary)
        .setEmoji('📊')
    );
  }

  if (session?.status === 'completed') {
    buttons.push(
      new ButtonBuilder()
        .setCustomId('qm_new_lobby')
        .setLabel('Start New Lobby')
        .setStyle(ButtonStyle.Success)
        .setEmoji('🆕')
    );
  }

  // Admin controls (always available)
  buttons.push(
    new ButtonBuilder()
      .setCustomId('qm_cancel')
      .setLabel('Cancel Lobby')
      .setStyle(ButtonStyle.Danger)
      .setEmoji('❌')
  );

  // Split into rows if needed (max 5 buttons per row)
  const rows: ActionRowBuilder<ButtonBuilder>[] = [];
  for (let i = 0; i < buttons.length; i += 5) {
    const row = new ActionRowBuilder<ButtonBuilder>()
      .addComponents(buttons.slice(i, i + 5));
    rows.push(row);
  }

  return rows;
}

export function createMapVotingEmbed(maps: any[], votes: any[] = [], sessionId: string) {
  const embed = new EmbedBuilder()
    .setTitle('🗳️ Map Voting')
    .setDescription('All 10 players must vote for the map. Most votes wins!')
    .setColor(0x9D4EDD);

  // Count votes per map
  const mapVotes: Record<string, number> = {};
  votes.forEach(vote => {
    mapVotes[vote.map_id] = (mapVotes[vote.map_id] || 0) + 1;
  });

  // Create map list with vote counts
  const mapList = maps
    .map(map => {
      const voteCount = mapVotes[map.id] || 0;
      const progressBar = '█'.repeat(Math.floor((voteCount / 10) * 10)) + '░'.repeat(10 - Math.floor((voteCount / 10) * 10));
      return `**${map.display_name}**: ${voteCount}/10 votes\n${progressBar}`;
    })
    .join('\n\n');

  embed.addFields([
    {
      name: 'Maps',
      value: mapList || 'No maps available',
      inline: false
    },
    {
      name: 'Progress',
      value: `${votes.length}/10 players have voted`,
      inline: false
    }
  ]);

  // Create map voting buttons
  const mapButtons = maps.slice(0, 5).map(map => // Limit to 5 maps per row
    new ButtonBuilder()
      .setCustomId(`vote_${map.id}`)
      .setLabel(map.display_name)
      .setStyle(ButtonStyle.Secondary)
      .setEmoji('🗺️')
  );

  const components = new ActionRowBuilder<ButtonBuilder>()
    .addComponents(mapButtons);

  return { embed, components: [components] };
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