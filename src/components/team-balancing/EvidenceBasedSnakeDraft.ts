// Evidence-Based Snake Draft with Smart Skill Distribution
import { getRankPointsWithManualOverride } from "@/utils/rankingSystemWithOverrides";
import { calculateEvidenceBasedWeight, assignWithSkillDistribution, EvidenceBasedConfig, EnhancedEvidenceResult } from "@/utils/evidenceBasedWeightSystem";

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
  miniAiDecisions: string[];
  validationTime: number;
}

export interface EvidenceTeamResult {
  teams: any[][];
  balanceSteps: EvidenceBalanceStep[];
  validationResult?: EvidenceValidationResult;
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
    overallQuality: 'excellent' | 'good' | 'acceptable' | 'needs_improvement';
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

  console.log('🎯 STARTING EVIDENCE-BASED DRAFT');

  // Phase 1: Calculate evidence-based weights for all players
  const evidenceCalculations: Array<{ userId: string; calculation: any }> = [];
  const playersWithEvidenceWeights = players.map((player, index) => {
    if (onEvidenceCalculation) {
      onEvidenceCalculation('calculating', index + 1, players.length);
    }

    const evidenceResult = calculateEvidenceBasedWeight({
      current_rank: player.current_rank,
      peak_rank: player.peak_rank,
      manual_rank_override: player.manual_rank_override,
      manual_weight_override: player.manual_weight_override,
      use_manual_override: player.use_manual_override,
      rank_override_reason: player.rank_override_reason,
      weight_rating: player.weight_rating,
      tournaments_won: player.tournaments_won,
      last_tournament_win: player.last_tournament_win
    }, config);

    const evidenceCalculation = evidenceResult.evidenceCalculation;
    if (evidenceCalculation) {
      evidenceCalculation.userId = player.user_id || player.id;
      evidenceCalculations.push({
        userId: player.user_id || player.id,
        calculation: evidenceCalculation
      });
    }

    return {
      ...player,
      evidenceWeight: evidenceResult.points,
      weightSource: evidenceResult.source,
      evidenceCalculation,
      isElite: evidenceResult.points >= config.skillTierCaps.eliteThreshold
    };
  });

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
  const miniAiResult = performMiniAiValidation(distributionResult.teams, config);
  
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

  // Calculate final analysis
  const finalAnalysis = calculateFinalAnalysis(miniAiResult.teams, config);

  return {
    teams: miniAiResult.teams,
    balanceSteps: allBalanceSteps,
    validationResult,
    evidenceCalculations,
    finalAnalysis
  };
};

/**
 * Mini-AI Decision System for post-draft validation
 */
function performMiniAiValidation(
  teams: any[][],
  config: EvidenceBasedConfig
): {
  teams: any[][];
  adjustments: { redistributions: Array<{ player: string; fromTeam: number; toTeam: number; reason: string; type: 'skill_fix' | 'balance_fix' }> };
  decisions: string[];
  validationSteps: EvidenceBalanceStep[];
} {
  let adjustedTeams = JSON.parse(JSON.stringify(teams));
  const adjustments: { redistributions: Array<{ player: string; fromTeam: number; toTeam: number; reason: string; type: 'skill_fix' | 'balance_fix' }> } = { redistributions: [] };
  const decisions: string[] = [];
  const validationSteps: EvidenceBalanceStep[] = [];

  // Decision 1: Fix skill stacking violations
  const skillStackingTeams = adjustedTeams.map((team, index) => ({
    teamIndex: index,
    eliteCount: team.filter(p => (p.evidenceWeight || 150) >= config.skillTierCaps.eliteThreshold).length,
    elitePlayers: team.filter(p => (p.evidenceWeight || 150) >= config.skillTierCaps.eliteThreshold)
  })).filter(t => t.eliteCount > 1);

  if (skillStackingTeams.length > 0) {
    decisions.push(`🚨 SKILL STACKING DETECTED: ${skillStackingTeams.length} teams have multiple elite players`);
    
    // Redistribute excess elite players
    skillStackingTeams.forEach(stackedTeam => {
      const excessElites = stackedTeam.elitePlayers.slice(1); // Keep first elite, move others
      
      excessElites.forEach(elitePlayer => {
        // Find team with no elite players
        const targetTeamIndex = adjustedTeams.findIndex((team, index) => 
          index !== stackedTeam.teamIndex && 
          team.filter(p => (p.evidenceWeight || 150) >= config.skillTierCaps.eliteThreshold).length === 0
        );

        if (targetTeamIndex !== -1) {
          // Remove from stacked team
          adjustedTeams[stackedTeam.teamIndex] = adjustedTeams[stackedTeam.teamIndex].filter(p => p.id !== elitePlayer.id);
          // Add to target team
          adjustedTeams[targetTeamIndex].push(elitePlayer);

          const redistribution = {
            player: elitePlayer.discord_username || 'Unknown',
            fromTeam: stackedTeam.teamIndex + 1,
            toTeam: targetTeamIndex + 1,
            reason: `MINI-AI: Fixed skill stacking - moved elite player to team without elite players`,
            type: 'skill_fix' as const
          };

          adjustments.redistributions.push(redistribution);
          decisions.push(`✅ Redistributed ${elitePlayer.discord_username} from Team ${stackedTeam.teamIndex + 1} to Team ${targetTeamIndex + 1}`);

          // Add validation step
          validationSteps.push({
            step: validationSteps.length + 1,
            player: {
              id: elitePlayer.id,
              discord_username: elitePlayer.discord_username || 'Unknown',
              points: elitePlayer.evidenceWeight || 150,
              rank: elitePlayer.current_rank || 'Unknown',
              source: 'mini_ai_redistribution',
              evidenceWeight: elitePlayer.evidenceWeight,
              isElite: true
            },
            assignedTeam: targetTeamIndex,
            reasoning: redistribution.reason,
            teamStatesAfter: adjustedTeams.map((team, index) => ({
              teamIndex: index,
              totalPoints: team.reduce((sum, p) => sum + (p.evidenceWeight || 150), 0),
              playerCount: team.length,
              eliteCount: team.filter(p => (p.evidenceWeight || 150) >= config.skillTierCaps.eliteThreshold).length
            })),
            phase: 'mini_ai_adjustment'
          });
        }
      });
    });
  } else {
    decisions.push(`✅ SKILL DISTRIBUTION: No stacking violations detected`);
  }

  // Decision 2: Check point balance (only after skill fixes)
  const pointBalance = calculatePointBalance(adjustedTeams);
  if (pointBalance.balanceQuality === 'poor') {
    decisions.push(`⚖️ POINT BALANCE: Poor balance detected (${pointBalance.maxDifference} point difference)`);
    // Could add point-only swaps here, but skill distribution is priority
  } else {
    decisions.push(`✅ POINT BALANCE: Acceptable balance (${pointBalance.maxDifference} point difference)`);
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
 * Calculate comprehensive final analysis
 */
function calculateFinalAnalysis(teams: any[][], config: EvidenceBasedConfig) {
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
    overallQuality
  };
}