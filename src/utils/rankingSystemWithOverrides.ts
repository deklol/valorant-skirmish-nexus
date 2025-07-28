// Enhanced ranking system with manual override support
import { RANK_POINT_MAPPING } from "./rankingSystem";
// Import adaptive weight calculation
import { calculateAdaptiveWeight, EnhancedAdaptiveResult, AdaptiveWeightConfig, DEFAULT_CONFIG } from "./adaptiveWeightSystem";

// Update EnhancedRankPointsResult to be compatible with EnhancedAdaptiveResult
export interface EnhancedRankPointsResult {
  points: number;
  source: 'manual_override' | 'adaptive_weight' | 'current_rank' | 'peak_rank' | 'default';
  rank: string;
  overrideReason?: string;
  overrideSetBy?: string;
  metadata?: {
    currentRank?: string;
    peakRank?: string;
    manualOverride?: string;
  };
  // Add adaptiveCalculation property from EnhancedAdaptiveResult
  adaptiveCalculation?: {
    userId: string;
    currentRank?: string;
    peakRank?: string;
    currentRankPoints: number;
    peakRankPoints: number;
    adaptiveFactor: number;
    calculatedAdaptiveWeight: number;
    weightSource: 'manual_override' | 'adaptive_weight' | 'current_rank' | 'peak_rank' | 'default';
    calculationReasoning: string;
    rankDecayFactor?: number;
    timeSincePeakDays?: number;
    manualOverrideApplied: boolean;
  };
}

export interface UserRankData {
  id: string; // Added id for adaptiveCalculation
  discord_username: string; // Added for adaptiveCalculation reasoning
  current_rank?: string | null;
  peak_rank?: string | null;
  manual_rank_override?: string | null;
  manual_weight_override?: number | null;
  use_manual_override?: boolean;
  rank_override_reason?: string | null;
  rank_points?: number | null; // Original rank_points from DB
  weight_rating?: number | null; // This will now hold the effective calculated weight
}

/**
 * Enhanced getRankPoints that supports manual overrides with full priority system
 * Priority: Manual Override → Adaptive Weight → Current Rank → Peak Rank → Default (150)
 */
export const getRankPointsWithManualOverride = (
  userData: UserRankData,
  enableAdaptiveWeights: boolean // New parameter to control adaptive logic
): EnhancedRankPointsResult => {
  const {
    current_rank,
    peak_rank,
    manual_rank_override,
    manual_weight_override,
    use_manual_override,
    rank_override_reason,
    // weight_rating is now the output, not an input for calculation here
  } = userData;

  // Priority 1: Manual Override (if enabled and set)
  if (use_manual_override && manual_rank_override) {
    const result: EnhancedRankPointsResult = {
      points: manual_weight_override || RANK_POINT_MAPPING[manual_rank_override] || 150,
      source: 'manual_override',
      rank: manual_rank_override,
      overrideReason: rank_override_reason || undefined,
      metadata: {
        currentRank: current_rank || undefined,
        peakRank: peak_rank || undefined,
        manualOverride: manual_rank_override
      }
    };
    // Populate adaptiveCalculation for consistency if manual override is applied
    result.adaptiveCalculation = {
      userId: userData.id,
      currentRank: current_rank || undefined,
      peakRank: peak_rank || undefined,
      currentRankPoints: RANK_POINT_MAPPING[current_rank || ''] || 150,
      peakRankPoints: RANK_POINT_MAPPING[peak_rank || ''] || 150,
      adaptiveFactor: 0,
      calculatedAdaptiveWeight: result.points,
      weightSource: 'manual_override',
      calculationReasoning: `Manual override applied: ${result.rank} (${result.points} points)${result.overrideReason ? ` - Reason: ${result.overrideReason}` : ''}`,
      manualOverrideApplied: true
    };
    return result;
  }

  // Priority 2: Adaptive Weight (if enabled)
  if (enableAdaptiveWeights) {
    // Call the adaptive weight calculation
    const adaptiveResult = calculateAdaptiveWeight(userData, DEFAULT_CONFIG); // Pass DEFAULT_CONFIG or a custom one
    return adaptiveResult; // This will return the points, source, and adaptiveCalculation details
  }

  // Priority 3: Current Rank (if not Unranked/Unrated)
  if (current_rank && current_rank !== 'Unranked' && current_rank !== 'Unrated') {
    return {
      points: RANK_POINT_MAPPING[current_rank] || 150, // Use RANK_POINT_MAPPING directly here
      source: 'current_rank',
      rank: current_rank,
      metadata: {
        currentRank: current_rank,
        peakRank: peak_rank || undefined
      }
    };
  }

  // Priority 4: Peak Rank Fallback (if current is Unranked/Unrated and peak exists)
  if ((current_rank === 'Unranked' || current_rank === 'Unrated' || !current_rank) && peak_rank) {
    return {
      points: RANK_POINT_MAPPING[peak_rank] || 150,
      source: 'peak_rank',
      rank: peak_rank,
      metadata: {
        currentRank: current_rank || 'Unranked',
        peakRank: peak_rank
      }
    };
  }

  // Priority 5: Default fallback
  return {
    points: 150,
    source: 'default',
    rank: current_rank || 'Unranked',
    metadata: {
      currentRank: current_rank || 'Unranked',
      peakRank: peak_rank || undefined
    }
  };
};

export const getDisplayRankWithSource = (result: EnhancedRankPointsResult): string => {
  switch (result.source) {
    case 'manual_override':
      return `${result.rank} (Manual Override)`;
    case 'adaptive_weight':
      // If adaptive, show the adaptive rank from the result
      return `${result.rank} (Adaptive Weight)`;
    case 'current_rank':
      return result.rank;
    case 'peak_rank':
      return `${result.rank} (Peak Rank)`;
    case 'default':
      return `${result.rank} (Default)`;
    default:
      return result.rank;
  }
};
