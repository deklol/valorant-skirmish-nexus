import { RANK_POINT_MAPPING } from "./rankingSystem";
import { getRankPointsWithManualOverride, EnhancedRankPointsResult, UserRankData } from "./rankingSystemWithOverrides";

// Extended interface for tournament winner data
export interface ExtendedUserRankData extends UserRankData {
  tournaments_won?: number;
  last_tournament_win?: Date | string | null;
}

export interface AdaptiveWeightConfig {
  enableAdaptiveWeights: boolean;
  baseFactor: number; // Base adaptive factor (0.5 = 50/50 between current and peak)
  decayMultiplier: number; // How much decay affects the factor
  timeWeightDays: number; // Days after which time weighting kicks in
  tournamentWinnerPenalties?: {
    enabled: boolean;
    oneWin: number; // Penalty for 1 tournament win (0.15 = 15%)
    twoWins: number; // Penalty for 2 tournament wins (0.25 = 25%)
    threeOrMoreWins: number; // Penalty for 3+ tournament wins (0.35 = 35%)
    recentWinMultiplier: number; // Additional penalty for recent wins (1.5 = 50% more penalty)
    unrankedWinnerMultiplier: number; // Additional penalty for unranked winners (2.0 = double penalty)
  };
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
  tournamentWinsPenalty?: number;
  tournamentsWon?: number;
  manualOverrideApplied: boolean;
}

export interface EnhancedAdaptiveResult extends EnhancedRankPointsResult {
  adaptiveCalculation?: AdaptiveWeightCalculation;
}

