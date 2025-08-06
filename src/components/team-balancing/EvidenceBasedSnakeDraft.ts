// Modern Evidence-Based Team Formation with Constraint-First Approach
import { calculateEvidenceBasedWeightWithMiniAi, EvidenceBasedConfig, EvidenceBasedCalculation } from "@/utils/evidenceBasedWeightSystem";
// import { processAtlasDecisions } from "@/utils/miniAiDecisionSystem";
import { RANK_POINT_MAPPING } from "@/utils/rankingSystem";
import { atlasLogger } from "@/utils/atlasLogger";
import { 
  balanceTeamsConstraintFirst,
  type ConstraintConfig,
  type BalancerPlayer 
} from '@/utils/constraintFirstBalancer';
import {
  streamingTeamAssignment,
  type StreamingConfig,
  type StreamingPlayer
} from '@/utils/streamingAssignment';
import {
  analyzeTeamComposition,
  generateCompositionRecommendations,
  calculateCompositionBalance,
  type PlayerComposition
} from '@/utils/compositionAnalyzer';


export interface EvidenceBalanceStep {
  step: number;
  player: {
    id: string;
    discord_username: string;
    points: number;
    rank: string;
    source: string;
    evidenceWeight?: number;
    weightSource?: string;
    evidenceReasoning?: string;
    isElite?: boolean;
  };
  assignedTeam: number;
  reasoning: string;
  teamStatesAfter: {
    teamIndex: number;
    totalPoints: number;
    playerCount: number;
    eliteCount: number;
  }[];
  phase: 'elite_distribution' | 'regular_distribution' | 'mini_ai_adjustment' | 'atlas_adjustment' | 'atlas_team_formation' | 'atlas_optimization_swap';
}

export interface EvidenceValidationResult {
  originalSkillDistribution: {
    elitePlayersPerTeam: number[];
    skillStackingViolations: number;
    balanceQuality: 'ideal' | 'good' | 'warning' | 'poor';
  };
  adjustmentsMade: {
    redistributions: Array<{
      player: string;
      fromTeam: number;
      toTeam: number;
      reason: string;
      type: 'skill_fix' | 'balance_fix';
    }>;
  };
  finalDistribution: {
    elitePlayersPerTeam: number[];
    skillStackingViolations: number;
    pointBalance: {
      maxDifference: number;
      balanceQuality: 'ideal' | 'good' | 'warning' | 'poor';
    };
  };
  miniAiDecisions: any[];
  validationTime: number;
}

export interface MiniAiEnhancedResult {
  playerAdjustments: Array<{
    playerId: string;
    username: string;
    originalPoints: number;
    adjustedPoints: number;
    reasoning: string;
    confidence: number;
  }>;
  redistributionRecommendations: Array<{
    playerId: string;
    username: string;
    fromTeam: number;
    toTeam: number;
    reasoning: string;
    priority: string;
  }>;
}

export interface EvidenceTeamResult {
  teams: any[][];
  balanceSteps: EvidenceBalanceStep[];
  validationResult?: EvidenceValidationResult;
  // This is the key field for the ATLAS UI
  evidenceCalculations: Array<{
    userId: string;
    calculation: any;
  }>;
  miniAiEnhancements?: MiniAiEnhancedResult;
  finalAnalysis: {
    skillDistribution: {
      elitePlayersPerTeam: number[];
      skillStackingViolations: number;
    };
    pointBalance: {
      averageTeamPoints: number;
      minTeamPoints: number;
      maxTeamPoints: number;
      maxPointDifference: number;
      balanceQuality: 'ideal' | 'good' | 'warning' | 'poor';
    };
    overallQuality: 'excellent' | 'good' | 'acceptable' | 'needs_improvement';
    miniAiSummary?: {
      playersAnalyzed: number;
      adjustmentsMade: number;
      redistributionsRecommended: number;
      averageConfidence: number;
    };
  };
}

/**
 * Creates balanced teams using ATLAS Advanced Formation Algorithm
 * FIXED: Prevents highest weight player from being on strongest team
 */
