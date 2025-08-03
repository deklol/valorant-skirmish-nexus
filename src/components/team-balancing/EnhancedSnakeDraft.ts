// Enhanced Snake Draft Algorithm with adaptive weights and proper alternating pattern
import { getRankPointsWithManualOverride } from "@/utils/rankingSystemWithOverrides";
import { calculateAdaptiveWeight, EnhancedAdaptiveResult, AdaptiveWeightConfig } from "@/utils/adaptiveWeightSystem";

export interface BalanceStep {
  step: number;
  player: {
    id: string;
    discord_username: string;
    points: number;
    rank: string;
    source: string;
    adaptiveWeight?: number;
    weightSource?: string;
    adaptiveReasoning?: string;
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
  adaptiveWeightCalculations?: Array<{
    userId: string;
    calculation: any;
  }>;
  finalBalance: {
    averageTeamPoints: number;
    minTeamPoints: number;
    maxTeamPoints: number;
    maxPointDifference: number;
    balanceQuality: 'ideal' | 'good' | 'warning' | 'poor';
  };
}

/**
 * Enhanced snake draft with CUMULATIVE BALANCE SYSTEM - distributes based on running team totals
 */
export const enhancedSnakeDraft = (
  players: any[], 
  numTeams: number, 
  teamSize: number,
  onProgress?: (step: BalanceStep, currentStep: number, totalSteps: number) => void,
  onValidationStart?: () => void,
  onAdaptiveWeightCalculation?: (phase: string, current: number, total: number) => void,
  adaptiveConfig?: AdaptiveWeightConfig
): EnhancedTeamResult => {
  
  // Calculate adaptive weights for all players
  const adaptiveWeightCalculations: Array<{ userId: string; calculation: any }> = [];
  const playersWithAdaptiveWeights = players.map((player, index) => {
    if (onAdaptiveWeightCalculation) {
      onAdaptiveWeightCalculation('calculating', index + 1, players.length);
    }

    const adaptiveResult = adaptiveConfig?.enableAdaptiveWeights 
      ? calculateAdaptiveWeight({
          current_rank: player.current_rank,
          peak_rank: player.peak_rank,
          manual_rank_override: player.manual_rank_override,
          manual_weight_override: player.manual_weight_override,
          use_manual_override: player.use_manual_override,
          rank_override_reason: player.rank_override_reason,
          weight_rating: player.weight_rating
        }, adaptiveConfig, player.last_rank_update ? new Date(player.last_rank_update) : undefined)
      : getRankPointsWithManualOverride({
          current_rank: player.current_rank,
          peak_rank: player.peak_rank,
          manual_rank_override: player.manual_rank_override,
          manual_weight_override: player.manual_weight_override,
          use_manual_override: player.use_manual_override,
          rank_override_reason: player.rank_override_reason,
          weight_rating: player.weight_rating
        });

    const adaptiveCalculation = (adaptiveResult as any).adaptiveCalculation;
    if (adaptiveCalculation) {
      adaptiveCalculation.userId = player.user_id || player.id;
      adaptiveWeightCalculations.push({
        userId: player.user_id || player.id,
        calculation: adaptiveCalculation
      });
    }

    return {
      ...player,
      adaptiveWeight: adaptiveResult.points,
      weightSource: adaptiveResult.source,
      adaptiveCalculation
    };
  });

  // Sort players by points (highest first)
  const sortedPlayers = playersWithAdaptiveWeights.sort((a, b) => b.adaptiveWeight - a.adaptiveWeight);

  // Initialize teams
  let teams: any[][] = Array(numTeams).fill(null).map(() => []);
  const balanceSteps: BalanceStep[] = [];
  let stepCounter = 0;

  // CUMULATIVE BALANCE ASSIGNMENT: Always assign to the team with the lowest current total
  const assignPlayerToLowestTeam = (player: any): number => {
    const teamTotals = teams.map(team => 
      team.reduce((sum, p) => sum + p.adaptiveWeight, 0)
    );
    
    // Find team with lowest total that still has space
    let lowestTeamIndex = 0;
    let lowestTotal = Infinity;
    
    for (let i = 0; i < numTeams; i++) {
      if (teams[i].length < teamSize && teamTotals[i] < lowestTotal) {
        lowestTotal = teamTotals[i];
        lowestTeamIndex = i;
      }
    }
    
    return lowestTeamIndex;
  };

  // Assign each player to the team with the lowest current total
  sortedPlayers.forEach(player => {
    const targetTeamIndex = assignPlayerToLowestTeam(player);
    teams[targetTeamIndex].push(player);
    
    const teamStatesAfter = teams.map((team, index) => ({
      teamIndex: index,
      totalPoints: team.reduce((sum, p) => sum + p.adaptiveWeight, 0),
      playerCount: team.length
    }));

    const balanceStep: BalanceStep = {
      step: ++stepCounter,
      player: {
        id: player.id,
        discord_username: player.discord_username || 'Unknown',
        points: player.adaptiveWeight,
        rank: (player.adaptiveCalculation as any)?.rank || player.current_rank || 'Unranked',
        source: player.weightSource,
        adaptiveWeight: player.adaptiveWeight,
        weightSource: player.weightSource,
        adaptiveReasoning: (player.adaptiveCalculation as any)?.calculationReasoning
      },
      assignedTeam: targetTeamIndex,
      reasoning: `CUMULATIVE BALANCE: Assigned ${player.discord_username} (${player.adaptiveWeight}pts) to Team ${targetTeamIndex + 1} (lowest total: ${teamStatesAfter[targetTeamIndex].totalPoints - player.adaptiveWeight}pts → ${teamStatesAfter[targetTeamIndex].totalPoints}pts)`,
      teamStatesAfter
    };

    balanceSteps.push(balanceStep);

    if (onProgress) {
      onProgress(balanceStep, stepCounter, players.length);
    }
  });

  // Post-validation - only if ATLAS is not enabled
  let validationResult: ValidationResult | undefined;
  let finalBalance = calculateFinalBalance(teams);
  let allBalanceSteps = balanceSteps;

  if (!adaptiveConfig?.enableAdaptiveWeights) {
    if (onValidationStart) {
      onValidationStart();
    }

    const initialBalance = calculateFinalBalance(teams);
    const validationStartTime = Date.now();

    const validatedTeams = performSimplifiedPostValidation(teams, balanceSteps);
    finalBalance = calculateFinalBalance(validatedTeams.teams);

    validationResult = {
      originalBalance: initialBalance,
      adjustmentsMade: validatedTeams.adjustments,
      finalBalance,
      validationTime: Date.now() - validationStartTime
    };

    allBalanceSteps = [...balanceSteps, ...validatedTeams.validationSteps];
    teams = validatedTeams.teams;
  } else {
    console.log("🤖 ATLAS enabled - skipping post-validation to preserve strategic team composition");
  }

  return {
    teams,
    balanceSteps: allBalanceSteps,
    validationResult,
    adaptiveWeightCalculations: adaptiveWeightCalculations.length > 0 ? adaptiveWeightCalculations : undefined,
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
  const playerPoints = player.adaptiveWeight;
  const currentTeamPoints = teamStates[teamIndex].totalPoints;
  const playerName = player.discord_username || 'Unknown';
  const rank = (player.adaptiveCalculation as any)?.rank || player.current_rank || 'Unranked';
  const weightSource = player.weightSource;
  
  if (step === 0) {
    const sourceText = weightSource === 'adaptive_weight' ? ' [Adaptive]' :
                      weightSource === 'manual_override' ? ' [Override]' : 
                      weightSource === 'peak_rank' ? ' [Peak]' : '';
    return `First pick (Round ${round}): Assigned ${playerName} (${rank}, ${playerPoints}pts${sourceText}) to Team ${teamIndex + 1} as highest-weighted player.`;
  }

  const directionText = direction === 1 ? 'ascending' : 'descending';
  const sourceText = weightSource === 'adaptive_weight' ? ' [Adaptive]' :
                    weightSource === 'manual_override' ? ' [Override]' : 
                    weightSource === 'peak_rank' ? ' [Peak]' : '';
  
  return `Snake draft Round ${round} (${directionText}): Assigned ${playerName} (${rank}, ${playerPoints}pts${sourceText}) to Team ${teamIndex + 1}. Team total: ${currentTeamPoints}pts.`;
};

const calculateSimplifiedBalance = (teams: any[][]) => {
  const teamTotals = teams.map(team => 
    team.reduce((sum, player) => sum + (player.adaptiveWeight || 150), 0)
  );

  const maxPointDifference = Math.max(...teamTotals) - Math.min(...teamTotals);
  
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
    maxPointDifference,
    balanceQuality
  };
};

const performSimplifiedPostValidation = (
  teams: any[][],
  balanceSteps: BalanceStep[]
): { teams: any[][], adjustments: { swaps: Array<{ player1: string; player2: string; fromTeam: number; toTeam: number; reason: string; }> }, validationSteps: BalanceStep[] } => {
  // Since tier distribution is handled upfront, this only does minimal point balancing
  let adjustedTeams = JSON.parse(JSON.stringify(teams));
  const adjustments: { swaps: Array<{ player1: string; player2: string; fromTeam: number; toTeam: number; reason: string; }> } = { swaps: [] };
  const validationSteps: BalanceStep[] = [];

  const currentBalance = calculateSimplifiedBalance(adjustedTeams);
  
  // Only proceed if balance is poor (>150 point difference)
  if (currentBalance.maxPointDifference <= 150) {
    return {
      teams: adjustedTeams,
      adjustments,
      validationSteps
    };
  }

  // Find the single best swap to improve balance (limited to 1 iteration)
  const teamTotals = adjustedTeams.map(team =>
    team.reduce((sum, player) => sum + (player.adaptiveWeight || 150), 0)
  );

  let bestSwap: { playerA: any; playerB: any; fromTeam: number; toTeam: number; newMaxDiff: number } | null = null;
  let bestNewMaxDiff = currentBalance.maxPointDifference;

  for (let teamA = 0; teamA < adjustedTeams.length; teamA++) {
    for (let teamB = teamA + 1; teamB < adjustedTeams.length; teamB++) {
      if (adjustedTeams[teamA].length === 0 || adjustedTeams[teamB].length === 0) {
        continue;
      }

      for (const playerA of adjustedTeams[teamA]) {
        for (const playerB of adjustedTeams[teamB]) {
          const playerAPoints = playerA.adaptiveWeight || 150;
          const playerBPoints = playerB.adaptiveWeight || 150;

          const hypotheticalTeamAPoints = teamTotals[teamA] - playerAPoints + playerBPoints;
          const hypotheticalTeamBPoints = teamTotals[teamB] - playerBPoints + playerAPoints;

          const tempTeamTotals = [...teamTotals];
          tempTeamTotals[teamA] = hypotheticalTeamAPoints;
          tempTeamTotals[teamB] = hypotheticalTeamBPoints;

          const hypotheticalMaxDiff = Math.max(...tempTeamTotals) - Math.min(...tempTeamTotals);

          if (hypotheticalMaxDiff < bestNewMaxDiff) {
            bestNewMaxDiff = hypotheticalMaxDiff;
            bestSwap = {
              playerA,
              playerB,
              fromTeam: teamA,
              toTeam: teamB,
              newMaxDiff: hypotheticalMaxDiff
            };
          }
        }
      }
    }
  }

  // Apply the best swap if found
  if (bestSwap) {
    adjustedTeams[bestSwap.fromTeam] = adjustedTeams[bestSwap.fromTeam].filter(
      (p: any) => p.id !== bestSwap.playerA.id
    );
    adjustedTeams[bestSwap.fromTeam].push(bestSwap.playerB);

    adjustedTeams[bestSwap.toTeam] = adjustedTeams[bestSwap.toTeam].filter(
      (p: any) => p.id !== bestSwap.playerB.id
    );
    adjustedTeams[bestSwap.toTeam].push(bestSwap.playerA);

    const swapReason = `MINIMAL POST-BALANCE: Swapped ${bestSwap.playerA.discord_username} (${bestSwap.playerA.adaptiveWeight}pts) with ${bestSwap.playerB.discord_username} (${bestSwap.playerB.adaptiveWeight}pts) to improve point balance only.`;

    const swapStep: BalanceStep = {
      step: balanceSteps.length + 1,
      player: {
        id: `simplified-swap-1`,
        discord_username: `${bestSwap.playerA.discord_username} ↔ ${bestSwap.playerB.discord_username}`,
        points: 0,
        rank: 'MINIMAL POST-BALANCE SWAP',
        source: 'simplified_post_validation',
        adaptiveWeight: 0
      },
      assignedTeam: -1,
      reasoning: swapReason,
      teamStatesAfter: adjustedTeams.map((team, index) => ({
        teamIndex: index,
        totalPoints: team.reduce((sum, p) => sum + (p.adaptiveWeight || 150), 0),
        playerCount: team.length
      }))
    };

    validationSteps.push(swapStep);

    adjustments.swaps.push({
      player1: bestSwap.playerA.discord_username,
      player2: bestSwap.playerB.discord_username,
      fromTeam: bestSwap.fromTeam + 1,
      toTeam: bestSwap.toTeam + 1,
      reason: swapReason
    });
  }

  return {
    teams: adjustedTeams,
    adjustments,
    validationSteps
  };
};

const performPostBalanceValidation = (
  teams: any[][],
  initialBalance: any
): { teams: any[][], adjustments: { swaps: Array<{ player1: string; player2: string; fromTeam: number; toTeam: number; reason: string; }> }, validationSteps: BalanceStep[] } => {
  // Deep copy the teams to avoid direct mutation of the original array
  let adjustedTeams = JSON.parse(JSON.stringify(teams));
  const adjustments: { swaps: Array<{ player1: string; player2: string; fromTeam: number; toTeam: number; reason: string; }> } = { swaps: [] };
  const validationSteps: BalanceStep[] = [];

  let hasMadeSwap = true;
  const maxIterations = 10; // Increased iterations for better optimization
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

    // Ensure there are at least two teams with members to consider for swapping
    const teamsWithMembers = adjustedTeams.filter(team => team.length > 0);
    if (teamsWithMembers.length < 2) {
        break; // Cannot perform swaps if less than 2 teams have members
    }

    // Recalculate team totals to ensure they are up-to-date after any previous swaps
    const teamTotals = adjustedTeams.map(team =>
        team.reduce((sum, player) => sum + (player.adaptiveWeight || 150), 0)
    );

    let bestSwap: { playerA: any; playerB: any; fromTeam: number; toTeam: number; newMaxDiff: number } | null = null;
    let bestNewMaxDiff = currentBalance.maxPointDifference;

    // Try ALL possible swaps between ALL teams (not just highest vs lowest)
    for (let teamA = 0; teamA < adjustedTeams.length; teamA++) {
      for (let teamB = teamA + 1; teamB < adjustedTeams.length; teamB++) {
        // Skip if either team is empty
        if (adjustedTeams[teamA].length === 0 || adjustedTeams[teamB].length === 0) {
          continue;
        }

        // Try swapping every player from teamA with every player from teamB
        for (const playerA of adjustedTeams[teamA]) {
          for (const playerB of adjustedTeams[teamB]) {
            // Calculate hypothetical new totals if playerA and playerB are swapped
            const playerAPoints = playerA.adaptiveWeight || 150;
            const playerBPoints = playerB.adaptiveWeight || 150;

            const hypotheticalTeamAPoints = teamTotals[teamA] - playerAPoints + playerBPoints;
            const hypotheticalTeamBPoints = teamTotals[teamB] - playerBPoints + playerAPoints;

            // Create a temporary array of all team totals to find the new max difference
            const tempTeamTotals = [...teamTotals];
            tempTeamTotals[teamA] = hypotheticalTeamAPoints;
            tempTeamTotals[teamB] = hypotheticalTeamBPoints;

            const hypotheticalMaxDiff = Math.max(...tempTeamTotals) - Math.min(...tempTeamTotals);

            // If this swap improves the balance, record it as the best so far for this iteration
            if (hypotheticalMaxDiff < bestNewMaxDiff) {
              bestNewMaxDiff = hypotheticalMaxDiff;
              bestSwap = {
                playerA,
                playerB,
                fromTeam: teamA,
                toTeam: teamB,
                newMaxDiff: hypotheticalMaxDiff
              };
            }
          }
        }
      }
    }

    // Apply the best swap found in this iteration
    if (bestSwap) {
      // Remove playerA from teamA and add playerB
      adjustedTeams[bestSwap.fromTeam] = adjustedTeams[bestSwap.fromTeam].filter(
        (p: any) => p.id !== bestSwap.playerA.id
      );
      adjustedTeams[bestSwap.fromTeam].push(bestSwap.playerB);

      // Remove playerB from teamB and add playerA
      adjustedTeams[bestSwap.toTeam] = adjustedTeams[bestSwap.toTeam].filter(
        (p: any) => p.id !== bestSwap.playerB.id
      );
      adjustedTeams[bestSwap.toTeam].push(bestSwap.playerA);

      // Record the swap with adaptive weight context
      const playerASource = bestSwap.playerA.weightSource || 'current_rank';
      const playerBSource = bestSwap.playerB.weightSource || 'current_rank';
      const swapReason = `Post-Balance Optimization: Swapped ${bestSwap.playerA.discord_username} (${bestSwap.playerA.adaptiveWeight}pts, ${playerASource}) with ${bestSwap.playerB.discord_username} (${bestSwap.playerB.adaptiveWeight}pts, ${playerBSource}) to improve team balance. Reduced max point difference from ${currentBalance.maxPointDifference} to ${bestNewMaxDiff}pts and prevent skill stacking.`;

      // Add validation step for this swap
      const swapStep: BalanceStep = {
        step: teams.reduce((sum, team) => sum + team.length, 0) + adjustments.swaps.length + 1,
        player: {
          id: `swap-${adjustments.swaps.length + 1}`,
          discord_username: `${bestSwap.playerA.discord_username} ↔ ${bestSwap.playerB.discord_username}`,
          points: 0,
          rank: 'POST-BALANCE SWAP',
          source: 'post_balance_validation',
          adaptiveWeight: 0
        },
        assignedTeam: -1,
        reasoning: swapReason,
        teamStatesAfter: adjustedTeams.map((team, index) => ({
          teamIndex: index,
          totalPoints: team.reduce((sum, p) => sum + (p.adaptiveWeight || 150), 0),
          playerCount: team.length
        }))
      };

      validationSteps.push(swapStep);

      adjustments.swaps.push({
        player1: bestSwap.playerA.discord_username,
        player2: bestSwap.playerB.discord_username,
        fromTeam: bestSwap.fromTeam + 1, // 1-indexed for display
        toTeam: bestSwap.toTeam + 1,     // 1-indexed for display
        reason: swapReason
      });
      hasMadeSwap = true; // Indicate that a swap was made, continue iterating
    }
  }

  return {
    teams: adjustedTeams,
    adjustments,
    validationSteps
  };
};

const calculateFinalBalance = (teams: any[][]) => {
  const teamTotals = teams.map(team => 
    team.reduce((sum, player) => {
      const points = player.adaptiveWeight || getRankPointsWithManualOverride(player).points;
      return sum + points;
    }, 0)
  );

  const averageTeamPoints = teamTotals.reduce((sum, total) => sum + total, 0) / teams.length;
  const minTeamPoints = Math.min(...teamTotals);
  const maxTeamPoints = Math.max(...teamTotals);
  const maxPointDifference = maxTeamPoints - minTeamPoints;

  // Since tier distribution is handled upfront, we only focus on point balance
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