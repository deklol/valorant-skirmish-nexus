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

  // ============= PHASE 3: VALIDATION =============
  atlasLogger.info('✅ Phase 3: Anti-Stacking Validation');
  onValidationStart?.();

  const antiStackingResults = validateAntiStacking(teams);
  logAntiStackingResults(antiStackingResults, 'ATLAS Formation Results');

  // ============= FINAL ANALYSIS =============
  const finalAnalysis = calculateFinalAnalysis(teams, antiStackingResults);
  
  atlasLogger.info(`🏁 ATLAS Formation Complete: ${finalAnalysis.overallQuality.toUpperCase()}`);
  atlasLogger.info(`Balance Quality: ${finalAnalysis.pointBalance.balanceQuality}`);
  atlasLogger.info(`Anti-Stacking Valid: ${antiStackingResults.isValid ? '✅' : '❌'}`);

  return {
    teams,
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

  // ============= CAPTAIN ASSIGNMENT =============
  const captains = sortedPlayers.slice(0, numTeams);
  const remainingPlayers = sortedPlayers.slice(numTeams);

  captains.forEach((captain, index) => {
    let targetTeamIndex: number;

    if (captain === highestWeightPlayer) {
      // CRITICAL: Assign highest weight player to last team position to prevent stacking
      targetTeamIndex = numTeams - 1;
      atlasLogger.info(`🚫 ANTI-STACKING: ${captain.discord_username} assigned to Team ${targetTeamIndex + 1}`);
    } else {
      // Balance-aware assignment for other captains
      const currentWeights = teams.map(team => 
        team.reduce((sum, p) => sum + p.evidenceWeight, 0)
      );
      
      targetTeamIndex = findOptimalTeamForPlayer(captain, currentWeights, teams);
    }

    teams[targetTeamIndex].push(captain);

    steps.push(createBalanceStep(
      ++stepCounter,
      captain,
      targetTeamIndex,
      captain === highestWeightPlayer 
        ? `🚫 ANTI-STACKING CAPTAIN: Highest weight player strategically placed to prevent concentration`
        : `BALANCE-AWARE CAPTAIN: Optimal distribution assignment`,
      teams,
      'team_formation'
    ));
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
    overallQuality
  };
}