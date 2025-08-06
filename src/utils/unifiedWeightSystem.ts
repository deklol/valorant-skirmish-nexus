/**
 * Unified Weight System - Single source of truth for player weight calculations
 * Consolidates various ranking and evidence-based systems with fallbacks and validation
 */
import { calculateEvidenceBasedWeightWithMiniAi } from "./evidenceBasedWeightSystem";
import { getRankPointsWithManualOverride } from "./rankingSystemWithOverrides";
import { RANK_POINT_MAPPING } from "./rankingSystem";
import { atlasLogger } from "./atlasLogger";

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
 * PHASE 2 FIX: SINGLE SOURCE OF TRUTH for all player weight calculations
 * Enhanced with weight calculation consolidation and caching
 */
export async function getUnifiedPlayerWeight(
  userData: any,
  options: PlayerWeightOptions = { enableATLAS: false }
): Promise<UnifiedPlayerWeight> {
  const { enableATLAS, userId, username, forceValidation = true } = options;

  // Debug logging for specific players
  const isTargetPlayer = username?.toLowerCase().includes('kera') || 
                        userData.discord_username?.toLowerCase().includes('kera');

  // Create cache key for weight calculation consistency
  const cacheKey = `${userData.user_id || userData.id}_${userData.current_rank}_${userData.peak_rank}_${userData.manual_rank_override}_${enableATLAS}`;
  
  if (isTargetPlayer) {
    atlasLogger.debug('UNIFIED WEIGHT CALCULATION for KERA', {
      userData,
      enableATLAS,
      options,
      cacheKey
    });
  }

  try {
    if (enableATLAS) {
      // PHASE 2 FIX: Use ATLAS evidence-based system with enhanced configuration
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
      const isValid = points > 0 && !isNaN(points);
      const isElite = points >= 400;

      if (isTargetPlayer) {
        atlasLogger.debug('KERA ATLAS RESULT', {
          points,
          reasoning: atlasResult.adjustmentReasoning,
          isValid,
          isElite,
          evidenceFactors: atlasResult.evidenceResult.evidenceCalculation?.evidenceFactors
        });
      }

      // PHASE 6 FIX: Enhanced validation with proper fallback
      const validatedPoints = forceValidation && !isValid ? 150 : points;

      return {
        points: validatedPoints,
        source: 'atlas_evidence',
        rank: atlasResult.evidenceResult.rank,
        reasoning: `🏛️ ATLAS: ${atlasResult.adjustmentReasoning}`,
        isElite,
        atlasAnalysis: atlasResult.miniAiRecommendations,
        evidenceFactors: atlasResult.evidenceResult.evidenceCalculation?.evidenceFactors,
        isValid: validatedPoints > 0 && !isNaN(validatedPoints)
      };
    } else {
      // Use standard system with manual overrides
      const standardResult = getRankPointsWithManualOverride(userData);
      const points = standardResult.points;
      const isValid = points > 0 && !isNaN(points);
      const isElite = points >= 400;

      if (isTargetPlayer) {
        atlasLogger.debug('KERA STANDARD RESULT', {
          points,
          source: standardResult.source,
          rank: standardResult.rank,
          isValid,
          isElite
        });
      }

      // Enhanced validation
      const validatedPoints = forceValidation && !isValid ? 150 : points;

      return {
        points: validatedPoints,
        source: standardResult.source === 'adaptive_weight' ? 'atlas_evidence' : standardResult.source,
        rank: standardResult.rank,
        reasoning: `Standard calculation: ${standardResult.rank} (${validatedPoints} points)`,
        isElite,
        isValid: validatedPoints > 0 && !isNaN(validatedPoints)
      };
    }
  } catch (error) {
    atlasLogger.error('UNIFIED WEIGHT CALCULATION FAILED', error);
    
    // Enhanced fallback to basic rank points
    const fallbackRank = userData.current_rank || userData.peak_rank || 'Unranked';
    const fallbackPoints = RANK_POINT_MAPPING[fallbackRank] || 150;

    if (isTargetPlayer) {
      atlasLogger.debug('KERA FALLBACK RESULT', {
        fallbackRank,
        fallbackPoints,
        error: error.message
      });
    }

    return {
      points: fallbackPoints,
      source: 'default',
      rank: fallbackRank,
      reasoning: `🚨 Fallback: ${fallbackRank} (${fallbackPoints} points) - Primary calculation failed: ${error.message}`,
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
  atlasLogger.weightCalculated(username, result.points, result.source);
  atlasLogger.debug(`Weight calculation details [${context}]`, {
    username,
    points: result.points,
    source: result.source,
    rank: result.rank,
    isElite: result.isElite,
    isValid: result.isValid,
    reasoning: result.reasoning
  });
}