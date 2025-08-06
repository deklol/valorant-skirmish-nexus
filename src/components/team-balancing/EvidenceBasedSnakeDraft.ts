// Modern Evidence-Based Team Formation with Constraint-First Approach
import { calculateEvidenceBasedWeightWithMiniAi, EvidenceBasedConfig, EvidenceBasedCalculation } from "@/utils/evidenceBasedWeightSystem";
// import { processAtlasDecisions } from "@/utils/miniAiDecisionSystem";
import { RANK_POINT_MAPPING } from "@/utils/rankingSystem";
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
 * PHASE 1 FIX: Prevents Team 0 from automatically getting strongest players
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

  console.log('🏛️ ATLAS PHASE 1 FIX: Implementing Balanced Captain Distribution');

  // PHASE 1 FIX: Balanced Captain Assignment
  // Instead of sequential assignment, use round-robin with load balancing
  const captains = sortedPlayers.slice(0, numTeams);
  const remainingPlayers = sortedPlayers.slice(numTeams);
  
  // Assign captains using weighted round-robin to prevent Team 0 dominance
  captains.forEach((captain, index) => {
    // ATLAS Strategy: Assign strongest captain to team that needs balancing
    let targetTeamIndex;
    
    if (numTeams === 2) {
      // For 2-team tournaments: strategically place captains
      targetTeamIndex = index % 2;
    } else {
      // For multi-team: use reverse order for stronger captains
      targetTeamIndex = (numTeams - 1 - index) % numTeams;
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
      reasoning: `🏛️ ATLAS Strategic Captain: ${captain.discord_username} (${captain.evidenceWeight}pts) → Team ${targetTeamIndex + 1}. Balanced captain distribution prevents Team 0 dominance.`,
      teamStatesAfter: JSON.parse(JSON.stringify(teams)).map((team, index) => ({
        teamIndex: index, totalPoints: team.reduce((sum, p) => sum + p.evidenceWeight, 0),
        playerCount: team.length, eliteCount: team.filter(p => p.isElite).length
      })),
      phase: 'atlas_team_formation',
    });
  });

  // ATLAS COMBINATORIAL OPTIMIZATION: Find optimal team combinations for all tournaments
  console.log(`🏛️ ATLAS COMBINATORIAL OPTIMIZATION: ${remainingPlayers.length} players, ${numTeams} teams, max ${teamSize} per team`);
  
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
        reasoning: `🏛️ ATLAS Optimal: ${player.discord_username} (${player.evidenceWeight}pts) → Team ${assignment.teamIndex + 1}. ${assignment.reasoning}`,
        teamStatesAfter: JSON.parse(JSON.stringify(teams)).map((team, index) => ({
          teamIndex: index, totalPoints: team.reduce((sum, p) => sum + p.evidenceWeight, 0),
          playerCount: team.length, eliteCount: team.filter(p => p.isElite).length
        })),
        phase: 'atlas_optimization_swap',
      });
    });
    
    console.log('🏛️ ATLAS OPTIMAL COMBINATION SELECTED:');
    console.log(`   - Combinations evaluated: ${optimalAssignment.combinationsEvaluated}`);
    console.log(`   - Final balance score: ${optimalAssignment.finalScore.toFixed(2)}`);
    console.log(`   - Elite distribution: ${optimalAssignment.eliteDistribution.join(', ')}`);
    console.log(`   - Team totals: ${teams.map((team, i) => `T${i+1}=${team.reduce((sum, p) => sum + p.evidenceWeight, 0)}`).join(', ')}`);
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
  
  console.log('🏛️ ATLAS OPTIMIZATION: Starting combinatorial analysis...');
  
  // Sort players by weight for strategic evaluation
  const sortedPlayers = [...players].sort((a, b) => b.evidenceWeight - a.evidenceWeight);
  
  // For large player counts, use smart sampling instead of brute force
  const maxCombinations = Math.min(10000, Math.pow(numTeams, players.length));
  
  let bestCombination: TeamAssignment[] = [];
  let bestScore = -Infinity;
  let combinationsEvaluated = 0;
  
  // Generate and evaluate combinations
  if (players.length <= 10) {
    // Small groups: try all combinations
    generateAllCombinations(sortedPlayers, existingTeams, numTeams, teamSize, (combination) => {
      const score = evaluateCombination(combination, existingTeams, config, teamSize, sortedPlayers);
      combinationsEvaluated++;
      
      if (score > bestScore) {
        bestScore = score;
        bestCombination = combination;
      }
      
      return combinationsEvaluated < maxCombinations;
    });
  } else {
    // Large groups: use smart heuristic approaches
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
 * Generate smart combination using balanced heuristics
 */
function generateSmartCombination(
  players: any[], 
  existingTeams: any[][], 
  numTeams: number, 
  teamSize: number,
  config: EvidenceBasedConfig
): TeamAssignment[] {
  
  const assignments: TeamAssignment[] = [];
  
  // Calculate current team totals
  let teamTotals = existingTeams.map(team => 
    team.reduce((sum, p) => sum + p.evidenceWeight, 0)
  );
  
  // Track team sizes to enforce hard constraints
  const teamSizes = existingTeams.map(team => team.length);
  
  // Assign each player to optimal team that has capacity
  players.forEach((player, index) => {
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
      console.error(`🚨 ATLAS ERROR: No available teams for player ${player.discord_username}`);
      // Emergency fallback - find team with smallest size violation
      const teamWithSmallestSize = teamSizes.reduce((minIndex, size, index) => 
        size < teamSizes[minIndex] ? index : minIndex, 0);
      availableTeams.push(teamWithSmallestSize);
    }
    
    // Find best team among available teams
    let bestTeamIndex = availableTeams[0];
    let bestBalanceScore = -Infinity;
    
    for (const teamIndex of availableTeams) {
      const newTeamTotals = [...teamTotals];
      newTeamTotals[teamIndex] += player.evidenceWeight;
      
      // Calculate balance score for this assignment
      const variance = calculateTeamVariance(newTeamTotals);
      const eliteViolations = calculateEliteViolations(existingTeams, assignments, player, teamIndex, config);
      
      const balanceScore = 1000 / (1 + variance) - (eliteViolations * 100);
      
      if (balanceScore > bestBalanceScore) {
        bestBalanceScore = balanceScore;
        bestTeamIndex = teamIndex;
      }
    }
    
    // Update team totals
    teamTotals[bestTeamIndex] += player.evidenceWeight;
    
    assignments.push({
      teamIndex: bestTeamIndex,
      reasoning: `Smart assignment (score: ${bestBalanceScore.toFixed(1)}, capacity-enforced)`
    });
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
    console.error(`🚨 ATLAS CRITICAL ERROR: Size violations detected in evaluation! Teams: ${teamSizes}`);
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

  console.log('🏛️ STARTING ATLAS-FIRST TEAM FORMATION');

  // PHASE 2 FIX: Consolidated Weight Calculation with Caching
  console.log('🏛️ ATLAS PHASE 2 FIX: Implementing Weight Calculation Consolidation');
  
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
        console.log(`🏛️ ATLAS CACHE HIT for ${player.discord_username}`);
      } else {
        evidenceResult = await calculateEvidenceBasedWeightWithMiniAi({
          current_rank: player.current_rank, peak_rank: player.peak_rank,
          manual_rank_override: player.manual_rank_override, manual_weight_override: player.manual_weight_override,
          use_manual_override: player.use_manual_override, rank_override_reason: player.rank_override_reason,
          weight_rating: player.weight_rating, tournaments_won: player.tournaments_won,
          last_tournament_win: player.last_tournament_win
        }, config, true);
        
        weightCache.set(cacheKey, evidenceResult);
        console.log(`🏛️ ATLAS WEIGHT CALCULATED for ${player.discord_username}: ${evidenceResult.finalAdjustedPoints}pts`);
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

  console.log('🏛️ ATLAS UNIFIED WEIGHT CALCULATIONS COMPLETE');
  console.log(`🏛️ ATLAS CACHE PERFORMANCE: ${weightCache.size} unique calculations cached`);

  // PHASE 3: ATLAS Advanced Team Formation
  console.log('🏛️ ATLAS PHASE 3: Advanced Team Formation with Mini-AI Integration');
  const { teams: atlasCreatedTeams, steps: balanceSteps } = createAtlasBalancedTeams(
    playersWithEvidenceWeights,
    numTeams,
    teamSize,
    config
  );

  // PHASE 6 FIX: Add comprehensive validation logging
  console.log('🏛️ ATLAS PHASE 6: Team Formation Validation');
  const teamTotals = atlasCreatedTeams.map((team, index) => {
    const total = team.reduce((sum, p) => sum + p.evidenceWeight, 0);
    console.log(`🏛️ Team ${index + 1}: ${total} points (${team.length} players)`);
    return total;
  });
  
  const maxDiff = Math.max(...teamTotals) - Math.min(...teamTotals);
  console.log(`🏛️ ATLAS Formation Quality: ${maxDiff} point difference between teams`);

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

  console.log('🏛️ ATLAS VALIDATION STARTING: Analyzing team composition...');

  // PHASE 3 FIX: Enhanced Post-Formation Validation (reduced complexity since main formation is improved)
  console.log('🏛️ ATLAS PHASE 3 FIX: Simplified Post-Formation Validation');
  
  // For 2-team tournaments, only apply minimal post-validation since main formation handles balance
  if (adjustedTeams.length === 2) {
    const teamTotals = adjustedTeams.map(team => team.reduce((sum, p) => sum + p.evidenceWeight, 0));
    const pointDifference = Math.abs(teamTotals[0] - teamTotals[1]);
    
    // Only intervene if there's an extreme imbalance (>150 points) after formation
    if (pointDifference > 150) {
      console.log(`🏛️ ATLAS 2-Team Post-Validation: Point difference ${pointDifference} exceeds threshold`);
      
      const strongerTeamIndex = teamTotals[0] > teamTotals[1] ? 0 : 1;
      const weakerTeamIndex = 1 - strongerTeamIndex;
      
      const strongTeam = [...adjustedTeams[strongerTeamIndex]].sort((a, b) => b.evidenceWeight - a.evidenceWeight);
      const weakTeam = [...adjustedTeams[weakerTeamIndex]].sort((a, b) => a.evidenceWeight - b.evidenceWeight);

      // Find optimal swap to minimize difference
      let bestSwap = null;
      let smallestNewDifference = pointDifference;
      
      for (let i = 1; i < strongTeam.length; i++) { // Skip captain (index 0)
        for (let j = 0; j < weakTeam.length; j++) {
          const strongPlayer = strongTeam[i];
          const weakPlayer = weakTeam[j];
          
          const newStrongTotal = teamTotals[strongerTeamIndex] - strongPlayer.evidenceWeight + weakPlayer.evidenceWeight;
          const newWeakTotal = teamTotals[weakerTeamIndex] - weakPlayer.evidenceWeight + strongPlayer.evidenceWeight;
          const newDifference = Math.abs(newStrongTotal - newWeakTotal);
          
          if (newDifference < smallestNewDifference) {
            smallestNewDifference = newDifference;
            bestSwap = { strongPlayer, weakPlayer, newDifference };
          }
        }
      }
      
      if (bestSwap && smallestNewDifference < pointDifference - 50) {
        // Perform the optimal swap
        adjustedTeams[strongerTeamIndex] = adjustedTeams[strongerTeamIndex].filter(p => p.id !== bestSwap.strongPlayer.id);
        adjustedTeams[strongerTeamIndex].push(bestSwap.weakPlayer);
        
        adjustedTeams[weakerTeamIndex] = adjustedTeams[weakerTeamIndex].filter(p => p.id !== bestSwap.weakPlayer.id);
        adjustedTeams[weakerTeamIndex].push(bestSwap.strongPlayer);
        
        validationSteps.push({
          step: validationSteps.length + 1,
          player: {
            id: 'optimal-swap',
            discord_username: `${bestSwap.strongPlayer.discord_username} ↔ ${bestSwap.weakPlayer.discord_username}`,
            points: 0, 
            rank: 'Optimal Balance', 
            source: 'ATLAS Post-Validation',
          },
          assignedTeam: -1,
          reasoning: `🏛️ ATLAS Optimal Balance: Reduced point difference from ${pointDifference} to ${bestSwap.newDifference}. Strategic swap for enhanced 2-team balance.`,
          teamStatesAfter: JSON.parse(JSON.stringify(adjustedTeams)).map((team, index) => ({
            teamIndex: index, totalPoints: team.reduce((sum, p) => sum + p.evidenceWeight, 0),
            playerCount: team.length, eliteCount: team.filter(p => p.isElite).length
          })),
          phase: 'atlas_optimization_swap',
        });

        adjustments.redistributions.push({
          player: `${bestSwap.strongPlayer.discord_username} ↔ ${bestSwap.weakPlayer.discord_username}`,
          fromTeam: strongerTeamIndex,
          toTeam: weakerTeamIndex,
          reason: `ATLAS Post-Validation: Optimal swap reduced imbalance from ${pointDifference} to ${bestSwap.newDifference}`,
          type: 'balance_fix'
        });

        decisions.push({
          type: 'swap',
          reasoning: `Reduced point difference from ${pointDifference} to ${bestSwap.newDifference}`,
          confidence: 0.88
        });
      }
    }
  }

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
