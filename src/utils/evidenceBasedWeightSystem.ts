// Evidence-Based Weight System - focuses on boosting skilled players, not penalizing them
import { RANK_POINT_MAPPING } from "@/utils/rankingSystem";
import { getRankPointsWithManualOverride, EnhancedRankPointsResult, UserRankData } from "@/utils/rankingSystemWithOverrides";
import { AtlasDecisionSystem, AtlasAnalysis } from "@/utils/miniAiDecisionSystem";
import { PlayerSkillData } from "@/utils/playerAnalysisEngine";
import { atlasLogger } from "@/utils/atlasLogger";

// Extended interface for tournament winner data
export interface ExtendedUserRankData extends UserRankData {
  tournaments_won?: number;
  last_tournament_win?: Date | string | null;
}

export interface EvidenceBasedConfig {
  enableEvidenceBasedWeights: boolean;
  tournamentWinBonus: number; // Points to ADD per tournament win (e.g. 15)
  underrankedBonusThreshold: number; // How many tiers down before applying bonus (e.g. 1.5 tiers)
  maxUnderrankedBonus: number; // Maximum underranked bonus percentage (e.g. 0.35 = 35%)
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
  underrankedBonus: number;
  finalPoints: number;
  weightSource: 'manual_override' | 'evidence_based' | 'current_rank' | 'peak_rank' | 'default';
  calculationReasoning: string;
  isEliteTier: boolean;
  tournamentsWon: number;
  evidenceFactors: string[];
}

export interface EnhancedEvidenceResult extends EnhancedRankPointsResult {
  evidenceCalculation?: EvidenceBasedCalculation;
  miniAiAnalysis?: AtlasAnalysis;
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
  underrankedBonusThreshold: 1.5, // Start applying bonus at 1.5 tier drop (75 points)
  maxUnderrankedBonus: 0.35, // Max 35% underranked bonus
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

      // Run ATLAS analysis
      const atlas = new AtlasDecisionSystem({
        aggressivenessLevel: 'moderate',
        confidenceThreshold: 75,
        maxAdjustmentPercent: 0.30,
        logging: { enableDetailedLogging: true, logPlayerAnalysis: true, logTeamAnalysis: false, logDecisions: true }
      });

      const atlasAnalysis = await atlas.analyzeAndDecide([playerSkillData]);
      const playerAnalysis = atlasAnalysis.playerAnalyses[0];
      
      let finalPoints = evidenceResult.points;
      let adjustmentReasoning = evidenceResult.evidenceCalculation?.calculationReasoning || '';
      
      if (playerAnalysis && playerAnalysis.adjustedPoints !== playerAnalysis.originalPoints) {
        finalPoints = playerAnalysis.adjustedPoints;
        const pointDifference = playerAnalysis.adjustedPoints - playerAnalysis.originalPoints;
        const adjustmentType = pointDifference > 0 ? 'boost' : 'reduction';
        
        // CRITICAL DEBUG: Log when ATLAS makes adjustments
        console.log(`🚨 ATLAS ADJUSTMENT for ${(userData as any).discord_username}:`, {
          originalPoints: playerAnalysis.originalPoints,
          adjustedPoints: playerAnalysis.adjustedPoints,
          pointDifference,
          adjustmentReason: playerAnalysis.adjustmentReason,
          confidenceScore: playerAnalysis.confidenceScore,
          analysisFlags: playerAnalysis.analysisFlags
        });
        
        adjustmentReasoning += `\nATLAS ${adjustmentType}: ${playerAnalysis.adjustmentReason} (${pointDifference > 0 ? '+' : ''}${pointDifference} pts, Confidence: ${playerAnalysis.confidenceScore}%)`;
      }

