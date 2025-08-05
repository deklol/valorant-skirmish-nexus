// Evidence-Based Snake Draft with Smart Skill Distribution and Mini-AI Decision System
import { getRankPointsWithManualOverride } from "@/utils/rankingSystemWithOverrides";
import { calculateEvidenceBasedWeightWithMiniAi, EvidenceBasedConfig } from "@/utils/evidenceBasedWeightSystem";
import { AtlasDecisionSystem, AtlasDecision } from "@/utils/miniAiDecisionSystem";
import { TeamPlayer } from "@/utils/teamCompositionAnalyzer";
import { getUnifiedPlayerWeight, logWeightCalculation, hasRadiantHistory } from "@/utils/unifiedWeightSystem";


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
  miniAiDecisions: AtlasDecision[];
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
 * Creates balanced teams using a true balancing algorithm followed by iterative optimization.
 */
function createAtlasBalancedTeams(players: any[], numTeams: number, teamSize: number): { teams: any[][], steps: EvidenceBalanceStep[] } {
  const teams: any[][] = Array(numTeams).fill(null).map(() => []);
  const steps: EvidenceBalanceStep[] = [];
  let stepCounter = 0;

  // Sort players descending by weight
  const sortedPlayers = [...players].sort((a, b) => b.evidenceWeight - a.evidenceWeight);

  // 1. Initial Distribution using a true balancing algorithm
  for (const player of sortedPlayers) {
    // Find the team with the lowest current total weight that has space
    let targetTeamIndex = -1;
    let lowestTotal = Infinity;

    for (let i = 0; i < numTeams; i++) {
      if (teams[i].length < teamSize) {
        const currentTotal = teams[i].reduce((sum, p) => sum + p.evidenceWeight, 0);
        if (currentTotal < lowestTotal) {
          lowestTotal = currentTotal;
          targetTeamIndex = i;
        }
      }
    }

    if (targetTeamIndex !== -1) {
      teams[targetTeamIndex].push(player);
      // Log this placement as a step
      steps.push({
        step: ++stepCounter,
        player: {
          id: player.id,
          discord_username: player.discord_username || 'Unknown',
          points: player.evidenceWeight,
          rank: player.evidenceCalculation?.currentRank || player.current_rank || 'Unranked',
          source: player.weightSource || 'unknown',
          evidenceWeight: player.evidenceWeight,
          isElite: player.isElite,
        },
        assignedTeam: targetTeamIndex,
        reasoning: `ATLAS Balancing: Placed ${player.discord_username} on Team ${targetTeamIndex + 1} (lowest total) to create initial balance.`,
        teamStatesAfter: teams.map((team, index) => ({
          teamIndex: index,
          totalPoints: team.reduce((sum, p) => sum + p.evidenceWeight, 0),
          playerCount: team.length,
          eliteCount: team.filter(p => p.isElite).length
        })),
        phase: 'atlas_team_formation',
      });
    }
  }

  // 2. Iterative Optimization to fine-tune the balance
  const MAX_ITERATIONS = 20;
  for (let iter = 0; iter < MAX_ITERATIONS; iter++) {
    let teamTotals = teams.map(team => team.reduce((sum, p) => sum + p.evidenceWeight, 0));
    let richestTeamIndex = teamTotals.indexOf(Math.max(...teamTotals));
    let poorestTeamIndex = teamTotals.indexOf(Math.min(...teamTotals));

    if (richestTeamIndex === poorestTeamIndex) break;

    let bestSwap = null;
    let bestSpread = Math.max(...teamTotals) - Math.min(...teamTotals);

    const richestTeam = teams[richestTeamIndex];
    const poorestTeam = teams[poorestTeamIndex];

    for (const playerFromRich of richestTeam) {
      for (const playerFromPoor of poorestTeam) {
        const swapImpact = playerFromRich.evidenceWeight - playerFromPoor.evidenceWeight;
        const newRichTotal = teamTotals[richestTeamIndex] - swapImpact;
        const newPoorTotal = teamTotals[poorestTeamIndex] + swapImpact;

        const tempTotals = [...teamTotals];
        tempTotals[richestTeamIndex] = newRichTotal;
        tempTotals[poorestTeamIndex] = newPoorTotal;
        const newSpread = Math.max(...tempTotals) - Math.min(...tempTotals);

        if (newSpread < bestSpread) {
          bestSpread = newSpread;
          bestSwap = { playerFromRich, playerFromPoor, richestTeamIndex, poorestTeamIndex };
        }
      }
    }

    if (bestSwap) {
      const { playerFromRich, playerFromPoor, richestTeamIndex, poorestTeamIndex } = bestSwap;
      
      teams[richestTeamIndex] = teams[richestTeamIndex].filter(p => p.id !== playerFromRich.id);
      teams[richestTeamIndex].push(playerFromPoor);
      
      teams[poorestTeamIndex] = teams[poorestTeamIndex].filter(p => p.id !== playerFromPoor.id);
      teams[poorestTeamIndex].push(playerFromRich);

      steps.push({
        step: ++stepCounter,
        player: { id: 'swap', discord_username: `${playerFromRich.discord_username} ↔ ${playerFromPoor.discord_username}`, points: 0, rank: 'Optimization', source: 'ATLAS' },
        assignedTeam: -1,
        reasoning: `ATLAS Optimization: Swapped ${playerFromRich.discord_username} (${playerFromRich.evidenceWeight}pts) with ${playerFromPoor.discord_username} (${playerFromPoor.evidenceWeight}pts) to reduce point spread.`,
        teamStatesAfter: teams.map((team, index) => ({
          teamIndex: index,
          totalPoints: team.reduce((sum, p) => sum + p.evidenceWeight, 0),
          playerCount: team.length,
          eliteCount: team.filter(p => p.isElite).length
        })),
        phase: 'atlas_optimization_swap',
      });
    } else {
      break;
    }
  }

  return { teams, steps };
}


