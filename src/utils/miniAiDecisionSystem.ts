// ATLAS Decision System - Comprehensive decision engine for team balancing (Adaptive Tournament League Analysis System)
import { PlayerAnalysisEngine, PlayerAnalysis, PlayerSkillData } from './playerAnalysisEngine';
import { TeamCompositionAnalyzer, TeamCompositionAnalysis, GlobalBalance, TeamPlayer } from './teamCompositionAnalyzer';
import { atlasLogger } from './atlasLogger';

export interface AtlasDecision {
  id: string;
  type: 'player_adjustment' | 'team_redistribution' | 'player_swap' | 'no_action';
  priority: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  reasoning: string;
  confidence: number; // 0-100
  impact: {
    expectedImprovement: number; // 0-100
    affectedPlayers: string[];
    affectedTeams: number[];
  };
  action?: {
    playerId?: string;
    fromTeam?: number;
    toTeam?: number;
    pointAdjustment?: number;
    swapPlayerId?: string;
  };
  timestamp: Date;
}

export interface AtlasAnalysis {
  playerAnalyses: PlayerAnalysis[];
  teamCompositionAnalysis: TeamCompositionAnalysis[];
  globalBalance: GlobalBalance;
  decisions: AtlasDecision[];
  executionPlan: ExecutionStep[];
  summary: {
    totalPlayersAnalyzed: number;
    playersAdjusted: number;
    redistributionsNeeded: number;
    swapsNeeded: number;
    expectedBalanceImprovement: number;
    confidenceScore: number;
  };
}

export interface ExecutionStep {
  order: number;
  type: 'analyze_players' | 'adjust_points' | 'redistribute_player' | 'swap_players' | 'validate_result';
  description: string;
  details: any;
}

export interface AtlasConfig {
  enablePlayerAnalysis: boolean;
  enableTeamRedistribution: boolean;
  enablePlayerSwaps: boolean;
  aggressivenessLevel: 'conservative' | 'moderate' | 'aggressive';
  confidenceThreshold: number; // Minimum confidence to execute decisions
  maxAdjustmentPercent: number; // Max percentage to adjust player points
  eliteThreshold: number;
  logging: {
    enableDetailedLogging: boolean;
    logPlayerAnalysis: boolean;
    logTeamAnalysis: boolean;
    logDecisions: boolean;
  };
}

/**
 * ATLAS Decision System
 * Comprehensive AI system for analyzing players and teams, making intelligent decisions
 */
export class AtlasDecisionSystem {
  private playerEngine: PlayerAnalysisEngine;
  private teamAnalyzer: TeamCompositionAnalyzer;
  private config: AtlasConfig;
  private decisions: AtlasDecision[];

  constructor(config?: Partial<AtlasConfig>) {
    this.playerEngine = new PlayerAnalysisEngine();
    this.teamAnalyzer = new TeamCompositionAnalyzer();
    this.decisions = [];
    
    this.config = {
      enablePlayerAnalysis: true,
      enableTeamRedistribution: true,
      enablePlayerSwaps: true,
      aggressivenessLevel: 'moderate',
      confidenceThreshold: 75,
      maxAdjustmentPercent: 0.30,
      eliteThreshold: 400,
      logging: {
        enableDetailedLogging: true,
        logPlayerAnalysis: true,
        logTeamAnalysis: true,
        logDecisions: true
      },
      ...config
    };
  }