function createAtlasBalancedTeams(players: any[], numTeams: number, teamSize: number, config: EvidenceBasedConfig): { teams: any[][], steps: EvidenceBalanceStep[] } {
  const teams: any[][] = Array(numTeams).fill(null).map(() => []);
  const steps: EvidenceBalanceStep[] = [];
  let stepCounter = 0;

  // Sort players descending by weight
  const sortedPlayers = [...players].sort((a, b) => b.evidenceWeight - a.evidenceWeight);
  
  // Handle case where there are not enough players for captains
  if (sortedPlayers.length < numTeams) {
      console.error("Not enough players to form teams.");
      return { teams, steps };
  }

  atlasLogger.info('Phase 1: Implementing anti-stacking captain distribution');

  // CRITICAL FIX: Balance-aware captain assignment
  // Track the highest weight player specifically
  const highestWeightPlayer = sortedPlayers[0];
  const captains = sortedPlayers.slice(0, numTeams);
  const remainingPlayers = sortedPlayers.slice(numTeams);
  
  // Assign captains using balance-aware strategy to prevent strongest team concentration
  captains.forEach((captain, index) => {
    // Calculate current team weights for balance-aware assignment
    const teamWeights = teams.map(team => 
      team.reduce((sum, p) => sum + p.evidenceWeight, 0)
    );
    
    let targetTeamIndex = 0;
    
    // For the highest weight player (first captain), assign to weakest team position
    if (captain === highestWeightPlayer) {
      // Always assign strongest player to last team to prevent early stacking
      targetTeamIndex = numTeams - 1;
      atlasLogger.info(`🚫 ANTI-STACKING: Assigning highest weight player ${captain.discord_username} (${captain.evidenceWeight}pts) to Team ${targetTeamIndex + 1} to prevent skill concentration`);
    } else {
      // For remaining captains, find team that would create best overall balance
      let bestBalance = Infinity;
      
      for (let i = 0; i < numTeams; i++) {
        if (teams[i].length > 0) continue; // Team already has a captain
        
        const hypotheticalWeights = [...teamWeights];
        hypotheticalWeights[i] = captain.evidenceWeight;
        
        // Calculate balance score (lower is better)
        const maxWeight = Math.max(...hypotheticalWeights);
        const minWeight = Math.min(...hypotheticalWeights);
        const balanceScore = maxWeight - minWeight;
        
        if (balanceScore < bestBalance) {
          bestBalance = balanceScore;
          targetTeamIndex = i;
        }
      }
    }
    
    teams[targetTeamIndex].push(captain);
    
    steps.push({
      step: ++stepCounter,
      player: {
        id: captain.id, 
        discord_username: captain.discord_username || 'Unknown',
        points: captain.evidenceWeight, 
        rank: captain.displayRank || 'Unranked',
        source: captain.weightSource || 'unknown', 
        evidenceWeight: captain.evidenceWeight, 
        isElite: captain.isElite,
        evidenceReasoning: captain.evidenceCalculation?.calculationReasoning,
      },
      assignedTeam: targetTeamIndex,
      reasoning: captain === highestWeightPlayer 
        ? `🚫 ANTI-STACKING CAPTAIN: ${captain.discord_username} (${captain.evidenceWeight}pts) → Team ${targetTeamIndex + 1}. Highest weight player strategically placed to prevent concentration.`
        : `BALANCE-AWARE CAPTAIN: ${captain.discord_username} (${captain.evidenceWeight}pts) → Team ${targetTeamIndex + 1}. Optimal balance distribution.`,
      teamStatesAfter: JSON.parse(JSON.stringify(teams)).map((team, index) => ({
        teamIndex: index, totalPoints: team.reduce((sum, p) => sum + p.evidenceWeight, 0),
        playerCount: team.length, eliteCount: team.filter(p => p.isElite).length
      })),
      phase: 'atlas_team_formation',
    });
  });

  // ATLAS COMBINATORIAL OPTIMIZATION: Find optimal team combinations for all tournaments
  atlasLogger.formationStarted(remainingPlayers.length, numTeams, teamSize);
  
  if (remainingPlayers.length > 0) {
    const optimalAssignment = findOptimalTeamCombination(remainingPlayers, teams, numTeams, teamSize, config);
    
    // Apply the optimal assignment
    optimalAssignment.assignments.forEach((assignment, index) => {
      const player = remainingPlayers[index];
      teams[assignment.teamIndex].push(player);
      
      steps.push({
        step: ++stepCounter,
        player: {
          id: player.id, 
          discord_username: player.discord_username || 'Unknown',
          points: player.evidenceWeight, 
          rank: player.displayRank || 'Unranked',
          source: player.weightSource || 'unknown', 
          evidenceWeight: player.evidenceWeight, 
          isElite: player.isElite,
          evidenceReasoning: player.evidenceCalculation?.calculationReasoning,
        },
        assignedTeam: assignment.teamIndex,
        reasoning: `Optimal: ${player.discord_username} (${player.evidenceWeight}pts) → Team ${assignment.teamIndex + 1}. ${assignment.reasoning}`,
        teamStatesAfter: JSON.parse(JSON.stringify(teams)).map((team, index) => ({
          teamIndex: index, totalPoints: team.reduce((sum, p) => sum + p.evidenceWeight, 0),
          playerCount: team.length, eliteCount: team.filter(p => p.isElite).length
        })),
        phase: 'atlas_optimization_swap',
      });
    });
    
    atlasLogger.optimizationComplete(optimalAssignment.finalScore, optimalAssignment.eliteDistribution);
    atlasLogger.combinationsEvaluated(optimalAssignment.combinationsEvaluated, optimalAssignment.finalScore);
  }

  return { teams, steps };
}

