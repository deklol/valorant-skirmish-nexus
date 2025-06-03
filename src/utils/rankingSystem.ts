
// TGH Skirmish Rank-to-Point System
export const RANK_POINT_MAPPING: Record<string, number> = {
  // Iron
  'Iron 1': 10,
  'Iron 2': 15,
  'Iron 3': 20,
  
  // Bronze
  'Bronze 1': 25,
  'Bronze 2': 30,
  'Bronze 3': 35,
  
  // Silver
  'Silver 1': 40,
  'Silver 2': 50,
  'Silver 3': 60,
  
  // Gold
  'Gold 1': 70,
  'Gold 2': 80,
  'Gold 3': 90,
  
  // Platinum
  'Platinum 1': 100,
  'Platinum 2': 115,
  'Platinum 3': 130,
  
  // Diamond
  'Diamond 1': 150,
  'Diamond 2': 170,
  'Diamond 3': 190,
  
  // Ascendant
  'Ascendant 1': 215,
  'Ascendant 2': 240,
  'Ascendant 3': 265,
  
  // Immortal
  'Immortal 1': 300,
  'Immortal 2': 350,
  'Immortal 3': 400,
  
  // Radiant
  'Radiant': 500,
  
  // Default/Unknown
  'Unranked': 150,
  'Phantom': 150
};

export const getRankPoints = (rank: string): number => {
  return RANK_POINT_MAPPING[rank] || 150;
};

export const calculateTeamBalance = (team1Points: number, team2Points: number) => {
  const delta = Math.abs(team1Points - team2Points);
  
  let balanceStatus: 'ideal' | 'good' | 'warning' | 'poor';
  if (delta <= 25) balanceStatus = 'ideal';
  else if (delta <= 50) balanceStatus = 'good';
  else if (delta <= 100) balanceStatus = 'warning';
  else balanceStatus = 'poor';

  return {
    delta,
    balanceStatus,
    team1Points,
    team2Points
  };
};

export const autoBalanceTeams = (players: any[], numTeams: number) => {
  // Separate real players from phantom players
  const realPlayers = players.filter(p => !p.is_phantom);
  const phantomPlayers = players.filter(p => p.is_phantom);

  // Sort real players by points (highest first)
  const sortedRealPlayers = [...realPlayers].sort((a, b) => {
    const aPoints = getRankPoints(a.current_rank || 'Unranked');
    const bPoints = getRankPoints(b.current_rank || 'Unranked');
    return bPoints - aPoints;
  });

  // Sort phantom players by points (highest first)
  const sortedPhantomPlayers = [...phantomPlayers].sort((a, b) => {
    const aPoints = getRankPoints(a.current_rank || 'Unranked');
    const bPoints = getRankPoints(b.current_rank || 'Unranked');
    return bPoints - aPoints;
  });

  // Initialize teams
  const teams = Array(numTeams).fill(null).map((_, index) => ({
    id: `team-${index + 1}`,
    name: `Team ${index + 1}`,
    players: [] as any[],
    totalPoints: 0
  }));

  // First, distribute real players using snake draft
  sortedRealPlayers.forEach((player, index) => {
    const teamIndex = index % numTeams;
    const targetTeam = teams[teamIndex];
    
    // Only add if team has space (max 5 players)
    if (targetTeam.players.length < 5) {
      const points = getRankPoints(player.current_rank || 'Unranked');
      targetTeam.players.push(player);
      targetTeam.totalPoints += points;
    }
  });

  // Then, fill remaining spots with phantom players if needed
  let phantomIndex = 0;
  for (const team of teams) {
    while (team.players.length < 5 && phantomIndex < sortedPhantomPlayers.length) {
      const phantomPlayer = sortedPhantomPlayers[phantomIndex];
      const points = getRankPoints(phantomPlayer.current_rank || 'Unranked');
      
      team.players.push(phantomPlayer);
      team.totalPoints += points;
      phantomIndex++;
    }
  }

  return teams;
};