  /**
   * Main analysis and decision-making function
   */
  async analyzeAndDecide(players: PlayerSkillData[], currentTeams?: TeamPlayer[][]): Promise<AtlasAnalysis> {
    this.log('🏛️ ATLAS ANALYSIS STARTING');
    this.decisions = [];

    // Phase 1: Analyze individual players
    const playerAnalyses = await this.analyzeAllPlayers(players);
    
    // Phase 2: Analyze team composition (if teams provided)
    let teamCompositionAnalysis: TeamCompositionAnalysis[] = [];
    let globalBalance: GlobalBalance | null = null;
    
    if (currentTeams && currentTeams.length > 0) {
      teamCompositionAnalysis = currentTeams.map((team, index) => 
        this.teamAnalyzer.analyzeTeam(team, index)
      );
      globalBalance = this.teamAnalyzer.analyzeGlobalBalance(currentTeams);
    }

    // Phase 3: Make decisions based on analysis
    await this.makePlayerAdjustmentDecisions(playerAnalyses);
    
    if (globalBalance) {
      await this.makeTeamBalanceDecisions(globalBalance, currentTeams!);
    }

    // Phase 4: Generate execution plan
    const executionPlan = this.generateExecutionPlan();

    // Phase 5: Calculate summary
    const summary = this.calculateSummary(playerAnalyses, this.decisions);

    const analysis: AtlasAnalysis = {
      playerAnalyses,
      teamCompositionAnalysis,
      globalBalance: globalBalance || this.createEmptyGlobalBalance(),
      decisions: this.decisions,
      executionPlan,
      summary
    };

    this.log('🏛️ ATLAS ANALYSIS COMPLETE', analysis.summary);
    return analysis;
  }

  /**
   * Analyze all players for skill mismatches and adjustments
   */
  private async analyzeAllPlayers(players: PlayerSkillData[]): Promise<PlayerAnalysis[]> {
    this.log('🔍 ANALYZING PLAYERS', `${players.length} players`);
    
    const analyses: PlayerAnalysis[] = [];
    
    for (const player of players) {
      const analysis = this.playerEngine.analyzePlayer(player);
      analyses.push(analysis);
      
      if (this.config.logging.logPlayerAnalysis && analysis.analysisFlags.length > 0) {
        this.log(`👤 PLAYER ANALYSIS: ${player.username}`, {
          original: analysis.originalPoints,
          adjusted: analysis.adjustedPoints,
          flags: analysis.analysisFlags.map(f => f.description)
        });
      }
    }
    
    return analyses;
  }

  /**
   * Make decisions for player point adjustments
   */
  private async makePlayerAdjustmentDecisions(playerAnalyses: PlayerAnalysis[]): Promise<void> {
    if (!this.config.enablePlayerAnalysis) return;
    
    for (const analysis of playerAnalyses) {
      if (analysis.adjustedPoints === analysis.originalPoints) continue;
      
      const adjustment = analysis.adjustedPoints - analysis.originalPoints;
      const adjustmentPercent = Math.abs(adjustment) / analysis.originalPoints;
      
      // Check if adjustment is within limits
      if (adjustmentPercent > this.config.maxAdjustmentPercent) {
        const maxAdjustment = analysis.originalPoints * this.config.maxAdjustmentPercent;
        const cappedAdjustment = adjustment > 0 
          ? Math.min(adjustment, maxAdjustment)
          : Math.max(adjustment, -maxAdjustment);
        
        this.log(`⚠️ CAPPING ADJUSTMENT for ${analysis.username}: ${adjustment} -> ${cappedAdjustment}`);
        analysis.adjustedPoints = analysis.originalPoints + cappedAdjustment;
      }
      
      // Only make decisions above confidence threshold
      if (analysis.confidenceScore >= this.config.confidenceThreshold) {
        const decision: AtlasDecision = {
          id: `player_adj_${analysis.userId}`,
          type: 'player_adjustment',
          priority: this.determinePriority(analysis),
          description: `Adjust ${analysis.username} from ${analysis.originalPoints} to ${analysis.adjustedPoints} points`,
          reasoning: `Analysis confidence: ${analysis.confidenceScore}%. ${analysis.adjustmentReason}`,
          confidence: analysis.confidenceScore,
          impact: {
            expectedImprovement: Math.min(Math.abs(adjustment) / 10, 30),
            affectedPlayers: [analysis.username],
            affectedTeams: []
          },
          action: {
            playerId: analysis.userId,
            pointAdjustment: analysis.adjustedPoints - analysis.originalPoints
          },
          timestamp: new Date()
        };
        
        this.decisions.push(decision);
      }
    }
  }

