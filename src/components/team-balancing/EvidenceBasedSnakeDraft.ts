// Clean ATLAS Team Formation System - Pure Implementation
import { calculateEvidenceBasedWeightWithMiniAi, EvidenceBasedConfig } from "@/utils/evidenceBasedWeightSystem";
import { atlasLogger } from "@/utils/atlasLogger";
import { validateAntiStacking, logAntiStackingResults } from "@/utils/antiStackingValidator";

// ============= CORE INTERFACES =============

interface SwapSuggestion {
  strategy: 'direct' | 'secondary' | 'cascading' | 'fallback';
  player1: {
    name: string;
    rank: string;
    points: number;
    currentTeam: number;
  };
  player2?: {
    name: string;
    rank: string;
    points: number;
    currentTeam: number;
  };
  targetTeam?: number;
  expectedImprovement: number;
  reasoning: string;
  outcome: 'executed' | 'rejected' | 'considered';
  rejectionReason?: string;
  balanceImpact: {
    beforeBalance: number;
    afterBalance: number;
    violationResolved: boolean;
  };
}

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
  phase: 'weight_calculation' | 'team_formation' | 'anti_stacking_validation';
}

export interface EvidenceTeamResult {
  teams: any[][];
  balanceSteps: EvidenceBalanceStep[];
  evidenceCalculations: Array<{
    userId: string;
    calculation: any;
  }>;
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
    antiStackingResults: {
      isValid: boolean;
      violations: Array<{
        type: string;
        severity: string;
        message: string;
        teamIndex: number;
        players?: string[];
      }>;
      highestWeightPlayer: string;
      strongestTeamIndex: number;
    };
    overallQuality: 'excellent' | 'good' | 'acceptable' | 'needs_improvement';
    smartBalanceApplied?: boolean;
    optimizationSteps?: number;
  };
}

// ============= MAIN ATLAS FUNCTION =============

