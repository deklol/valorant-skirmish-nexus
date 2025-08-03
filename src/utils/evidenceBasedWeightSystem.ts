// Evidence-Based Weight System - focuses on boosting skilled players, not penalizing them
import { RANK_POINT_MAPPING } from "./rankingSystem";
import { getRankPointsWithManualOverride, EnhancedRankPointsResult, UserRankData } from "./rankingSystemWithOverrides";
import { MiniAiDecisionSystem, MiniAiAnalysis } from "./miniAiDecisionSystem";
import { PlayerSkillData } from "./playerAnalysisEngine";

// Extended interface for tournament winner data
export interface ExtendedUserRankData extends UserRankData {
  tournaments_won?: number;
  last_tournament_win?: Date | string | null;
}

export interface EvidenceBasedConfig {
  enableEvidenceBasedWeights: boolean;
  tournamentWinBonus: number; // Points to ADD per tournament win (e.g. 15)
  rankDecayThreshold: number; // How many tiers down before applying decay (e.g. 2 tiers)
  maxDecayPercent: number; // Maximum decay percentage (e.g. 0.25 = 25%)
  skillTierCaps: {
    enabled: boolean;
    eliteThreshold: number; // Points threshold for "elite" players (e.g. 400)
    maxElitePerTeam: number; // Max elite players per team (e.g. 1)
  };
}

export interface EvidenceBasedCalculation {
  userId: string;
  currentRank?: string;
  peakRank?: string;
  basePoints: number;
  tournamentBonus: number;
  rankDecayApplied: number;
  finalPoints: number;
  weightSource: 'manual_override' | 'evidence_based' | 'current_rank' | 'peak_rank' | 'default';
  calculationReasoning: string;
  isEliteTier: boolean;
  tournamentsWon: number;
  evidenceFactors: string[];
}

export interface EnhancedEvidenceResult extends EnhancedRankPointsResult {
  evidenceCalculation?: EvidenceBasedCalculation;
  miniAiAnalysis?: MiniAiAnalysis;
}

export interface EvidenceWithMiniAi {
  evidenceResult: EnhancedEvidenceResult;
  miniAiRecommendations?: any[];
  finalAdjustedPoints: number;
  adjustmentReasoning: string;
}

const DEFAULT_EVIDENCE_CONFIG: EvidenceBasedConfig = {
  enableEvidenceBasedWeights: true,
  tournamentWinBonus: 15, // +15 points per tournament win
  rankDecayThreshold: 2, // Only apply decay if dropped 2+ tiers
  maxDecayPercent: 0.25, // Max 25% decay
  skillTierCaps: {
    enabled: true,
    eliteThreshold: 400, // 400+ points = elite
    maxElitePerTeam: 1 // Max 1 elite player per team
  }
};

/**
 * Calculate evidence-based weight with Mini-AI enhancement
 */
