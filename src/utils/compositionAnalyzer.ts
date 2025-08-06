/**
 * Team Composition Analyzer
 * Advanced analysis beyond point totals - role diversity, synergy, meta considerations
 */

export interface PlayerComposition {
  id: string;
  discord_username: string;
  evidenceWeight: number;
  role?: 'duelist' | 'controller' | 'initiator' | 'sentinel' | 'flex';
  playstyle?: 'aggressive' | 'passive' | 'tactical' | 'support';
  peak_rank?: string;
  isElite?: boolean;
  experience?: {
    tournamentsPlayed: number;
    winRate: number;
    recentPerformance: number;
  };
}

export interface TeamComposition {
  players: PlayerComposition[];
  analysis: CompositionAnalysis;
}

export interface CompositionAnalysis {
  roleDistribution: {
    duelist: number;
    controller: number;
    initiator: number;
    sentinel: number;
    flex: number;
    unknown: number;
  };
  playstyleBalance: {
    aggressive: number;
    passive: number;
    tactical: number;
    support: number;
  };
  experienceMetrics: {
    avgTournaments: number;
    avgWinRate: number;
    veteranCount: number;
    rookieCount: number;
  };
  synergy: {
    score: number;
    strengths: string[];
    weaknesses: string[];
  };
  competitiveness: {
    level: 'low' | 'medium' | 'high' | 'elite';
    ceiling: number;
    consistency: number;
  };
}

export interface CompositionRecommendation {
  type: 'role' | 'playstyle' | 'experience' | 'synergy';
  severity: 'info' | 'warning' | 'critical';
  message: string;
  suggestion?: string;
}

/**
 * Analyze team composition for balance and synergy
 */
export function analyzeTeamComposition(team: PlayerComposition[]): CompositionAnalysis {
  
  const roleDistribution = analyzeRoleDistribution(team);
  const playstyleBalance = analyzePlaystyeleBalance(team);
  const experienceMetrics = analyzeExperience(team);
  const synergy = analyzeSynergy(team);
  const competitiveness = analyzeCompetitiveness(team);
  
  return {
    roleDistribution,
    playstyleBalance,
    experienceMetrics,
    synergy,
    competitiveness
  };
}

/**
 * Generate composition recommendations
 */
export function generateCompositionRecommendations(
  teams: TeamComposition[],
  targetComposition?: Partial<CompositionAnalysis>
): CompositionRecommendation[] {
  
  const recommendations: CompositionRecommendation[] = [];
  
  teams.forEach((team, index) => {
    const analysis = team.analysis;
    
    // Role distribution analysis
    const totalRoles = Object.values(analysis.roleDistribution).reduce((sum, count) => sum + count, 0);
    const unknownRoleRatio = analysis.roleDistribution.unknown / totalRoles;
    
    if (unknownRoleRatio > 0.5) {
      recommendations.push({
        type: 'role',
        severity: 'warning',
        message: `Team ${index + 1} has ${Math.round(unknownRoleRatio * 100)}% players with unknown roles`,
        suggestion: 'Consider role preferences during assignment'
      });
    }
    
    // Synergy analysis
    if (analysis.synergy.score < 0.6) {
      recommendations.push({
        type: 'synergy',
        severity: 'warning',
        message: `Team ${index + 1} has low synergy score (${(analysis.synergy.score * 100).toFixed(0)}%)`,
        suggestion: `Address: ${analysis.synergy.weaknesses.join(', ')}`
      });
    }
    
    // Experience balance
    if (analysis.experienceMetrics.rookieCount > analysis.experienceMetrics.veteranCount * 2) {
      recommendations.push({
        type: 'experience',
        severity: 'info',
        message: `Team ${index + 1} is rookie-heavy`,
        suggestion: 'Consider mentorship opportunities'
      });
    }
    
    // Competitiveness warnings
    if (analysis.competitiveness.level === 'elite' && teams.some(t => t.analysis.competitiveness.level === 'low')) {
      recommendations.push({
        type: 'synergy',
        severity: 'critical',
        message: `Significant skill gap between teams`,
        suggestion: 'Consider redistributing elite players'
      });
    }
  });
  
  return recommendations;
}

