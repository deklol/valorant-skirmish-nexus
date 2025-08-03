// Player Analysis Engine - Analyzes individual players for skill mismatches and adjustments
export interface PlayerAnalysis {
  userId: string;
  username: string;
  originalPoints: number;
  adjustedPoints: number;
  adjustmentReason: string;
  confidenceScore: number; // 0-100, how confident we are in this adjustment
  skillIndicators: {
    currentRank?: string;
    peakRank?: string;
    tournamentsWon: number;
    winRate?: number;
    recentActivity?: boolean;
    rankConsistency?: 'stable' | 'climbing' | 'declining' | 'volatile';
  };
  analysisFlags: AnalysisFlag[];
}

export interface AnalysisFlag {
  type: 'undervalued' | 'overvalued' | 'tournament_champion' | 'rank_mismatch' | 'inactive_decay' | 'consistent_performer';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  adjustment: number; // Points to add/subtract
  reasoning: string;
}

export interface PlayerSkillData {
  userId: string;
  username: string;
  currentRank?: string;
  peakRank?: string;
  basePoints: number;
  tournamentsWon: number;
  tournamentsPlayed?: number;
  wins?: number;
  losses?: number;
  lastRankUpdate?: Date;
  lastTournamentWin?: Date;
  weightRating?: number;
}

/**
 * Advanced Player Analysis Engine
 * Analyzes players for skill mismatches and provides point adjustments
 */
export class PlayerAnalysisEngine {
  private readonly RANK_TIERS = {
    'Radiant': 500,
    'Immortal 3': 450,
    'Immortal 2': 425,
    'Immortal 1': 400,
    'Ascendant 3': 365,
    'Ascendant 2': 340,
    'Ascendant 1': 315,
    'Diamond 3': 290,
    'Diamond 2': 265,
    'Diamond 1': 240,
    'Platinum 3': 215,
    'Platinum 2': 190,
    'Platinum 1': 165,
    'Gold 3': 140,
    'Gold 2': 130,
    'Gold 1': 120,
    'Silver 3': 110,
    'Silver 2': 100,
    'Silver 1': 90,
    'Bronze 3': 80,
    'Bronze 2': 70,
    'Bronze 1': 60,
    'Iron 3': 50,
    'Iron 2': 40,
    'Iron 1': 30
  };

  /**
   * Analyze a player and determine appropriate point adjustments
   */
  analyzePlayer(playerData: PlayerSkillData): PlayerAnalysis {
    const analysis: PlayerAnalysis = {
      userId: playerData.userId,
      username: playerData.username,
      originalPoints: playerData.basePoints,
      adjustedPoints: playerData.basePoints,
      adjustmentReason: '',
      confidenceScore: 50, // Start neutral
      skillIndicators: {
        currentRank: playerData.currentRank,
        peakRank: playerData.peakRank,
        tournamentsWon: playerData.tournamentsWon,
        winRate: this.calculateWinRate(playerData),
        recentActivity: this.checkRecentActivity(playerData),
        rankConsistency: this.analyzeRankConsistency(playerData)
      },
      analysisFlags: []
    };

    // Run all analysis checks
    this.checkTournamentChampionBoost(analysis, playerData);
    this.checkRankMismatch(analysis, playerData);
    this.checkUndervaluedPlayer(analysis, playerData);
    this.checkInactiveDecay(analysis, playerData);
    this.checkConsistentPerformer(analysis, playerData);

    // Apply adjustments and calculate final confidence
    this.applyAdjustments(analysis);
    this.calculateFinalConfidence(analysis);

    return analysis;
  }

  /**
   * Check for tournament champion boost
   */
  private checkTournamentChampionBoost(analysis: PlayerAnalysis, playerData: PlayerSkillData): void {
    const tournamentsWon = playerData.tournamentsWon || 0;
    
    if (tournamentsWon > 0) {
      const peakPoints = this.RANK_TIERS[playerData.peakRank as keyof typeof this.RANK_TIERS] || 150;
      const currentPoints = playerData.basePoints;
      
      // Base tournament bonus
      let bonus = tournamentsWon * 15; // 15 points per tournament win
      let severity: 'low' | 'medium' | 'high' | 'critical' = 'medium';
      
      // Extra boost for high-tier tournament winners
      if (peakPoints >= 400) { // Immortal+ peak
        bonus += 10; // Additional 10 points for elite peaks
        severity = 'high';
      }
      
      // Extra boost if current rank doesn't reflect tournament success
      if (currentPoints < peakPoints - 100) {
        bonus += 20; // Additional boost for significantly dropped players
        severity = 'critical';
      }

      analysis.analysisFlags.push({
        type: 'tournament_champion',
        severity,
        description: `Tournament Champion (${tournamentsWon} wins)`,
        adjustment: bonus,
        reasoning: `Tournament winners demonstrate sustained high-level performance. Base bonus: ${tournamentsWon * 15}pts${peakPoints >= 400 ? ', Elite tier bonus: +10pts' : ''}${currentPoints < peakPoints - 100 ? ', Underranked bonus: +20pts' : ''}`
      });
    }
  }