export function calculateEvidenceBasedWeightWithMiniAi(
  userData: ExtendedUserRankData,
  config: EvidenceBasedConfig = DEFAULT_EVIDENCE_CONFIG,
  enableMiniAi: boolean = true
): Promise<EvidenceWithMiniAi> {
  return new Promise(async (resolve) => {
    const evidenceResult = calculateEvidenceBasedWeight(userData, config);
    
    if (!enableMiniAi) {
      resolve({
        evidenceResult,
        finalAdjustedPoints: evidenceResult.points,
        adjustmentReasoning: evidenceResult.evidenceCalculation?.calculationReasoning || 'Standard evidence-based calculation'
      });
      return;
    }

    try {
      // Convert to PlayerSkillData format for Mini-AI
      const playerSkillData: PlayerSkillData = {
        userId: (userData as any).id || 'unknown',
        username: (userData as any).discord_username || 'Unknown',
        currentRank: userData.current_rank,
        peakRank: userData.peak_rank,
        basePoints: evidenceResult.points,
        tournamentsWon: userData.tournaments_won || 0,
        tournamentsPlayed: (userData as any).tournaments_played,
        wins: (userData as any).wins,
        losses: (userData as any).losses,
        lastRankUpdate: (userData as any).last_rank_update ? new Date((userData as any).last_rank_update) : undefined,
        lastTournamentWin: userData.last_tournament_win ? new Date(userData.last_tournament_win) : undefined,
        weightRating: userData.weight_rating
      };

      // Run Mini-AI analysis
      const miniAi = new MiniAiDecisionSystem({
        aggressivenessLevel: 'moderate',
        confidenceThreshold: 75,
        maxAdjustmentPercent: 0.30,
        logging: { enableDetailedLogging: true, logPlayerAnalysis: true, logTeamAnalysis: false, logDecisions: true }
      });

      const miniAiAnalysis = await miniAi.analyzeAndDecide([playerSkillData]);
      const playerAnalysis = miniAiAnalysis.playerAnalyses[0];
      
      let finalPoints = evidenceResult.points;
      let adjustmentReasoning = evidenceResult.evidenceCalculation?.calculationReasoning || '';
      
      if (playerAnalysis && playerAnalysis.adjustedPoints !== playerAnalysis.originalPoints) {
        finalPoints = playerAnalysis.adjustedPoints;
        adjustmentReasoning += ` | MINI-AI: ${playerAnalysis.adjustmentReason} (Confidence: ${playerAnalysis.confidenceScore}%)`;
      }

      resolve({
        evidenceResult: {
          ...evidenceResult,
          points: finalPoints,
          miniAiAnalysis
        },
        miniAiRecommendations: miniAiAnalysis.decisions,
        finalAdjustedPoints: finalPoints,
        adjustmentReasoning
      });
    } catch (error) {
      console.error('Mini-AI analysis failed, falling back to evidence-based:', error);
      resolve({
        evidenceResult,
        finalAdjustedPoints: evidenceResult.points,
        adjustmentReasoning: evidenceResult.evidenceCalculation?.calculationReasoning || 'Evidence-based calculation (Mini-AI failed)'
      });
    }
  });
}

/**
 * Calculate evidence-based weight that BOOSTS skilled players instead of penalizing them
 */