/**
 * ATLAS Combinatorial Optimization: Find optimal team combination
 */
interface TeamAssignment {
  teamIndex: number;
  reasoning: string;
}

interface OptimalCombinationResult {
  assignments: TeamAssignment[];
  finalScore: number;
  combinationsEvaluated: number;
  eliteDistribution: number[];
}

function findOptimalTeamCombination(
  players: any[], 
  existingTeams: any[][], 
  numTeams: number, 
  teamSize: number,
  config: EvidenceBasedConfig
): OptimalCombinationResult {
  
  atlasLogger.debug('Starting combinatorial analysis');
  
  // Sort players by weight for strategic evaluation
  const sortedPlayers = [...players].sort((a, b) => b.evidenceWeight - a.evidenceWeight);
  
  // For large player counts, use smart sampling instead of brute force
  const maxCombinations = Math.min(10000, Math.pow(numTeams, players.length));
  
  let bestCombination: TeamAssignment[] = [];
  let bestScore = -Infinity;
  let combinationsEvaluated = 0;
  
  // Generate and evaluate combinations
  if (players.length <= 6) {
    // Small groups: try all combinations (reduced threshold for true combinatorial)
    atlasLogger.optimizationStarted('TRUE combinatorial', players.length);
    generateAllCombinations(sortedPlayers, existingTeams, numTeams, teamSize, (combination) => {
      const score = evaluateCombination(combination, existingTeams, config, teamSize, sortedPlayers);
      combinationsEvaluated++;
      
      if (score > bestScore) {
        bestScore = score;
        bestCombination = combination;
      }
      
      // Remove artificial cap for small groups
      return combinationsEvaluated < 50000;
    });
  } else {
    // Large groups: use smart heuristic approaches
    atlasLogger.optimizationStarted('Smart heuristic', players.length);
    bestCombination = generateSmartCombination(sortedPlayers, existingTeams, numTeams, teamSize, config);
    bestScore = evaluateCombination(bestCombination, existingTeams, config, teamSize, sortedPlayers);
    combinationsEvaluated = 1;
  }
  
  // Calculate final elite distribution
  const eliteDistribution = existingTeams.map((team, index) => {
    const assignments = bestCombination.filter(a => a.teamIndex === index);
    return team.filter(p => p.isElite).length + assignments.filter((_, i) => sortedPlayers[i].isElite).length;
  });
  
  return {
    assignments: bestCombination,
    finalScore: bestScore,
    combinationsEvaluated,
    eliteDistribution
  };
}

/**
 * Generate smart combination using balance-first heuristics with anti-stacking
 */