/**
 * Calculate composition-aware balance score
 */
export function calculateCompositionBalance(teams: TeamComposition[]): {
  pointBalance: number;
  compositionBalance: number;
  overallBalance: number;
  details: string[];
} {
  
  const details: string[] = [];
  
  // Traditional point balance
  const teamWeights = teams.map(team => 
    team.players.reduce((sum, p) => sum + p.evidenceWeight, 0)
  );
  const avgWeight = teamWeights.reduce((sum, w) => sum + w, 0) / teamWeights.length;
  const pointVariance = teamWeights.reduce((sum, w) => sum + Math.pow(w - avgWeight, 2), 0) / teamWeights.length;
  const pointBalance = 1 / (1 + Math.sqrt(pointVariance) / avgWeight);
  
  // Composition balance factors
  let compositionScore = 0;
  let factorCount = 0;
  
  // Role diversity balance
  const roleScores = teams.map(team => calculateRoleDiversity(team.analysis.roleDistribution));
  const avgRoleScore = roleScores.reduce((sum, score) => sum + score, 0) / roleScores.length;
  const roleVariance = roleScores.reduce((sum, score) => sum + Math.pow(score - avgRoleScore, 2), 0) / roleScores.length;
  const roleBalance = 1 / (1 + roleVariance);
  compositionScore += roleBalance;
  factorCount++;
  details.push(`Role diversity balance: ${(roleBalance * 100).toFixed(0)}%`);
  
  // Experience balance
  const expScores = teams.map(team => team.analysis.experienceMetrics.avgTournaments);
  const avgExpScore = expScores.reduce((sum, score) => sum + score, 0) / expScores.length;
  const expVariance = expScores.reduce((sum, score) => sum + Math.pow(score - avgExpScore, 2), 0) / expScores.length;
  const expBalance = avgExpScore > 0 ? 1 / (1 + expVariance / avgExpScore) : 0.5;
  compositionScore += expBalance;
  factorCount++;
  details.push(`Experience balance: ${(expBalance * 100).toFixed(0)}%`);
  
  // Synergy balance
  const synergyScores = teams.map(team => team.analysis.synergy.score);
  const avgSynergyScore = synergyScores.reduce((sum, score) => sum + score, 0) / synergyScores.length;
  const synergyVariance = synergyScores.reduce((sum, score) => sum + Math.pow(score - avgSynergyScore, 2), 0) / synergyScores.length;
  const synergyBalance = 1 / (1 + synergyVariance);
  compositionScore += synergyBalance;
  factorCount++;
  details.push(`Synergy balance: ${(synergyBalance * 100).toFixed(0)}%`);
  
  const compositionBalance = compositionScore / factorCount;
  
  // Weighted overall balance (70% points, 30% composition)
  const overallBalance = (pointBalance * 0.7) + (compositionBalance * 0.3);
  
  details.unshift(`Point balance: ${(pointBalance * 100).toFixed(0)}%`);
  details.unshift(`Overall balance: ${(overallBalance * 100).toFixed(0)}%`);
  
  return {
    pointBalance,
    compositionBalance,
    overallBalance,
    details
  };
}

// Helper functions

function analyzeRoleDistribution(team: PlayerComposition[]) {
  const distribution = {
    duelist: 0,
    controller: 0,
    initiator: 0,
    sentinel: 0,
    flex: 0,
    unknown: 0
  };
  
  team.forEach(player => {
    const role = player.role || 'unknown';
    if (role in distribution) {
      distribution[role as keyof typeof distribution]++;
    } else {
      distribution.unknown++;
    }
  });
  
  return distribution;
}

function analyzePlaystyeleBalance(team: PlayerComposition[]) {
  const balance = {
    aggressive: 0,
    passive: 0,
    tactical: 0,
    support: 0
  };
  
  team.forEach(player => {
    const style = player.playstyle;
    if (style && style in balance) {
      balance[style]++;
    }
  });
  
  return balance;
}