export function calculateEvidenceBasedWeight(
  userData: ExtendedUserRankData,
  config: EvidenceBasedConfig = DEFAULT_EVIDENCE_CONFIG
): EnhancedEvidenceResult {
  // First check for manual override
  const manualResult = getRankPointsWithManualOverride(userData);
  if (manualResult.source === 'manual_override') {
    return {
      ...manualResult,
      evidenceCalculation: {
        userId: '',
        currentRank: userData.current_rank || undefined,
        peakRank: userData.peak_rank || undefined,
        basePoints: manualResult.points,
        tournamentBonus: 0,
        rankDecayApplied: 0,
        finalPoints: manualResult.points,
        weightSource: 'manual_override',
        calculationReasoning: `Manual override: ${manualResult.rank} (${manualResult.points} points)`,
        isEliteTier: manualResult.points >= config.skillTierCaps.eliteThreshold,
        tournamentsWon: userData.tournaments_won || 0,
        evidenceFactors: ['Manual Override Applied']
      }
    };
  }

  const currentRank = userData.current_rank;
  const peakRank = userData.peak_rank;
  const tournamentsWon = userData.tournaments_won || 0;
  
  // Get base points - always start with the HIGHEST evidence we have
  let basePoints: number;
  let primaryRank: string;
  let weightSource: 'current_rank' | 'peak_rank' | 'default' = 'default';
  const evidenceFactors: string[] = [];

  // Priority 1: Use current rank if it's not Unranked/Unrated
  if (currentRank && currentRank !== 'Unranked' && currentRank !== 'Unrated') {
    basePoints = userData.weight_rating || RANK_POINT_MAPPING[currentRank] || 150;
    primaryRank = currentRank;
    weightSource = 'current_rank';
    evidenceFactors.push(`Current Rank: ${currentRank} (${basePoints} base points)`);
  }
  // Priority 2: Use peak rank if current is unranked but peak exists
  else if (peakRank && RANK_POINT_MAPPING[peakRank]) {
    basePoints = RANK_POINT_MAPPING[peakRank];
    primaryRank = peakRank;
    weightSource = 'peak_rank';
    evidenceFactors.push(`Peak Rank: ${peakRank} (${basePoints} base points - current unranked)`);
  }
  // Priority 3: Default
  else {
    basePoints = 150;
    primaryRank = currentRank || 'Unranked';
    weightSource = 'default';
    evidenceFactors.push(`Default: 150 points (no rank evidence)`);
  }

  // BOOST for tournament wins (evidence of maintained skill)
  const tournamentBonus = tournamentsWon * config.tournamentWinBonus;
  if (tournamentBonus > 0) {
    evidenceFactors.push(`Tournament Wins Bonus: +${tournamentBonus} points (${tournamentsWon} wins × ${config.tournamentWinBonus})`);
  }

  // ONLY apply rank decay if there's concrete evidence of skill drop
  let rankDecay = 0;
  if (weightSource === 'current_rank' && peakRank && RANK_POINT_MAPPING[peakRank]) {
    const currentPoints = basePoints;
    const peakPoints = RANK_POINT_MAPPING[peakRank];
    const pointDifference = peakPoints - currentPoints;
    
    // Only apply decay if dropped significantly (2+ tiers = 100+ points)
    if (pointDifference >= 100) {
      const tierDrops = Math.floor(pointDifference / 50); // Each tier ~50 points
      if (tierDrops >= config.rankDecayThreshold) {
        // Gradual decay: 5% per tier beyond threshold, capped at maxDecayPercent
        const decayPercent = Math.min((tierDrops - config.rankDecayThreshold + 1) * 0.05, config.maxDecayPercent);
        rankDecay = Math.floor(basePoints * decayPercent);
        evidenceFactors.push(`Rank Decay: -${rankDecay} points (${tierDrops} tier drop from ${peakRank})`);
      }
    }
  }

  // Calculate final points
  const finalPoints = Math.max(basePoints + tournamentBonus - rankDecay, 100); // Minimum 100 points

  // Determine if this is an elite tier player
  const isEliteTier = finalPoints >= config.skillTierCaps.eliteThreshold;
  if (isEliteTier) {
    evidenceFactors.push(`🏆 Elite Tier Player (${finalPoints}+ points)`);
  }

  const calculationReasoning = evidenceFactors.join(' | ');

  // Debug logging for specific players
  if ((userData as any).discord_username?.toLowerCase().includes('kera')) {
    console.log('🎯 KERA EVIDENCE-BASED CALCULATION:', {
      basePoints,
      tournamentBonus,
      rankDecay,
      finalPoints,
      evidenceFactors,
      isEliteTier
    });
  }

  return {
    points: finalPoints,
    source: 'adaptive_weight', // Keep existing source for compatibility
    rank: primaryRank,
    metadata: {
      currentRank: currentRank || undefined,
      peakRank: peakRank || undefined,
      manualOverride: userData.manual_rank_override || undefined
    },
    evidenceCalculation: {
      userId: '',
      currentRank: currentRank || undefined,
      peakRank: peakRank || undefined,
      basePoints,
      tournamentBonus,
      rankDecayApplied: rankDecay,
      finalPoints,
      weightSource: 'evidence_based',
      calculationReasoning,
      isEliteTier,
      tournamentsWon,
      evidenceFactors
    }
  };
}

/**
 * Skill Distribution Logic - prevents elite stacking
 */
export interface SkillDistributionResult {
  teams: any[][];
  distributionSteps: Array<{
    step: number;
    action: 'initial_assignment' | 'redistribution' | 'validation';
    player: string;
    fromTeam?: number;
    toTeam: number;
    reason: string;
    skillAnalysis: {
      elitePlayersPerTeam: number[];
      balanceQuality: 'ideal' | 'good' | 'warning' | 'poor';
    };
  }>;
  finalDistribution: {
    elitePlayersPerTeam: number[];
    skillStackingViolations: number;
    balanceQuality: 'ideal' | 'good' | 'warning' | 'poor';
  };
}

/**
 * Smart team assignment that prevents skill stacking
 */
