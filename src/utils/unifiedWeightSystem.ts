// Unified Weight System - Single source of truth for all player weight calculations
import { getRankPointsWithManualOverride, EnhancedRankPointsResult } from "./rankingSystemWithOverrides";
import { calculateEvidenceBasedWeightWithMiniAi, EvidenceWithMiniAi } from "./evidenceBasedWeightSystem";
import { RANK_POINT_MAPPING } from "./rankingSystem";

export interface UnifiedPlayerWeight {
  points: number;
  source: 'manual_override' | 'atlas_evidence' | 'current_rank' | 'peak_rank' | 'default';
  rank: string;
  reasoning: string;
  isElite: boolean;
  atlasAnalysis?: any;
  evidenceFactors?: string[];
  /** Flag to ensure this is never 0 */
  isValid: boolean;
}

export interface PlayerWeightOptions {
  enableATLAS: boolean;
  userId?: string;
  username?: string;
  forceValidation?: boolean;
}

/**
 * SINGLE SOURCE OF TRUTH for all player weight calculations
 * This function replaces all other weight calculation methods
 */
export async function getUnifiedPlayerWeight(
  userData: any,
  options: PlayerWeightOptions = { enableATLAS: false }
): Promise<UnifiedPlayerWeight> {
  const { enableATLAS, userId, username, forceValidation = true } = options;

  // Debug logging for specific players
  const isTargetPlayer = username?.toLowerCase().includes('kera') || 
                        userData.discord_username?.toLowerCase().includes('kera');

  if (isTargetPlayer) {
    console.log('🎯 UNIFIED WEIGHT CALCULATION for KERA:', {
      userData,
      enableATLAS,
      options
    });
  }

  try {
    if (enableATLAS) {
      // Use ATLAS evidence-based system
      const atlasResult = await calculateEvidenceBasedWeightWithMiniAi({
        current_rank: userData.current_rank,
        peak_rank: userData.peak_rank,
        manual_rank_override: userData.manual_rank_override,
        manual_weight_override: userData.manual_weight_override,
        use_manual_override: userData.use_manual_override,
        rank_override_reason: userData.rank_override_reason,
        weight_rating: userData.weight_rating,
        tournaments_won: userData.tournaments_won,
        last_tournament_win: userData.last_tournament_win
      }, {
        enableEvidenceBasedWeights: true,
        tournamentWinBonus: 15,
        rankDecayThreshold: 2,
        maxDecayPercent: 0.25,
        skillTierCaps: {
          enabled: true,
          eliteThreshold: 400,
          maxElitePerTeam: 1
        }
      }, true);

      const points = atlasResult.finalAdjustedPoints;
      const isValid = points > 0;
      const isElite = points >= 400;

      if (isTargetPlayer) {
        console.log('🎯 KERA ATLAS RESULT:', {
          points,
          reasoning: atlasResult.adjustmentReasoning,
          isValid,
          isElite
        });
      }

      // Force minimum points if invalid
      const validatedPoints = forceValidation && !isValid ? 150 : points;

      return {
        points: validatedPoints,
        source: 'atlas_evidence',
        rank: atlasResult.evidenceResult.rank,
        reasoning: atlasResult.adjustmentReasoning,
        isElite,
        atlasAnalysis: atlasResult.miniAiRecommendations,
        evidenceFactors: atlasResult.evidenceResult.evidenceCalculation?.evidenceFactors,
        isValid: validatedPoints > 0
      };
    } else {
      // Use standard system with manual overrides
      const standardResult = getRankPointsWithManualOverride(userData);
      const points = standardResult.points;
      const isValid = points > 0;
      const isElite = points >= 400;

      if (isTargetPlayer) {
        console.log('🎯 KERA STANDARD RESULT:', {
          points,
          source: standardResult.source,
          rank: standardResult.rank,
          isValid,
          isElite
        });
      }

      // Force minimum points if invalid
      const validatedPoints = forceValidation && !isValid ? 150 : points;

      return {
        points: validatedPoints,
        source: standardResult.source === 'adaptive_weight' ? 'atlas_evidence' : standardResult.source,
        rank: standardResult.rank,
        reasoning: `Standard calculation: ${standardResult.rank} (${validatedPoints} points)`,
        isElite,
        isValid: validatedPoints > 0
      };
    }
  } catch (error) {
    console.error('Unified weight calculation failed:', error);
    
    // Fallback to basic rank points
    const fallbackRank = userData.current_rank || userData.peak_rank || 'Unranked';
    const fallbackPoints = RANK_POINT_MAPPING[fallbackRank] || 150;

    if (isTargetPlayer) {
      console.log('🎯 KERA FALLBACK RESULT:', {
        fallbackRank,
        fallbackPoints,
        error: error.message
      });
    }

    return {
      points: fallbackPoints,
      source: 'default',
      rank: fallbackRank,
      reasoning: `Fallback calculation: ${fallbackRank} (${fallbackPoints} points) - Error in primary calculation`,
      isElite: fallbackPoints >= 400,
      isValid: true
    };
  }
}

