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
  baseFactor: 0.5, // 50/50 blend
  decayMultiplier: 0.15, // Increases adaptive factor based on rank decay
  timeWeightDays: 90 // Consider time weighting after 90 days
};

/**
 * Calculate rank decay factor based on how far current rank has fallen from peak
 */
function calculateRankDecay(currentPoints: number, peakPoints: number): number {
  if (peakPoints <= currentPoints) return 0; // No decay, current is equal or better
  
  const maxDecay = peakPoints - 10; // Maximum possible decay (to Iron 1)
  const actualDecay = peakPoints - currentPoints;
  
  return Math.min(actualDecay / maxDecay, 1); // Normalized 0-1
}

/**
 * Calculate time-based weighting for peak rank relevance
 */
function calculateTimeWeight(timeSincePeakDays: number, config: AdaptiveWeightConfig): number {
  if (timeSincePeakDays <= config.timeWeightDays) return 0;
  
  // Linear increase from 0 to 0.2 over next 90 days
  const extraDays = timeSincePeakDays - config.timeWeightDays;
  return Math.min(extraDays / 450, 0.2); // Max 20% time penalty
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
    // Use peak rank with slight penalty for being unranked
    const adaptiveWeight = Math.floor(peakRankPoints * 0.85); // 15% penalty for being unranked
    
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
        adaptiveFactor: 0.85,
        calculatedAdaptiveWeight: adaptiveWeight,
        weightSource: 'adaptive_weight',
        calculationReasoning: `Adaptive weight: ${peakRank} peak rank with 15% unranked penalty (${peakRankPoints} → ${adaptiveWeight} points)`,
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

  // Calculate adaptive factor: higher decay = more peak rank influence
  const adaptiveFactor = Math.min(
    config.baseFactor + (rankDecay * config.decayMultiplier) + timeWeight,
    0.8 // Max 80% peak rank influence
  );

  // Calculate blended weight
  const adaptiveWeight = Math.floor(
    (currentRankPoints * (1 - adaptiveFactor)) + (peakRankPoints * adaptiveFactor)
  );

  const reasoningParts = [
    `Adaptive blend: ${Math.round((1 - adaptiveFactor) * 100)}% current rank (${currentRank}, ${currentRankPoints} pts)`,
    `+ ${Math.round(adaptiveFactor * 100)}% peak rank (${peakRank}, ${peakRankPoints} pts)`,
    `= ${adaptiveWeight} points`
  ];

  if (rankDecay > 0) {
    reasoningParts.push(`Rank decay factor: ${Math.round(rankDecay * 100)}%`);
  }
  
  if (timeWeight > 0) {
    reasoningParts.push(`Time penalty (${timeSincePeakDays} days): ${Math.round(timeWeight * 100)}%`);
  }

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