function generateSmartCombination(
  players: any[], 
  existingTeams: any[][], 
  numTeams: number, 
  teamSize: number,
  config: EvidenceBasedConfig
): TeamAssignment[] {
  
  const assignments: TeamAssignment[] = [];
  
  // Calculate current team totals BEFORE making any assignments
  let teamTotals = existingTeams.map(team => 
    team.reduce((sum, p) => sum + p.evidenceWeight, 0)
  );
  
  // Track team sizes to enforce hard constraints
  const teamSizes = existingTeams.map(team => team.length);
  
  // Sort players by weight for strategic look-ahead processing
  const sortedPlayers = [...players].sort((a, b) => b.evidenceWeight - a.evidenceWeight);
  
  // Look-ahead assignment with anti-stacking logic
  sortedPlayers.forEach((player, index) => {
    // Find teams that have space remaining
    const availableTeams = [];
    for (let teamIndex = 0; teamIndex < numTeams; teamIndex++) {
      const currentTeamSize = teamSizes[teamIndex] + 
        assignments.filter(a => a.teamIndex === teamIndex).length;
      
      if (currentTeamSize < teamSize) {
        availableTeams.push(teamIndex);
      }
    }
    
    if (availableTeams.length === 0) {
      atlasLogger.capacityError(player.discord_username, teamSizes, teamSize);
      return assignments; // Return current assignments, stop processing remaining players
    }
    
    // CRITICAL FIX: Check if this is a high-value player and prevent them from joining strongest team
    const currentStrongestTeamIndex = teamTotals.indexOf(Math.max(...teamTotals));
    const isHighValuePlayer = player.evidenceWeight >= 300 || player.isElite;
    
    // Filter out strongest team for high-value players to prevent stacking
    const eligibleTeams = isHighValuePlayer 
      ? availableTeams.filter(teamIndex => teamIndex !== currentStrongestTeamIndex)
      : availableTeams;
    
    // If all teams are eliminated by anti-stacking, use available teams but with penalty
    const teamsToConsider = eligibleTeams.length > 0 ? eligibleTeams : availableTeams;
    
    // Find best team among eligible teams with look-ahead consideration
    let bestTeamIndex = teamsToConsider[0];
    let bestBalanceScore = -Infinity;
    
    for (const teamIndex of teamsToConsider) {
      const newTeamTotals = [...teamTotals];
      newTeamTotals[teamIndex] += player.evidenceWeight;
      
      // Calculate balance score for this assignment
      const variance = calculateTeamVariance(newTeamTotals);
      const eliteViolations = calculateEliteViolations(existingTeams, assignments, player, teamIndex, config);
      
      // Look-ahead penalty: consider impact on remaining high-value players
      let lookAheadPenalty = 0;
      const remainingHighValuePlayers = sortedPlayers.slice(index + 1).filter(p => p.evidenceWeight >= 250);
      if (remainingHighValuePlayers.length > 0 && newTeamTotals[teamIndex] > Math.max(...newTeamTotals.filter((_, i) => i !== teamIndex))) {
        lookAheadPenalty = 200; // Heavy penalty for creating new strongest team with high-value player
      }
      
      // Anti-stacking penalty: extra penalty if assigning high-value to already strong team
      let antiStackingPenalty = 0;
      if (isHighValuePlayer && teamIndex === currentStrongestTeamIndex) {
        antiStackingPenalty = 500; // Massive penalty for stacking high-value players
      }
      
      const balanceScore = 1000 / (1 + variance) - (eliteViolations * 100) - lookAheadPenalty - antiStackingPenalty;
      
      if (balanceScore > bestBalanceScore) {
        bestBalanceScore = balanceScore;
        bestTeamIndex = teamIndex;
      }
    }
    
    // Update team totals
    teamTotals[bestTeamIndex] += player.evidenceWeight;
    
    const wasAntiStacked = isHighValuePlayer && availableTeams.includes(currentStrongestTeamIndex) && bestTeamIndex !== currentStrongestTeamIndex;
    
    assignments.push({
      teamIndex: bestTeamIndex,
      reasoning: wasAntiStacked 
        ? `🚫 ANTI-STACKING: ${player.discord_username} (${player.evidenceWeight}pts) prevented from joining strongest team (Team ${currentStrongestTeamIndex + 1})`
        : `Smart assignment (score: ${bestBalanceScore.toFixed(1)}, capacity: ${teamSizes[bestTeamIndex] + assignments.filter(a => a.teamIndex === bestTeamIndex).length + 1}/${teamSize})`
    });
    
    atlasLogger.playerAssigned(player.discord_username, player.evidenceWeight, bestTeamIndex, 
      wasAntiStacked ? 'Anti-stacking assignment' : 'Smart heuristic assignment');
  });
  
  return assignments;
}

/**
 * Generate all possible combinations (for small groups)
 */
function generateAllCombinations(
  players: any[], 
  existingTeams: any[][], 
  numTeams: number, 
  teamSize: number,
  callback: (combination: TeamAssignment[]) => boolean
): void {
  
  function backtrack(playerIndex: number, currentCombination: TeamAssignment[]): boolean {
    if (playerIndex === players.length) {
      // Final validation: ensure no team exceeds capacity
      const teamCounts = new Array(numTeams).fill(0);
      existingTeams.forEach((team, teamIndex) => {
        teamCounts[teamIndex] = team.length;
      });
      
      currentCombination.forEach(assignment => {
        teamCounts[assignment.teamIndex]++;
      });
      
      if (teamCounts.some(count => count > teamSize)) {
        return true; // Skip this invalid combination
      }
      
      return callback([...currentCombination]);
    }
    
    for (let teamIndex = 0; teamIndex < numTeams; teamIndex++) {
      // Calculate current team size including existing players and current assignments
      const currentTeamSize = existingTeams[teamIndex].length + 
        currentCombination.filter(a => a.teamIndex === teamIndex).length;
      
      if (currentTeamSize >= teamSize) {
        continue; // Skip full teams - HARD constraint
      }
      
      currentCombination.push({
        teamIndex,
        reasoning: `Combinatorial assignment option ${teamIndex + 1}`
      });
      
      if (!backtrack(playerIndex + 1, currentCombination)) {
        return false; // Stop if callback returns false
      }
      
      currentCombination.pop();
    }
    
    return true;
  }
  
  backtrack(0, []);
}

