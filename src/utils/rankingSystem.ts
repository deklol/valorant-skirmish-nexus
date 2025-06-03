
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

  // Calculate how many players each team should have (max 5 per team)
  const totalAvailableSlots = numTeams * 5;
  const totalPlayers = realPlayers.length + phantomPlayers.length;
  const playersToDistribute = Math.min(totalPlayers, totalAvailableSlots);

  // First, distribute real players evenly across teams using round-robin
  let currentTeamIndex = 0;
  const allPlayersToDistribute = [...sortedRealPlayers];

  // Add phantom players only if we need more players to fill teams
  const spotsAfterRealPlayers = playersToDistribute - realPlayers.length;
  if (spotsAfterRealPlayers > 0) {
    allPlayersToDistribute.push(...sortedPhantomPlayers.slice(0, spotsAfterRealPlayers));
  }

  // Distribute players round-robin style, ensuring no team exceeds 5 players
  for (const player of allPlayersToDistribute) {
    // Find the next team that has space (less than 5 players)
    let attempts = 0;
    while (teams[currentTeamIndex].players.length >= 5 && attempts < numTeams) {
      currentTeamIndex = (currentTeamIndex + 1) % numTeams;
      attempts++;
    }

    // If we found a team with space, add the player
    if (teams[currentTeamIndex].players.length < 5) {
      const points = getRankPoints(player.current_rank || 'Unranked');
      teams[currentTeamIndex].players.push(player);
      teams[currentTeamIndex].totalPoints += points;
      
      // Move to next team for round-robin distribution
      currentTeamIndex = (currentTeamIndex + 1) % numTeams;
    }
  }

  return teams;
};