export async function evidenceBasedSnakeDraft(
  players: any[],
  numTeams: number,
  teamSize: number,
  onProgress?: (step: EvidenceBalanceStep) => void,
  onValidationStart?: () => void,
  onAdaptiveWeightCalculation?: (player: any, calculation: any) => void,
  adaptiveConfig?: EvidenceBasedConfig
): Promise<EvidenceTeamResult> {

  atlasLogger.info('🚀 ATLAS Team Formation System Started');
  atlasLogger.info(`Configuration: ${players.length} players → ${numTeams} teams of ${teamSize}`);

  const balanceSteps: EvidenceBalanceStep[] = [];
  const evidenceCalculations: Array<{ userId: string; calculation: any }> = [];
  let stepCounter = 0;

  // ============= PHASE 1: WEIGHT CALCULATION =============
  atlasLogger.info('📊 Phase 1: Evidence-Based Weight Calculation');
  
  const processedPlayers = await Promise.all(
    players.map(async (player) => {
      try {
        const config = adaptiveConfig || {
          enableEvidenceBasedWeights: true,
          tournamentWinBonus: 15,
          underrankedBonusThreshold: 1.5,
          maxUnderrankedBonus: 0.35,
          skillTierCaps: {
            enabled: true,
            eliteThreshold: 400,
            maxElitePerTeam: 1
          }
        };
        const evidenceResult = await calculateEvidenceBasedWeightWithMiniAi(player, config);
        
        const processedPlayer = {
          ...player,
          evidenceWeight: evidenceResult.finalAdjustedPoints,
          evidenceCalculation: evidenceResult.evidenceResult.evidenceCalculation,
          evidenceReasoning: evidenceResult.evidenceResult.evidenceCalculation?.calculationReasoning,
          weightSource: evidenceResult.evidenceResult.evidenceCalculation?.weightSource || 'evidence_based',
          isElite: evidenceResult.finalAdjustedPoints >= 400
        };
        
        console.log(`🔍 ATLAS calculation for ${player.discord_username}:`, {
          finalPoints: evidenceResult.finalAdjustedPoints,
          reasoning: evidenceResult.evidenceResult.evidenceCalculation?.calculationReasoning,
          calculation: evidenceResult.evidenceResult.evidenceCalculation
        });

        evidenceCalculations.push({
          userId: player.id,
          calculation: evidenceResult.evidenceResult
        });

        onAdaptiveWeightCalculation?.(player, evidenceResult.evidenceResult);
        
        atlasLogger.weightCalculated(
          player.discord_username, 
          evidenceResult.finalAdjustedPoints, 
          evidenceResult.evidenceResult.evidenceCalculation?.weightSource || 'evidence_based'
        );

        return processedPlayer;
      } catch (error) {
        atlasLogger.error('Weight calculation failed', { player: player.discord_username, error });
        return {
          ...player,
          evidenceWeight: 150,
          weightSource: 'fallback',
          isElite: false
        };
      }
    })
  );

  // ============= PHASE 2: TEAM FORMATION =============
  atlasLogger.info('🎯 Phase 2: Anti-Stacking Team Formation');
  
  const { teams, formationSteps } = createBalancedTeamsWithAntiStacking(
    processedPlayers, 
    numTeams, 
    teamSize,
    stepCounter
  );

  balanceSteps.push(...formationSteps);
  stepCounter += formationSteps.length;

  // Progress reporting
  formationSteps.forEach(step => onProgress?.(step));

  // ============= PHASE 3: SMART ATLAS POST-TEAM BALANCE VALIDATION =============
  atlasLogger.info('✅ Phase 3: Smart ATLAS Balance Validation');
  onValidationStart?.();

  let finalTeams = [...teams];
  const postBalanceSteps: EvidenceBalanceStep[] = [];
  
  // Initial anti-stacking validation
  let antiStackingResults = validateAntiStacking(finalTeams);
  logAntiStackingResults(antiStackingResults, 'Initial Post-Formation Validation');

  // Smart ATLAS balance optimization - identify highest weight player
  const allPlayers = finalTeams.flat();
  const highestWeightPlayer = allPlayers.reduce((highest, current) => 
    current.evidenceWeight > highest.evidenceWeight ? current : highest
  );

  // Smart ATLAS balance optimization
  if (!antiStackingResults.isValid || antiStackingResults.violations.some(v => v.severity === 'critical')) {
    atlasLogger.info(`🔧 ATLAS SMART BALANCING: Detected violations, initiating intelligent swaps...`);
    
    const optimizationResult = performSmartAtlasBalancing(finalTeams, highestWeightPlayer, stepCounter);
    finalTeams = optimizationResult.teams;
    postBalanceSteps.push(...optimizationResult.steps);
    stepCounter = optimizationResult.finalStepCounter;
    
    // Re-validate after optimization
    antiStackingResults = validateAntiStacking(finalTeams);
    logAntiStackingResults(antiStackingResults, 'Post-Optimization Validation');
  }

  // Add post-balance steps to main collection
  balanceSteps.push(...postBalanceSteps);

  // Progress reporting for optimization steps
  postBalanceSteps.forEach(step => onProgress?.(step));

  // ============= FINAL ANALYSIS =============
  const finalAnalysis = calculateFinalAnalysis(finalTeams, antiStackingResults);
  
  // Add smart balancing info to final analysis
  finalAnalysis.smartBalanceApplied = postBalanceSteps.length > 0;
  finalAnalysis.optimizationSteps = postBalanceSteps.length;
  
  atlasLogger.info(`🏁 ATLAS Formation Complete: ${finalAnalysis.overallQuality.toUpperCase()}`);
  atlasLogger.info(`Balance Quality: ${finalAnalysis.pointBalance.balanceQuality}`);
  atlasLogger.info(`Anti-Stacking Valid: ${antiStackingResults.isValid ? '✅' : '❌'}`);
  if (postBalanceSteps.length > 0) {
    atlasLogger.info(`🎯 Smart balancing applied ${postBalanceSteps.length} optimization steps`);
  }

  return {
    teams: finalTeams,
    balanceSteps,
    evidenceCalculations,
    finalAnalysis
  };
}

// ============= TEAM FORMATION CORE LOGIC =============