  /**
   * Make decisions for team balance improvements
   */
  private async makeTeamBalanceDecisions(globalBalance: GlobalBalance, teams: TeamPlayer[][]): Promise<void> {
    // Handle critical skill stacking
    if (globalBalance.criticalIssues.some(issue => issue.includes('elite players'))) {
      await this.handleEliteStacking(teams, globalBalance);
    }
    
    // Handle extreme point imbalances
    if (globalBalance.pointSpread > 200) {
      await this.handlePointImbalance(teams, globalBalance);
    }
    
    // Execute global recommendations
    for (const recommendation of globalBalance.recommendations) {
      if (recommendation.priority === 'critical' || recommendation.priority === 'high') {
        const decision = this.convertRecommendationToDecision(recommendation);
        this.decisions.push(decision);
      }
    }
  }

  /**
   * Handle elite player stacking issues
   */
  private async handleEliteStacking(teams: TeamPlayer[][], globalBalance: GlobalBalance): Promise<void> {
    const stackingTeams = globalBalance.eliteDistribution
      .map((count, index) => ({ teamIndex: index, eliteCount: count }))
      .filter(team => team.eliteCount > 1);
    
    for (const stackingTeam of stackingTeams) {
      const team = teams[stackingTeam.teamIndex];
      const elitePlayers = team.filter(p => p.isElite);
      
      // Find teams with no elite players
      const availableTeams = teams
        .map((t, index) => ({ index, eliteCount: t.filter(p => p.isElite).length }))
        .filter(t => t.eliteCount === 0 && t.index !== stackingTeam.teamIndex);
      
      // Redistribute excess elite players
      const excessElites = elitePlayers.slice(1); // Keep first elite
      for (let i = 0; i < excessElites.length && i < availableTeams.length; i++) {
        const elitePlayer = excessElites[i];
        const targetTeam = availableTeams[i];
        
        const decision: AtlasDecision = {
          id: `redistribute_${elitePlayer.id}_${targetTeam.index}`,
          type: 'team_redistribution',
          priority: 'critical',
          description: `Move ${elitePlayer.username} from Team ${stackingTeam.teamIndex + 1} to Team ${targetTeam.index + 1}`,
          reasoning: `Elite stacking detected. Moving excess elite player to balance teams and prevent unfair advantage.`,
          confidence: 95,
          impact: {
            expectedImprovement: 60,
            affectedPlayers: [elitePlayer.username],
            affectedTeams: [stackingTeam.teamIndex, targetTeam.index]
          },
          action: {
            playerId: elitePlayer.id,
            fromTeam: stackingTeam.teamIndex,
            toTeam: targetTeam.index
          },
          timestamp: new Date()
        };
        
        this.decisions.push(decision);
      }
    }
  }

