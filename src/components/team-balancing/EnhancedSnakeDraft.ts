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
  round?: number;
  direction?: 'ascending' | 'descending';
}

export interface ValidationResult {
  originalBalance: {
    maxPointDifference: number;
    balanceQuality: 'ideal' | 'good' | 'warning' | 'poor';
  };
  adjustmentsMade: {
    swaps: Array<{
      player1: string;
      player2: string;
      fromTeam: number;
      toTeam: number;
      reason: string;
    }>;
  };
  finalBalance: {
    maxPointDifference: number;
    balanceQuality: 'ideal' | 'good' | 'warning' | 'poor';
  };
  validationTime: number;
}

export interface EnhancedTeamResult {
  teams: any[][];
  balanceSteps: BalanceStep[];
  validationResult?: ValidationResult;
  finalBalance: {
    averageTeamPoints: number;
    minTeamPoints: number;
    maxTeamPoints: number;
    maxPointDifference: number;
    balanceQuality: 'ideal' | 'good' | 'warning' | 'poor';
  };
}

/**
 * Enhanced snake draft algorithm with detailed progress tracking and post-balance validation
 */
export const enhancedSnakeDraft = (
  players: any[], 
  numTeams: number, 
  teamSize: number,
  onProgress?: (step: BalanceStep, currentStep: number, totalSteps: number) => void,
  onValidationStart?: () => void
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
  let direction = 1;
  let round = 1;

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
        round++;
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

    // Enhanced reasoning with round and direction info
    const reasoning = generateEnhancedReasoning(
      player, 
      currentTeamIndex, 
      teamStatesAfter, 
      direction, 
      round,
      i
    );

    const balanceStep: BalanceStep = {
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
      teamStatesAfter,
      round,
      direction: direction === 1 ? 'ascending' : 'descending'
    };

    balanceSteps.push(balanceStep);

    // Call progress callback if provided
    if (onProgress) {
      onProgress(balanceStep, i + 1, sortedPlayers.length);
    }

    // Move to next team in snake pattern for next iteration
    currentTeamIndex += direction;
    
    // Handle direction reversal at boundaries
    if (currentTeamIndex >= numTeams) {
      currentTeamIndex = numTeams - 1;
      direction = -1;
    } else if (currentTeamIndex < 0) {
      currentTeamIndex = 0;
      direction = 1;
      round++;
    }
  }

  // Post-balance validation phase
  let validationResult: ValidationResult | undefined;
  if (onValidationStart) {
    onValidationStart();
  }

  const initialBalance = calculateFinalBalance(teams);
  const validationStartTime = Date.now();

  // Perform validation and potential adjustments
  const validatedTeams = performPostBalanceValidation(teams, initialBalance);
  const finalBalance = calculateFinalBalance(validatedTeams.teams);

  validationResult = {
    originalBalance: initialBalance,
    adjustmentsMade: validatedTeams.adjustments,
    finalBalance,
    validationTime: Date.now() - validationStartTime
  };

  return {
    teams: validatedTeams.teams,
    balanceSteps,
    validationResult,
    finalBalance
  };
};

const generateEnhancedReasoning = (
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
    return `First pick (Round ${round}): Assigned ${playerName} (${rankResult.rank}, ${rankResult.points}pts) to Team ${teamIndex + 1} as highest-rated player.`;
  }

  const directionText = direction === 1 ? 'ascending' : 'descending';
  const sourceText = rankResult.source === 'manual_override' ? ' [Override]' : 
                    rankResult.source === 'peak_rank' ? ' [Peak]' : '';
  
  return `Snake draft Round ${round} (${directionText}): Assigned ${playerName} (${rankResult.rank}, ${rankResult.points}pts${sourceText}) to Team ${teamIndex + 1}. Team total: ${currentTeamPoints}pts.`;
};

const performPostBalanceValidation = (
  teams: any[][],
  initialBalance: any
): { teams: any[][], adjustments: any[] } => {
  // For now, return teams as-is with no adjustments
  // This can be enhanced later with actual balance adjustment logic
  return {
    teams,
    adjustments: []
  };
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