function createBalancedTeamsWithAntiStacking(
  players: any[], 
  numTeams: number, 
  teamSize: number,
  initialStepCounter: number
): { teams: any[][], formationSteps: EvidenceBalanceStep[] } {
  
  const teams: any[][] = Array(numTeams).fill(null).map(() => []);
  const steps: EvidenceBalanceStep[] = [];
  let stepCounter = initialStepCounter;

  // Sort players by evidence weight (highest first)
  const sortedPlayers = [...players].sort((a, b) => b.evidenceWeight - a.evidenceWeight);
  
  if (sortedPlayers.length < numTeams) {
    atlasLogger.error('Insufficient players for team formation');
    return { teams, formationSteps: steps };
  }

  // Identify highest weight player for anti-stacking
  const highestWeightPlayer = sortedPlayers[0];
  atlasLogger.info(`🎯 Highest weight player identified: ${highestWeightPlayer.discord_username} (${highestWeightPlayer.evidenceWeight}pts)`);

  // ============= BALANCE-AWARE CAPTAIN ASSIGNMENT =============
  const captains = sortedPlayers.slice(0, numTeams);
  const remainingPlayers = sortedPlayers.slice(numTeams);

  captains.forEach((captain, index) => {
    // Balance-aware assignment for ALL captains (including highest weight player)
    const currentWeights = teams.map(team => 
      team.reduce((sum, p) => sum + p.evidenceWeight, 0)
    );
    
    const targetTeamIndex = findOptimalTeamForPlayer(captain, currentWeights, teams);
    teams[targetTeamIndex].push(captain);

    steps.push(createBalanceStep(
      ++stepCounter,
      captain,
      targetTeamIndex,
      captain === highestWeightPlayer 
        ? `🎯 HIGHEST WEIGHT CAPTAIN: Balance-aware assignment to prevent auto-stacking`
        : `BALANCE-AWARE CAPTAIN: Optimal distribution assignment`,
      teams,
      'team_formation'
    ));

    atlasLogger.info(`👑 Captain ${captain.discord_username} (${captain.evidenceWeight}pts) → Team ${targetTeamIndex + 1}`);
  });

  // ============= REMAINING PLAYER ASSIGNMENT =============
  remainingPlayers.forEach(player => {
    const currentWeights = teams.map(team => 
      team.reduce((sum, p) => sum + p.evidenceWeight, 0)
    );

    const targetTeamIndex = findOptimalTeamForPlayer(player, currentWeights, teams, teamSize);
    
    // Additional anti-stacking check for elite players  
    const isElitePlayer = player.evidenceWeight >= 400; // Updated threshold
    const strongestTeamIndex = currentWeights.indexOf(Math.max(...currentWeights));
    
    let finalTeamIndex = targetTeamIndex;
    let reasoning = `Optimal balance assignment`;

    if (isElitePlayer && targetTeamIndex === strongestTeamIndex) {
      // Find alternative team for elite player to prevent stacking
      const alternativeTeams = teams
        .map((team, index) => ({ index, weight: currentWeights[index], size: team.length }))
        .filter(t => t.index !== strongestTeamIndex && t.size < teamSize)
        .sort((a, b) => a.weight - b.weight);

      if (alternativeTeams.length > 0) {
        finalTeamIndex = alternativeTeams[0].index;
        reasoning = `🚫 ANTI-STACKING: Elite player redirected from strongest team`;
        atlasLogger.info(`🚫 Elite player ${player.discord_username} redirected from Team ${strongestTeamIndex + 1} to Team ${finalTeamIndex + 1}`);
      }
    }

    teams[finalTeamIndex].push(player);

    steps.push(createBalanceStep(
      ++stepCounter,
      player,
      finalTeamIndex,
      reasoning,
      teams,
      'team_formation'
    ));
  });

  return { teams, formationSteps: steps };
}

// ============= HELPER FUNCTIONS =============

function findOptimalTeamForPlayer(
  player: any, 
  currentWeights: number[], 
  teams: any[][], 
  teamSize?: number
): number {
  let bestTeamIndex = 0;
  let bestScore = -Infinity;

  for (let i = 0; i < teams.length; i++) {
    // Check team capacity if specified
    if (teamSize && teams[i].length >= teamSize) {
      continue;
    }

    // Calculate balance score if player is added to this team
    const newWeight = currentWeights[i] + player.evidenceWeight;
    const otherWeights = currentWeights.filter((_, index) => index !== i);
    const maxOtherWeight = Math.max(...otherWeights, 0);
    const minOtherWeight = Math.min(...otherWeights, Infinity);

    // Prefer teams that minimize the maximum difference
    const balanceScore = -(Math.abs(newWeight - maxOtherWeight) + Math.abs(newWeight - minOtherWeight));
    
    if (balanceScore > bestScore) {
      bestScore = balanceScore;
      bestTeamIndex = i;
    }
  }

  return bestTeamIndex;
}

function createBalanceStep(
  step: number,
  player: any,
  teamIndex: number,
  reasoning: string,
  teams: any[][],
  phase: EvidenceBalanceStep['phase']
): EvidenceBalanceStep {
  // Extract rank from evidence calculation or fallback to player data
  const displayRank = player.evidenceCalculation?.currentRank || 
                     player.current_rank || 
                     player.evidenceCalculation?.peakRank || 
                     player.peak_rank || 
                     'Unranked';

  return {
    step,
    player: {
      id: player.id,
      discord_username: player.discord_username || 'Unknown',
      points: player.evidenceWeight,
      rank: displayRank,
      source: player.evidenceCalculation?.weightSource || player.weightSource || 'unknown',
      evidenceWeight: player.evidenceWeight,
      isElite: player.isElite,
      evidenceReasoning: player.evidenceReasoning,
    },
    assignedTeam: teamIndex,
    reasoning,
    teamStatesAfter: teams.map((team, index) => ({
      teamIndex: index,
      totalPoints: team.reduce((sum, p) => sum + p.evidenceWeight, 0),
      playerCount: team.length,
      eliteCount: team.filter(p => p.isElite).length
    })),
    phase
  };
}