function analyzeExperience(team: PlayerComposition[]) {
  const experiences = team.map(p => p.experience).filter(Boolean);
  
  if (experiences.length === 0) {
    return {
      avgTournaments: 0,
      avgWinRate: 0,
      veteranCount: 0,
      rookieCount: team.length
    };
  }
  
  const avgTournaments = experiences.reduce((sum, exp) => sum + exp!.tournamentsPlayed, 0) / experiences.length;
  const avgWinRate = experiences.reduce((sum, exp) => sum + exp!.winRate, 0) / experiences.length;
  const veteranCount = experiences.filter(exp => exp!.tournamentsPlayed >= 5).length;
  const rookieCount = team.length - veteranCount;
  
  return {
    avgTournaments,
    avgWinRate,
    veteranCount,
    rookieCount
  };
}

function analyzeSynergy(team: PlayerComposition[]): { score: number; strengths: string[]; weaknesses: string[] } {
  const strengths: string[] = [];
  const weaknesses: string[] = [];
  let score = 0.5; // Base score
  
  // Role synergy
  const roles = analyzeRoleDistribution(team);
  const totalPlayers = team.length;
  
  if (totalPlayers >= 5) {
    // Check for balanced 5-man composition
    if (roles.duelist >= 1 && roles.controller >= 1 && roles.initiator >= 1 && roles.sentinel >= 1) {
      score += 0.2;
      strengths.push('Balanced role composition');
    } else if (roles.unknown > totalPlayers * 0.6) {
      score -= 0.1;
      weaknesses.push('Too many unknown roles');
    }
  }
  
  // Elite distribution
  const eliteCount = team.filter(p => p.isElite).length;
  if (eliteCount > 0 && eliteCount <= 2) {
    score += 0.1;
    strengths.push('Good elite distribution');
  } else if (eliteCount > 2) {
    score -= 0.1;
    weaknesses.push('Elite player stacking');
  }
  
  // Experience mixing
  const experience = analyzeExperience(team);
  if (experience.veteranCount > 0 && experience.rookieCount > 0) {
    score += 0.1;
    strengths.push('Veteran-rookie mix');
  }
  
  // Playstyle diversity
  const playstyles = analyzePlaystyeleBalance(team);
  const diversePlaystyles = Object.values(playstyles).filter(count => count > 0).length;
  if (diversePlaystyles >= 3) {
    score += 0.1;
    strengths.push('Diverse playstyles');
  }
  
  return {
    score: Math.max(0, Math.min(1, score)),
    strengths,
    weaknesses
  };
}

function analyzeCompetitiveness(team: PlayerComposition[]) {
  const weights = team.map(p => p.evidenceWeight);
  const avgWeight = weights.reduce((sum, w) => sum + w, 0) / weights.length;
  const maxWeight = Math.max(...weights);
  const minWeight = Math.min(...weights);
  
  // Determine competitiveness level
  let level: 'low' | 'medium' | 'high' | 'elite';
  if (avgWeight >= 1800) level = 'elite';
  else if (avgWeight >= 1500) level = 'high';
  else if (avgWeight >= 1200) level = 'medium';
  else level = 'low';
  
  // Calculate ceiling (max potential)
  const ceiling = maxWeight;
  
  // Calculate consistency (how close players are to each other)
  const variance = weights.reduce((sum, w) => sum + Math.pow(w - avgWeight, 2), 0) / weights.length;
  const consistency = 1 / (1 + Math.sqrt(variance) / avgWeight);
  
  return {
    level,
    ceiling,
    consistency
  };
}

function calculateRoleDiversity(distribution: any): number {
  const totalPlayers = Object.values(distribution).reduce((sum: number, count) => sum + (count as number), 0);
  if (totalPlayers === 0) return 0;
  
  // Shannon diversity index for roles
  let diversity = 0;
  Object.values(distribution).forEach(count => {
    const numCount = count as number;
    if (numCount > 0) {
      const proportion = numCount / totalPlayers;
      diversity -= proportion * (Math.log(proportion) / Math.LN2);
    }
  });
  
  // Normalize to 0-1 scale (max diversity for 5 roles = log2(5) ≈ 2.32)
  return Math.min(1, diversity / 2.32);
}