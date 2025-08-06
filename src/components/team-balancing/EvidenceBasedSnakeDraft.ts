// Clean ATLAS Team Formation System - Pure Implementation
import { calculateEvidenceBasedWeightWithMiniAi, EvidenceBasedConfig } from "@/utils/evidenceBasedWeightSystem";
import { atlasLogger } from "@/utils/atlasLogger";
import { validateAntiStacking, logAntiStackingResults } from "@/utils/antiStackingValidator";

// ============= CORE INTERFACES =============

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
          rankDecayThreshold: 2,
          maxDecayPercent: 0.25,
          skillTierCaps: {
            enabled: true,
            eliteThreshold: 300,
            maxElitePerTeam: 1
          }
        };
        const evidenceResult = await calculateEvidenceBasedWeightWithMiniAi(player, config);
        
        const processedPlayer = {
          ...player,
          evidenceWeight: evidenceResult.finalAdjustedPoints,
          evidenceCalculation: evidenceResult.evidenceResult,
          weightSource: evidenceResult.evidenceResult.evidenceCalculation?.weightSource || 'evidence_based',
          isElite: evidenceResult.finalAdjustedPoints >= 300
        };

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
    const isElitePlayer = player.evidenceWeight >= 300;
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
  return {
    step,
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

// ============= SMART ATLAS BALANCING SYSTEM =============

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

  // CRITICAL: If highest weight player is on the strongest team, find optimal swap
  if (highestPlayerTeamIndex === strongestTeamIndex) {
    atlasLogger.info(`🚨 CRITICAL VIOLATION: Highest weight player on strongest team - initiating smart swap`);
    
    const swapResult = findOptimalHighestPlayerSwap(optimizedTeams, highestWeightPlayer, highestPlayerTeamIndex);
    
    if (swapResult.swapFound) {
      // Perform the swap
      const targetPlayer = swapResult.targetPlayer;
      const targetTeamIndex = swapResult.targetTeamIndex;
      
      // Remove players from current teams
      optimizedTeams[highestPlayerTeamIndex] = optimizedTeams[highestPlayerTeamIndex].filter(p => p !== highestWeightPlayer);
      optimizedTeams[targetTeamIndex] = optimizedTeams[targetTeamIndex].filter(p => p !== targetPlayer);
      
      // Add players to new teams
      optimizedTeams[targetTeamIndex].push(highestWeightPlayer);
      optimizedTeams[highestPlayerTeamIndex].push(targetPlayer);

      optimizationSteps.push(createBalanceStep(
        ++stepCounter,
        highestWeightPlayer,
        targetTeamIndex,
        `🔄 ATLAS SMART SWAP: Highest weight player moved to prevent concentration (swapped with ${targetPlayer.discord_username})`,
        optimizedTeams,
        'anti_stacking_validation'
      ));

      optimizationSteps.push(createBalanceStep(
        ++stepCounter,
        targetPlayer,
        highestPlayerTeamIndex,
        `🔄 ATLAS SMART SWAP: Balancing swap to accommodate highest weight player redistribution`,
        optimizedTeams,
        'anti_stacking_validation'
      ));

      atlasLogger.info(`✅ Smart swap completed: ${highestWeightPlayer.discord_username} ↔ ${targetPlayer.discord_username}`);
    } else {
      atlasLogger.warn(`⚠️ No optimal swap found for highest weight player - teams remain as formed`);
    }
  }

  return {
    teams: optimizedTeams,
    steps: optimizationSteps,
    finalStepCounter: stepCounter
  };
}

// Find optimal swap for highest weight player to prevent stacking
function findOptimalHighestPlayerSwap(
  teams: any[][],
  highestWeightPlayer: any,
  currentTeamIndex: number
): { swapFound: boolean, balanceImprovement: number, targetPlayer?: any, targetTeamIndex?: number } {
  const currentTeamTotals = teams.map(team => team.reduce((sum, p) => sum + p.evidenceWeight, 0));
  const currentMaxDiff = Math.max(...currentTeamTotals) - Math.min(...currentTeamTotals);
  
  let bestSwap: { swapFound: boolean, balanceImprovement: number, targetPlayer?: any, targetTeamIndex?: number } = { 
    swapFound: false, 
    balanceImprovement: 0 
  };

  // Try swapping with players from other teams
  for (let targetTeamIndex = 0; targetTeamIndex < teams.length; targetTeamIndex++) {
    if (targetTeamIndex === currentTeamIndex) continue;

    for (const targetPlayer of teams[targetTeamIndex]) {
      // Simulate the swap
      const simulatedTotals = [...currentTeamTotals];
      simulatedTotals[currentTeamIndex] = simulatedTotals[currentTeamIndex] - highestWeightPlayer.evidenceWeight + targetPlayer.evidenceWeight;
      simulatedTotals[targetTeamIndex] = simulatedTotals[targetTeamIndex] - targetPlayer.evidenceWeight + highestWeightPlayer.evidenceWeight;
      
      const newMaxDiff = Math.max(...simulatedTotals) - Math.min(...simulatedTotals);
      const strongestTeamAfterSwap = simulatedTotals.indexOf(Math.max(...simulatedTotals));
      
      // Check if this swap prevents highest player from being on strongest team AND improves balance
      if (strongestTeamAfterSwap !== targetTeamIndex && newMaxDiff < currentMaxDiff) {
        const improvement = currentMaxDiff - newMaxDiff;
        
        if (improvement > bestSwap.balanceImprovement) {
          bestSwap = {
            swapFound: true,
            targetPlayer,
            targetTeamIndex,
            balanceImprovement: improvement
          };
        }
      }
    }
  }

  return bestSwap;
}