function calculateFinalAnalysis(teams: any[][], antiStackingResults: any): EvidenceTeamResult['finalAnalysis'] {
  const teamTotals = teams.map(team => 
    team.reduce((sum, player) => sum + player.evidenceWeight, 0)
  );

  const averageTeamPoints = teamTotals.reduce((sum, total) => sum + total, 0) / teams.length;
  const minTeamPoints = Math.min(...teamTotals);
  const maxTeamPoints = Math.max(...teamTotals);
  const maxPointDifference = maxTeamPoints - minTeamPoints;

  // Determine balance quality
  let balanceQuality: 'ideal' | 'good' | 'warning' | 'poor';
  if (maxPointDifference <= 50) balanceQuality = 'ideal';
  else if (maxPointDifference <= 100) balanceQuality = 'good';
  else if (maxPointDifference <= 150) balanceQuality = 'warning';
  else balanceQuality = 'poor';

  // Elite distribution analysis
  const elitePlayersPerTeam = teams.map(team => 
    team.filter(player => player.isElite).length
  );
  const skillStackingViolations = antiStackingResults.violations.length;

  // Overall quality assessment
  let overallQuality: 'excellent' | 'good' | 'acceptable' | 'needs_improvement';
  if (balanceQuality === 'ideal' && antiStackingResults.isValid) {
    overallQuality = 'excellent';
  } else if ((balanceQuality === 'good' || balanceQuality === 'ideal') && skillStackingViolations <= 1) {
    overallQuality = 'good';
  } else if (balanceQuality !== 'poor' && skillStackingViolations <= 2) {
    overallQuality = 'acceptable';
  } else {
    overallQuality = 'needs_improvement';
  }

  return {
    skillDistribution: {
      elitePlayersPerTeam,
      skillStackingViolations
    },
    pointBalance: {
      averageTeamPoints,
      minTeamPoints,
      maxTeamPoints,
      maxPointDifference,
      balanceQuality
    },
    antiStackingResults: {
      isValid: antiStackingResults.isValid,
      violations: antiStackingResults.violations.map(v => ({
        type: v.type || 'unknown',
        severity: v.severity || 'warning',
        message: v.message || v.reason || 'Stacking violation detected',
        teamIndex: v.teamIndex || 0,
        players: v.radiantPlayers || []
      })),
      highestWeightPlayer: antiStackingResults.highestWeightPlayer || 'Unknown',
      strongestTeamIndex: antiStackingResults.strongestTeamIndex || 0
    },
    overallQuality,
    smartBalanceApplied: false, // Will be overridden if smart balancing is applied
    optimizationSteps: 0 // Will be overridden if optimization steps are taken
  };
}

// ============= ENHANCED ATLAS BALANCING SYSTEM =============

