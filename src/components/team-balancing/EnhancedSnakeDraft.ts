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
 * Enhanced snake draft algorithm with adaptive weights, detailed progress tracking and post-balance validation
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
  
  // Calculate adaptive weights for all players if enabled
  const adaptiveWeightCalculations: Array<{ userId: string; calculation: any }> = [];
  const playersWithAdaptiveWeights = players.map((player, index) => {
    // Call progress callback for adaptive weight calculation
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

    // Store adaptive calculation if available (only for EnhancedAdaptiveResult)
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

  // Sort players by adaptive weight (highest first)
  const sortedPlayers = [...playersWithAdaptiveWeights].sort((a, b) => {
    return b.adaptiveWeight - a.adaptiveWeight;
  });

  // Initialize teams
  const teams: any[][] = Array(numTeams).fill(null).map(() => []);
  const balanceSteps: BalanceStep[] = [];
  
  let currentTeamIndex = 0;
  let direction = 1;
  let round = 1;

  for (let i = 0; i < sortedPlayers.length; i++) {
    const player = sortedPlayers[i];
    const playerPoints = player.adaptiveWeight;
    
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

    // Calculate team points after assignment using adaptive weights
    const teamStatesAfter = teams.map((team, index) => ({
      teamIndex: index,
      totalPoints: team.reduce((sum, p) => sum + (p.adaptiveWeight || 150), 0),
      playerCount: team.length
    }));

    // Enhanced reasoning with adaptive weight information
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
        points: playerPoints,
        rank: (player.adaptiveCalculation as any)?.rank || player.current_rank || 'Unranked',
        source: player.weightSource,
        adaptiveWeight: playerPoints,
        weightSource: player.weightSource,
        adaptiveReasoning: (player.adaptiveCalculation as any)?.calculationReasoning
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

  // Add validation steps to the main balance steps array
  const allBalanceSteps = [...balanceSteps, ...validatedTeams.validationSteps];

  return {
    teams: validatedTeams.teams,
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
      // Use adaptive weight if available, otherwise fall back to manual override system
      const points = player.adaptiveWeight || getRankPointsWithManualOverride(player).points;
      return sum + points;
    }, 0)
  );

  const averageTeamPoints = teamTotals.reduce((sum, total) => sum + total, 0) / teams.length;
  const minTeamPoints = Math.min(...teamTotals);
  const maxTeamPoints = Math.max(...teamTotals);
  const maxPointDifference = maxTeamPoints - minTeamPoints;

  // Calculate skill distribution penalty for avoiding "skill stacking"
  let skillDistributionPenalty = 0;
  teams.forEach((team, teamIndex) => {
    const teamPoints = team.map(player => player.adaptiveWeight || getRankPointsWithManualOverride(player).points);
    
    // Count players in different skill tiers
    const highTierPlayers = teamPoints.filter(points => points >= 300).length; // Immortal+ tier
    const upperMidTierPlayers = teamPoints.filter(points => points >= 240 && points < 300).length; // Ascendant tier
    
    // MUCH stronger penalty for skill stacking to match user's preferred distribution
    if (highTierPlayers >= 3) {
      skillDistributionPenalty += (highTierPlayers - 2) * 100; // 100 point penalty per extra high-tier player
    }
    
    if (highTierPlayers >= 2) {
      skillDistributionPenalty += (highTierPlayers - 1) * 60; // 60 point penalty for having 2+ high-tier players
    }
    
    // Penalize teams with both high-tier stacking AND upper-mid stacking
    if (highTierPlayers >= 2 && upperMidTierPlayers >= 2) {
      skillDistributionPenalty += 80; // Additional penalty for tier stacking
    }
    
    // Calculate combined high-tier points (300+) - this should be spread evenly
    const highTierTotalPoints = teamPoints.filter(points => points >= 300).reduce((sum, points) => sum + points, 0);
    if (highTierTotalPoints > 650) { // More than ~2.2 high-tier players worth
      skillDistributionPenalty += (highTierTotalPoints - 650) / 5; // Penalty for concentrating too much high-tier skill
    }
    
    // Calculate skill variance within team (prefer smoother skill curves)
    const teamAvg = teamPoints.reduce((sum, points) => sum + points, 0) / teamPoints.length;
    const skillVariance = teamPoints.reduce((sum, points) => sum + Math.pow(points - teamAvg, 2), 0) / teamPoints.length;
    
    // Reward teams with better skill distribution (lower variance)
    if (skillVariance < 8000) { // Well-distributed skill levels
      skillDistributionPenalty -= 15; // 15 point bonus for good distribution
    }
  });

  const adjustedPointDifference = maxPointDifference + skillDistributionPenalty;

  let balanceQuality: 'ideal' | 'good' | 'warning' | 'poor';
  if (adjustedPointDifference <= 50) {
    balanceQuality = 'ideal';
  } else if (adjustedPointDifference <= 100) {
    balanceQuality = 'good';
  } else if (adjustedPointDifference <= 150) {
    balanceQuality = 'warning';
  } else {
    balanceQuality = 'poor';
  }

  return {
    averageTeamPoints: Math.round(averageTeamPoints),
    minTeamPoints,
    maxTeamPoints,
    maxPointDifference: adjustedPointDifference,
    balanceQuality,
    skillDistributionPenalty
  };
};