  /**
   * Check for rank mismatch (peak vs current)
   */
  private checkRankMismatch(analysis: PlayerAnalysis, playerData: PlayerSkillData): void {
    if (!playerData.peakRank || !playerData.currentRank) return;
    
    const peakPoints = this.RANK_TIERS[playerData.peakRank as keyof typeof this.RANK_TIERS];
    const currentPoints = this.RANK_TIERS[playerData.currentRank as keyof typeof this.RANK_TIERS];
    
    if (!peakPoints || !currentPoints) return;
    
    const rankGap = peakPoints - currentPoints;
    
    // Only flag significant mismatches
    if (rankGap >= 150) { // 3+ tier difference
      const isRecentWinner = this.hasRecentTournamentWin(playerData);
      let adjustment = Math.min(rankGap * 0.3, 75); // 30% of gap, max 75 points
      
      // Boost if they have recent tournament success
      if (isRecentWinner) {
        adjustment += 25;
      }
      
      analysis.analysisFlags.push({
        type: 'rank_mismatch',
        severity: rankGap >= 250 ? 'critical' : rankGap >= 200 ? 'high' : 'medium',
        description: `Significant rank drop (${playerData.peakRank} → ${playerData.currentRank})`,
        adjustment: Math.round(adjustment),
        reasoning: `Player peaked at ${playerData.peakRank} but currently ${playerData.currentRank}. ${rankGap}pt gap suggests skill retention. Adjustment: ${Math.round(adjustment)}pts${isRecentWinner ? ' (includes recent win bonus)' : ''}`
      });
    }
  }

  /**
   * Check for undervalued players (multiple indicators)
   */
  private checkUndervaluedPlayer(analysis: PlayerAnalysis, playerData: PlayerSkillData): void {
    const indicators = [];
    let undervalueScore = 0;
    
    // High win rate indicator
    const winRate = this.calculateWinRate(playerData);
    if (winRate && winRate > 0.7) {
      indicators.push(`${Math.round(winRate * 100)}% win rate`);
      undervalueScore += 15;
    }
    
    // Tournament participation vs rank
    if (playerData.tournamentsPlayed && playerData.tournamentsPlayed >= 5) {
      const participationRatio = (playerData.tournamentsWon || 0) / playerData.tournamentsPlayed;
      if (participationRatio > 0.3) { // 30%+ tournament win rate
        indicators.push(`${Math.round(participationRatio * 100)}% tournament win rate`);
        undervalueScore += 20;
      }
    }
    
    // Consistent performance
    if (analysis.skillIndicators.rankConsistency === 'stable' && playerData.tournamentsWon > 0) {
      indicators.push('consistent high performance');
      undervalueScore += 10;
    }
    
    if (indicators.length >= 2 && undervalueScore >= 25) {
      analysis.analysisFlags.push({
        type: 'undervalued',
        severity: undervalueScore >= 40 ? 'high' : 'medium',
        description: 'Multiple skill indicators suggest undervaluation',
        adjustment: Math.min(undervalueScore, 50),
        reasoning: `Player shows strong performance indicators: ${indicators.join(', ')}. Skill level likely exceeds current rating.`
      });
    }
  }

  /**
   * Check for inactive player decay
   */
  private checkInactiveDecay(analysis: PlayerAnalysis, playerData: PlayerSkillData): void {
    const isRecentlyActive = this.checkRecentActivity(playerData);
    const hasHighRank = playerData.basePoints >= 350; // Diamond+ equivalent
    
    if (!isRecentlyActive && hasHighRank && playerData.tournamentsWon === 0) {
      const decay = Math.min(playerData.basePoints * 0.1, 35); // 10% decay, max 35 points
      
      analysis.analysisFlags.push({
        type: 'inactive_decay',
        severity: 'low',
        description: 'High rank but no recent tournament activity',
        adjustment: -Math.round(decay),
        reasoning: `High-ranked player with no recent tournament wins may have skill decay. Conservative reduction: ${Math.round(decay)}pts`
      });
    }
  }