function performSmartAtlasBalancing(
  teams: any[][],
  highestWeightPlayer: any,
  initialStepCounter: number
): { teams: any[][], steps: EvidenceBalanceStep[], finalStepCounter: number } {
  let optimizedTeams = teams.map(team => [...team]);
  const optimizationSteps: EvidenceBalanceStep[] = [];
  let stepCounter = initialStepCounter;

  const teamTotals = optimizedTeams.map(team => team.reduce((sum, p) => sum + p.evidenceWeight, 0));
  const highestPlayerTeamIndex = optimizedTeams.findIndex(team => team.includes(highestWeightPlayer));
  const strongestTeamIndex = teamTotals.indexOf(Math.max(...teamTotals));

  atlasLogger.info(`🔍 ATLAS Analysis: Highest player on Team ${highestPlayerTeamIndex + 1} (${teamTotals[highestPlayerTeamIndex]}pts), Strongest team is ${strongestTeamIndex + 1} (${teamTotals[strongestTeamIndex]}pts)`);

  // CRITICAL: If highest weight player is on the strongest team, try multiple strategies
  if (highestPlayerTeamIndex === strongestTeamIndex) {
    atlasLogger.info(`🚨 CRITICAL VIOLATION: Highest weight player on strongest team - initiating enhanced smart balancing`);
    
    // Strategy 1: Direct highest player swap (original approach)
    atlasLogger.info(`🔄 Strategy 1: Attempting direct highest player swap`);
    const directSwapResult = findOptimalHighestPlayerSwapWithTracking(optimizedTeams, highestWeightPlayer, highestPlayerTeamIndex, []);
    
    if (directSwapResult.swapFound) {
      const { result: swapResult, steps: directSteps } = performPlayerSwap(
        optimizedTeams, 
        highestWeightPlayer, 
        directSwapResult.targetPlayer!, 
        highestPlayerTeamIndex, 
        directSwapResult.targetTeamIndex!, 
        stepCounter,
        'DIRECT SWAP: Highest weight player moved to prevent concentration'
      );
      optimizedTeams = swapResult;
      optimizationSteps.push(...directSteps);
      stepCounter += directSteps.length;
      atlasLogger.info(`✅ Strategy 1 SUCCESS: Direct swap completed`);
    } else {
      // Strategy 2: Secondary player swaps on strongest team
      atlasLogger.info(`🔄 Strategy 2: Attempting secondary player swap on strongest team`);
      const secondarySwapResult = findOptimalSecondaryPlayerSwapWithTracking(optimizedTeams, highestWeightPlayer, highestPlayerTeamIndex, []);
      
      if (secondarySwapResult.swapFound) {
        const { result: swapResult, steps: secondarySteps } = performPlayerSwap(
          optimizedTeams,
          secondarySwapResult.swapPlayer!,
          secondarySwapResult.targetPlayer!,
          highestPlayerTeamIndex,
          secondarySwapResult.targetTeamIndex!,
          stepCounter,
          'SECONDARY SWAP: Weakening strongest team by swapping secondary player'
        );
        optimizedTeams = swapResult;
        optimizationSteps.push(...secondarySteps);
        stepCounter += secondarySteps.length;
        atlasLogger.info(`✅ Strategy 2 SUCCESS: Secondary player swap completed`);
      } else {
        // Strategy 3: Cascading swaps (try multiple combinations)
        atlasLogger.info(`🔄 Strategy 3: Attempting cascading swap combinations`);
        const cascadingResult = findOptimalCascadingSwapsWithTracking(optimizedTeams, highestWeightPlayer, highestPlayerTeamIndex, []);
        
        if (cascadingResult.swapsFound) {
          for (const swap of cascadingResult.swaps!) {
            const { result: swapResult, steps: cascadeSteps } = performPlayerSwap(
              optimizedTeams,
              swap.player1,
              swap.player2,
              swap.team1Index,
              swap.team2Index,
              stepCounter,
              'CASCADING SWAP: Multi-player balancing sequence'
            );
            optimizedTeams = swapResult;
            optimizationSteps.push(...cascadeSteps);
            stepCounter += cascadeSteps.length;
          }
          atlasLogger.info(`✅ Strategy 3 SUCCESS: Cascading swaps completed`);
        } else {
          // Fallback: Force move strategy
          atlasLogger.info(`⚡ FALLBACK: All strategies failed, forcing move to weakest team`);
          const fallbackResult = performForcedMoveWithTracking(optimizedTeams, highestWeightPlayer, highestPlayerTeamIndex, stepCounter, []);
          if (fallbackResult) {
            optimizedTeams = fallbackResult.result;
            optimizationSteps.push(...fallbackResult.steps);
            stepCounter += fallbackResult.steps.length;
          }
        }
      }
    }
  } else {
    atlasLogger.info(`✅ No critical violations detected - highest player correctly distributed`);
  }

  return {
    teams: optimizedTeams,
    steps: optimizationSteps,
    finalStepCounter: stepCounter
  };
}

// ============= SWAP EXECUTION HELPER =============

function performPlayerSwap(
  teams: any[][],
  player1: any,
  player2: any,
  team1Index: number,
  team2Index: number,
  stepCounter: number,
  description: string
): { result: any[][], steps: EvidenceBalanceStep[] } {
  const result = teams.map(team => [...team]);
  const steps: EvidenceBalanceStep[] = [];

  // Remove players from current teams
  result[team1Index] = result[team1Index].filter(p => p !== player1);
  result[team2Index] = result[team2Index].filter(p => p !== player2);
  
  // Add players to new teams
  result[team2Index].push(player1);
  result[team1Index].push(player2);

  steps.push(createBalanceStep(
    stepCounter + 1,
    player1,
    team2Index,
    `🔄 ${description} (${player1.discord_username} ⇄ ${player2.discord_username})`,
    result,
    'anti_stacking_validation'
  ));

  steps.push(createBalanceStep(
    stepCounter + 2,
    player2,
    team1Index,
    `🔄 Counter-swap balancing move`,
    result,
    'anti_stacking_validation'
  ));

  return { result, steps };
}

// ============= SWAP STRATEGY FUNCTIONS =============

