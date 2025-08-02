import { RANK_POINT_MAPPING } from "./rankingSystem";
import { getRankPointsWithManualOverride, EnhancedRankPointsResult, UserRankData } from "./rankingSystemWithOverrides";

export interface AdaptiveWeightConfig {
  enableAdaptiveWeights: boolean;
  baseFactor: number; // Base adaptive factor (0.5 = 50/50 between current and peak)
  decayMultiplier: number; // How much decay affects the factor
  timeWeightDays: number; // Days after which time weighting kicks in
}

export interface AdaptiveWeightCalculation {
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
}

export interface EnhancedAdaptiveResult extends EnhancedRankPointsResult {
  adaptiveCalculation?: AdaptiveWeightCalculation;
}

const DEFAULT_CONFIG: AdaptiveWeightConfig = {
  enableAdaptiveWeights: true,
  baseFactor: 0.3, // More conservative 30% blend for stability
  decayMultiplier: 0.25, // Higher multiplier for more responsive decay adjustment
  timeWeightDays: 60 // More aggressive time consideration after 60 days
};

/**
 * Enhanced rank decay calculation with tier-based weighting
 * Considers both absolute point difference and tier gaps for more nuanced decay
 */
function calculateRankDecay(currentPoints: number, peakPoints: number): number {
  if (peakPoints <= currentPoints) return 0; // No decay, current is equal or better
  
  const pointDifference = peakPoints - currentPoints;
  
  // Calculate tier-based decay - larger gaps between tiers should have more impact
  const tierGaps = {
    50: 0.2,   // Minor tier drop (e.g., Gold 3 to Gold 2)
    100: 0.4,  // Major tier drop (e.g., Diamond to Platinum)
    200: 0.6,  // Severe drop (e.g., Immortal to Gold)
    300: 0.8   // Extreme drop (e.g., Radiant to Silver)
  };
  
  let decayFactor = 0;
  for (const [threshold, factor] of Object.entries(tierGaps)) {
    if (pointDifference >= parseInt(threshold)) {
      decayFactor = factor;
    }
  }
  
  // Add progressive scaling for very large gaps
  if (pointDifference > 300) {
    const extraDecay = Math.min((pointDifference - 300) / 200, 0.15);
    decayFactor = Math.min(decayFactor + extraDecay, 0.95); // Cap at 95%
  }
  
  return decayFactor;
}

/**
 * Enhanced time-based weighting with exponential decay curve
 * Models realistic skill degradation over time
 */
function calculateTimeWeight(timeSincePeakDays: number, config: AdaptiveWeightConfig): number {
  if (timeSincePeakDays <= config.timeWeightDays) return 0;
  
  const extraDays = timeSincePeakDays - config.timeWeightDays;
  
  // Exponential decay curve - skill degrades faster initially, then plateaus
  // Formula: 1 - e^(-x/k) where k controls decay rate
  const decayConstant = 120; // Days for ~63% of max decay
  const maxTimeWeight = 0.25; // Max 25% time penalty
  
  const timeWeight = maxTimeWeight * (1 - Math.exp(-extraDays / decayConstant));
  
  return Math.min(timeWeight, maxTimeWeight);
}

/**
 * Calculate adaptive weight that mediates between current and peak rank
 */