export function assignWithSkillDistribution(
  players: any[],
  numTeams: number,
  teamSize: number,
  config: EvidenceBasedConfig = DEFAULT_EVIDENCE_CONFIG
): SkillDistributionResult {
  const teams: any[][] = Array(numTeams).fill(null).map(() => []);
  const distributionSteps: any[] = [];
  let stepCounter = 0;

  // Sort players by points (highest first)
  const sortedPlayers = players.sort((a, b) => (b.evidenceWeight || b.adaptiveWeight || 150) - (a.evidenceWeight || a.adaptiveWeight || 150));

  // Separate elite and non-elite players
  const elitePlayers = sortedPlayers.filter(p => (p.evidenceWeight || p.adaptiveWeight || 150) >= config.skillTierCaps.eliteThreshold);
  const regularPlayers = sortedPlayers.filter(p => (p.evidenceWeight || p.adaptiveWeight || 150) < config.skillTierCaps.eliteThreshold);

  console.log(`🏆 SKILL DISTRIBUTION: ${elitePlayers.length} elite players, ${regularPlayers.length} regular players`);

  // Phase 1: Distribute elite players first (max 1 per team)
  elitePlayers.forEach((player, index) => {
    const targetTeam = index % numTeams; // Round-robin elite distribution
    teams[targetTeam].push(player);

    const eliteCountsAfter = teams.map(team => 
      team.filter(p => (p.evidenceWeight || p.adaptiveWeight || 150) >= config.skillTierCaps.eliteThreshold).length
    );

    distributionSteps.push({
      step: ++stepCounter,
      action: 'initial_assignment',
      player: player.discord_username || 'Unknown',
      toTeam: targetTeam,
      reason: `Elite Distribution: Assigned elite player (${player.evidenceWeight || player.adaptiveWeight}pts) to Team ${targetTeam + 1} to prevent stacking`,
      skillAnalysis: {
        elitePlayersPerTeam: eliteCountsAfter,
        balanceQuality: eliteCountsAfter.every(count => count <= 1) ? 'ideal' : 'poor'
      }
    });
  });

  // Phase 2: Distribute regular players using cumulative balance
  regularPlayers.forEach(player => {
    // Find team with lowest total points that has space
    const teamTotals = teams.map(team => 
      team.reduce((sum, p) => sum + (p.evidenceWeight || p.adaptiveWeight || 150), 0)
    );
    
    let lowestTeamIndex = 0;
    let lowestTotal = Infinity;
    
    for (let i = 0; i < numTeams; i++) {
      if (teams[i].length < teamSize && teamTotals[i] < lowestTotal) {
        lowestTotal = teamTotals[i];
        lowestTeamIndex = i;
      }
    }

    teams[lowestTeamIndex].push(player);

    const eliteCountsAfter = teams.map(team => 
      team.filter(p => (p.evidenceWeight || p.adaptiveWeight || 150) >= config.skillTierCaps.eliteThreshold).length
    );

    distributionSteps.push({
      step: ++stepCounter,
      action: 'initial_assignment',
      player: player.discord_username || 'Unknown',
      toTeam: lowestTeamIndex,
      reason: `Regular Distribution: Assigned to Team ${lowestTeamIndex + 1} (lowest total: ${lowestTotal}pts)`,
      skillAnalysis: {
        elitePlayersPerTeam: eliteCountsAfter,
        balanceQuality: eliteCountsAfter.every(count => count <= 1) ? 'ideal' : 'poor'
      }
    });
  });

  // Calculate final distribution metrics
  const finalEliteCounts = teams.map(team => 
    team.filter(p => (p.evidenceWeight || p.adaptiveWeight || 150) >= config.skillTierCaps.eliteThreshold).length
  );
  const skillStackingViolations = finalEliteCounts.filter(count => count > 1).length;
  const balanceQuality = skillStackingViolations === 0 ? 'ideal' : 'poor';

  return {
    teams,
    distributionSteps,
    finalDistribution: {
      elitePlayersPerTeam: finalEliteCounts,
      skillStackingViolations,
      balanceQuality
    }
  };
}

/**
 * Display helper for evidence-based results
 */
export function getEvidenceDisplayRankWithSource(result: EnhancedEvidenceResult): string {
  const calc = result.evidenceCalculation;
  if (!calc) {
    return result.rank;
  }

  switch (calc.weightSource) {
    case 'manual_override':
      return `${result.rank} (Manual Override)`;
    case 'evidence_based':
      return `${result.rank} (Evidence: ${calc.finalPoints} pts)`;
    case 'current_rank':
      return `${result.rank} (Current)`;
    case 'peak_rank':
      return `${result.rank} (Peak)`;
    case 'default':
      return `${result.rank} (Default)`;
    default:
      return result.rank;
  }
}