  /**
   * Handle extreme point imbalances with a focus on powerful players.
   * This logic has been updated to consider swapping the strongest player.
   */
  private async handlePointImbalance(teams: TeamPlayer[][], globalBalance: GlobalBalance): Promise<void> {
    // Find the strongest and weakest teams
    const teamStrengths = teams.map((team, index) => ({
      index,
      totalPoints: team.reduce((sum, p) => sum + p.points, 0),
      players: team
    })).sort((a, b) => b.totalPoints - a.totalPoints);
    
    const strongestTeam = teamStrengths[0];
    const weakestTeam = teamStrengths[teamStrengths.length - 1];
    
    if (strongestTeam.totalPoints - weakestTeam.totalPoints > 200) {
      this.log('🚨 EXTREME POINT IMBALANCE DETECTED', `Spread: ${globalBalance.pointSpread}`);

      // Sort players by points to find the most impactful candidates
      const strongTeamPlayers = strongestTeam.players.sort((a, b) => b.points - a.points);
      const weakTeamPlayers = weakestTeam.players.sort((a, b) => a.points - b.points);

      // --- NEW LOGIC: Prioritize swapping the best player on the strong team ---
      const strongPlayer = strongTeamPlayers[0]; // The single strongest player on the team
      const weakPlayer = weakTeamPlayers[0]; // The weakest player on the weakest team

      if (strongPlayer && weakPlayer) {
        const newStrongTotal = strongestTeam.totalPoints - strongPlayer.points + weakPlayer.points;
        const newWeakTotal = weakestTeam.totalPoints - weakPlayer.points + strongPlayer.points;
        const newSpread = Math.abs(newStrongTotal - newWeakTotal);

        // Check if this single, high-impact swap significantly improves the balance
        if (newSpread < globalBalance.pointSpread - 50) {
          const decision: AtlasDecision = {
            id: `swap_critical_${strongPlayer.id}_${weakPlayer.id}`,
            type: 'player_swap',
            priority: 'critical',
            description: `CRITICAL SWAP: ${strongPlayer.username} (Team ${strongestTeam.index + 1}) with ${weakPlayer.username} (Team ${weakestTeam.index + 1})`,
            reasoning: `High-impact swap to fix extreme point imbalance. Reduces spread from ${globalBalance.pointSpread} to ~${newSpread}.`,
            confidence: 95,
            impact: {
              expectedImprovement: 80,
              affectedPlayers: [strongPlayer.username, weakPlayer.username],
              affectedTeams: [strongestTeam.index, weakestTeam.index]
            },
            action: {
              playerId: strongPlayer.id,
              swapPlayerId: weakPlayer.id,
              fromTeam: strongestTeam.index,
              toTeam: weakestTeam.index
            },
            timestamp: new Date()
          };
          this.decisions.push(decision);
          this.log('✅ CRITICAL SWAP DECISION MADE', decision);
          return; // A critical swap is sufficient, no need for more loops
        }
      }

      // --- OLD LOGIC, now updated to consider all players without .slice(1) ---
      // If the critical swap isn't enough, look for another beneficial swap.
      for (const playerA of strongTeamPlayers) {
        for (const playerB of weakTeamPlayers) {
          const newStrongTotal = strongestTeam.totalPoints - playerA.points + playerB.points;
          const newWeakTotal = weakestTeam.totalPoints - playerB.points + playerA.points;
          const newSpread = Math.abs(newStrongTotal - newWeakTotal);
          
          if (newSpread < globalBalance.pointSpread - 50) { // Significant improvement
            const decision: AtlasDecision = {
              id: `swap_${playerA.id}_${playerB.id}`,
              type: 'player_swap',
              priority: 'high',
              description: `Swap ${playerA.username} (Team ${strongestTeam.index + 1}) with ${playerB.username} (Team ${weakestTeam.index + 1})`,
              reasoning: `Reduces point imbalance from ${globalBalance.pointSpread} to ~${newSpread} points`,
              confidence: 85,
              impact: {
                expectedImprovement: 40,
                affectedPlayers: [playerA.username, playerB.username],
                affectedTeams: [strongestTeam.index, weakestTeam.index]
              },
              action: {
                playerId: playerA.id,
                swapPlayerId: playerB.id,
                fromTeam: strongestTeam.index,
                toTeam: weakestTeam.index
              },
              timestamp: new Date()
            };
            
            this.decisions.push(decision);
            this.log('🔄 REGULAR SWAP DECISION MADE', decision);
            return; // Only do one swap at a time
          }
        }
      }
    }
  }

