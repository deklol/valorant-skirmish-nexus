
// Enhanced ranking system with manual override support
import { RANK_POINT_MAPPING } from "./rankingSystem";

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
}

export interface UserRankData {
  current_rank?: string | null;
  peak_rank?: string | null;
  manual_rank_override?: string | null;
  manual_weight_override?: number | null;
  use_manual_override?: boolean;
  rank_override_reason?: string | null;
  weight_rating?: number | null;
}

/**
 * Enhanced getRankPoints that supports manual overrides with full priority system
 * Priority: Manual Override → Current Rank → Peak Rank → Default (150)
 */
export const getRankPointsWithManualOverride = (userData: UserRankData): EnhancedRankPointsResult => {
  const {
    current_rank,
    peak_rank,
    manual_rank_override,
    manual_weight_override,
    use_manual_override,
    rank_override_reason,
    weight_rating
  } = userData;

  // Priority 1: Manual Override (if enabled and set)
  if (use_manual_override && manual_rank_override) {
    return {
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
  }

  // Priority 2: Current Rank (if not Unranked/Unrated)
  if (current_rank && current_rank !== 'Unranked' && current_rank !== 'Unrated') {
    return {
      points: weight_rating || RANK_POINT_MAPPING[current_rank] || 150,
      source: 'current_rank',
      rank: current_rank,
      metadata: {
        currentRank: current_rank,
        peakRank: peak_rank || undefined
      }
    };
  }

  // Priority 3: Peak Rank Fallback (if current is Unranked/Unrated and peak exists)
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

  // Priority 4: Default fallback
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