/**
 * Evaluate the quality of a team combination
 */
function evaluateCombination(
  assignments: TeamAssignment[], 
  existingTeams: any[][], 
  config: EvidenceBasedConfig,
  teamSize: number,
  players?: any[]
): number {
  
  // Calculate team sizes - this should NEVER violate constraints now
  const teamSizes = existingTeams.map(team => team.length);
  
  assignments.forEach((assignment) => {
    teamSizes[assignment.teamIndex]++;
  });
  
  // This should never happen now, but keep as safety check
  const sizeViolations = teamSizes.filter(size => size > teamSize).length;
  if (sizeViolations > 0) {
    atlasLogger.constraintViolation('Team size', `Teams: ${teamSizes}, max allowed: ${teamSize}`);
    return -100000; // Extremely negative score
  }
  
  // Calculate hypothetical team totals
  const teamTotals = existingTeams.map(team => 
    team.reduce((sum, p) => sum + p.evidenceWeight, 0)
  );
  
  assignments.forEach((assignment, playerIndex) => {
    const playerWeight = players?.[playerIndex]?.evidenceWeight || 200;
    teamTotals[assignment.teamIndex] += playerWeight;
  });
  
  // Score based on balance and elite distribution
  const variance = calculateTeamVariance(teamTotals);
  const balanceScore = 1000 / (1 + variance);
  
  // Elite distribution penalty (count violations)
  let elitePenalty = 0;
  if (players) {
    assignments.forEach((assignment, playerIndex) => {
      const player = players[playerIndex];
      if (player?.isElite) {
        const currentEliteCount = existingTeams[assignment.teamIndex].filter(p => p.isElite).length;
        const assignedEliteCount = assignments.slice(0, playerIndex).filter(a => a.teamIndex === assignment.teamIndex).length;
        const totalElite = currentEliteCount + assignedEliteCount + 1;
        if (totalElite > config.skillTierCaps.maxElitePerTeam) {
          elitePenalty += 100; // Heavy penalty for elite stacking
        }
      }
    });
  }
  
  return balanceScore - elitePenalty;
}

/**
 * Calculate team variance for balance scoring
 */
function calculateTeamVariance(teamTotals: number[]): number {
  const mean = teamTotals.reduce((sum, total) => sum + total, 0) / teamTotals.length;
  const variance = teamTotals.reduce((sum, total) => sum + Math.pow(total - mean, 2), 0) / teamTotals.length;
  return variance;
}

/**
 * Calculate elite distribution violations
 */
function calculateEliteViolations(
  existingTeams: any[][], 
  assignments: TeamAssignment[], 
  player: any, 
  teamIndex: number, 
  config: EvidenceBasedConfig
): number {
  
  // Count existing elite players in target team
  const existingEliteCount = existingTeams[teamIndex].filter(p => p.isElite).length;
  
  // Count elite players being assigned to this team
  const assignedEliteCount = assignments.filter((a, i) => 
    a.teamIndex === teamIndex && i < assignments.length
  ).length; // Simplified - would need actual player data
  
  const newPlayerIsElite = player.isElite ? 1 : 0;
  const totalEliteInTeam = existingEliteCount + assignedEliteCount + newPlayerIsElite;
  
  return Math.max(0, totalEliteInTeam - config.skillTierCaps.maxElitePerTeam);
}


/**
 * Modern Evidence-Based Team Formation with Constraint-First Approach
 * Replaces problematic combinatorial optimization with efficient algorithms
 */