const DEFAULT_CONFIG: AdaptiveWeightConfig = {
  enableAdaptiveWeights: true,
  baseFactor: 0.3, // More conservative 30% blend for stability
  decayMultiplier: 0.25, // Higher multiplier for more responsive decay adjustment
  timeWeightDays: 60, // More aggressive time consideration after 60 days
  tournamentWinnerPenalties: {
    enabled: true,
    oneWin: 0.15, // 15% penalty for 1 tournament win
    twoWins: 0.25, // 25% penalty for 2 tournament wins
    threeOrMoreWins: 0.35, // 35% penalty for 3+ tournament wins
    recentWinMultiplier: 1.5, // 50% more penalty for recent wins
    unrankedWinnerMultiplier: 2.0 // Double penalty for unranked winners
  }
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
 * Calculate tournament winner penalty to prevent overpowered teams
 * Progressive penalties for multiple wins, with additional modifiers
 */
function calculateTournamentWinnerPenalty(
  userData: ExtendedUserRankData,
  config: AdaptiveWeightConfig,
  isCurrentUnranked: boolean
): { penalty: number; reasoning: string } {
  const penalties = config.tournamentWinnerPenalties;
  if (!penalties?.enabled) {
    return { penalty: 0, reasoning: '' };
  }

  const tournamentsWon = userData.tournaments_won || 0;
  console.log(`Tournament penalty check for user:`, { 
    tournamentsWon, 
    isCurrentUnranked,
    penaltiesEnabled: penalties?.enabled,
    userData: userData
  });
  
  if (tournamentsWon === 0) {
    return { penalty: 0, reasoning: '' };
  }

  // Base penalty calculation
  let basePenalty = 0;
  if (tournamentsWon === 1) {
    basePenalty = penalties.oneWin;
  } else if (tournamentsWon === 2) {
    basePenalty = penalties.twoWins;
  } else if (tournamentsWon >= 3) {
    basePenalty = penalties.threeOrMoreWins;
  }

  // Calculate additional modifiers
  let finalPenalty = basePenalty;
  const modifiers: string[] = [];

  // Unranked winner penalty (double penalty)
  if (isCurrentUnranked && tournamentsWon > 0) {
    finalPenalty *= penalties.unrankedWinnerMultiplier;
    modifiers.push(`${Math.round((penalties.unrankedWinnerMultiplier - 1) * 100)}% unranked winner penalty`);
  }

  // Recent winner penalty (if last win was in last 90 days)
  if (userData.last_tournament_win) {
    const lastWinDate = new Date(userData.last_tournament_win);
    const daysSinceLastWin = Math.floor((Date.now() - lastWinDate.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysSinceLastWin <= 90) {
      const recentPenalty = basePenalty * (penalties.recentWinMultiplier - 1);
      finalPenalty += recentPenalty;
      modifiers.push(`${Math.round(recentPenalty * 100)}% recent winner penalty (${daysSinceLastWin} days ago)`);
    }
  }

  // Cap the penalty at 60% to prevent excessive penalization
  finalPenalty = Math.min(finalPenalty, 0.60);

  const reasoning = `🏆 Tournament Winner Penalty: ${Math.round(basePenalty * 100)}% base (${tournamentsWon} wins)${modifiers.length > 0 ? ` + ${modifiers.join(' + ')}` : ''} = ${Math.round(finalPenalty * 100)}% total`;

  return { penalty: finalPenalty, reasoning };
}

/**
 * Calculate adaptive weight that mediates between current and peak rank
 * Enhanced with tournament winner penalties for competitive fairness
 */
export function calculateAdaptiveWeight(
  userData: ExtendedUserRankData,
  config: AdaptiveWeightConfig = DEFAULT_CONFIG,
  lastRankUpdate?: Date
): EnhancedAdaptiveResult {
  console.log('🔍 calculateAdaptiveWeight called for:', (userData as any).discord_username, {
    current_rank: userData.current_rank,
    peak_rank: userData.peak_rank,
    tournaments_won: userData.tournaments_won,
    manual_override: userData.manual_rank_override,
    enableAdaptiveWeights: config.enableAdaptiveWeights,
    tournamentPenaltiesEnabled: config.tournamentWinnerPenalties?.enabled
  });

  // CRITICAL DEBUG: Check if tournament winner penalties are working
  if (userData.tournaments_won && userData.tournaments_won > 0) {
    console.log(`🏆 TOURNAMENT WINNER DETECTED: ${(userData as any).discord_username} has ${userData.tournaments_won} wins - penalties should apply!`);
  }

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
    
    // Calculate tournament winner penalty for unranked players
    const tournamentPenalty = calculateTournamentWinnerPenalty(userData, config, isCurrentUnranked);
    
    // Combine penalties: unranked penalty + tournament winner penalty
    const totalPenalty = Math.min(unrankedPenalty + tournamentPenalty.penalty, 0.75); // Cap at 75%
    const adaptiveWeight = Math.floor(peakRankPoints * (1 - totalPenalty));
    
    const reasoningParts = [
      `${peakRank} peak (${peakRankPoints} pts)`
    ];
    
    if (tournamentPenalty.penalty > 0) {
      reasoningParts.push(`Tournament penalty: ${Math.round(tournamentPenalty.penalty * 100)}%`);
    }
    
    reasoningParts.push(`Unranked penalty: ${Math.round(unrankedPenalty * 100)}%`);
    reasoningParts.push(`Final: ${adaptiveWeight} pts`);
    
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
        adaptiveFactor: 1 - totalPenalty,
        calculatedAdaptiveWeight: adaptiveWeight,
        weightSource: 'adaptive_weight',
        calculationReasoning: reasoningParts.join('. '),
        tournamentWinsPenalty: tournamentPenalty.penalty,
        tournamentsWon: userData.tournaments_won || 0,
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
  let adaptiveWeight = Math.floor(baseBlend - varianceReduction);
  
  // Apply tournament winner penalty to ranked players as well
  const tournamentPenalty = calculateTournamentWinnerPenalty(userData, config, isCurrentUnranked);
  if (tournamentPenalty.penalty > 0) {
    adaptiveWeight = Math.floor(adaptiveWeight * (1 - tournamentPenalty.penalty));
  }

  const reasoningParts = [
    `Adaptive: ${Math.round((1 - adaptiveFactor) * 100)}%/${Math.round(adaptiveFactor * 100)}% blend`
  ];

  if (tournamentPenalty.penalty > 0) {
    reasoningParts.push(`Tournament penalty: ${Math.round(tournamentPenalty.penalty * 100)}%`);
  }
  
  if (rankDecay > 0) {
    reasoningParts.push(`Decay: ${Math.round(rankDecay * 100)}%`);
  }
  
  reasoningParts.push(`Final: ${adaptiveWeight} pts`);

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
        tournamentWinsPenalty: tournamentPenalty.penalty,
        tournamentsWon: userData.tournaments_won || 0,
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