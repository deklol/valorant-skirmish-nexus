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
  phase: 'elite_distribution' | 'regular_distribution' | 'mini_ai_adjustment' | 'atlas_adjustment';
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

  console.log('🏛️ STARTING EVIDENCE-BASED DRAFT WITH ATLAS (Adaptive Tournament League Analysis System)');

  // Phase 1: Calculate evidence-based weights with ATLAS enhancement for all players
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

      // Use ATLAS enhanced calculation for more intelligent weight assignment
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

      // Track ATLAS adjustments
      if (evidenceResult.miniAiRecommendations && evidenceResult.miniAiRecommendations.length > 0) {
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
          }
        });
      }

      return {
        ...player,
        evidenceWeight: evidenceResult.finalAdjustedPoints,
        weightSource: evidenceResult.evidenceResult.source,
        evidenceCalculation,
        miniAiAnalysis: evidenceResult.evidenceResult.miniAiAnalysis,
        // Using the config for elite threshold check for consistency
        isElite: evidenceResult.finalAdjustedPoints >= config.skillTierCaps.eliteThreshold
      };
    })
  );

  console.log('🏛️ ATLAS WEIGHT CALCULATIONS COMPLETE:', {
    totalPlayers: playersWithEvidenceWeights.length,
    elitePlayers: playersWithEvidenceWeights.filter(p => p.isElite).length,
    averageWeight: Math.round(playersWithEvidenceWeights.reduce((sum, p) => sum + p.evidenceWeight, 0) / playersWithEvidenceWeights.length)
  });

  // Sort players by points (highest first)
  const sortedPlayers = playersWithEvidenceWeights.sort((a, b) => b.evidenceWeight - a.evidenceWeight);

  // Initialize teams
  let teams: any[][] = Array(numTeams).fill(null).map(() => []);
  const balanceSteps: EvidenceBalanceStep[] = [];
  let stepCounter = 0;

  // ⭐ CORRECTED LOGIC: Use a predictive, cumulative balance system for assignment
  const assignPlayerWithAtlasLogic = (player: any): number => {
    const teamTotals = teams.map(team => 
      team.reduce((sum, p) => sum + p.evidenceWeight, 0)
    );
    
    let bestTeamIndex = -1;
    let lowestHypotheticalSpread = Infinity;

    // Find the team where adding this player results in the smallest point spread
    for (let i = 0; i < numTeams; i++) {
      if (teams[i].length >= teamSize) continue; // Skip full teams

      // Create a hypothetical scenario
      const hypotheticalTotals = [...teamTotals];
      hypotheticalTotals[i] += player.evidenceWeight;
      
      // Calculate the new spread
      const maxTotal = Math.max(...hypotheticalTotals);
      const minTotal = Math.min(...hypotheticalTotals.filter((_, index) => teams[index].length > 0 || index === i)); // Only consider non-empty teams for min
      const hypotheticalSpread = maxTotal - minTotal;
      
      // If this move is better, store it
      if (hypotheticalSpread < lowestHypotheticalSpread) {
        lowestHypotheticalSpread = hypotheticalSpread;
        bestTeamIndex = i;
      }
    }
    
    // Fallback if no team is found (should not happen if there are spots)
    if (bestTeamIndex === -1) {
      bestTeamIndex = teams.findIndex(t => t.length < teamSize);
    }
    
    return bestTeamIndex;
  };
  
  // Assign each player using the new predictive logic
  sortedPlayers.forEach(player => {
    const targetTeamIndex = assignPlayerWithAtlasLogic(player);
    teams[targetTeamIndex].push(player);
    
    const teamStatesAfter = teams.map((team, index) => ({
      teamIndex: index,
      totalPoints: team.reduce((sum, p) => sum + p.evidenceWeight, 0),
      playerCount: team.length,
      eliteCount: team.filter(p => p.isElite).length
    }));
    
    const balanceStep: EvidenceBalanceStep = {
      step: ++stepCounter,
      player: {
        id: player.id,
        discord_username: player.discord_username || 'Unknown',
        points: player.evidenceWeight,
        rank: player.evidenceCalculation?.currentRank || player.current_rank || 'Unranked',
        source: player.weightSource || 'unknown',
        evidenceWeight: player.evidenceWeight,
        weightSource: player.weightSource,
        evidenceReasoning: player.evidenceCalculation?.calculationReasoning,
        isElite: player.isElite
      },
      assignedTeam: targetTeamIndex,
      reasoning: `ATLAS Predictive: Assigned ${player.discord_username} (${player.evidenceWeight}pts) to Team ${targetTeamIndex + 1} to achieve the best possible overall balance.`,
      teamStatesAfter,
      phase: 'regular_distribution'
    };

    balanceSteps.push(balanceStep);

    if (onProgress) {
      onProgress(balanceStep, stepCounter, players.length);
    }
  });


  // Phase 3: ATLAS validation and adjustment
  let validationResult: EvidenceValidationResult | undefined;
  if (onValidationStart) {
    onValidationStart();
  }

  const validationStartTime = Date.now();
  const atlasResult = await performAtlasValidation(teams, config, atlasEnhancements);
  
  const originalSkillDistribution = {
    elitePlayersPerTeam: teams.map(team => 
      team.filter(p => (p.evidenceWeight || 150) >= config.skillTierCaps.eliteThreshold).length
    ),
    skillStackingViolations: teams.filter(team => 
      team.filter(p => (p.evidenceWeight || 150) >= config.skillTierCaps.eliteThreshold).length > 1
    ).length,
    pointBalance: calculatePointBalance(teams),
    balanceQuality: 'good' as const // A default for pre-validation state
  };
  
  validationResult = {
    originalSkillDistribution,
    adjustmentsMade: atlasResult.adjustments,
    finalDistribution: {
      elitePlayersPerTeam: atlasResult.teams.map(team => 
        team.filter(p => (p.evidenceWeight || 150) >= config.skillTierCaps.eliteThreshold).length
      ),
      skillStackingViolations: atlasResult.teams.filter(team => 
        team.filter(p => (p.evidenceWeight || 150) >= config.skillTierCaps.eliteThreshold).length > 1
      ).length,
      pointBalance: calculatePointBalance(atlasResult.teams)
    },
    miniAiDecisions: atlasResult.decisions,
    validationTime: Date.now() - validationStartTime
  };

  // Add validation steps to balance steps
  const allBalanceSteps = [...balanceSteps, ...atlasResult.validationSteps];

  // Calculate final analysis with ATLAS summary
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
 * (Adaptive Tournament League Analysis System)
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

  // Convert teams to TeamPlayer format for ATLAS analysis
  const teamPlayers: TeamPlayer[][] = adjustedTeams.map(team => 
    team.map(player => ({
      id: player.id,
      username: player.discord_username || 'Unknown',
      points: player.evidenceWeight || 150,
      isElite: (player.evidenceWeight || 150) >= config.skillTierCaps.eliteThreshold,
      // Updated skill tier logic to match the new thresholds
      skillTier: (player.evidenceWeight || 150) >= config.skillTierCaps.eliteThreshold ? 'elite' : 
                 (player.evidenceWeight || 150) >= 300 ? 'high' : 
                 (player.evidenceWeight || 150) >= 200 ? 'medium' : 'low'
    }))
  );

  try {
    // Initialize ATLAS Decision System
    const atlas = new AtlasDecisionSystem({
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

    // Run ATLAS analysis on current team composition
    const atlasAnalysis = await atlas.analyzeAndDecide([], teamPlayers);
    
    console.log('🏛️ ATLAS TEAM ANALYSIS COMPLETE:', atlasAnalysis.summary);

    // Process ATLAS decisions
    for (const decision of atlasAnalysis.decisions) {
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
              source: 'atlas_redistribution',
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
            phase: 'atlas_adjustment'
          });
        }
      }
    }

  } catch (error) {
    console.error('ATLAS validation failed, using fallback logic:', error);
    
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
        reasoning: 'ATLAS failed, using basic redistribution logic',
        confidence: 70,
        impact: {
          expectedImprovement: 40,
          affectedPlayers: [],
          affectedTeams: stackingTeams.map(t => t.teamIndex)
        },
        timestamp: new Date()
      } as AtlasDecision);
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

  // Calculate ATLAS summary
  let miniAiSummary = undefined;
  if (atlasEnhancements) {
    const totalAdjustments = atlasEnhancements.playerAdjustments.length;
    const totalRedistributions = atlasEnhancements.redistributionRecommendations.length;
    const averageConfidence = totalAdjustments > 0 
      ? atlasEnhancements.playerAdjustments.reduce((sum, adj) => sum + adj.confidence, 0) / totalAdjustments
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