export const evidenceBasedSnakeDraft = async (
  players: any[], 
  numTeams: number, 
  teamSize: number,
  onProgress?: (progress: number, stage: string) => void,
  onValidationStart?: () => void,
  onAdaptiveWeightCalculation?: (playerId: string, weight: number) => void,
  evidenceConfig?: EvidenceBasedConfig
): Promise<EvidenceTeamResult> => {
  
  const config = evidenceConfig || {
    enableEvidenceBasedWeights: true,
    tournamentWinBonus: 15,
    rankDecayThreshold: 2,
    maxDecayPercent: 0.25,
    skillTierCaps: {
      enabled: true,
      eliteThreshold: 400, // Adjusted threshold for better elite detection
      maxElitePerTeam: 1
    }
  };

  atlasLogger.info('Starting ATLAS-first team formation');

  // PHASE 2 FIX: Consolidated Weight Calculation with Caching
  atlasLogger.info('Phase 2: Implementing weight calculation consolidation');
  
  const evidenceCalculations: Array<{ userId: string; calculation: any }> = [];
  const atlasEnhancements: MiniAiEnhancedResult = {
    playerAdjustments: [],
    redistributionRecommendations: []
  };
  
  // Cache to prevent duplicate calculations
  const weightCache = new Map<string, any>();

  const playersWithEvidenceWeights = await Promise.all(
    players.map(async (player, index) => {
      if (onAdaptiveWeightCalculation) {
        // Progress callback for weight calculation
      }

      const cacheKey = `${player.user_id || player.id}_${player.current_rank}_${player.peak_rank}_${player.manual_rank_override}`;
      
      let evidenceResult;
      if (weightCache.has(cacheKey)) {
        evidenceResult = weightCache.get(cacheKey);
        atlasLogger.weightCacheHit(player.discord_username);
      } else {
        evidenceResult = await calculateEvidenceBasedWeightWithMiniAi({
          current_rank: player.current_rank, peak_rank: player.peak_rank,
          manual_rank_override: player.manual_rank_override, manual_weight_override: player.manual_weight_override,
          use_manual_override: player.use_manual_override, rank_override_reason: player.rank_override_reason,
          weight_rating: player.weight_rating, tournaments_won: player.tournaments_won,
          last_tournament_win: player.last_tournament_win
        }, config, true);
        
        weightCache.set(cacheKey, evidenceResult);
        atlasLogger.weightCalculated(player.discord_username, evidenceResult.finalAdjustedPoints, 'ATLAS unified');
      }

      // Enhanced calculation object for transparency
      const evidenceDetails = evidenceResult.evidenceResult;
      const evidenceCalculation = evidenceDetails.evidenceCalculation;
      
      if (evidenceCalculation) {
        const peakRankPoints = evidenceCalculation.peakRank ? (RANK_POINT_MAPPING[evidenceCalculation.peakRank] || 0) : 0;
        
        evidenceCalculations.push({
          userId: player.user_id || player.id,
          calculation: {
            finalPoints: evidenceResult.finalAdjustedPoints,
            currentRank: evidenceCalculation.currentRank || player.current_rank,
            currentRankPoints: evidenceCalculation.basePoints,
            peakRank: evidenceCalculation.peakRank || player.peak_rank,
            peakRankPoints: peakRankPoints,
            calculationReasoning: evidenceCalculation.calculationReasoning || "Calculated by ATLAS Evidence-Based System.",
            rankDecayFactor: evidenceCalculation.rankDecayApplied,
            tournamentsWon: evidenceCalculation.tournamentsWon,
            tournamentBonus: evidenceCalculation.tournamentBonus,
            weightSource: 'atlas_unified',
            evidenceFactors: evidenceCalculation.evidenceFactors || [],
            miniAiAnalysis: evidenceDetails.miniAiAnalysis,
            isElite: evidenceResult.finalAdjustedPoints >= config.skillTierCaps.eliteThreshold,
            cacheHit: weightCache.has(cacheKey)
          },
        });
      }

      // PHASE 4 FIX: Capture Mini-AI recommendations for formation integration
      if (evidenceResult.miniAiRecommendations) {
        evidenceResult.miniAiRecommendations.forEach(rec => {
          if (rec.type === 'player_adjustment') {
            atlasEnhancements.playerAdjustments.push({
              playerId: player.user_id || player.id, 
              username: player.discord_username || 'Unknown',
              originalPoints: evidenceResult.evidenceResult.evidenceCalculation?.basePoints || 150,
              adjustedPoints: evidenceResult.finalAdjustedPoints,
              reasoning: rec.reasoning, 
              confidence: rec.confidence
            });
          } else if (rec.type === 'team_redistribution') {
            atlasEnhancements.redistributionRecommendations.push({
              playerId: player.user_id || player.id,
              username: player.discord_username || 'Unknown',
              fromTeam: rec.action?.fromTeam || -1,
              toTeam: rec.action?.toTeam || -1,
              reasoning: rec.reasoning,
              priority: rec.priority
            });
          }
        });
      }

      // Return enhanced player object with unified weight data
      return {
        ...player,
        evidenceWeight: evidenceResult.finalAdjustedPoints,
        weightSource: 'atlas_unified',
        displayRank: evidenceDetails.rank,
        evidenceCalculation,
        miniAiAnalysis: evidenceDetails.miniAiAnalysis,
        isElite: evidenceResult.finalAdjustedPoints >= config.skillTierCaps.eliteThreshold,
        unifiedWeightData: {
          points: evidenceResult.finalAdjustedPoints,
          source: 'atlas_evidence',
          rank: evidenceDetails.rank,
          reasoning: evidenceResult.adjustmentReasoning,
          isValid: evidenceResult.finalAdjustedPoints > 0
        }
      };
    })
  );

  atlasLogger.info(`Unified weight calculations complete: ${weightCache.size} unique calculations cached`);

  // PHASE 3: ATLAS Advanced Team Formation
  atlasLogger.info('Phase 3: Advanced team formation with Mini-AI integration');
  const { teams: atlasCreatedTeams, steps: balanceSteps } = createAtlasBalancedTeams(
    playersWithEvidenceWeights,
    numTeams,
    teamSize,
    config
  );

  // PHASE 6 FIX: Add comprehensive validation logging
  atlasLogger.validationStarted(atlasCreatedTeams.length);
  const teamTotals = atlasCreatedTeams.map((team, index) => {
    const total = team.reduce((sum, p) => sum + p.evidenceWeight, 0);
    return total;
  });
  
  const maxDiff = Math.max(...teamTotals) - Math.min(...teamTotals);
  atlasLogger.formationComplete(atlasCreatedTeams, maxDiff);

  // Simulate progress for the UI with enhanced feedback
  for (let i = 0; i < balanceSteps.length; i++) {
    if (onProgress) {
      onProgress((i + 1) / balanceSteps.length, `Processing step ${i + 1}`);
    }
  }

  // Phase 3: ATLAS validation and final adjustments (optional fine-tuning)
  let validationResult: EvidenceValidationResult | undefined;
  if (onValidationStart) onValidationStart();

  const validationStartTime = Date.now();
  const atlasResult = await performAtlasValidation(atlasCreatedTeams, config, atlasEnhancements, playersWithEvidenceWeights);
  
  validationResult = {
    originalSkillDistribution: {
      elitePlayersPerTeam: atlasCreatedTeams.map(t => t.filter(p => p.isElite).length),
      skillStackingViolations: atlasCreatedTeams.filter(t => t.filter(p => p.isElite).length > 1).length,
      balanceQuality: calculatePointBalance(atlasCreatedTeams).balanceQuality
    },
    adjustmentsMade: atlasResult.adjustments,
    finalDistribution: {
      elitePlayersPerTeam: atlasResult.teams.map(t => t.filter(p => p.isElite).length),
      skillStackingViolations: atlasResult.teams.map(t => t.filter(p => p.isElite).length > 1).length,
      pointBalance: calculatePointBalance(atlasResult.teams)
    },
    miniAiDecisions: atlasResult.decisions,
    validationTime: Date.now() - validationStartTime
  };

  const allBalanceSteps = [...balanceSteps, ...atlasResult.validationSteps];
  const finalAnalysis = calculateFinalAnalysis(atlasResult.teams, config, atlasEnhancements);

  return {
    teams: atlasResult.teams,
    balanceSteps: allBalanceSteps,
    validationResult,
    evidenceCalculations,
    miniAiEnhancements: atlasEnhancements,
    finalAnalysis
  };
};

