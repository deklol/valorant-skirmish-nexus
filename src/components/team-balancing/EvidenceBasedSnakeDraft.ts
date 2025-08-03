// Evidence-Based Snake Draft with Smart Skill Distribution and Mini-AI Decision System
import { getRankPointsWithManualOverride } from "@/utils/rankingSystemWithOverrides";
import { calculateEvidenceBasedWeight, calculateEvidenceBasedWeightWithMiniAi, assignWithSkillDistribution, EvidenceBasedConfig, EnhancedEvidenceResult } from "@/utils/evidenceBasedWeightSystem";
import { MiniAiDecisionSystem, MiniAiDecision } from "@/utils/miniAiDecisionSystem";
import { TeamPlayer } from "@/utils/teamCompositionAnalyzer";

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
  phase: 'elite_distribution' | 'regular_distribution' | 'mini_ai_adjustment';
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
  miniAiDecisions: MiniAiDecision[];
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
 * Evidence-Based Snake Draft with Mini-AI Decision System
 */
export const evidenceBasedSnakeDraft = (
  players: any[], 
  numTeams: number, 
  teamSize: number,
  onProgress?: (step: EvidenceBalanceStep, currentStep: number, totalSteps: number) => void,
  onValidationStart?: () => void,
  onEvidenceCalculation?: (phase: string, current: number, total: number) => void,
  evidenceConfig?: EvidenceBasedConfig
): EvidenceTeamResult => {
  
  const config = evidenceConfig || {
    enableEvidenceBasedWeights: true,
    tournamentWinBonus: 15,
    rankDecayThreshold: 2,
    maxDecayPercent: 0.25,
    skillTierCaps: {
      enabled: true,
      eliteThreshold: 400,
      maxElitePerTeam: 1
    }
  };

  console.log('🎯 STARTING EVIDENCE-BASED DRAFT WITH MINI-AI');

  // Phase 1: Calculate evidence-based weights with Mini-AI enhancement for all players
  const evidenceCalculations: Array<{ userId: string; calculation: any }> = [];
  const miniAiEnhancements: MiniAiEnhancedResult = {
    playerAdjustments: [],
    redistributionRecommendations: []
  };

  const playersWithEvidenceWeights = await Promise.all(
    players.map(async (player, index) => {
      if (onEvidenceCalculation) {
        onEvidenceCalculation('calculating', index + 1, players.length);
      }

      // Use Mini-AI enhanced calculation for more intelligent weight assignment
      const evidenceResult = await calculateEvidenceBasedWeightWithMiniAi({
        current_rank: player.current_rank,
        peak_rank: player.peak_rank,
        manual_rank_override: player.manual_rank_override,
        manual_weight_override: player.manual_weight_override,
        use_manual_override: player.use_manual_override,
        rank_override_reason: player.rank_override_reason,
        weight_rating: player.weight_rating,
        tournaments_won: player.tournaments_won,
        last_tournament_win: player.last_tournament_win
      }, config, true);

      const evidenceCalculation = evidenceResult.evidenceResult.evidenceCalculation;
      if (evidenceCalculation) {
        evidenceCalculation.userId = player.user_id || player.id;
        evidenceCalculations.push({
          userId: player.user_id || player.id,
          calculation: evidenceCalculation
        });
      }

      // Track Mini-AI adjustments
      if (evidenceResult.miniAiRecommendations && evidenceResult.miniAiRecommendations.length > 0) {
        evidenceResult.miniAiRecommendations.forEach(rec => {
          if (rec.type === 'player_adjustment') {
            miniAiEnhancements.playerAdjustments.push({
              playerId: player.user_id || player.id,
              username: player.discord_username || 'Unknown',
              originalPoints: evidenceResult.evidenceResult.evidenceCalculation?.basePoints || 150,
              adjustedPoints: evidenceResult.finalAdjustedPoints,
              reasoning: rec.reasoning,
              confidence: rec.confidence
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

  console.log('🏆 EVIDENCE WEIGHTS CALCULATED:', {
    totalPlayers: playersWithEvidenceWeights.length,
    elitePlayers: playersWithEvidenceWeights.filter(p => p.isElite).length,
    averageWeight: Math.round(playersWithEvidenceWeights.reduce((sum, p) => sum + p.evidenceWeight, 0) / playersWithEvidenceWeights.length)
  });

  // Phase 2: Smart skill distribution
  const distributionResult = assignWithSkillDistribution(playersWithEvidenceWeights, numTeams, teamSize, config);
  
  // Convert distribution steps to balance steps
  const balanceSteps: EvidenceBalanceStep[] = distributionResult.distributionSteps.map((step, index) => {
    const player = playersWithEvidenceWeights.find(p => (p.discord_username || 'Unknown') === step.player);
    const isElitePhase = step.action === 'initial_assignment' && (player?.isElite || false);
    
    const balanceStep: EvidenceBalanceStep = {
      step: step.step,
      player: {
        id: player?.id || '',
        discord_username: step.player,
        points: player?.evidenceWeight || 150,
        rank: player?.evidenceCalculation?.currentRank || player?.current_rank || 'Unranked',
        source: player?.weightSource || 'unknown',
        evidenceWeight: player?.evidenceWeight,
        weightSource: player?.weightSource,
        evidenceReasoning: player?.evidenceCalculation?.calculationReasoning,
        isElite: player?.isElite
      },
      assignedTeam: step.toTeam,
      reasoning: step.reason,
      teamStatesAfter: distributionResult.teams.map((team, teamIndex) => ({
        teamIndex,
        totalPoints: team.reduce((sum, p) => sum + (p.evidenceWeight || 150), 0),
        playerCount: team.length,
        eliteCount: team.filter(p => p.isElite).length
      })),
      phase: isElitePhase ? 'elite_distribution' : 'regular_distribution'
    };

    if (onProgress) {
      onProgress(balanceStep, index + 1, distributionResult.distributionSteps.length);
    }

    return balanceStep;
  });

  // Phase 3: Mini-AI validation and adjustment
  let validationResult: EvidenceValidationResult | undefined;
  if (onValidationStart) {
    onValidationStart();
  }

  const validationStartTime = Date.now();
  const miniAiResult = await performMiniAiValidation(distributionResult.teams, config, miniAiEnhancements);
  
  validationResult = {
    originalSkillDistribution: distributionResult.finalDistribution,
    adjustmentsMade: miniAiResult.adjustments,
    finalDistribution: {
      elitePlayersPerTeam: miniAiResult.teams.map(team => 
        team.filter(p => (p.evidenceWeight || 150) >= config.skillTierCaps.eliteThreshold).length
      ),
      skillStackingViolations: miniAiResult.teams.filter(team => 
        team.filter(p => (p.evidenceWeight || 150) >= config.skillTierCaps.eliteThreshold).length > 1
      ).length,
      pointBalance: calculatePointBalance(miniAiResult.teams)
    },
    miniAiDecisions: miniAiResult.decisions,
    validationTime: Date.now() - validationStartTime
  };

  // Add validation steps to balance steps
  const allBalanceSteps = [...balanceSteps, ...miniAiResult.validationSteps];

  // Calculate final analysis with Mini-AI summary
  const finalAnalysis = calculateFinalAnalysis(miniAiResult.teams, config, miniAiEnhancements);

  return {
    teams: miniAiResult.teams,
    balanceSteps: allBalanceSteps,
    validationResult,
    evidenceCalculations,
    miniAiEnhancements,
    finalAnalysis
  };
};

/**
 * Mini-AI Enhanced Validation System
 */
async function performMiniAiValidation(
  teams: any[][],
  config: EvidenceBasedConfig,
  miniAiEnhancements: MiniAiEnhancedResult
): Promise<{
  teams: any[][];
  adjustments: { redistributions: Array<{ player: string; fromTeam: number; toTeam: number; reason: string; type: 'skill_fix' | 'balance_fix' }> };
  decisions: MiniAiDecision[];
  validationSteps: EvidenceBalanceStep[];
}> {
  let adjustedTeams = JSON.parse(JSON.stringify(teams));
  const adjustments: { redistributions: Array<{ player: string; fromTeam: number; toTeam: number; reason: string; type: 'skill_fix' | 'balance_fix' }> } = { redistributions: [] };
  const decisions: MiniAiDecision[] = [];
  const validationSteps: EvidenceBalanceStep[] = [];

  // Convert teams to TeamPlayer format for Mini-AI analysis
  const teamPlayers: TeamPlayer[][] = adjustedTeams.map(team => 
    team.map(player => ({
      id: player.id,
      username: player.discord_username || 'Unknown',
      points: player.evidenceWeight || 150,
      isElite: (player.evidenceWeight || 150) >= config.skillTierCaps.eliteThreshold,
      skillTier: (player.evidenceWeight || 150) >= 400 ? 'elite' : 
                 (player.evidenceWeight || 150) >= 300 ? 'high' :
                 (player.evidenceWeight || 150) >= 200 ? 'medium' : 'low'
    }))
  );

  try {
    // Initialize Mini-AI Decision System
    const miniAi = new MiniAiDecisionSystem({
      enableTeamRedistribution: true,
      enablePlayerSwaps: true,
      aggressivenessLevel: 'moderate',
      confidenceThreshold: 80,
      eliteThreshold: config.skillTierCaps.eliteThreshold,
      logging: {
        enableDetailedLogging: true,
        logPlayerAnalysis: false,
        logTeamAnalysis: true,
        logDecisions: true
      }
    });

    // Run Mini-AI analysis on current team composition
    const miniAiAnalysis = await miniAi.analyzeAndDecide([], teamPlayers);
    
    console.log('🤖 MINI-AI TEAM ANALYSIS COMPLETE:', miniAiAnalysis.summary);

    // Process Mini-AI decisions
    for (const decision of miniAiAnalysis.decisions) {
      decisions.push(decision);
      
      if (decision.type === 'team_redistribution' && decision.action?.playerId && decision.action?.toTeam !== undefined) {
        // Find the player and execute redistribution
        const playerToMove = adjustedTeams.flat().find(p => p.id === decision.action!.playerId);
        const fromTeamIndex = adjustedTeams.findIndex(team => team.some(p => p.id === decision.action!.playerId));
        const toTeamIndex = decision.action.toTeam;
        
        if (playerToMove && fromTeamIndex !== -1 && toTeamIndex !== -1) {
          // Remove from source team
          adjustedTeams[fromTeamIndex] = adjustedTeams[fromTeamIndex].filter(p => p.id !== playerToMove.id);
          // Add to target team
          adjustedTeams[toTeamIndex].push(playerToMove);
          
          adjustments.redistributions.push({
            player: playerToMove.discord_username || 'Unknown',
            fromTeam: fromTeamIndex + 1,
            toTeam: toTeamIndex + 1,
            reason: decision.reasoning,
            type: 'skill_fix'
          });

          // Add validation step
          validationSteps.push({
            step: validationSteps.length + 1,
            player: {
              id: playerToMove.id,
              discord_username: playerToMove.discord_username || 'Unknown',
              points: playerToMove.evidenceWeight || 150,
              rank: playerToMove.current_rank || 'Unknown',
              source: 'mini_ai_redistribution',
              evidenceWeight: playerToMove.evidenceWeight,
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
            phase: 'mini_ai_adjustment'
          });
        }
      }
    }

  } catch (error) {
    console.error('Mini-AI validation failed, using fallback logic:', error);
    
    // Fallback to basic skill stacking detection
    const stackingTeams = adjustedTeams.map((team, index) => ({
      teamIndex: index,
      eliteCount: team.filter(p => (p.evidenceWeight || 150) >= config.skillTierCaps.eliteThreshold).length,
      elitePlayers: team.filter(p => (p.evidenceWeight || 150) >= config.skillTierCaps.eliteThreshold)
    })).filter(t => t.eliteCount > 1);

    if (stackingTeams.length > 0) {
      decisions.push({
        id: 'fallback_skill_fix',
        type: 'team_redistribution',
        priority: 'critical',
        description: `Fallback skill stacking fix for ${stackingTeams.length} teams`,
        reasoning: 'Mini-AI failed, using basic redistribution logic',
        confidence: 70,
        impact: {
          expectedImprovement: 40,
          affectedPlayers: [],
          affectedTeams: stackingTeams.map(t => t.teamIndex)
        },
        timestamp: new Date()
      } as MiniAiDecision);
    }
  }

  return {
    teams: adjustedTeams,
    adjustments,
    decisions,
    validationSteps
  };
}

/**
 * Calculate point balance metrics
 */
function calculatePointBalance(teams: any[][]) {
  const teamTotals = teams.map(team => 
    team.reduce((sum, player) => sum + (player.evidenceWeight || 150), 0)
  );

  const maxDifference = Math.max(...teamTotals) - Math.min(...teamTotals);
  
  let balanceQuality: 'ideal' | 'good' | 'warning' | 'poor';
  if (maxDifference <= 50) balanceQuality = 'ideal';
  else if (maxDifference <= 100) balanceQuality = 'good';
  else if (maxDifference <= 150) balanceQuality = 'warning';
  else balanceQuality = 'poor';

  return {
    maxDifference,
    balanceQuality
  };
}

/**
 * Calculate comprehensive final analysis with Mini-AI enhancements
 */
function calculateFinalAnalysis(teams: any[][], config: EvidenceBasedConfig, miniAiEnhancements?: MiniAiEnhancedResult) {
  const teamTotals = teams.map(team => 
    team.reduce((sum, player) => sum + (player.evidenceWeight || 150), 0)
  );

  const elitePlayersPerTeam = teams.map(team => 
    team.filter(p => (p.evidenceWeight || 150) >= config.skillTierCaps.eliteThreshold).length
  );

  const skillStackingViolations = elitePlayersPerTeam.filter(count => count > 1).length;
  const maxPointDifference = Math.max(...teamTotals) - Math.min(...teamTotals);

  // Determine overall quality
  let overallQuality: 'excellent' | 'good' | 'acceptable' | 'needs_improvement';
  if (skillStackingViolations === 0 && maxPointDifference <= 50) {
    overallQuality = 'excellent';
  } else if (skillStackingViolations === 0 && maxPointDifference <= 100) {
    overallQuality = 'good';
  } else if (skillStackingViolations <= 1 && maxPointDifference <= 150) {
    overallQuality = 'acceptable';
  } else {
    overallQuality = 'needs_improvement';
  }

  // Calculate Mini-AI summary
  let miniAiSummary = undefined;
  if (miniAiEnhancements) {
    const totalAdjustments = miniAiEnhancements.playerAdjustments.length;
    const totalRedistributions = miniAiEnhancements.redistributionRecommendations.length;
    const averageConfidence = totalAdjustments > 0 
      ? miniAiEnhancements.playerAdjustments.reduce((sum, adj) => sum + adj.confidence, 0) / totalAdjustments
      : 100;

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
      averageTeamPoints: Math.round(teamTotals.reduce((sum, total) => sum + total, 0) / teams.length),
      minTeamPoints: Math.min(...teamTotals),
      maxTeamPoints: Math.max(...teamTotals),
      maxPointDifference,
      balanceQuality: maxPointDifference <= 50 ? 'ideal' as const : 
                     maxPointDifference <= 100 ? 'good' as const :
                     maxPointDifference <= 150 ? 'warning' as const : 'poor' as const
    },
    overallQuality,
    miniAiSummary
  };
}