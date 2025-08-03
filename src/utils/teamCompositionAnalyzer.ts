// Team Composition Analyzer - Analyzes team balance and composition issues
export interface TeamCompositionAnalysis {
  teamIndex: number;
  totalPoints: number;
  playerCount: number;
  eliteCount: number;
  compositionScore: number; // 0-100, higher is better
  issues: CompositionIssue[];
  strengths: CompositionStrength[];
  recommendations: TeamRecommendation[];
}

export interface CompositionIssue {
  type: 'skill_stacking' | 'power_imbalance' | 'size_mismatch' | 'extreme_variance' | 'elite_concentration';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  impact: number; // -100 to 0, how much this hurts team balance
  suggestedFix?: string;
}

export interface CompositionStrength {
  type: 'balanced_distribution' | 'skill_diversity' | 'consistent_level' | 'strong_core';
  description: string;
  benefit: number; // 0 to 100, how much this helps
}

export interface TeamRecommendation {
  type: 'redistribute_player' | 'swap_players' | 'adjust_points' | 'no_action';
  priority: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  targetPlayer?: string;
  targetTeam?: number;
  expectedImprovement: number;
  reasoning: string;
}

export interface TeamPlayer {
  id: string;
  username: string;
  points: number;
  isElite: boolean;
  skillTier: 'elite' | 'high' | 'medium' | 'low';
}

export interface GlobalBalance {
  averageTeamPoints: number;
  minTeamPoints: number;
  maxTeamPoints: number;
  pointSpread: number;
  eliteDistribution: number[]; // Elite players per team
  balanceQuality: 'excellent' | 'good' | 'acceptable' | 'poor' | 'critical';
  overallScore: number; // 0-100
  criticalIssues: string[];
  recommendations: TeamRecommendation[];
}

/**
 * Team Composition Analyzer
 * Analyzes team balance, composition, and provides recommendations
 */
export class TeamCompositionAnalyzer {
  private readonly ELITE_THRESHOLD = 400;
  private readonly HIGH_TIER_THRESHOLD = 350; // Immortal 2+
  private readonly MEDIUM_TIER_THRESHOLD = 200;

  /**
   * Analyze all teams and provide global balance assessment
   */
  analyzeGlobalBalance(teams: TeamPlayer[][]): GlobalBalance {
    const teamAnalyses = teams.map((team, index) => this.analyzeTeam(team, index));
    const teamPoints = teams.map(team => team.reduce((sum, p) => sum + p.points, 0));
    const eliteDistribution = teams.map(team => team.filter(p => p.isElite).length);
    
    const averageTeamPoints = teamPoints.reduce((sum, points) => sum + points, 0) / teams.length;
    const minTeamPoints = Math.min(...teamPoints);
    const maxTeamPoints = Math.max(...teamPoints);
    const pointSpread = maxTeamPoints - minTeamPoints;
    
    // Calculate overall balance quality
    const balanceQuality = this.determineBalanceQuality(pointSpread, eliteDistribution);
    const overallScore = this.calculateOverallScore(teamAnalyses, pointSpread, eliteDistribution);
    
    // Identify critical issues
    const criticalIssues = this.identifyCriticalIssues(teamAnalyses, eliteDistribution, pointSpread);
    
    // Generate global recommendations
    const recommendations = this.generateGlobalRecommendations(teams, teamAnalyses, criticalIssues);

    return {
      averageTeamPoints,
      minTeamPoints,
      maxTeamPoints,
      pointSpread,
      eliteDistribution,
      balanceQuality,
      overallScore,
      criticalIssues,
      recommendations
    };
  }

  /**
   * Analyze individual team composition
   */
  analyzeTeam(team: TeamPlayer[], teamIndex: number): TeamCompositionAnalysis {
    const totalPoints = team.reduce((sum, player) => sum + player.points, 0);
    const eliteCount = team.filter(player => player.isElite).length;
    
    // Categorize players by skill tier
    const skillDistribution = this.analyzeSkillDistribution(team);
    
    // Identify issues
    const issues = this.identifyTeamIssues(team, teamIndex);
    
    // Identify strengths
    const strengths = this.identifyTeamStrengths(team, skillDistribution);
    
    // Generate recommendations
    const recommendations = this.generateTeamRecommendations(team, teamIndex, issues);
    
    // Calculate composition score
    const compositionScore = this.calculateCompositionScore(team, issues, strengths);

    return {
      teamIndex,
      totalPoints,
      playerCount: team.length,
      eliteCount,
      compositionScore,
      issues,
      strengths,
      recommendations
    };
  }