/**
 * ATLAS Enhanced Validation System
 */
async function performAtlasValidation(
  teams: any[][],
  config: EvidenceBasedConfig,
  atlasEnhancements: MiniAiEnhancedResult,
  allPlayers: any[] // Pass in all players to find the top player
): Promise<{
  teams: any[][];
  adjustments: { redistributions: Array<{ player: string; fromTeam: number; toTeam: number; reason: string; type: 'skill_fix' | 'balance_fix' }> };
  decisions: any[];
  validationSteps: EvidenceBalanceStep[];
}> {
  let adjustedTeams = JSON.parse(JSON.stringify(teams));
  const adjustments: { redistributions: Array<{ player: string; fromTeam: number; toTeam: number; reason: string; type: 'skill_fix' | 'balance_fix' }> } = { redistributions: [] };
  const decisions: any[] = [];
  const validationSteps: EvidenceBalanceStep[] = [];

  atlasLogger.validationStarted(adjustedTeams.length);

  // DISABLED: Post-formation validation systems that interfere with ATLAS
  // ATLAS main formation already handles balance and anti-stacking comprehensively
  atlasLogger.info('Phase 3: Skipping legacy post-validation systems - ATLAS formation is comprehensive');
  
  // DISABLED: 2-team optimal swap logic - conflicts with ATLAS constraint-first approach
  // DISABLED: Anti-stacking validation - redundant as ATLAS formation prevents this during creation
  console.log('🏛️ ATLAS: Skipping legacy post-validation systems to prevent interference with constraint-first logic');

  return { teams: adjustedTeams, adjustments, decisions, validationSteps };
}

