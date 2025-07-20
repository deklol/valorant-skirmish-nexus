// Enhanced Snake Draft Algorithm with proper alternating pattern
import { getRankPointsWithManualOverride } from "@/utils/rankingSystemWithOverrides";

export interface BalanceStep {
  step: number;
  player: {
    id: string;
    discord_username: string;
    points: number;
    rank: string;
    source: string;
  };
  assignedTeam: number;
  reasoning: string;
  teamStatesAfter: {
    teamIndex: number;
    totalPoints: number;
    playerCount: number;
  }[];
}

export interface EnhancedTeamResult {
  teams: any[][];
  balanceSteps: BalanceStep[];
  finalBalance: {
    averageTeamPoints: number;
    minTeamPoints: number;
    maxTeamPoints: number;
    maxPointDifference: number;
    balanceQuality: 'ideal' | 'good' | 'warning' | 'poor';
  };
}

/**
 * Enhanced snake draft algorithm with proper alternating pattern and detailed logging
 * Pattern: Team 1 → Team 2 → Team 3 → Team 3 → Team 2 → Team 1 → repeat
 */
export const enhancedSnakeDraft = (
  players: any[], 
  numTeams: number, 
  teamSize: number
): EnhancedTeamResult => {
  // Sort players by enhanced ranking system (highest first)
  const sortedPlayers = [...players].sort((a, b) => {
    const aRankResult = getRankPointsWithManualOverride(a);
    const bRankResult = getRankPointsWithManualOverride(b);
    return bRankResult.points - aRankResult.points;
  });

  // Initialize teams
  const teams: any[][] = Array(numTeams).fill(null).map(() => []);
  const balanceSteps: BalanceStep[] = [];
  
  let currentTeamIndex = 0;
  let direction = 1; // 1 for forward, -1 for backward
  let round = 0;

  for (let i = 0; i < sortedPlayers.length; i++) {
    const player = sortedPlayers[i];
    const rankResult = getRankPointsWithManualOverride(player);
    
    // Find next available team that has space
    let attempts = 0;
    while (teams[currentTeamIndex].length >= teamSize && attempts < numTeams) {
      // Move to next team in snake pattern
      currentTeamIndex += direction;
      
      // Handle direction reversal at boundaries
      if (currentTeamIndex >= numTeams) {
        currentTeamIndex = numTeams - 1;
        direction = -1;
      } else if (currentTeamIndex < 0) {
        currentTeamIndex = 0;
        direction = 1;
      }
      
      attempts++;
    }
    
    // If no teams have space, stop
    if (teams[currentTeamIndex].length >= teamSize) {
      break;
    }

    // Assign player to current team
    teams[currentTeamIndex].push(player);

    // Calculate team points after assignment
    const teamStatesAfter = teams.map((team, index) => ({
      teamIndex: index,
      totalPoints: team.reduce((sum, p) => {
        const result = getRankPointsWithManualOverride(p);
        return sum + result.points;
      }, 0),
      playerCount: team.length
    }));

    // Generate reasoning for this assignment
    const reasoning = generateAssignmentReasoning(
      player, 
      currentTeamIndex, 
      teamStatesAfter, 
      direction, 
      round,
      i
    );

    // Record this step
    balanceSteps.push({
      step: i + 1,
      player: {
        id: player.id,
        discord_username: player.discord_username || 'Unknown',
        points: rankResult.points,
        rank: rankResult.rank || 'Unranked',
        source: rankResult.source
      },
      assignedTeam: currentTeamIndex,
      reasoning,
      teamStatesAfter
    });

    // Move to next team in snake pattern for next iteration
    currentTeamIndex += direction;
    
    // Handle direction reversal at boundaries
    if (currentTeamIndex >= numTeams) {
      currentTeamIndex = numTeams - 1;
      direction = -1;
      round++;
    } else if (currentTeamIndex < 0) {
      currentTeamIndex = 0;
      direction = 1;
      round++;
    }
  }

  // Calculate final balance metrics
  const finalBalance = calculateFinalBalance(teams);

  return {
    teams,
    balanceSteps,
    finalBalance
  };
};

const generateAssignmentReasoning = (
  player: any,
  teamIndex: number,
  teamStates: any[],
  direction: number,
  round: number,
  step: number
): string => {
  const rankResult = getRankPointsWithManualOverride(player);
  const currentTeamPoints = teamStates[teamIndex].totalPoints;
  const playerName = player.discord_username || 'Unknown';
  
  if (step === 0) {
    return `First pick: Assigned ${playerName} (${rankResult.rank}, ${rankResult.points}pts) to Team ${teamIndex + 1} as highest-rated player.`;
  }

  if (step === 1) {
    return `Snake draft: Assigned ${playerName} (${rankResult.rank}, ${rankResult.points}pts) to Team ${teamIndex + 1} following snake pattern.`;
  }

  const directionText = direction === 1 ? 'ascending' : 'descending';
  const roundText = round > 0 ? ` (Round ${round + 1})` : '';
  
  return `Snake draft${roundText}: Assigned ${playerName} (${rankResult.rank}, ${rankResult.points}pts) to Team ${teamIndex + 1} in ${directionText} order. Team total: ${currentTeamPoints}pts.`;
};

const calculateFinalBalance = (teams: any[][]) => {
  const teamTotals = teams.map(team => 
    team.reduce((sum, player) => {
      const result = getRankPointsWithManualOverride(player);
      return sum + result.points;
    }, 0)
  );

  const averageTeamPoints = teamTotals.reduce((sum, total) => sum + total, 0) / teams.length;
  const minTeamPoints = Math.min(...teamTotals);
  const maxTeamPoints = Math.max(...teamTotals);
  const maxPointDifference = maxTeamPoints - minTeamPoints;

  let balanceQuality: 'ideal' | 'good' | 'warning' | 'poor';
  if (maxPointDifference <= 50) {
    balanceQuality = 'ideal';
  } else if (maxPointDifference <= 100) {
    balanceQuality = 'good';
  } else if (maxPointDifference <= 150) {
    balanceQuality = 'warning';
  } else {
    balanceQuality = 'poor';
  }

  return {
    averageTeamPoints: Math.round(averageTeamPoints),
    minTeamPoints,
    maxTeamPoints,
    maxPointDifference,
    balanceQuality
  };
};