  /**
   * Analyze skill distribution within a team
   */
  private analyzeSkillDistribution(team: TeamPlayer[]) {
    return {
      elite: team.filter(p => p.skillTier === 'elite').length,
      high: team.filter(p => p.skillTier === 'high').length,
      medium: team.filter(p => p.skillTier === 'medium').length,
      low: team.filter(p => p.skillTier === 'low').length
    };
  }

  /**
   * Identify team composition issues
   */
  private identifyTeamIssues(team: TeamPlayer[], teamIndex: number): CompositionIssue[] {
    const issues: CompositionIssue[] = [];
    const eliteCount = team.filter(p => p.isElite).length;
    const skillDistribution = this.analyzeSkillDistribution(team);
    
    // Skill stacking issue
    if (eliteCount > 1) {
      issues.push({
        type: 'skill_stacking',
        severity: eliteCount > 2 ? 'critical' : 'high',
        description: `${eliteCount} elite players on one team`,
        impact: -50 * eliteCount,
        suggestedFix: `Redistribute ${eliteCount - 1} elite player(s) to other teams`
      });
    }

    // Elite concentration
    if (skillDistribution.elite + skillDistribution.high > team.length * 0.6) {
      issues.push({
        type: 'elite_concentration',
        severity: 'medium',
        description: 'High concentration of top-tier players',
        impact: -25,
        suggestedFix: 'Balance with more medium-tier players'
      });
    }

    // Extreme variance
    const points = team.map(p => p.points);
    const variance = this.calculateVariance(points);
    if (variance > 10000) { // High variance
      issues.push({
        type: 'extreme_variance',
        severity: 'medium',
        description: 'Large skill gap within team',
        impact: -20,
        suggestedFix: 'Swap players to reduce internal skill gaps'
      });
    }

    return issues;
  }

  /**
   * Identify team strengths
   */
  private identifyTeamStrengths(team: TeamPlayer[], skillDistribution: any): CompositionStrength[] {
    const strengths: CompositionStrength[] = [];
    
    // Balanced distribution
    if (skillDistribution.elite <= 1 && skillDistribution.high >= 1 && skillDistribution.medium >= 1) {
      strengths.push({
        type: 'balanced_distribution',
        description: 'Good skill tier distribution',
        benefit: 30
      });
    }

    // Skill diversity
    const tierCount = Object.values(skillDistribution).filter((count: any) => count > 0).length;
    if (tierCount >= 3) {
      strengths.push({
        type: 'skill_diversity',
        description: 'Diverse skill levels represented',
        benefit: 20
      });
    }

    // Consistent level
    const points = team.map(p => p.points);
    const variance = this.calculateVariance(points);
    if (variance < 2500) { // Low variance
      strengths.push({
        type: 'consistent_level',
        description: 'Consistent skill level across players',
        benefit: 15
      });
    }

    return strengths;
  }

  /**
   * Generate team-specific recommendations
   */
  private generateTeamRecommendations(team: TeamPlayer[], teamIndex: number, issues: CompositionIssue[]): TeamRecommendation[] {
    const recommendations: TeamRecommendation[] = [];

    issues.forEach(issue => {
      switch (issue.type) {
        case 'skill_stacking':
          const elitePlayers = team.filter(p => p.isElite);
          if (elitePlayers.length > 1) {
            // Recommend redistributing excess elite players
            elitePlayers.slice(1).forEach(player => {
              recommendations.push({
                type: 'redistribute_player',
                priority: 'critical',
                description: `Move elite player to team without elite players`,
                targetPlayer: player.username,
                expectedImprovement: 40,
                reasoning: `${player.username} (${player.points}pts) should be redistributed to prevent elite stacking`
              });
            });
          }
          break;

        case 'extreme_variance':
          recommendations.push({
            type: 'swap_players',
            priority: 'medium',
            description: 'Swap players to reduce skill gaps',
            expectedImprovement: 20,
            reasoning: 'High variance within team suggests need for player swaps'
          });
          break;
      }
    });

    return recommendations;
  }

  /**
   * Calculate team composition score
   */
  private calculateCompositionScore(team: TeamPlayer[], issues: CompositionIssue[], strengths: CompositionStrength[]): number {
    let score = 70; // Base score
    
    // Apply issue penalties
    issues.forEach(issue => {
      score += issue.impact / 5; // Scale down impact
    });
    
    // Apply strength bonuses
    strengths.forEach(strength => {
      score += strength.benefit / 3; // Scale down benefit
    });
    
    return Math.max(0, Math.min(100, score));
  }

