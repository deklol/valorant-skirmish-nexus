import { RANK_POINT_MAPPING } from "./rankingSystem";
import { getRankPointsWithManualOverride, EnhancedRankPointsResult, UserRankData } from "./rankingSystemWithOverrides";
import { atlasLogger } from "./atlasLogger";

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
  tournamentWinnerBonuses?: {
    enabled: boolean;
    oneWin: number; // Bonus for 1 tournament win (+15 points)
    twoWins: number; // Bonus for 2 tournament wins (+25 points)
    threeOrMoreWins: number; // Bonus for 3+ tournament wins (+35 points)
    recentWinMultiplier: number; // Additional bonus for recent wins (1.5 = 50% more bonus)
    eliteWinnerMultiplier: number; // Additional bonus for elite winners (1.2 = 20% more bonus)
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
  tournamentWinsBonus?: number;
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
  tournamentWinnerBonuses: {
    enabled: true,
    oneWin: 15, // +15 points for 1 tournament win
    twoWins: 25, // +25 points for 2 tournament wins
    threeOrMoreWins: 35, // +35 points for 3+ tournament wins
    recentWinMultiplier: 1.5, // 50% more bonus for recent wins
    eliteWinnerMultiplier: 1.2 // 20% more bonus for elite winners
  }
};

/**
 * Calculate underranked bonus for players significantly below their peak
 * Progressive bonus system that rewards demonstrated higher skill levels
 */
