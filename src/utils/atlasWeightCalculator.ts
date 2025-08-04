/**
 * ATLAS Weight Calculator - Unified player weight calculation system
 * Consolidates all weight calculation logic into a single source of truth
 */

import { getRankPointsWithManualOverride, type EnhancedRankPointsResult, type UserRankData } from "./rankingSystemWithOverrides";
import { calculateEvidenceBasedWeightWithMiniAi, type EvidenceWithMiniAi } from "./evidenceBasedWeightSystem";

export interface ATLASWeightResult {
  points: number;
  source: 'manual_override' | 'atlas_evidence' | 'current_rank' | 'peak_rank' | 'default';
  rank: string;
  reasoning?: string;
  atlasAnalysis?: EvidenceWithMiniAi;
}

export interface ATLASConfig {
  enableAtlas: boolean;
  tournamentWinBonus: number;
  rankDecayThreshold: number;
  maxDecayPercent: number;
  eliteThreshold: number;
  maxElitePerTeam: number;
}

const DEFAULT_ATLAS_CONFIG: ATLASConfig = {
  enableAtlas: true,
  tournamentWinBonus: 15,
  rankDecayThreshold: 2,
  maxDecayPercent: 0.25,
  eliteThreshold: 400,
  maxElitePerTeam: 1
};

/**
 * Single function to get player weight - handles both ATLAS and standard modes
 */
export const getPlayerWeight = async (
  userData: UserRankData & { tournaments_won?: number; last_tournament_win?: string },
  config: Partial<ATLASConfig> = {}
): Promise<ATLASWeightResult> => {
  const atlasConfig = { ...DEFAULT_ATLAS_CONFIG, ...config };

  // Manual override always takes priority
  if (userData.use_manual_override && userData.manual_rank_override) {
    return {
      points: userData.manual_weight_override || 150,
      source: 'manual_override',
      rank: userData.manual_rank_override,
      reasoning: userData.rank_override_reason || 'Manual admin override'
    };
  }

  // Use ATLAS if enabled
  if (atlasConfig.enableAtlas) {
    try {
      const atlasResult = await calculateEvidenceBasedWeightWithMiniAi(userData, {
        enableEvidenceBasedWeights: true,
        tournamentWinBonus: atlasConfig.tournamentWinBonus,
        rankDecayThreshold: atlasConfig.rankDecayThreshold,
        maxDecayPercent: atlasConfig.maxDecayPercent,
        skillTierCaps: {
          enabled: true,
          eliteThreshold: atlasConfig.eliteThreshold,
          maxElitePerTeam: atlasConfig.maxElitePerTeam
        }
      }, true);

      return {
        points: atlasResult.finalAdjustedPoints,
        source: 'atlas_evidence',
        rank: atlasResult.evidenceResult.rank,
        reasoning: `ATLAS: ${atlasResult.adjustmentReasoning || 'AI-enhanced calculation'}`,
        atlasAnalysis: atlasResult
      };
    } catch (error) {
      console.warn('ATLAS calculation failed, falling back to standard:', error);
    }
  }

  // Fall back to standard calculation
  const standardResult = getRankPointsWithManualOverride(userData);
  return {
    points: standardResult.points,
    source: standardResult.source === 'adaptive_weight' ? 'current_rank' : standardResult.source,
    rank: standardResult.rank,
    reasoning: standardResult.overrideReason || `Standard rank calculation: ${standardResult.rank}`
  };
};

/**
 * Synchronous version for immediate UI updates (uses cached or fallback values)
 */
export const getPlayerWeightSync = (
  userData: UserRankData,
  enableAtlas: boolean = false
): ATLASWeightResult => {
  // Manual override
  if (userData.use_manual_override && userData.manual_rank_override) {
    return {
      points: userData.manual_weight_override || 150,
      source: 'manual_override',
      rank: userData.manual_rank_override,
      reasoning: userData.rank_override_reason || 'Manual admin override'
    };
  }

  // For sync operations, use standard calculation
  // The async ATLAS calculation happens in background
  const standardResult = getRankPointsWithManualOverride(userData);
  return {
    points: standardResult.points,
    source: enableAtlas ? 'atlas_evidence' : (standardResult.source === 'adaptive_weight' ? 'current_rank' : standardResult.source),
    rank: standardResult.rank,
    reasoning: enableAtlas 
      ? 'ATLAS calculation in progress...' 
      : `Standard: ${standardResult.rank}`
  };
};

/**
 * Get display text for weight source
 */
export const getWeightSourceDisplay = (result: ATLASWeightResult): string => {
  switch (result.source) {
    case 'manual_override':
      return `Override: ${result.rank}`;
    case 'atlas_evidence':
      return `ATLAS: ${result.points}pts`;
    case 'current_rank':
      return result.rank;
    case 'peak_rank':
      return `Peak: ${result.rank}`;
    case 'default':
      return `Default (${result.rank})`;
    default:
      return result.rank;
  }
};