function findOptimalHighestPlayerSwapWithTracking(
  teams: any[][],
  highestWeightPlayer: any,
  highestPlayerTeamIndex: number,
  swapSuggestions: SwapSuggestion[]
): { swapFound: boolean; targetPlayer?: any; targetTeamIndex?: number; improvement?: number } {
  let bestSwap: { swapFound: boolean; targetPlayer?: any; targetTeamIndex?: number; improvement: number } = { 
    swapFound: false, 
    improvement: 0 
  };
  
  const currentTeamTotals = teams.map(team => team.reduce((sum, p) => sum + p.evidenceWeight, 0));
  const currentBalance = Math.max(...currentTeamTotals) - Math.min(...currentTeamTotals);
  
  // Try swapping with players from other teams
  teams.forEach((team, teamIndex) => {
    if (teamIndex === highestPlayerTeamIndex) return;
    
    team.forEach(targetPlayer => {
      // Calculate balance after hypothetical swap
      const newHighestTeamTotal = currentTeamTotals[highestPlayerTeamIndex] - highestWeightPlayer.evidenceWeight + targetPlayer.evidenceWeight;
      const newTargetTeamTotal = currentTeamTotals[teamIndex] - targetPlayer.evidenceWeight + highestWeightPlayer.evidenceWeight;
      
      const newTeamTotals = [...currentTeamTotals];
      newTeamTotals[highestPlayerTeamIndex] = newHighestTeamTotal;
      newTeamTotals[teamIndex] = newTargetTeamTotal;
      
      const newBalance = Math.max(...newTeamTotals) - Math.min(...newTeamTotals);
      const improvement = currentBalance - newBalance;
      
      // Prefer swaps that improve balance and move highest player to a weaker position
      const newHighestPlayerTeamStrength = newTeamTotals.indexOf(Math.max(...newTeamTotals));
      const highestPlayerMovesToWeakerTeam = teamIndex !== newHighestPlayerTeamStrength;
      
      // Track this suggestion
      const suggestion: SwapSuggestion = {
        strategy: 'direct',
        player1: {
          name: highestWeightPlayer.discord_username,
          rank: highestWeightPlayer.rank || 'Unknown',
          points: highestWeightPlayer.evidenceWeight,
          currentTeam: highestPlayerTeamIndex
        },
        player2: {
          name: targetPlayer.discord_username,
          rank: targetPlayer.rank || 'Unknown',
          points: targetPlayer.evidenceWeight,
          currentTeam: teamIndex
        },
        expectedImprovement: improvement,
        reasoning: `Direct swap of highest player (${highestWeightPlayer.discord_username}) with ${targetPlayer.discord_username} to reduce team strength imbalance`,
        outcome: improvement > bestSwap.improvement && highestPlayerMovesToWeakerTeam ? 'considered' : 'rejected',
        rejectionReason: improvement <= bestSwap.improvement ? 'Insufficient improvement' : !highestPlayerMovesToWeakerTeam ? 'Does not resolve violation' : undefined,
        balanceImpact: {
          beforeBalance: currentBalance,
          afterBalance: newBalance,
          violationResolved: highestPlayerMovesToWeakerTeam
        }
      };
      
      if (improvement > bestSwap.improvement && highestPlayerMovesToWeakerTeam) {
        bestSwap = {
          swapFound: true,
          targetPlayer,
          targetTeamIndex: teamIndex,
          improvement
        };
        suggestion.outcome = 'executed';
      }
      
      swapSuggestions.push(suggestion);
    });
  });
  
  atlasLogger.info(`🔍 Direct Swap Analysis: ${bestSwap.swapFound ? `Found swap with ${bestSwap.improvement?.toFixed(1)} point improvement` : 'No beneficial direct swap found'}`);
  
  return bestSwap;
}