export function calculateAdaptiveWeight(
  userData: UserRankData,
  config: AdaptiveWeightConfig = DEFAULT_CONFIG,
  lastRankUpdate?: Date
): EnhancedAdaptiveResult {
  // First, get the manual override result
  const manualResult = getRankPointsWithManualOverride(userData);
  
  // If manual override is used, return that immediately
  if (manualResult.source === 'manual_override') {
    return {
      ...manualResult,
      adaptiveCalculation: {
        userId: '', // Will be set by caller
        currentRank: userData.current_rank || undefined,
        peakRank: userData.peak_rank || undefined,
        currentRankPoints: RANK_POINT_MAPPING[userData.current_rank || ''] || 150,
        peakRankPoints: RANK_POINT_MAPPING[userData.peak_rank || ''] || 150,
        adaptiveFactor: 0,
        calculatedAdaptiveWeight: manualResult.points,
        weightSource: 'manual_override',
        calculationReasoning: `Manual override applied: ${manualResult.rank} (${manualResult.points} points)${manualResult.overrideReason ? ` - Reason: ${manualResult.overrideReason}` : ''}`,
        manualOverrideApplied: true
      }
    };
  }

  // If adaptive weights are disabled, use existing system
  if (!config.enableAdaptiveWeights) {
    return manualResult;
  }

  const currentRank = userData.current_rank;
  const peakRank = userData.peak_rank;
  
  // Get rank points
  const currentRankPoints = RANK_POINT_MAPPING[currentRank || ''] || 150;
  const peakRankPoints = RANK_POINT_MAPPING[peakRank || ''] || 150;

  // If no peak rank or peak is same/lower than current, use current rank
  if (!peakRank || peakRankPoints <= currentRankPoints) {
    return {
      ...manualResult,
      adaptiveCalculation: {
        userId: '',
        currentRank,
        peakRank,
        currentRankPoints,
        peakRankPoints,
        adaptiveFactor: 1.0, // Full current rank weight
        calculatedAdaptiveWeight: currentRankPoints,
        weightSource: 'current_rank',
        calculationReasoning: `Using current rank ${currentRank || 'Unranked'} (${currentRankPoints} points) - ${!peakRank ? 'no peak rank available' : 'peak rank is not higher than current'}`,
        manualOverrideApplied: false
      }
    };
  }

  // If current is Unranked/Unrated but peak exists, consider adaptive blending
  const isCurrentUnranked = !currentRank || currentRank === 'Unranked' || currentRank === 'Unrated';
  
  if (isCurrentUnranked) {
    // Enhanced unranked penalty based on peak rank tier
    let unrankedPenalty = 0.15; // Base 15% penalty
    
    // Higher penalty for higher peak ranks (skill should be maintained)
    if (peakRankPoints >= 400) unrankedPenalty = 0.25; // Immortal+ loses 25%
    else if (peakRankPoints >= 265) unrankedPenalty = 0.22; // Ascendant loses 22%
    else if (peakRankPoints >= 190) unrankedPenalty = 0.20; // Diamond loses 20%
    else if (peakRankPoints >= 130) unrankedPenalty = 0.18; // Platinum loses 18%
    
    const adaptiveWeight = Math.floor(peakRankPoints * (1 - unrankedPenalty));
    
    return {
      points: adaptiveWeight,
      source: 'adaptive_weight',
      rank: peakRank,
      metadata: {
        currentRank: currentRank || 'Unranked',
        peakRank,
        manualOverride: userData.manual_rank_override || undefined
      },
      adaptiveCalculation: {
        userId: '',
        currentRank: currentRank || 'Unranked',
        peakRank,
        currentRankPoints: 150, // Default for unranked
        peakRankPoints,
        adaptiveFactor: 1 - unrankedPenalty,
        calculatedAdaptiveWeight: adaptiveWeight,
        weightSource: 'adaptive_weight',
        calculationReasoning: `Enhanced unranked weighting: ${peakRank} peak (${peakRankPoints} pts) with ${Math.round(unrankedPenalty * 100)}% tier-appropriate penalty → ${adaptiveWeight} points`,
        manualOverrideApplied: false
      }
    };
  }

  // Calculate adaptive blending for ranked current with higher peak
  const rankDecay = calculateRankDecay(currentRankPoints, peakRankPoints);
  
  // Calculate time weight if last rank update is available
  let timeWeight = 0;
  let timeSincePeakDays = 0;
  if (lastRankUpdate) {
    timeSincePeakDays = Math.floor((Date.now() - lastRankUpdate.getTime()) / (1000 * 60 * 60 * 24));
    timeWeight = calculateTimeWeight(timeSincePeakDays, config);
  }

  // Enhanced adaptive factor calculation with confidence scoring
  let adaptiveFactor = config.baseFactor + (rankDecay * config.decayMultiplier) + timeWeight;
  
  // Confidence boost: if peak is significantly higher, trust it more
  const rankGap = peakRankPoints - currentRankPoints;
  const confidenceBoost = Math.min(rankGap / 500, 0.15); // Up to 15% boost for large gaps
  adaptiveFactor += confidenceBoost;
  
  // Cap the adaptive factor
  adaptiveFactor = Math.min(adaptiveFactor, 0.75); // Max 75% peak influence for stability
  
  // Smart blending with variance consideration
  const baseBlend = (currentRankPoints * (1 - adaptiveFactor)) + (peakRankPoints * adaptiveFactor);
  
  // Add small variance reduction for more consistent results
  const varianceReduction = Math.min(rankGap * 0.02, 10); // Small adjustment for smoother transitions
  const adaptiveWeight = Math.floor(baseBlend - varianceReduction);

  const reasoningParts = [
    `🧠 Enhanced Adaptive Algorithm:`,
    `Current: ${currentRank} (${currentRankPoints} pts) • Peak: ${peakRank} (${peakRankPoints} pts)`,
    `Smart blend: ${Math.round((1 - adaptiveFactor) * 100)}% current + ${Math.round(adaptiveFactor * 100)}% peak`
  ];

  if (rankDecay > 0) {
    reasoningParts.push(`📉 Tier-based decay: ${Math.round(rankDecay * 100)}% (${rankGap} point gap)`);
  }
  
  if (confidenceBoost > 0) {
    reasoningParts.push(`🎯 Confidence boost: +${Math.round(confidenceBoost * 100)}% (significant peak advantage)`);
  }
  
  if (timeWeight > 0) {
    reasoningParts.push(`⏰ Time decay: ${Math.round(timeWeight * 100)}% (${timeSincePeakDays} days since peak)`);
  }
  
  reasoningParts.push(`🎲 Final adaptive weight: ${adaptiveWeight} points`);

  return {
    points: adaptiveWeight,
    source: 'adaptive_weight',
    rank: `${currentRank} (adaptive)`,
    metadata: {
      currentRank,
      peakRank,
      manualOverride: userData.manual_rank_override || undefined
    },
    adaptiveCalculation: {
      userId: '',
      currentRank,
      peakRank,
      currentRankPoints,
      peakRankPoints,
      adaptiveFactor,
      calculatedAdaptiveWeight: adaptiveWeight,
      weightSource: 'adaptive_weight',
      calculationReasoning: reasoningParts.join('. '),
      rankDecayFactor: rankDecay,
      timeSincePeakDays: timeSincePeakDays > 0 ? timeSincePeakDays : undefined,
      manualOverrideApplied: false
    }
  };
}

/**
 * Get display text for adaptive weight source with detailed reasoning
 */
export function getAdaptiveDisplayRankWithSource(result: EnhancedAdaptiveResult): string {
  if (result.adaptiveCalculation) {
    const calc = result.adaptiveCalculation;
    switch (calc.weightSource) {
      case 'manual_override':
        return `${result.rank} (Manual Override)`;
      case 'adaptive_weight':
        return `${result.rank} (Adaptive: ${calc.calculatedAdaptiveWeight} pts)`;
      case 'current_rank':
        return `${result.rank} (Current Rank)`;
      case 'peak_rank':
        return `${result.rank} (Peak Rank)`;
      case 'default':
        return `${result.rank} (Default)`;
    }
  }
  
  // Fallback to original display logic
  switch (result.source) {
    case 'manual_override':
      return `${result.rank} (Manual Override)`;
    case 'current_rank':
      return result.rank;
    case 'peak_rank':
      return `${result.rank} (Peak Rank)`;
    case 'default':
      return `${result.rank} (Default)`;
    default:
      return result.rank;
  }
}