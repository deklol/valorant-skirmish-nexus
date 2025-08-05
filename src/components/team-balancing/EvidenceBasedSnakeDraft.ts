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
 * Creates balanced teams using a two-phase distribution method: elite players first, then the rest.
 * This ensures elite players are separated and the remaining players fill teams to maintain balance.
 */
function createAtlasBalancedTeams(players: any[], numTeams: number, teamSize: number, config: EvidenceBasedConfig): { teams: any[][], steps: EvidenceBalanceStep[] } {
  const teams: any[][] = Array(numTeams).fill(null).map(() => []);
  const steps: EvidenceBalanceStep[] = [];
  let stepCounter = 0;

  // Sort all players by weight, descending
  const sortedPlayers = [...players].sort((a, b) => b.evidenceWeight - a.evidenceWeight);

  // Separate elite players from the rest
  const elitePlayers = sortedPlayers.filter(p => p.isElite);
  const regularPlayers = sortedPlayers.filter(p => !p.isElite);

  // Phase 1: Distribute Elite Players
  // Deal them out one by one to each team to ensure they are separated.
  elitePlayers.forEach((player, index) => {
    const teamIndex = index % numTeams;
    if (teams[teamIndex].length < teamSize) {
      teams[teamIndex].push(player);
      steps.push({
        step: ++stepCounter,
        player: {
          id: player.id, discord_username: player.discord_username || 'Unknown',
          points: player.evidenceWeight, rank: player.evidenceCalculation?.currentRank || 'Unranked',
          source: player.weightSource || 'unknown', evidenceWeight: player.evidenceWeight, isElite: player.isElite,
        },
        assignedTeam: teamIndex,
        reasoning: `ATLAS Elite Distribution: Separating elite player ${player.discord_username} onto Team ${teamIndex + 1}.`,
        teamStatesAfter: teams.map((team, i) => ({
          teamIndex: i, totalPoints: team.reduce((sum, p) => sum + p.evidenceWeight, 0),
          playerCount: team.length, eliteCount: team.filter(p => p.isElite).length
        })),
        phase: 'elite_distribution',
      });
    }
  });

  // --- HARD RULE CONSTRAINT ---
  // Enforce that the highest-weighted elite player does NOT go to the strongest projected team
  if (elitePlayers.length > 0 && teams.length > 1) {
    const elitePlayerWithHighestWeight = elitePlayers[0]; // Sorted descending already
    const teamWithHighestProjectedScore = teams.reduce((prev, current) => {
      const prevTotal = prev.reduce((sum, p) => sum + p.evidenceWeight, 0);
      const currTotal = current.reduce((sum, p) => sum + p.evidenceWeight, 0);
      return currTotal > prevTotal ? current : prev;
    });

    if (teamWithHighestProjectedScore.includes(elitePlayerWithHighestWeight)) {
      // Find weakest team
      const weakestTeamIndex = teams.reduce((minIndex, team, i, arr) => {
        const total = team.reduce((sum, p) => sum + p.evidenceWeight, 0);
        const minTotal = arr[minIndex].reduce((sum, p) => sum + p.evidenceWeight, 0);
        return total < minTotal ? i : minIndex;
      }, 0);

      // Move the Radiant-caliber player to the weakest team
      const currentTeamIndex = teams.findIndex(t => t.includes(elitePlayerWithHighestWeight));
      if (currentTeamIndex !== -1 && currentTeamIndex !== weakestTeamIndex) {
        teams[currentTeamIndex] = teams[currentTeamIndex].filter(p => p !== elitePlayerWithHighestWeight);
        teams[weakestTeamIndex].push(elitePlayerWithHighestWeight);

        steps.push({
          step: ++stepCounter,
          player: {
            id: elitePlayerWithHighestWeight.id,
            discord_username: elitePlayerWithHighestWeight.discord_username || 'Unknown',
            points: elitePlayerWithHighestWeight.evidenceWeight,
            rank: elitePlayerWithHighestWeight.evidenceCalculation?.currentRank || 'Unranked',
            source: elitePlayerWithHighestWeight.weightSource || 'unknown',
            evidenceWeight: elitePlayerWithHighestWeight.evidenceWeight,
            isElite: true,
          },
          assignedTeam: weakestTeamIndex,
          reasoning: `ATLAS Override: Moved top-weight elite (${elitePlayerWithHighestWeight.discord_username}) to weakest team to prevent overstacking.`,
          teamStatesAfter: teams.map((team, i) => ({
            teamIndex: i,
            totalPoints: team.reduce((sum, p) => sum + p.evidenceWeight, 0),
            playerCount: team.length,
            eliteCount: team.filter(p => p.isElite).length
          })),
          phase: 'atlas_team_formation',
        });
      }
    }
  }


  // Phase 2: Distribute Regular Players using a smarter balancing algorithm
  for (const player of regularPlayers) {
    let targetTeamIndex = -1;
    let lowestImpactScore = Infinity;

    for (let i = 0; i < numTeams; i++) {
      if (teams[i].length >= teamSize) continue;

      // Create a hypothetical array of team totals if we add the player to team 'i'
      const hypotheticalTotals = teams.map((team, index) => {
        const currentTotal = team.reduce((sum, p) => sum + p.evidenceWeight, 0);
        return index === i ? currentTotal + player.evidenceWeight : currentTotal;
      });

      const maxPossibleTotal = Math.max(...hypotheticalTotals);
      
      // When calculating the minimum, only consider teams that will have players
      const minPossibleTotal = Math.min(...hypotheticalTotals.filter((total, index) => teams[index].length > 0 || index === i));

      const diff = maxPossibleTotal - minPossibleTotal;

      // Prefer the team that results in the least spread after adding this player
      if (diff < lowestImpactScore) {
        lowestImpactScore = diff;
        targetTeamIndex = i;
      }
    }

    if (targetTeamIndex !== -1) {
      teams[targetTeamIndex].push(player);
      steps.push({
        step: ++stepCounter,
        player: {
          id: player.id, discord_username: player.discord_username || 'Unknown',
          points: player.evidenceWeight, rank: player.evidenceCalculation?.currentRank || 'Unranked',
          source: player.weightSource || 'unknown', evidenceWeight: player.evidenceWeight, isElite: player.isElite,
        },
        assignedTeam: targetTeamIndex,
        reasoning: `ATLAS Smart Balancing: Placed ${player.discord_username} on Team ${targetTeamIndex + 1} to reduce point spread.`,
        teamStatesAfter: teams.map((team, i) => ({
          teamIndex: i,
          totalPoints: team.reduce((sum, p) => sum + p.evidenceWeight, 0),
          playerCount: team.length,
          eliteCount: team.filter(p => p.isElite).length
        })),
        phase: 'regular_distribution',
      });
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
      eliteThreshold: 400, // Adjusted threshold for better elite detection
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
    teamSize,
    config
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
  decisions: AtlasDecision[];
  validationSteps: EvidenceBalanceStep[];
}> {
  let adjustedTeams = JSON.parse(JSON.stringify(teams));
  const adjustments: { redistributions: Array<{ player: string; fromTeam: number; toTeam: number; reason: string; type: 'skill_fix' | 'balance_fix' }> } = { redistributions: [] };
  const decisions: AtlasDecision[] = [];
  const validationSteps: EvidenceBalanceStep[] = [];

  console.log('🏛️ ATLAS VALIDATION STARTING: Analyzing team composition...');

  // --- NEW CONDITIONAL RULE FOR 2-TEAM TOURNAMENTS ---
  if (adjustedTeams.length === 2) {
    const topPlayer = allPlayers.sort((a, b) => b.evidenceWeight - a.evidenceWeight)[0];
    const teamTotals = adjustedTeams.map(team => team.reduce((sum, p) => sum + p.evidenceWeight, 0));
    
    const topPlayerTeamIndex = adjustedTeams.findIndex(team => team.some(p => p.id === topPlayer.id));
    const otherTeamIndex = 1 - topPlayerTeamIndex;

    // Check if the top player's team has a higher total score
    if (teamTotals[topPlayerTeamIndex] > teamTotals[otherTeamIndex]) {
      console.warn(`ATLAS Final Balance Override: Top player's team is strongest. Forcing a swap.`);

      const strongTeam = [...adjustedTeams[topPlayerTeamIndex]].sort((a, b) => b.evidenceWeight - a.evidenceWeight);
      const weakTeam = [...adjustedTeams[otherTeamIndex]].sort((a, b) => b.evidenceWeight - a.evidenceWeight);

      // Ensure there are enough players to perform the swap
      if (strongTeam.length > 1 && weakTeam.length > 2) {
        const playerToSwapOut = strongTeam[1]; // 2nd highest on strong team
        const playerToSwapIn = weakTeam[2]; // 3rd highest on weak team

        // Perform the swap
        adjustedTeams[topPlayerTeamIndex] = strongTeam.filter(p => p.id !== playerToSwapOut.id);
        adjustedTeams[topPlayerTeamIndex].push(playerToSwapIn);

        adjustedTeams[otherTeamIndex] = weakTeam.filter(p => p.id !== playerToSwapIn.id);
        adjustedTeams[otherTeamIndex].push(playerToSwapOut);
        
        // Log the override for transparency
        validationSteps.push({
          step: validationSteps.length + 1,
          player: {
            id: 'override-swap',
            discord_username: `${playerToSwapOut.discord_username} ↔ ${playerToSwapIn.discord_username}`,
            points: 0, rank: 'Balance Override', source: 'ATLAS Rule',
          },
          assignedTeam: -1,
          reasoning: `ATLAS Final Balance Override: Swapped ${playerToSwapOut.discord_username} with ${playerToSwapIn.discord_username} to ensure the top player is not on the strongest team.`,
          teamStatesAfter: adjustedTeams.map((team, index) => ({
            teamIndex: index,
            totalPoints: team.reduce((sum, p) => sum + p.evidenceWeight, 0),
            playerCount: team.length,
            eliteCount: team.filter(p => p.isElite).length,
          })),
          phase: 'atlas_optimization_swap',
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