/**
 * Synchronous version for immediate calculations (uses cached/fallback values)
 */
export function getUnifiedPlayerWeightSync(
  userData: any,
  enableATLAS: boolean = false
): UnifiedPlayerWeight {
  const standardResult = getRankPointsWithManualOverride(userData);
  const points = standardResult.points;
  const isValid = points > 0;
  const validatedPoints = !isValid ? 150 : points;

  return {
    points: validatedPoints,
    source: enableATLAS ? 'atlas_evidence' : (standardResult.source === 'adaptive_weight' ? 'atlas_evidence' : standardResult.source),
    rank: standardResult.rank,
    reasoning: `${enableATLAS ? 'ATLAS sync calculation' : 'Standard calculation'}: ${standardResult.rank} (${validatedPoints} points)`,
    isElite: validatedPoints >= 400,
    isValid: validatedPoints > 0
  };
}

/**
 * Check if a player has ever been Radiant (for anti-stacking rules)
 */
export function hasRadiantHistory(userData: any): boolean {
  return userData.current_rank === 'Radiant' || 
         userData.peak_rank === 'Radiant' ||
         userData.manual_rank_override === 'Radiant';
}

/**
 * Validate team assignments to ensure Radiant players don't get strongest team
 */
export function validateRadiantDistribution(teams: any[][]): {
  isValid: boolean;
  violations: Array<{
    teamIndex: number;
    radiantPlayers: string[];
    isStrongestTeam: boolean;
    reason: string;
  }>;
} {
  const violations: any[] = [];
  
  // Calculate team totals
  const teamTotals = teams.map((team, index) => ({
    index,
    total: team.reduce((sum: number, player: any) => sum + (player.points || player.adaptiveWeight || player.evidenceWeight || 150), 0),
    players: team
  }));

  // Find strongest team
  const strongestTeam = teamTotals.reduce((strongest, current) => 
    current.total > strongest.total ? current : strongest
  );

  // Check for Radiant players on strongest team
  const strongestTeamRadiantPlayers = strongestTeam.players
    .filter((player: any) => hasRadiantHistory(player))
    .map((player: any) => player.discord_username || player.username || 'Unknown');

  if (strongestTeamRadiantPlayers.length > 0) {
    violations.push({
      teamIndex: strongestTeam.index,
      radiantPlayers: strongestTeamRadiantPlayers,
      isStrongestTeam: true,
      reason: `Team ${strongestTeam.index + 1} is the strongest (${strongestTeam.total} pts) and contains Radiant player(s): ${strongestTeamRadiantPlayers.join(', ')}`
    });
  }

  return {
    isValid: violations.length === 0,
    violations
  };
}

/**
 * Log weight calculation for transparency
 */
export function logWeightCalculation(
  username: string,
  result: UnifiedPlayerWeight,
  context: string = ''
): void {
  console.log(`⚖️ WEIGHT CALC [${context}]: ${username}`, {
    points: result.points,
    source: result.source,
    rank: result.rank,
    isElite: result.isElite,
    isValid: result.isValid,
    reasoning: result.reasoning
  });
}