      resolve({
        evidenceResult: {
          ...evidenceResult,
          points: finalPoints,
          miniAiAnalysis: atlasAnalysis
        },
        miniAiRecommendations: atlasAnalysis.decisions,
        finalAdjustedPoints: finalPoints,
        adjustmentReasoning
      });
    } catch (error) {
      atlasLogger.error('ATLAS analysis failed, falling back to evidence-based', error);
      resolve({
        evidenceResult,
        finalAdjustedPoints: evidenceResult.points,
        adjustmentReasoning: evidenceResult.evidenceCalculation?.calculationReasoning || 'Evidence-based calculation (ATLAS failed)'
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
        underrankedBonus: 0,
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
    evidenceFactors.push(`Peak Rank: ${peakRank} (+${basePoints})`);
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
    evidenceFactors.push(`Tournament Winner: ${tournamentsWon} (+${tournamentBonus})`);
  }

  // Apply underranked bonus for any player below their peak skill level
  let underrankedBonus = 0;
  if (peakRank && RANK_POINT_MAPPING[peakRank]) {
    const peakPoints = RANK_POINT_MAPPING[peakRank];
    let currentPoints = basePoints;
    
    // For peak rank usage, compare against default unrated points (150)
    if (weightSource === 'peak_rank') {
      currentPoints = 150; // Unrated baseline
    }
    
    const pointDifference = peakPoints - currentPoints;
    
    // Apply generous bonus for any meaningful rank drop (1.5+ tiers = 75+ points)
    const thresholdPoints = config.underrankedBonusThreshold * 50; // Convert tiers to points
    if (pointDifference >= thresholdPoints) {
      const tierDrops = pointDifference / 50; // Exact tier drops (can be decimal)
      
      // Progressive bonus system: more generous for larger drops
      // 10% for first tier, then increasing increments
      let bonusPercent = 0;
      if (tierDrops >= 1.5) bonusPercent += 0.10; // First 1.5 tiers: +10%
      if (tierDrops >= 2.5) bonusPercent += 0.08; // Next tier: +8% more (18% total)
      if (tierDrops >= 3.5) bonusPercent += 0.07; // Next tier: +7% more (25% total)
      if (tierDrops >= 4.5) bonusPercent += 0.05; // Next tier: +5% more (30% total)
      if (tierDrops >= 5.5) bonusPercent += 0.05; // Additional tiers: +5% more (35% total)
      
      // Cap at max bonus
      bonusPercent = Math.min(bonusPercent, config.maxUnderrankedBonus);
      underrankedBonus = Math.floor(basePoints * bonusPercent);
      
      const rankStatus = weightSource === 'peak_rank' ? 'Unrated' : currentRank || 'Unknown';
      evidenceFactors.push(`Underranked Bonus: ${rankStatus} vs ${peakRank} peak = ${tierDrops.toFixed(1)} tier drop = +${Math.round(bonusPercent * 100)}% (+${underrankedBonus})`);
    }
  }

  // Calculate final points
  const finalPoints = Math.max(basePoints + tournamentBonus + underrankedBonus, 100); // Minimum 100 points

  // Determine if this is an elite tier player
  const isEliteTier = finalPoints >= config.skillTierCaps.eliteThreshold;

  const calculationReasoning = evidenceFactors.join('\n');

  // Debug logging for specific players
  if ((userData as any).discord_username?.toLowerCase().includes('alexbo') || 
      (userData as any).discord_username?.toLowerCase().includes('kera')) {
    atlasLogger.debug(`Evidence-based calculation for ${(userData as any).discord_username}`, {
      basePoints,
      tournamentBonus,
      underrankedBonus,
      finalPoints,
      evidenceFactors,
      isEliteTier,
      config_eliteThreshold: config.skillTierCaps.eliteThreshold
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
      underrankedBonus,
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

  atlasLogger.info(`Skill distribution: ${elitePlayers.length} elite players, ${regularPlayers.length} regular players`);

  // Phase 1: ATLAS Smart Elite Distribution - Prevent ALL forms of skill stacking
  elitePlayers.forEach((player, index) => {
    // ATLAS Strategy: Always assign to the team with the lowest total points that doesn't already have high-value players
    const teamTotals = teams.map(team => 
      team.reduce((sum, p) => sum + (p.evidenceWeight || p.adaptiveWeight || 150), 0)
    );
    
    // Find the best team for this elite player to prevent stacking
    let bestTeamIndex = 0;
    let bestScore = Infinity;
    
    for (let teamIndex = 0; teamIndex < numTeams; teamIndex++) {
      const currentTotal = teamTotals[teamIndex];
      const highValuePlayersCount = teams[teamIndex].filter(p => 
        (p.evidenceWeight || p.adaptiveWeight || 150) >= 250
      ).length;
      
      // Score = current team total + penalty for existing high-value players
      const stackingPenalty = highValuePlayersCount * 100; // Heavy penalty for stacking
      const totalScore = currentTotal + stackingPenalty;
      
      if (totalScore < bestScore) {
        bestScore = totalScore;
        bestTeamIndex = teamIndex;
      }
    }
    
    teams[bestTeamIndex].push(player);

    const eliteCountsAfter = teams.map(team => 
      team.filter(p => (p.evidenceWeight || p.adaptiveWeight || 150) >= config.skillTierCaps.eliteThreshold).length
    );

    distributionSteps.push({
      step: ++stepCounter,
      action: 'initial_assignment',
      player: player.discord_username || 'Unknown',
      toTeam: bestTeamIndex,
      reason: `🏛️ ATLAS: Elite player ${player.discord_username || 'Unknown'} (${player.evidenceWeight || 150}pts) assigned to Team ${bestTeamIndex + 1} - prevents skill stacking (team total: ${teamTotals[bestTeamIndex]} → ${teamTotals[bestTeamIndex] + (player.evidenceWeight || 150)})`,
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
      reason: generateRegularPlayerReasoning(player, lowestTeamIndex, lowestTotal, teamTotals),
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
 * Generate detailed ATLAS reasoning for elite player assignment
 */
function generateElitePlayerReasoning(player: any, targetTeam: number, index: number): string {
  const playerWeight = player.evidenceWeight || player.adaptiveWeight || 150;
  let reasoning = `🏛️ ATLAS Elite Distribution: ${player.discord_username || 'Unknown'} (${playerWeight}pts) → Team ${targetTeam + 1}. `;
  
  // Add detailed ATLAS reasoning
  if (player.evidenceCalculation) {
    const calc = player.evidenceCalculation;
    reasoning += `ATLAS Analysis: Current rank ${calc.currentRank || 'Unranked'} provides ${calc.basePoints}pts base weight. `;
    
    if (calc.rankDecayApplied > 0) {
      reasoning += `Peak rank decay detected: -${calc.rankDecayApplied}pts adjustment applied. `;
    }
    
    if (calc.tournamentBonus > 0) {
      reasoning += `Tournament performance bonus: +${calc.tournamentBonus}pts for ${calc.tournamentsWon} tournament wins. `;
    }
    
    reasoning += `Evidence factors: [${calc.evidenceFactors?.join(', ') || 'Standard Analysis'}]. `;
  }
  
  reasoning += `Elite skill distribution: Round-robin assignment prevents skill stacking (max 1 elite per team). Strategic placement ${index + 1} of elite players.`;
  
  return reasoning;
}

/**
 * Generate detailed ATLAS reasoning for regular player assignment
 */
function generateRegularPlayerReasoning(player: any, targetTeam: number, lowestTotal: number, teamTotals: number[]): string {
  const playerWeight = player.evidenceWeight || player.adaptiveWeight || 150;
  const newTeamTotal = lowestTotal + playerWeight;
  const avgTeamTotal = teamTotals.reduce((sum, total) => sum + total, 0) / teamTotals.length;
  
  let reasoning = `🏛️ ATLAS Smart Balancing: ${player.discord_username || 'Unknown'} (${playerWeight}pts) → Team ${targetTeam + 1}. `;
  
  // Add detailed ATLAS decision reasoning
  if (player.evidenceCalculation) {
    const calc = player.evidenceCalculation;
    reasoning += `ATLAS evaluated: ${calc.currentRank || 'Unranked'} rank worth ${calc.basePoints}pts base. `;
    
    if (calc.evidenceFactors && calc.evidenceFactors.length > 0) {
      reasoning += `Evidence factors considered: [${calc.evidenceFactors.join(', ')}]. `;
    }
    
    if (calc.weightSource === 'peak_rank') {
      reasoning += `Using peak rank data due to current rank limitations. `;
    }
  }
  
    reasoning += `Team selection logic: Chose team with lowest total (${lowestTotal}pts) for optimal balance. `;
    reasoning += `Post-assignment: Team total ${newTeamTotal}pts vs league average ${Math.round(avgTeamTotal)}pts. `;
  
  const balanceDiff = Math.abs(newTeamTotal - avgTeamTotal);
  if (balanceDiff <= 15) {
    reasoning += `Excellent balance maintained (±${Math.round(balanceDiff)}pts from average).`;
  } else if (balanceDiff <= 30) {
    reasoning += `Good balance achieved (±${Math.round(balanceDiff)}pts from average).`;
  } else {
    reasoning += `Balance impact noted (±${Math.round(balanceDiff)}pts from average) - will be optimized in validation phase.`;
  }
  
  return reasoning;
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