  /**
   * Convert team recommendation to decision
   */
  private convertRecommendationToDecision(recommendation: any): AtlasDecision {
    return {
      id: `rec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: recommendation.type === 'redistribute_player' ? 'team_redistribution' : 'player_swap',
      priority: recommendation.priority,
      description: recommendation.description,
      reasoning: recommendation.reasoning,
      confidence: 80,
      impact: {
        expectedImprovement: recommendation.expectedImprovement,
        affectedPlayers: recommendation.targetPlayer ? [recommendation.targetPlayer] : [],
        affectedTeams: recommendation.targetTeam ? [recommendation.targetTeam] : []
      },
      action: {
        playerId: recommendation.targetPlayer,
        toTeam: recommendation.targetTeam
      },
      timestamp: new Date()
    };
  }

  /**
   * Generate execution plan for all decisions
   */
  private generateExecutionPlan(): ExecutionStep[] {
    const steps: ExecutionStep[] = [];
    let order = 1;
    
    // Step 1: Player adjustments first
    const playerAdjustments = this.decisions.filter(d => d.type === 'player_adjustment');
    if (playerAdjustments.length > 0) {
      steps.push({
        order: order++,
        type: 'adjust_points',
        description: `Adjust points for ${playerAdjustments.length} players based on skill analysis`,
        details: playerAdjustments.map(d => ({
          player: d.impact.affectedPlayers[0],
          adjustment: d.action?.pointAdjustment,
          reasoning: d.reasoning
        }))
      });
    }
    
    // Step 2: Critical redistributions
    const redistributions = this.decisions.filter(d => d.type === 'team_redistribution' && d.priority === 'critical');
    if (redistributions.length > 0) {
      steps.push({
        order: order++,
        type: 'redistribute_player',
        description: `Redistribute ${redistributions.length} players to fix critical issues`,
        details: redistributions.map(d => ({
          player: d.impact.affectedPlayers[0],
          fromTeam: d.action?.fromTeam,
          toTeam: d.action?.toTeam,
          reasoning: d.reasoning
        }))
      });
    }
    
    // Step 3: Player swaps for balance
    const swaps = this.decisions.filter(d => d.type === 'player_swap');
    if (swaps.length > 0) {
      steps.push({
        order: order++,
        type: 'swap_players',
        description: `Execute ${swaps.length} player swaps to improve balance`,
        details: swaps.map(d => ({
          player1: d.impact.affectedPlayers[0],
          player2: d.impact.affectedPlayers[1],
          reasoning: d.reasoning
        }))
      });
    }
    
    // Final step: Validation
    steps.push({
      order: order++,
      type: 'validate_result',
      description: 'Validate final team balance and composition',
      details: {
        expectedImprovement: this.decisions.reduce((sum, d) => sum + d.impact.expectedImprovement, 0) / this.decisions.length,
        totalDecisions: this.decisions.length
      }
    });
    
    return steps;
  }

  /**
   * Calculate analysis summary
   */
  private calculateSummary(playerAnalyses: PlayerAnalysis[], decisions: AtlasDecision[]) {
    const playersAdjusted = decisions.filter(d => d.type === 'player_adjustment').length;
    const redistributionsNeeded = decisions.filter(d => d.type === 'team_redistribution').length;
    const swapsNeeded = decisions.filter(d => d.type === 'player_swap').length;
    
    const expectedImprovement = decisions.length > 0
      ? decisions.reduce((sum, d) => sum + d.impact.expectedImprovement, 0) / decisions.length
      : 0;
    
    const avgConfidence = decisions.length > 0
      ? decisions.reduce((sum, d) => sum + d.confidence, 0) / decisions.length
      : 100;
    
    return {
      totalPlayersAnalyzed: playerAnalyses.length,
      playersAdjusted,
      redistributionsNeeded,
      swapsNeeded,
      expectedBalanceImprovement: Math.round(expectedImprovement),
      confidenceScore: Math.round(avgConfidence)
    };
  }

  /**
   * Helper methods
   */
  private determinePriority(analysis: PlayerAnalysis): 'low' | 'medium' | 'high' | 'critical' {
    const adjustmentPercent = Math.abs(analysis.adjustedPoints - analysis.originalPoints) / analysis.originalPoints;
    const criticalFlags = analysis.analysisFlags.filter(f => f.severity === 'critical').length;
    
    if (criticalFlags > 0 || adjustmentPercent > 0.3) return 'critical';
    if (adjustmentPercent > 0.2 || analysis.confidenceScore > 90) return 'high';
    if (adjustmentPercent > 0.1 || analysis.confidenceScore > 80) return 'medium';
    return 'low';
  }

  private createEmptyGlobalBalance(): GlobalBalance {
    return {
      averageTeamPoints: 0,
      minTeamPoints: 0,
      maxTeamPoints: 0,
      pointSpread: 0,
      eliteDistribution: [],
      balanceQuality: 'excellent',
      overallScore: 100,
      criticalIssues: [],
      recommendations: []
    };
  }

  private log(message: string, data?: any): void {
    if (this.config.logging.enableDetailedLogging) {
      atlasLogger.info(message, data);
    }
  }
}