function findOptimalSecondaryPlayerSwapWithTracking(
  teams: any[][],
  highestWeightPlayer: any,
  strongestTeamIndex: number,
  swapSuggestions: SwapSuggestion[]
): { swapFound: boolean; swapPlayer?: any; targetPlayer?: any; targetTeamIndex?: number; improvement?: number } {
  let bestSwap: { swapFound: boolean; swapPlayer?: any; targetPlayer?: any; targetTeamIndex?: number; improvement: number } = { 
    swapFound: false, 
    improvement: 0 
  };
  
  const currentTeamTotals = teams.map(team => team.reduce((sum, p) => sum + p.evidenceWeight, 0));
  const currentBalance = Math.max(...currentTeamTotals) - Math.min(...currentTeamTotals);
  const strongestTeam = teams[strongestTeamIndex];
  
  // Try swapping secondary players (not the highest weight player) from strongest team
  strongestTeam
    .filter(player => player !== highestWeightPlayer)
    .forEach(secondaryPlayer => {
      
      teams.forEach((team, teamIndex) => {
        if (teamIndex === strongestTeamIndex) return;
        
        team.forEach(targetPlayer => {
          // Only swap if target player is lighter than secondary player
          if (targetPlayer.evidenceWeight >= secondaryPlayer.evidenceWeight) return;
          
          // Calculate balance after hypothetical swap
          const newStrongestTeamTotal = currentTeamTotals[strongestTeamIndex] - secondaryPlayer.evidenceWeight + targetPlayer.evidenceWeight;
          const newTargetTeamTotal = currentTeamTotals[teamIndex] - targetPlayer.evidenceWeight + secondaryPlayer.evidenceWeight;
          
          const newTeamTotals = [...currentTeamTotals];
          newTeamTotals[strongestTeamIndex] = newStrongestTeamTotal;
          newTeamTotals[teamIndex] = newTargetTeamTotal;
          
          const newBalance = Math.max(...newTeamTotals) - Math.min(...newTeamTotals);
          const improvement = currentBalance - newBalance;
          
          // Check if this resolves the "highest on strongest" violation
          const newStrongestTeamIndex = newTeamTotals.indexOf(Math.max(...newTeamTotals));
          const violationResolved = newStrongestTeamIndex !== strongestTeamIndex;
          
          // Track this suggestion
          const suggestion: SwapSuggestion = {
            strategy: 'secondary',
            player1: {
              name: secondaryPlayer.discord_username,
              rank: secondaryPlayer.rank || 'Unknown',
              points: secondaryPlayer.evidenceWeight,
              currentTeam: strongestTeamIndex
            },
            player2: {
              name: targetPlayer.discord_username,
              rank: targetPlayer.rank || 'Unknown',
              points: targetPlayer.evidenceWeight,
              currentTeam: teamIndex
            },
            expectedImprovement: improvement,
            reasoning: `Secondary player swap from strongest team to reduce overall team strength while keeping highest player in place`,
            outcome: improvement > bestSwap.improvement && violationResolved ? 'considered' : 'rejected',
            rejectionReason: improvement <= bestSwap.improvement ? 'Insufficient improvement' : !violationResolved ? 'Does not resolve violation' : undefined,
            balanceImpact: {
              beforeBalance: currentBalance,
              afterBalance: newBalance,
              violationResolved
            }
          };
          
          if (improvement > bestSwap.improvement && violationResolved) {
            bestSwap = {
              swapFound: true,
              swapPlayer: secondaryPlayer,
              targetPlayer,
              targetTeamIndex: teamIndex,
              improvement
            };
            suggestion.outcome = 'executed';
          }
          
          swapSuggestions.push(suggestion);
        });
      });
    });
  
  atlasLogger.info(`🔍 Secondary Swap Analysis: ${bestSwap.swapFound ? `Found secondary swap with ${bestSwap.improvement?.toFixed(1)} point improvement` : 'No beneficial secondary swap found'}`);
  
  return bestSwap;
}

function findOptimalCascadingSwapsWithTracking(
  teams: any[][],
  highestWeightPlayer: any,
  strongestTeamIndex: number,
  swapSuggestions: SwapSuggestion[]
): { swapsFound: boolean; swaps?: Array<{player1: any, player2: any, team1Index: number, team2Index: number}>; improvement?: number } {
  const currentTeamTotals = teams.map(team => team.reduce((sum, p) => sum + p.evidenceWeight, 0));
  const currentBalance = Math.max(...currentTeamTotals) - Math.min(...currentTeamTotals);
  const strongestTeam = teams[strongestTeamIndex];
  
  // Try combinations of 2 swaps involving players from strongest team
  const candidateSwaps: Array<{player1: any, player2: any, team1Index: number, team2Index: number, weightDiff: number}> = [];
  
  strongestTeam
    .filter(player => player !== highestWeightPlayer)
    .forEach(teamPlayer => {
      teams.forEach((team, teamIndex) => {
        if (teamIndex === strongestTeamIndex) return;
        
        team.forEach(targetPlayer => {
          if (targetPlayer.evidenceWeight < teamPlayer.evidenceWeight) {
            candidateSwaps.push({
              player1: teamPlayer,
              player2: targetPlayer,
              team1Index: strongestTeamIndex,
              team2Index: teamIndex,
              weightDiff: teamPlayer.evidenceWeight - targetPlayer.evidenceWeight
            });
          }
        });
      });
    });
  
  // Sort by weight difference (prioritize larger reductions in strongest team)
  candidateSwaps.sort((a, b) => b.weightDiff - a.weightDiff);
  
  // Try up to 2 swaps in sequence
  for (let i = 0; i < Math.min(2, candidateSwaps.length); i++) {
    const swap = candidateSwaps[i];
    
    // Simulate the swap
    const simulatedTotals = [...currentTeamTotals];
    simulatedTotals[swap.team1Index] -= swap.weightDiff;
    simulatedTotals[swap.team2Index] += swap.weightDiff;
    
    const newBalance = Math.max(...simulatedTotals) - Math.min(...simulatedTotals);
    const improvement = currentBalance - newBalance;
    
    // Check if this resolves the violation
    const newStrongestTeamIndex = simulatedTotals.indexOf(Math.max(...simulatedTotals));
    const violationResolved = newStrongestTeamIndex !== strongestTeamIndex;
    
    // Track this cascading suggestion
    const suggestion: SwapSuggestion = {
      strategy: 'cascading',
      player1: {
        name: swap.player1.discord_username,
        rank: swap.player1.rank || 'Unknown',
        points: swap.player1.evidenceWeight,
        currentTeam: swap.team1Index
      },
      player2: {
        name: swap.player2.discord_username,
        rank: swap.player2.rank || 'Unknown',
        points: swap.player2.evidenceWeight,
        currentTeam: swap.team2Index
      },
      expectedImprovement: improvement,
      reasoning: `Cascading swap sequence to progressively reduce strongest team strength through multiple player exchanges`,
      outcome: improvement > 0 && violationResolved ? 'executed' : 'rejected',
      rejectionReason: improvement <= 0 ? 'No improvement' : !violationResolved ? 'Does not resolve violation' : undefined,
      balanceImpact: {
        beforeBalance: currentBalance,
        afterBalance: newBalance,
        violationResolved
      }
    };
    
    swapSuggestions.push(suggestion);
    
    if (improvement > 0 && violationResolved) {
      atlasLogger.info(`🔍 Cascading Swap Analysis: Found beneficial cascading swap with ${improvement.toFixed(1)} point improvement`);
      return {
        swapsFound: true,
        swaps: [swap],
        improvement
      };
    }
  }
  
  atlasLogger.info(`🔍 Cascading Swap Analysis: No beneficial cascading swaps found`);
  return { swapsFound: false };
}