function calculateUnderrankedBonus(currentPoints: number, peakPoints: number): number {
  if (peakPoints <= currentPoints) return 0; // No bonus needed, current is equal or better
  
  const pointDifference = peakPoints - currentPoints;
  
  // Start giving bonuses at 75+ point drops (1.5 tiers)
  if (pointDifference < 75) return 0;
  
  const tierDrops = pointDifference / 50; // Exact tier drops (can be decimal)
  
  // Progressive bonus system - more generous for larger drops
  let bonusPercent = 0;
  if (tierDrops >= 1.5) bonusPercent += 0.10; // First 1.5 tiers: +10%
  if (tierDrops >= 2.5) bonusPercent += 0.08; // Next tier: +8% more (18% total)
  if (tierDrops >= 3.5) bonusPercent += 0.07; // Next tier: +7% more (25% total)
  if (tierDrops >= 4.5) bonusPercent += 0.05; // Next tier: +5% more (30% total)
  if (tierDrops >= 5.5) bonusPercent += 0.05; // Additional tiers: +5% more (35% total)
  
  // Cap at 35% max bonus
  bonusPercent = Math.min(bonusPercent, 0.35);
  
  return bonusPercent;
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
 * Calculate tournament winner bonus to enhance proven players
 * Progressive bonuses for multiple wins, with additional modifiers
 */
function calculateTournamentWinnerBonus(
  userData: ExtendedUserRankData,
  config: AdaptiveWeightConfig,
  isElitePlayer: boolean
): { bonus: number; reasoning: string } {
  const bonuses = config.tournamentWinnerBonuses;
  if (!bonuses?.enabled) {
    return { bonus: 0, reasoning: '' };
  }

  const tournamentsWon = userData.tournaments_won || 0;
  
  // Tournament bonus logging via atlasLogger
  if (tournamentsWon > 0) {
    atlasLogger.weightCalculated((userData as any).discord_username || 'Unknown', tournamentsWon * bonuses.oneWin, `tournament_bonus_${tournamentsWon}_wins`);
  }
  
  if (tournamentsWon === 0) {
    return { bonus: 0, reasoning: '' };
  }

  // Base bonus calculation
  let baseBonus = 0;
  if (tournamentsWon === 1) {
    baseBonus = bonuses.oneWin;
  } else if (tournamentsWon === 2) {
    baseBonus = bonuses.twoWins;
  } else if (tournamentsWon >= 3) {
    baseBonus = bonuses.threeOrMoreWins;
  }

  // Calculate additional modifiers
  let finalBonus = baseBonus;
  const modifiers: string[] = [];

  // Elite player bonus (additional bonus for high-skill winners)
  if (isElitePlayer && tournamentsWon > 0) {
    const eliteBonus = baseBonus * (bonuses.eliteWinnerMultiplier - 1);
    finalBonus += eliteBonus;
    modifiers.push(`${Math.round(eliteBonus)} elite winner bonus`);
  }

  // Recent winner bonus (if last win was in last 90 days)
  if (userData.last_tournament_win) {
    const lastWinDate = new Date(userData.last_tournament_win);
    const daysSinceLastWin = Math.floor((Date.now() - lastWinDate.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysSinceLastWin <= 90) {
      const recentBonus = baseBonus * (bonuses.recentWinMultiplier - 1);
      finalBonus += recentBonus;
      modifiers.push(`+${Math.round(recentBonus)} recent winner bonus (${daysSinceLastWin} days ago)`);
    }
  }

  // Cap the bonus at reasonable levels
  finalBonus = Math.min(finalBonus, 60); // Max +60 points

  const reasoning = `🏆 Tournament Winner Bonus: +${baseBonus} base (${tournamentsWon} wins)${modifiers.length > 0 ? ` + ${modifiers.join(' + ')}` : ''} = +${Math.round(finalBonus)} total`;

  return { bonus: finalBonus, reasoning };
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
  // CRITICAL: Ensure config is properly set with defaults
  const finalConfig = {
    ...DEFAULT_CONFIG,
    ...config,
    tournamentWinnerBonuses: {
      ...DEFAULT_CONFIG.tournamentWinnerBonuses,
      ...(config.tournamentWinnerBonuses || {})
    }
  };

  // Debug logging for specific users
  if ((userData as any).discord_username?.includes('kera')) {
    atlasLogger.debug(`Tournament data for ${(userData as any).discord_username}`, {
      tournaments_won: userData.tournaments_won,
      userData_full: userData
    });
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
  if (!finalConfig.enableAdaptiveWeights) {
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
    // For Radiant/Immortal peaks, calculate base weight and apply tournament bonuses
    let baseWeight = peakRankPoints;
    
    // Apply minimal unranked penalty only for lower peaks
    let unrankedPenalty = 0;
    if (peakRankPoints < 400) { // Below Immortal
      if (peakRankPoints >= 265) unrankedPenalty = 0.10; // Ascendant loses 10%
      else if (peakRankPoints >= 190) unrankedPenalty = 0.15; // Diamond loses 15%
      else if (peakRankPoints >= 130) unrankedPenalty = 0.18; // Platinum loses 18%
      else unrankedPenalty = 0.20; // Lower ranks lose 20%
      
      baseWeight = Math.floor(peakRankPoints * (1 - unrankedPenalty));
    }
    
    // Calculate tournament winner bonus for proven players
    const isElitePlayer = peakRankPoints >= 400;
    const tournamentBonus = calculateTournamentWinnerBonus(userData, finalConfig, isElitePlayer);
    
    // Final weight = base weight + tournament bonus
    const adaptiveWeight = baseWeight + Math.floor(tournamentBonus.bonus);
    
    const reasoningParts = [
      `${peakRank} peak (${peakRankPoints} pts)`
    ];
    
    if (unrankedPenalty > 0) {
      reasoningParts.push(`Unranked adjustment: -${Math.round(unrankedPenalty * 100)}%`);
    }
    
    if (tournamentBonus.bonus > 0) {
      reasoningParts.push(`Tournament bonus: +${Math.round(tournamentBonus.bonus)} pts`);
    }
    
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
        adaptiveFactor: 1.0,
        calculatedAdaptiveWeight: adaptiveWeight,
        weightSource: 'adaptive_weight',
        calculationReasoning: reasoningParts.join('. '),
        tournamentWinsBonus: tournamentBonus.bonus,
        tournamentsWon: userData.tournaments_won || 0,
        manualOverrideApplied: false
      }
    };
  }

  // Calculate underranked bonus for ranked current with higher peak
  const underrankedBonusPercent = calculateUnderrankedBonus(currentRankPoints, peakRankPoints);
  
  // Calculate time weight if last rank update is available
  let timeWeight = 0;
  let timeSincePeakDays = 0;
  if (lastRankUpdate) {
    timeSincePeakDays = Math.floor((Date.now() - lastRankUpdate.getTime()) / (1000 * 60 * 60 * 24));
    timeWeight = calculateTimeWeight(timeSincePeakDays, config);
  }

  // Enhanced adaptive factor calculation - more weight to peak if underranked
  let adaptiveFactor = config.baseFactor + (underrankedBonusPercent * 0.8) + timeWeight;
  
  // Confidence boost: if peak is significantly higher, trust it more
  const rankGap = peakRankPoints - currentRankPoints;
  const confidenceBoost = Math.min(rankGap / 500, 0.15); // Up to 15% boost for large gaps
  adaptiveFactor += confidenceBoost;
  
  // Cap the adaptive factor
  adaptiveFactor = Math.min(adaptiveFactor, 0.75); // Max 75% peak influence for stability
  
  // Smart blending with underranked bonus
  const baseBlend = (currentRankPoints * (1 - adaptiveFactor)) + (peakRankPoints * adaptiveFactor);
  
  // Apply underranked bonus as additional points
  const underrankedBonusPoints = Math.floor(currentRankPoints * underrankedBonusPercent);
  let adaptiveWeight = Math.floor(baseBlend) + underrankedBonusPoints;
  
  // Apply tournament winner bonus to ranked players as well
  const isElitePlayer = peakRankPoints >= 400;
  const tournamentBonus = calculateTournamentWinnerBonus(userData, finalConfig, isElitePlayer);
  if (tournamentBonus.bonus > 0) {
    adaptiveWeight += Math.floor(tournamentBonus.bonus);
  }

  const reasoningParts = [
    `Adaptive: ${Math.round((1 - adaptiveFactor) * 100)}%/${Math.round(adaptiveFactor * 100)}% blend`
  ];

  if (underrankedBonusPoints > 0) {
    const tierDrops = (peakRankPoints - currentRankPoints) / 50;
    reasoningParts.push(`Underranked Bonus: ${tierDrops.toFixed(1)} tier drop = +${Math.round(underrankedBonusPercent * 100)}% (+${underrankedBonusPoints})`);
  }

  if (tournamentBonus.bonus > 0) {
    reasoningParts.push(`Tournament bonus: +${Math.round(tournamentBonus.bonus)} pts`);
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
        timeSincePeakDays: timeSincePeakDays > 0 ? timeSincePeakDays : undefined,
        tournamentWinsBonus: tournamentBonus.bonus,
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