  /**
   * Check for consistent performers
   */
  private checkConsistentPerformer(analysis: PlayerAnalysis, playerData: PlayerSkillData): void {
    const consistency = analysis.skillIndicators.rankConsistency;
    const winRate = this.calculateWinRate(playerData);
    
    if (consistency === 'stable' && winRate && winRate > 0.6) {
      analysis.analysisFlags.push({
        type: 'consistent_performer',
        severity: 'low',
        description: 'Reliable consistent performance',
        adjustment: 10,
        reasoning: `Stable rank with good win rate indicates reliable skill level. Small confidence boost: +10pts`
      });
    }
  }

  /**
   * Apply all adjustments to the player's points
   */
  private applyAdjustments(analysis: PlayerAnalysis): void {
    let totalAdjustment = 0;
    const reasons: string[] = [];
    
    analysis.analysisFlags.forEach(flag => {
      totalAdjustment += flag.adjustment;
      reasons.push(`${flag.description}: ${flag.adjustment > 0 ? '+' : ''}${flag.adjustment}pts`);
    });
    
    analysis.adjustedPoints = Math.max(analysis.originalPoints + totalAdjustment, 50); // Minimum 50 points
    analysis.adjustmentReason = reasons.length > 0 
      ? reasons.join(' | ') 
      : 'No adjustments needed';
  }

  /**
   * Calculate final confidence score
   */
  private calculateFinalConfidence(analysis: PlayerAnalysis): void {
    let confidence = 50; // Base confidence
    
    // Increase confidence based on data quality
    if (analysis.skillIndicators.peakRank) confidence += 15;
    if (analysis.skillIndicators.tournamentsWon > 0) confidence += 20;
    if (analysis.skillIndicators.winRate !== undefined) confidence += 10;
    if (analysis.skillIndicators.recentActivity) confidence += 10;
    
    // Adjust based on flag severity
    analysis.analysisFlags.forEach(flag => {
      switch (flag.severity) {
        case 'critical': confidence += 15; break;
        case 'high': confidence += 10; break;
        case 'medium': confidence += 5; break;
        case 'low': confidence += 2; break;
      }
    });
    
    analysis.confidenceScore = Math.min(confidence, 95); // Cap at 95%
  }

  /**
   * Helper methods
   */
  private calculateWinRate(playerData: PlayerSkillData): number | undefined {
    if (!playerData.wins || !playerData.losses) return undefined;
    const totalGames = playerData.wins + playerData.losses;
    return totalGames > 0 ? playerData.wins / totalGames : undefined;
  }

  private checkRecentActivity(playerData: PlayerSkillData): boolean {
    if (!playerData.lastRankUpdate) return false;
    const daysSinceUpdate = (Date.now() - playerData.lastRankUpdate.getTime()) / (1000 * 60 * 60 * 24);
    return daysSinceUpdate <= 30; // Active within last 30 days
  }

  private analyzeRankConsistency(playerData: PlayerSkillData): 'stable' | 'climbing' | 'declining' | 'volatile' {
    // Simplified consistency analysis - could be enhanced with historical data
    if (!playerData.currentRank || !playerData.peakRank) return 'stable';
    
    const current = this.RANK_TIERS[playerData.currentRank as keyof typeof this.RANK_TIERS] || 150;
    const peak = this.RANK_TIERS[playerData.peakRank as keyof typeof this.RANK_TIERS] || 150;
    
    const difference = Math.abs(peak - current);
    
    if (difference <= 25) return 'stable';
    if (current > peak) return 'climbing';
    if (difference > 100) return 'volatile';
    return 'declining';
  }

  private hasRecentTournamentWin(playerData: PlayerSkillData): boolean {
    if (!playerData.lastTournamentWin) return false;
    const daysSinceWin = (Date.now() - playerData.lastTournamentWin.getTime()) / (1000 * 60 * 60 * 24);
    return daysSinceWin <= 90; // Recent win within 90 days
  }
}