function performForcedMoveWithTracking(
  teams: any[][],
  highestWeightPlayer: any,
  highestPlayerTeamIndex: number,
  stepCounter: number,
  swapSuggestions: SwapSuggestion[]
): { result: any[][], steps: EvidenceBalanceStep[] } | null {
  const teamTotals = teams.map(team => team.reduce((sum, p) => sum + p.evidenceWeight, 0));
  const weakestTeamIndex = teamTotals.indexOf(Math.min(...teamTotals));
  
  if (weakestTeamIndex === highestPlayerTeamIndex || teams[weakestTeamIndex].length >= teams[highestPlayerTeamIndex].length) {
    return null;
  }
  
  // Find a lighter player to move back
  const moveBackPlayer = teams[weakestTeamIndex]
    .filter(p => p.evidenceWeight < highestWeightPlayer.evidenceWeight * 0.7)
    .sort((a, b) => a.evidenceWeight - b.evidenceWeight)[0];
  
  if (!moveBackPlayer) {
    // Track failed fallback
    const suggestion: SwapSuggestion = {
      strategy: 'fallback',
      player1: {
        name: highestWeightPlayer.discord_username,
        rank: highestWeightPlayer.rank || 'Unknown',
        points: highestWeightPlayer.evidenceWeight,
        currentTeam: highestPlayerTeamIndex
      },
      targetTeam: weakestTeamIndex,
      expectedImprovement: 0,
      reasoning: `Fallback strategy to force move highest player to weakest team`,
      outcome: 'rejected',
      rejectionReason: 'No suitable lighter player found for counter-move',
      balanceImpact: {
        beforeBalance: teams.map(team => team.reduce((sum, p) => sum + p.evidenceWeight, 0)).reduce((max, current) => Math.max(max, current), 0) - teams.map(team => team.reduce((sum, p) => sum + p.evidenceWeight, 0)).reduce((min, current) => Math.min(min, current), Infinity),
        afterBalance: 0,
        violationResolved: false
      }
    };
    swapSuggestions.push(suggestion);
    return null;
  }
  
  // Track successful fallback
  const suggestion: SwapSuggestion = {
    strategy: 'fallback',
    player1: {
      name: highestWeightPlayer.discord_username,
      rank: highestWeightPlayer.rank || 'Unknown',
      points: highestWeightPlayer.evidenceWeight,
      currentTeam: highestPlayerTeamIndex
    },
    player2: {
      name: moveBackPlayer.discord_username,
      rank: moveBackPlayer.rank || 'Unknown',
      points: moveBackPlayer.evidenceWeight,
      currentTeam: weakestTeamIndex
    },
    expectedImprovement: 50, // Estimated improvement
    reasoning: `Fallback forced move strategy - swapping highest player with lighter player from weakest team`,
    outcome: 'executed',
    balanceImpact: {
      beforeBalance: teams.map(team => team.reduce((sum, p) => sum + p.evidenceWeight, 0)).reduce((max, current) => Math.max(max, current), 0) - teams.map(team => team.reduce((sum, p) => sum + p.evidenceWeight, 0)).reduce((min, current) => Math.min(min, current), Infinity),
      afterBalance: 0, // Will be calculated after swap
      violationResolved: true
    }
  };
  swapSuggestions.push(suggestion);
  
  return performPlayerSwap(
    teams,
    highestWeightPlayer,
    moveBackPlayer,
    highestPlayerTeamIndex,
    weakestTeamIndex,
    stepCounter,
    'FALLBACK FORCED MOVE: Highest weight player moved to weakest team'
  );
}