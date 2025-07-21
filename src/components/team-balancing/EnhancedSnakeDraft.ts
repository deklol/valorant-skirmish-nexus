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
): { teams: any[][], adjustments: { swaps: Array<{ player1: string; player2: string; fromTeam: number; toTeam: number; reason: string; }> } } => {
  // Deep copy the teams to avoid direct mutation of the original array
  let adjustedTeams = JSON.parse(JSON.stringify(teams));
  const adjustments: { swaps: Array<{ player1: string; player2: string; fromTeam: number; toTeam: number; reason: string; }> } = { swaps: [] };

  let hasMadeSwap = true;
  const maxIterations = 5; // Limit iterations to prevent excessive computation
  let iterationCount = 0;

  // Continue iterating as long as swaps are being made and max iterations are not reached
  while (hasMadeSwap && iterationCount < maxIterations) {
    hasMadeSwap = false; // Assume no swap will be made in this iteration
    iterationCount++;

    const currentBalance = calculateFinalBalance(adjustedTeams);

    // If balance is already ideal, no further adjustments needed
    if (currentBalance.balanceQuality === 'ideal') {
      break;
    }

    // Find the team with the highest total points and the team with the lowest total points
    let highestTeamIndex = -1;
    let lowestTeamIndex = -1;
    let highestTeamPoints = -1;
    let lowestTeamPoints = Infinity;

    // Ensure there are at least two teams with members to consider for swapping
    const teamsWithMembers = adjustedTeams.filter(team => team.length > 0);
    if (teamsWithMembers.length < 2) {
        break; // Cannot perform swaps if less than 2 teams have members
    }

    // Recalculate team totals to ensure they are up-to-date after any previous swaps
    const teamTotals = adjustedTeams.map(team =>
        team.reduce((sum, player) => getRankPointsWithManualOverride(player).points + sum, 0)
    );

    for (let i = 0; i < adjustedTeams.length; i++) {
        if (teamTotals[i] > highestTeamPoints) {
            highestTeamPoints = teamTotals[i];
            highestTeamIndex = i;
        }
        if (teamTotals[i] < lowestTeamPoints) {
            lowestTeamPoints = teamTotals[i];
            lowestTeamIndex = i;
        }
    }

    // If highest and lowest are the same team, or no valid teams found, break
    if (highestTeamIndex === -1 || lowestTeamIndex === -1 || highestTeamIndex === lowestTeamIndex) {
        break;
    }

    let bestSwap: { playerA: any; playerB: any; fromTeam: number; toTeam: number; newMaxDiff: number } | null = null;
    let bestNewMaxDiff = currentBalance.maxPointDifference;

    // Iterate through players in the highest team
    for (const playerA of adjustedTeams[highestTeamIndex]) {
      // Iterate through players in the lowest team
      for (const playerB of adjustedTeams[lowestTeamIndex]) {
        // Calculate hypothetical new totals if playerA and playerB are swapped
        const playerAPoints = getRankPointsWithManualOverride(playerA).points;
        const playerBPoints = getRankPointsWithManualOverride(playerB).points;

        const hypotheticalHighestTeamPoints = highestTeamPoints - playerAPoints + playerBPoints;
        const hypotheticalLowestTeamPoints = lowestTeamPoints - playerBPoints + playerAPoints;

        // Create a temporary array of all team totals to find the new max difference
        const tempTeamTotals = [...teamTotals];
        tempTeamTotals[highestTeamIndex] = hypotheticalHighestTeamPoints;
        tempTeamTotals[lowestTeamIndex] = hypotheticalLowestTeamPoints;

        const hypotheticalMaxDiff = Math.max(...tempTeamTotals) - Math.min(...tempTeamTotals);

        // If this swap improves the balance, record it as the best so far for this iteration
        if (hypotheticalMaxDiff < bestNewMaxDiff) {
          bestNewMaxDiff = hypotheticalMaxDiff;
          bestSwap = {
            playerA,
            playerB,
            fromTeam: highestTeamIndex,
            toTeam: lowestTeamIndex,
            newMaxDiff: hypotheticalMaxDiff
          };
        }
      }
    }

    // Apply the best swap found in this iteration
    if (bestSwap) {
      // Remove playerA from highest team and add playerB
      adjustedTeams[bestSwap.fromTeam] = adjustedTeams[bestSwap.fromTeam].filter(
        (p: any) => p.id !== bestSwap.playerA.id
      );
      adjustedTeams[bestSwap.fromTeam].push(bestSwap.playerB);

      // Remove playerB from lowest team and add playerA
      adjustedTeams[bestSwap.toTeam] = adjustedTeams[bestSwap.toTeam].filter(
        (p: any) => p.id !== bestSwap.playerB.id
      );
      adjustedTeams[bestSwap.toTeam].push(bestSwap.playerA);

      // Update total weights for the swapped teams
      // Note: The totalWeight property on the team object itself is not directly used by calculateFinalBalance,
      // but it's good practice to keep it consistent if it's used elsewhere.
      adjustedTeams[bestSwap.fromTeam].totalWeight = adjustedTeams[bestSwap.fromTeam].reduce((sum: number, p: any) => getRankPointsWithManualOverride(p).points + sum, 0);
      adjustedTeams[bestSwap.toTeam].totalWeight = adjustedTeams[bestSwap.toTeam].reduce((sum: number, p: any) => getRankPointsWithManualOverride(p).points + sum, 0);

      adjustments.swaps.push({
        player1: bestSwap.playerA.discord_username,
        player2: bestSwap.playerB.discord_username,
        fromTeam: bestSwap.fromTeam + 1, // 1-indexed for display
        toTeam: bestSwap.toTeam + 1,     // 1-indexed for display
        reason: `Swapped to reduce max point difference from ${currentBalance.maxPointDifference} to ${bestNewMaxDiff}`
      });
      hasMadeSwap = true; // Indicate that a swap was made, continue iterating
    }
  }

  return {
    teams: adjustedTeams,
    adjustments
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