  /**
   * Determine overall balance quality
   */
  private determineBalanceQuality(pointSpread: number, eliteDistribution: number[]): 'excellent' | 'good' | 'acceptable' | 'poor' | 'critical' {
    const maxEliteOnTeam = Math.max(...eliteDistribution);
    const eliteStackingTeams = eliteDistribution.filter(count => count > 1).length;
    
    // Critical issues
    if (maxEliteOnTeam > 2 || eliteStackingTeams > 1) {
      return 'critical';
    }
    
    // Elite stacking detected
    if (maxEliteOnTeam > 1 || pointSpread > 200) {
      return 'poor';
    }
    
    // Moderate issues
    if (pointSpread > 150) {
      return 'acceptable';
    }
    
    // Good balance
    if (pointSpread <= 100 && maxEliteOnTeam <= 1) {
      return 'good';
    }
    
    // Excellent balance
    if (pointSpread <= 50 && maxEliteOnTeam <= 1) {
      return 'excellent';
    }
    
    return 'acceptable';
  }

  /**
   * Calculate overall balance score
   */
  private calculateOverallScore(teamAnalyses: TeamCompositionAnalysis[], pointSpread: number, eliteDistribution: number[]): number {
    let score = 100;
    
    // Point spread penalty
    score -= Math.min(pointSpread / 5, 40);
    
    // Elite stacking penalty
    const stackingPenalty = eliteDistribution.reduce((penalty, count) => {
      return penalty + (count > 1 ? (count - 1) * 25 : 0);
    }, 0);
    score -= stackingPenalty;
    
    // Team composition scores
    const avgCompositionScore = teamAnalyses.reduce((sum, analysis) => sum + analysis.compositionScore, 0) / teamAnalyses.length;
    score = (score + avgCompositionScore) / 2;
    
    return Math.max(0, Math.min(100, score));
  }

  /**
   * Identify critical issues across all teams
   */
  private identifyCriticalIssues(teamAnalyses: TeamCompositionAnalysis[], eliteDistribution: number[], pointSpread: number): string[] {
    const criticalIssues: string[] = [];
    
    // Elite stacking
    const stackingTeams = eliteDistribution.filter(count => count > 1).length;
    if (stackingTeams > 0) {
      criticalIssues.push(`${stackingTeams} team(s) have multiple elite players`);
    }
    
    // Extreme point imbalance
    if (pointSpread > 200) {
      criticalIssues.push(`Extreme point imbalance: ${pointSpread} point difference`);
    }
    
    // Critical composition issues
    teamAnalyses.forEach((analysis, index) => {
      const criticalTeamIssues = analysis.issues.filter(issue => issue.severity === 'critical');
      if (criticalTeamIssues.length > 0) {
        criticalIssues.push(`Team ${index + 1}: ${criticalTeamIssues.map(i => i.description).join(', ')}`);
      }
    });
    
    return criticalIssues;
  }

  /**
   * Generate global recommendations for team redistribution
   */
  private generateGlobalRecommendations(teams: TeamPlayer[][], teamAnalyses: TeamCompositionAnalysis[], criticalIssues: string[]): TeamRecommendation[] {
    const recommendations: TeamRecommendation[] = [];
    
    // Handle elite stacking
    teams.forEach((team, teamIndex) => {
      const elitePlayers = team.filter(p => p.isElite);
      if (elitePlayers.length > 1) {
        // Find teams without elite players
        const availableTeams = teams.map((t, i) => ({ index: i, eliteCount: t.filter(p => p.isElite).length }))
          .filter(t => t.eliteCount === 0 && t.index !== teamIndex);
        
        if (availableTeams.length > 0) {
          elitePlayers.slice(1).forEach((elitePlayer, index) => {
            const targetTeam = availableTeams[index % availableTeams.length];
            recommendations.push({
              type: 'redistribute_player',
              priority: 'critical',
              description: `Move ${elitePlayer.username} from Team ${teamIndex + 1} to Team ${targetTeam.index + 1}`,
              targetPlayer: elitePlayer.username,
              targetTeam: targetTeam.index,
              expectedImprovement: 50,
              reasoning: `Eliminates elite stacking and improves overall balance`
            });
          });
        }
      }
    });
    
    return recommendations;
  }

  /**
   * Helper function to calculate variance
   */
  private calculateVariance(numbers: number[]): number {
    if (numbers.length === 0) return 0;
    const mean = numbers.reduce((sum, num) => sum + num, 0) / numbers.length;
    const squaredDiffs = numbers.map(num => Math.pow(num - mean, 2));
    return squaredDiffs.reduce((sum, diff) => sum + diff, 0) / numbers.length;
  }
}