/**
 * Evidence-Based Snake Draft with Mini-AI Decision System
 */
export const evidenceBasedSnakeDraft = async (
  players: any[], 
  numTeams: number, 
  teamSize: number,
  onProgress?: (step: EvidenceBalanceStep, currentStep: number, totalSteps: number) => void,
  onValidationStart?: () => void,
  onEvidenceCalculation?: (phase: string, current: number, total: number) => void,
  evidenceConfig?: EvidenceBasedConfig
): Promise<EvidenceTeamResult> => {
  
  const config = evidenceConfig || {
    enableEvidenceBasedWeights: true,
    tournamentWinBonus: 15,
    rankDecayThreshold: 2,
    maxDecayPercent: 0.25,
    skillTierCaps: {
      enabled: true,
      eliteThreshold: 500,
      maxElitePerTeam: 1
    }
  };

  console.log('🏛️ STARTING ATLAS-FIRST TEAM FORMATION');

  // Phase 1: Calculate evidence-based weights for all players
  const evidenceCalculations: Array<{ userId: string; calculation: any }> = [];
  const atlasEnhancements: MiniAiEnhancedResult = {
    playerAdjustments: [],
    redistributionRecommendations: []
  };

  const playersWithEvidenceWeights = await Promise.all(
    players.map(async (player, index) => {
      if (onEvidenceCalculation) {
        onEvidenceCalculation('🏛️ ATLAS analyzing player', index + 1, players.length);
      }

      const evidenceResult = await calculateEvidenceBasedWeightWithMiniAi({
        current_rank: player.current_rank, peak_rank: player.peak_rank,
        manual_rank_override: player.manual_rank_override, manual_weight_override: player.manual_weight_override,
        use_manual_override: player.use_manual_override, rank_override_reason: player.rank_override_reason,
        weight_rating: player.weight_rating, tournaments_won: player.tournaments_won,
        last_tournament_win: player.last_tournament_win
      }, config, true);

      const evidenceCalculation = evidenceResult.evidenceResult.evidenceCalculation;
      if (evidenceCalculation) {
        evidenceCalculation.userId = player.user_id || player.id;
        evidenceCalculations.push({ userId: player.user_id || player.id, calculation: evidenceCalculation });
      }

      if (evidenceResult.miniAiRecommendations) {
        evidenceResult.miniAiRecommendations.forEach(rec => {
          if (rec.type === 'player_adjustment') {
            atlasEnhancements.playerAdjustments.push({
              playerId: player.user_id || player.id, username: player.discord_username || 'Unknown',
              originalPoints: evidenceResult.evidenceResult.evidenceCalculation?.basePoints || 150,
              adjustedPoints: evidenceResult.finalAdjustedPoints,
              reasoning: rec.reasoning, confidence: rec.confidence
            });
          }
        });
      }

      return {
        ...player,
        evidenceWeight: evidenceResult.finalAdjustedPoints,
        weightSource: evidenceResult.evidenceResult.source,
        evidenceCalculation,
        miniAiAnalysis: evidenceResult.evidenceResult.miniAiAnalysis,
        isElite: evidenceResult.finalAdjustedPoints >= config.skillTierCaps.eliteThreshold
      };
    })
  );

  console.log('🏛️ ATLAS WEIGHT CALCULATIONS COMPLETE');

  // Phase 2: ATLAS forms the teams directly.
  console.log('🏛️ ATLAS is now forming the most balanced teams...');
  const { teams: atlasCreatedTeams, steps: balanceSteps } = createAtlasBalancedTeams(
    playersWithEvidenceWeights,
    numTeams,
    teamSize
  );

  // Simulate progress for the UI
  for (let i = 0; i < balanceSteps.length; i++) {
    if (onProgress) {
      onProgress(balanceSteps[i], i + 1, balanceSteps.length);
    }
  }

  // Phase 3: ATLAS validation and final adjustments (optional fine-tuning)
  let validationResult: EvidenceValidationResult | undefined;
  if (onValidationStart) onValidationStart();

  const validationStartTime = Date.now();
  const atlasResult = await performAtlasValidation(atlasCreatedTeams, config, atlasEnhancements);
  
  validationResult = {
    originalSkillDistribution: {
      elitePlayersPerTeam: atlasCreatedTeams.map(t => t.filter(p => p.isElite).length),
      skillStackingViolations: atlasCreatedTeams.filter(t => t.filter(p => p.isElite).length > 1).length,
      balanceQuality: calculatePointBalance(atlasCreatedTeams).balanceQuality
    },
    adjustmentsMade: atlasResult.adjustments,
    finalDistribution: {
      elitePlayersPerTeam: atlasResult.teams.map(t => t.filter(p => p.isElite).length),
      skillStackingViolations: atlasResult.teams.filter(t => t.filter(p => p.isElite).length > 1).length,
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
  atlasEnhancements: MiniAiEnhancedResult
): Promise<{
  teams: any[][];
  adjustments: { redistributions: Array<{ player: string; fromTeam: number; toTeam: number; reason: string; type: 'skill_fix' | 'balance_fix' }> };
  decisions: AtlasDecision[];
  validationSteps: EvidenceBalanceStep[];
}> {
  let adjustedTeams = JSON.parse(JSON.stringify(teams));
  const adjustments: { redistributions: Array<{ player: string; fromTeam: number; toTeam: number; reason: string; type: 'skill_fix' | 'balance_fix' }> } = { redistributions: [] };
  const decisions: AtlasDecision[] = [];
  const validationSteps: EvidenceBalanceStep[] = [];

  console.log('🏛️ ATLAS VALIDATION STARTING: Analyzing team composition...');

  const teamPlayers: TeamPlayer[][] = adjustedTeams.map(team => 
    team.map(player => ({
      id: player.id,
      username: player.discord_username || 'Unknown',
      points: player.evidenceWeight || 150,
      isElite: (player.evidenceWeight || 150) >= config.skillTierCaps.eliteThreshold,
      skillTier: (player.evidenceWeight || 150) >= config.skillTierCaps.eliteThreshold ? 'elite' : 
                 (player.evidenceWeight || 150) >= 300 ? 'high' : 
                 (player.evidenceWeight || 150) >= 200 ? 'medium' : 'low'
    }))
  );

  try {
    const atlas = new AtlasDecisionSystem({
      enableTeamRedistribution: true, enablePlayerSwaps: true,
      aggressivenessLevel: 'moderate', confidenceThreshold: 80,
      eliteThreshold: config.skillTierCaps.eliteThreshold,
      logging: { enableDetailedLogging: true, logPlayerAnalysis: false, logTeamAnalysis: true, logDecisions: true }
    });

    const atlasAnalysis = await atlas.analyzeAndDecide([], teamPlayers);
    
    console.log('🏛️ ATLAS TEAM ANALYSIS COMPLETE:', atlasAnalysis.summary);

    for (const decision of atlasAnalysis.decisions) {
      decisions.push(decision);
      
      if (decision.type === 'team_redistribution' && decision.action?.playerId && decision.action?.toTeam !== undefined) {
        const playerToMove = adjustedTeams.flat().find(p => p.id === decision.action!.playerId);
        const fromTeamIndex = adjustedTeams.findIndex(team => team.some(p => p.id === decision.action!.playerId));
        const toTeamIndex = decision.action.toTeam;
        
        if (playerToMove && fromTeamIndex !== -1 && toTeamIndex !== -1) {
          adjustedTeams[fromTeamIndex] = adjustedTeams[fromTeamIndex].filter(p => p.id !== playerToMove.id);
          adjustedTeams[toTeamIndex].push(playerToMove);
          
          adjustments.redistributions.push({
            player: playerToMove.discord_username || 'Unknown',
            fromTeam: fromTeamIndex + 1, toTeam: toTeamIndex + 1,
            reason: decision.reasoning, type: 'skill_fix'
          });

          validationSteps.push({
            step: validationSteps.length + 1,
            player: {
              id: playerToMove.id, discord_username: playerToMove.discord_username || 'Unknown',
              points: playerToMove.evidenceWeight || 150, rank: playerToMove.current_rank || 'Unknown',
              source: 'atlas_redistribution', evidenceWeight: playerToMove.evidenceWeight,
              isElite: (playerToMove.evidenceWeight || 150) >= config.skillTierCaps.eliteThreshold
            },
            assignedTeam: toTeamIndex,
            reasoning: decision.reasoning,
            teamStatesAfter: adjustedTeams.map((team, index) => ({
              teamIndex: index,
              totalPoints: team.reduce((sum, p) => sum + (p.evidenceWeight || 150), 0),
              playerCount: team.length,
              eliteCount: team.filter(p => (p.evidenceWeight || 150) >= config.skillTierCaps.eliteThreshold).length
            })),
            phase: 'atlas_adjustment'
          });
        }
      }
    }

  } catch (error) {
    console.error('ATLAS validation failed, using fallback logic:', error);
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
