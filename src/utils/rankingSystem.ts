// TGH Skirmish Rank-to-Point System with Peak Rank Fallback
export const RANK_POINT_MAPPING: Record<string, number> = {
  // Iron
  'Iron 1': 25,
  'Iron 2': 30,
  'Iron 3': 35,
  
  // Bronze
  'Bronze 1': 40,
  'Bronze 2': 45,
  'Bronze 3': 50,
  
  // Silver
  'Silver 1': 55,
  'Silver 2': 60,
  'Silver 3': 65,
  
  // Gold
  'Gold 1': 70,
  'Gold 2': 75,
  'Gold 3': 80,
  
  // Platinum
  'Platinum 1': 85,
  'Platinum 2': 90,
  'Platinum 3': 95,
  
  // Ascendant
  'Ascendant 1': 120,
  'Ascendant 2': 150,
  'Ascendant 3': 180,
  
  // Immortal
  'Immortal 1': 210,
  'Immortal 2': 270,
  'Immortal 3': 330,
  
  // Radiant
  'Radiant': 500,
  
  // Default/Unknown
  'Unranked': 150,
  'Phantom': 150
};

export interface RankPointsResult {
  points: number;
  usingPeakRank: boolean;
  peakRank?: string;
  currentRank: string;
}

export const getRankPoints = (rank: string): number => {
  return RANK_POINT_MAPPING[rank] || 150;
};

/**
 * Enhanced getRankPoints that supports peak rank fallback for unrated players
 * Returns both points and metadata about fallback usage
 */
export const getRankPointsWithFallback = (
  currentRank: string, 
  peakRank?: string | null
): RankPointsResult => {
  const normalizedCurrentRank = currentRank || 'Unranked';
  const normalizedPeakRank = peakRank || null;
  
  // If current rank is Unranked/Unrated and we have a peak rank, use peak rank
  if ((normalizedCurrentRank === 'Unranked' || normalizedCurrentRank === 'Unrated') && normalizedPeakRank) {
    return {
      points: getRankPoints(normalizedPeakRank),
      usingPeakRank: true,
      peakRank: normalizedPeakRank,
      currentRank: normalizedCurrentRank
    };
  }
  
  // Otherwise use current rank
  return {
    points: getRankPoints(normalizedCurrentRank),
    usingPeakRank: false,
    currentRank: normalizedCurrentRank
  };
};

export const calculateTeamBalance = (team1Points: number, team2Points: number) => {
  const delta = Math.abs(team1Points - team2Points);
  
  let balanceStatus: 'ideal' | 'good' | 'warning' | 'poor';
  let statusColor: string;
  let statusMessage: string;
  
  if (delta <= 25) {
    balanceStatus = 'ideal';
    statusColor = 'text-green-400';
    statusMessage = 'Perfectly balanced teams';
  } else if (delta <= 50) {
    balanceStatus = 'good';
    statusColor = 'text-blue-400';
    statusMessage = 'Well balanced teams';
  } else if (delta <= 100) {
    balanceStatus = 'warning';
    statusColor = 'text-yellow-400';
    statusMessage = 'Teams could be better balanced';
  } else {
    balanceStatus = 'poor';
    statusColor = 'text-red-400';
    statusMessage = '⚠️ Teams are poorly balanced - consider rebalancing';
  }

  return {
    delta,
    balanceStatus,
    statusColor,
    statusMessage,
    team1Points,
    team2Points
  };
};

export const autoBalanceTeams = (players: any[], numTeams: number) => {
  // Separate real players from phantom players
  const realPlayers = players.filter(p => !p.is_phantom);
  const phantomPlayers = players.filter(p => p.is_phantom);

  // Sort real players by weight_rating (highest first) - enhanced with peak rank fallback
  const sortedRealPlayers = [...realPlayers].sort((a, b) => {
    const aRankResult = getRankPointsWithFallback(a.current_rank, a.peak_rank);
    const bRankResult = getRankPointsWithFallback(b.current_rank, b.peak_rank);
    const aPoints = a.weight_rating || aRankResult.points;
    const bPoints = b.weight_rating || bRankResult.points;
    return bPoints - aPoints;
  });

  // Sort phantom players by weight_rating (highest first)
  const sortedPhantomPlayers = [...phantomPlayers].sort((a, b) => {
    const aPoints = a.weight_rating || getRankPoints(a.current_rank || 'Unranked');
    const bPoints = b.weight_rating || getRankPoints(b.current_rank || 'Unranked');
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

  // First, distribute real players evenly across teams using snake draft
  let currentTeamIndex = 0;
  const allPlayersToDistribute = [...sortedRealPlayers];

  // Add phantom players only if we need more players to fill teams
  const spotsAfterRealPlayers = playersToDistribute - realPlayers.length;
  if (spotsAfterRealPlayers > 0) {
    allPlayersToDistribute.push(...sortedPhantomPlayers.slice(0, spotsAfterRealPlayers));
  }

  // Distribute players using snake draft for maximum balance
  let direction = 1; // 1 for forward, -1 for backward
  
  for (const player of allPlayersToDistribute) {
    // Find the team with the lowest total points that has space
    const availableTeams = teams.filter(team => team.players.length < 5);
    if (availableTeams.length === 0) break;
    
    // Use snake draft pattern
    const targetTeam = availableTeams[currentTeamIndex % availableTeams.length];
    
    const rankResult = getRankPointsWithFallback(player.current_rank, player.peak_rank);
    const points = player.weight_rating || rankResult.points;
    targetTeam.players.push({
      ...player,
      _rankingMeta: rankResult // Store ranking metadata for UI display
    });
    targetTeam.totalPoints += points;
    
    // Move to next team in snake pattern
    currentTeamIndex += direction;
    
    // Reverse direction when we reach the end
    if (currentTeamIndex >= availableTeams.length) {
      currentTeamIndex = availableTeams.length - 1;
      direction = -1;
    } else if (currentTeamIndex < 0) {
      currentTeamIndex = 0;
      direction = 1;
    }
  }

  return teams;
};