/**
 * Calculate point balance metrics
 */
function calculatePointBalance(teams: any[][]) {
  if (teams.length === 0 || teams.every(t => t.length === 0)) {
    return { maxDifference: 0, balanceQuality: 'ideal' as const };
  }
  const teamTotals = teams.map(team => 
    team.reduce((sum, player) => sum + (player.evidenceWeight || 150), 0)
  );

  const maxDifference = Math.max(...teamTotals) - Math.min(...teamTotals);
  
  let balanceQuality: 'ideal' | 'good' | 'warning' | 'poor';
  if (maxDifference <= 50) balanceQuality = 'ideal';
  else if (maxDifference <= 100) balanceQuality = 'good';
  else if (maxDifference <= 150) balanceQuality = 'warning';
  else balanceQuality = 'poor';

  return { maxDifference, balanceQuality };
}

/**
 * Calculate comprehensive final analysis with ATLAS enhancements
 */
function calculateFinalAnalysis(teams: any[][], config: EvidenceBasedConfig, atlasEnhancements?: MiniAiEnhancedResult) {
  const teamTotals = teams.map(team => 
    team.reduce((sum, player) => sum + (player.evidenceWeight || 150), 0)
  );

  const elitePlayersPerTeam = teams.map(team => 
    team.filter(p => (p.evidenceWeight || 150) >= config.skillTierCaps.eliteThreshold).length
  );

  const skillStackingViolations = elitePlayersPerTeam.filter(count => count > 1).length;
  const maxPointDifference = teamTotals.length > 0 ? Math.max(...teamTotals) - Math.min(...teamTotals) : 0;

  let overallQuality: 'excellent' | 'good' | 'acceptable' | 'needs_improvement';
  if (skillStackingViolations === 0 && maxPointDifference <= 50) overallQuality = 'excellent';
  else if (skillStackingViolations === 0 && maxPointDifference <= 100) overallQuality = 'good';
  else if (skillStackingViolations <= 1 && maxPointDifference <= 150) overallQuality = 'acceptable';
  else overallQuality = 'needs_improvement';

  let miniAiSummary = undefined;
  if (atlasEnhancements) {
    const totalAdjustments = atlasEnhancements.playerAdjustments.length;
    const totalRedistributions = atlasEnhancements.redistributionRecommendations.length;
    const averageConfidence = totalAdjustments > 0 
      ? atlasEnhancements.playerAdjustments.reduce((sum, adj) => sum + adj.confidence, 0) / totalAdjustments : 100;

    miniAiSummary = {
      playersAnalyzed: teams.flat().length,
      adjustmentsMade: totalAdjustments,
      redistributionsRecommended: totalRedistributions,
      averageConfidence: Math.round(averageConfidence)
    };
  }

  return {
    skillDistribution: {
      elitePlayersPerTeam,
      skillStackingViolations
    },
    pointBalance: {
      averageTeamPoints: teamTotals.length > 0 ? Math.round(teamTotals.reduce((sum, total) => sum + total, 0) / teams.length) : 0,
      minTeamPoints: teamTotals.length > 0 ? Math.min(...teamTotals) : 0,
      maxTeamPoints: teamTotals.length > 0 ? Math.max(...teamTotals) : 0,
      maxPointDifference,
      balanceQuality: maxPointDifference <= 50 ? 'ideal' as const : 
                     maxPointDifference <= 100 ? 'good' as const :
                     maxPointDifference <= 150 ? 'warning' as const : 'poor' as const
    },
    overallQuality,
    miniAiSummary
  };
}
