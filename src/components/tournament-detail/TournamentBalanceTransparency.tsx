import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp, BarChart3, TrendingUp, Users, Trophy, Target, Zap, Shield, AlertTriangle, Clock, Brain } from "lucide-react";
import { useState } from "react";
import { Team } from "@/types/tournamentDetail";

interface BalanceStep {
  step?: number; // New format
  round?: number; // Old format
  player: {
    id?: string;
    name?: string;
    discord_username?: string;
    rank: string;
    points: number;
    source?: string;
  };
  assignedTo?: string; // Old format
  assignedTeam?: number; // New format
  reasoning: string;
  teamStates?: Array<{ // Old format
    name: string;
    totalPoints: number;
    playerCount: number;
  }>;
  teamStatesAfter?: Array<{ // New format
    teamIndex: number;
    totalPoints: number;
    playerCount: number;
  }>;
}

interface FinalBalance {
  averageTeamPoints: number;
  minTeamPoints: number;
  maxTeamPoints: number;
  maxPointDifference: number;
  balanceQuality: 'ideal' | 'good' | 'warning' | 'poor';
}

interface AdaptiveWeightCalculation {
  userId: string;
  calculation: {
    currentRank?: string;
    currentRankPoints: number;
    peakRank?: string;
    peakRankPoints: number;
    calculatedAdaptiveWeight: number;
    adaptiveFactor: number;
    calculationReasoning: string;
    weightSource: string;
    rankDecayFactor?: number;
    timeSincePeakDays?: number;
    // ATLAS-specific fields
    finalPoints?: number;
    tournamentsWon?: number;
    evidenceFactors?: string[];
    tournamentBonus?: number;
  };
}

interface BalanceAnalysis {
  // Old format properties
  qualityScore?: number;
  maxPointDifference?: number;
  avgPointDifference?: number;
  balanceSteps?: BalanceStep[];
  finalTeamStats?: Array<{
    name: string;
    totalPoints: number;
    playerCount: number;
    avgPoints: number;
  }>;
  
  // New format properties
  final_balance?: FinalBalance;
  balance_steps?: BalanceStep[];
  teams_created?: Array<{
    name: string;
    members: Array<{
      discord_username: string;
      rank: string;
      points: number;
      source: string;
    }>;
    total_points: number;
    seed: number;
  }>;
  
  // Adaptive weight calculations
  adaptiveWeightCalculations?: AdaptiveWeightCalculation[];
  adaptive_weight_calculations?: AdaptiveWeightCalculation[]; // Database format
  evidenceCalculations?: AdaptiveWeightCalculation[]; // ATLAS evidence format
  
  // Common properties
  method: string;
  timestamp: string;
}

interface TournamentBalanceTransparencyProps {
  balanceAnalysis: BalanceAnalysis;
  teams: Team[];
}

const TournamentBalanceTransparency = ({ balanceAnalysis, teams }: TournamentBalanceTransparencyProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isAdaptiveExpanded, setIsAdaptiveExpanded] = useState(false);
  const [isAtlasExpanded, setIsAtlasExpanded] = useState(false);
  
  // Helper functions to handle both old and new formats
  const getQualityScore = () => {
    if (balanceAnalysis.qualityScore !== undefined) {
      return balanceAnalysis.qualityScore;
    }
    if (balanceAnalysis.final_balance?.balanceQuality) {
      const quality = balanceAnalysis.final_balance.balanceQuality;
      switch (quality) {
        case 'ideal': return 95;
        case 'good': return 85;
        case 'warning': return 70;
        case 'poor': return 45;
        default: return 50;
      }
    }
    return 50;
  };

  const getMaxPointDifference = () => {
    return balanceAnalysis.maxPointDifference ?? balanceAnalysis.final_balance?.maxPointDifference ?? 0;
  };

  const getAvgPointDifference = () => {
    if (balanceAnalysis.avgPointDifference !== undefined) {
      return balanceAnalysis.avgPointDifference;
    }
    if (balanceAnalysis.final_balance) {
      return balanceAnalysis.final_balance.maxPointDifference / 2; // Approximate from max difference
    }
    return 0;
  };

  const getFinalTeamStats = () => {
    if (balanceAnalysis.finalTeamStats) {
      return balanceAnalysis.finalTeamStats;
    }
    if (balanceAnalysis.teams_created) {
      return balanceAnalysis.teams_created.map(team => ({
        name: team.name,
        totalPoints: team.total_points,
        playerCount: team.members.length,
        avgPoints: team.total_points / team.members.length
      }));
    }
    return [];
  };

  const getBalanceSteps = () => {
    return balanceAnalysis.balanceSteps ?? balanceAnalysis.balance_steps ?? [];
  };

  const getAdaptiveCalculations = () => {
    // PHASE 5 FIX: Enhanced ATLAS transparency data handling
    const calculations = balanceAnalysis.adaptiveWeightCalculations || 
                        balanceAnalysis.adaptive_weight_calculations || 
                        balanceAnalysis.evidenceCalculations || // New ATLAS format
                        [];
    
    // Remove duplicates based on userId
    const uniqueCalculations = calculations.filter((calc, index, self) => 
      index === self.findIndex(c => c.userId === calc.userId)
    );
    
    // Enhanced filtering: show calculations for players in balance steps OR ATLAS evidence calculations
    const balancedPlayerIds = balanceSteps.map(step => step.player.id);
    const balancedCalculations = uniqueCalculations.filter(calc => 
      balancedPlayerIds.includes(calc.userId) || 
      calc.calculation?.weightSource === 'atlas_unified' // Show ATLAS calculations
    );
    
    console.log('🏛️ TRANSPARENCY: Retrieved calculations:', {
      total: calculations.length,
      unique: uniqueCalculations.length,
      balanced: balancedCalculations.length,
      sources: [...new Set(balancedCalculations.map(c => c.calculation?.weightSource))]
    });
    
    return balancedCalculations;
  };

  const getEvidenceCalculations = () => {
    return balanceAnalysis.evidenceCalculations || 
           balanceAnalysis.adaptiveWeightCalculations || 
           balanceAnalysis.adaptive_weight_calculations || 
           [];
  };

  const getBalanceQuality = () => {
    const quality = balanceAnalysis.final_balance?.balanceQuality || 'good';
    return quality === 'ideal' ? 'excellent' : 
           quality === 'good' ? 'good' : 
           quality === 'warning' ? 'warning' : 'poor';
  };

  const getMaxTeamDifference = () => {
    return getMaxPointDifference();
  };
  
  const qualityScore = getQualityScore();
  const maxPointDifference = getMaxPointDifference();
  const avgPointDifference = getAvgPointDifference();
  const finalTeamStats = getFinalTeamStats();
  const balanceSteps = getBalanceSteps();
  const adaptiveCalculations = getAdaptiveCalculations();
  
  const getQualityColor = (score: number) => {
    if (score >= 85) return "text-emerald-600 bg-emerald-50 border-emerald-200";
    if (score >= 70) return "text-yellow-600 bg-yellow-50 border-yellow-200";
    return "text-red-600 bg-red-50 border-red-200";
  };

  const getQualityLabel = (score: number) => {
    if (score >= 85) return "Excellent";
    if (score >= 70) return "Good";
    return "Fair";
  };

  // Parse ATLAS reasoning into human-readable explanations
  const parseAtlasReasoning = (reasoning: string) => {
    let playerName = "";
    let rank = "";
    let points = 0;
    let teamName = "";
    let type = "Standard Assignment"; // Default to a more neutral type
    let explanation = "";
    let factors = [];
    let impact = "Player assigned to optimize overall team balance."; // Default impact

    // Try to extract player info from various formats
    const eliteDistMatch = reasoning.match(/ATLAS Elite Distribution:\s*(\w+)\s*\((\d+)pts\)\s*→\s*(.+?)\./);
    const smartBalanceMatch = reasoning.match(/ATLAS Smart Balancing:\s*(\w+)\s*\((\d+)pts\)\s*→\s*(.+?)\./);
    const generalMatch = reasoning.match(/(\w+)\s*\((\w+)\s*(\d+)pts?\)/);

    // Check if we can extract rank information from the reasoning
    const currentRankMatch = reasoning.match(/Current rank[:\s]+(\w+(?:\s\d)?)/i);
    const peakRankMatch = reasoning.match(/Peak Rank[:\s]+(\w+(?:\s\d)?)/i);
    const actualRank = currentRankMatch?.[1] || peakRankMatch?.[1] || "";
    
    // Helper function to determine if rank is high-level (Immortal 1) or elite (Immortal 2+)
    const isHighLevelRank = (rank: string) => {
      const highLevelRanks = ['Immortal 1'];
      return highLevelRanks.includes(rank);
    };
    
    const isEliteRank = (rank: string) => {
      const eliteRanks = ['Immortal 2', 'Immortal 3', 'Radiant'];
      return eliteRanks.includes(rank);
    };

    // Helper function to process any player match and determine notification type
    const processPlayerMatch = (name: string, pts: number, team: string, initialRank: string) => {
      playerName = name;
      points = pts;
      teamName = team;
      rank = initialRank; // Set initial rank from the balance step

      // Determine classification based on actual rank or points
      const isEliteByRank = isEliteRank(actualRank);
      const isHighLevelByRank = isHighLevelRank(actualRank);
      const isEliteByPoints = pts >= 400;
      const isHighLevelByPoints = pts >= 350;
      
      if (isEliteByRank || (isEliteByPoints && !isHighLevelByRank)) {
        type = "Elite Player Distribution";
        rank = actualRank || "Elite"; // Use actualRank if available, otherwise 'Elite'
        explanation = `${playerName} is an elite player who was distributed strategically to prevent skill stacking and maintain competitive balance across teams.`;
        factors.push({ label: "Player Category", value: `Elite Tier (${actualRank || 'Immortal 2+'}/ ${pts} points)`, type: "skill" });
        impact = "Elite players distributed evenly for fair competition";
      } else if (isHighLevelByRank || isHighLevelByPoints) {
        type = "High-Level Player Distribution";
        rank = actualRank || "High-Level"; // Use actualRank if available, otherwise 'High-Level'
        explanation = `${playerName} is a high-level player (Immortal 1) who was distributed strategically to prevent skill stacking and maintain competitive balance across teams.`;
        factors.push({ label: "Player Category", value: `High Tier (${actualRank || 'Immortal 1'}/ ${pts} points)`, type: "skill" });
        impact = "High-level players distributed evenly for fair competition";
      } else {
        // This is the updated default for non-elite/high-level players
        type = "Standard Assignment";
        rank = actualRank || initialRank; // Prefer actualRank, fallback to initial rank from step
        explanation = `${playerName} was assigned to ${teamName} to contribute to the overall team balance based on their ${rank} rank.`;
        factors.push({ label: "Player Category", value: `${rank} Tier (${pts} points)`, type: "skill" });
        impact = "Player assigned for optimal team balance";
      }
    };

    // Prioritize specific ATLAS distribution matches
    if (eliteDistMatch) {
      processPlayerMatch(eliteDistMatch[1], parseInt(eliteDistMatch[2]), eliteDistMatch[3], eliteDistMatch[1]); // Pass player name as initial rank for now, will be updated
      factors.push({ label: "Distribution Strategy", value: "Round-robin to prevent stacking", type: "rule" });
      factors.push({ label: "Team Limit", value: "Maximum 1 per team", type: "rule" });
    } else if (smartBalanceMatch) {
      processPlayerMatch(smartBalanceMatch[1], parseInt(smartBalanceMatch[2]), smartBalanceMatch[3], smartBalanceMatch[1]); // Pass player name as initial rank
      factors.push({ label: "Assignment Method", value: "Optimal team balancing", type: "balance" });
      factors.push({ label: "Team Selection", value: "Joined team needing their skill level", type: "balance" });
    } else if (generalMatch) {
      // General match is a weaker indicator, so we process it but allow processPlayerMatch to re-evaluate type
      processPlayerMatch(generalMatch[1], parseInt(generalMatch[3]), "Team (auto-assigned)", generalMatch[2]);
    } else {
      return null; // Couldn't parse
    }

    // Extract additional details from the reasoning text, regardless of initial classification
    if (reasoning.includes("Current rank Unrated") || reasoning.includes("Unrated")) {
      rank = "Unrated";
      factors.push({ label: "Current Rank", value: "Unrated", type: "skill" });
    }
    
    if (reasoning.includes("Peak Rank: Radiant")) {
      factors.push({ label: "Peak Achievement", value: "Radiant (highest tier)", type: "peak" });
    } else if (reasoning.includes("Peak Rank:")) {
      const peakMatch = reasoning.match(/Peak Rank:\s*(\w+)/);
      if (peakMatch) {
        factors.push({ label: "Peak Achievement", value: peakMatch[1], type: "peak" });
      }
    }
    
    if (reasoning.includes("Elite Tier Player")) {
      // This factor indicates an explicit mention in the reasoning, which is separate from our derived category
      factors.push({ label: "Classification Source", value: "Explicitly marked as Elite in source data", type: "rule" });
    }
    
    if (reasoning.includes("Round-robin assignment")) {
      factors.push({ label: "Assignment Logic", value: "Round-robin distribution", type: "rule" });
    }
    
    if (reasoning.includes("Strategic placement")) {
      factors.push({ label: "Strategy", value: "Strategic elite placement", type: "rule" });
    }

    if (reasoning.includes("lowest total") || reasoning.includes("optimal balance")) {
      factors.push({ label: "Team Selection", value: "Joined team with lowest total points", type: "balance" });
    }

    // Parse tournament winner bonuses
    if (reasoning.includes("Tournament bonus:")) {
      const bonusMatch = reasoning.match(/Tournament bonus:\s*\+(\d+)\s*pts/);
      if (bonusMatch) {
        const bonusPoints = bonusMatch[1];
        factors.push({ label: "Tournament Winner Bonus", value: `+${bonusPoints} points`, type: "achievement" });
        if (!explanation.includes("This player has proven their competitive skill")) { // Avoid duplicate explanation
          explanation += ` This player has proven their competitive skill through tournament victories and receives a bonus reflecting their demonstrated ability.`;
        }
      }
    }

    // Parse specific tournament win counts from reasoning
    if (reasoning.includes("Tournament Winner Bonus:") || reasoning.includes("🏆")) {
      const winCountMatch = reasoning.match(/(\d+)\s*wins?/);
      const bonusAmountMatch = reasoning.match(/\+(\d+)\s*(?:total|base)/);
      
      if (winCountMatch && bonusAmountMatch) {
        const wins = winCountMatch[1];
        const bonus = bonusAmountMatch[1];
        factors.push({ 
          label: "Competitive History", 
          value: `${wins} tournament win${wins !== '1' ? 's' : ''} (+${bonus} pts)`, 
          type: "achievement" 
        });
      }
    }

    // Parse recent winner bonuses
    if (reasoning.includes("recent winner bonus")) {
      const recentMatch = reasoning.match(/\+(\d+)\s*recent winner bonus/);
      if (recentMatch) {
        factors.push({ 
          label: "Recent Achievement", 
          value: `+${recentMatch[1]} recent winner bonus`, 
          type: "achievement" 
        });
      }
    }

    // Parse elite winner bonuses
    if (reasoning.includes("elite winner bonus")) {
      const eliteMatch = reasoning.match(/\+(\d+)\s*elite winner bonus/);
      if (eliteMatch) {
        factors.push({ 
          label: "Elite Competitor", 
          value: `+${eliteMatch[1]} elite winner bonus`, 
          type: "achievement" 
        });
      }
    }

    return {
      playerName,
      rank,
      teamName,
      points,
      type,
      explanation,
      factors,
      impact
    };
  };

  return (
    <Card className="border-secondary/20 bg-card/50 backdrop-blur-sm">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <BarChart3 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg text-foreground">Balance Analysis</CardTitle>
              <p className="text-sm text-muted-foreground">
                Auto-balanced using {balanceAnalysis.method}
                {balanceAnalysis.method?.includes('Adaptive') && (
                  <span className="ml-2 text-blue-400 font-medium">• Enhanced Weighting</span>
                )}
              </p>
            </div>
          </div>
          <Badge 
            variant="outline" 
            className={`px-3 py-1 ${getQualityColor(qualityScore)}`}
          >
            {getQualityLabel(qualityScore)} ({qualityScore}%)
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Balance Quality Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium text-foreground">Balance Quality</span>
            </div>
            <Progress value={qualityScore} className="h-2" />
            <p className="text-xs text-muted-foreground">{qualityScore}% balanced</p>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium text-foreground">Max Point Difference</span>
            </div>
            <div className="text-lg font-semibold text-foreground">{maxPointDifference}</div>
            <p className="text-xs text-muted-foreground">Between strongest/weakest teams</p>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Trophy className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium text-foreground">Avg Difference</span>
            </div>
            <div className="text-lg font-semibold text-foreground">{avgPointDifference.toFixed(1)}</div>
            <p className="text-xs text-muted-foreground">Average team point difference</p>
          </div>
        </div>

        {/* Team Comparison Bars */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-foreground flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Team Point Distribution
          </h4>
          <div className="space-y-2">
            {finalTeamStats
              .sort((a, b) => b.totalPoints - a.totalPoints)
              .map((team, index) => {
                const maxPoints = Math.max(...finalTeamStats.map(t => t.totalPoints));
                const percentage = maxPoints > 0 ? (team.totalPoints / maxPoints) * 100 : 0;
                
                return (
                  <div key={team.name} className="space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-foreground">{team.name}</span>
                      <div className="text-right">
                        <span className="text-sm font-semibold text-foreground">{team.totalPoints}</span>
                        <span className="text-xs text-muted-foreground ml-2">
                          ({team.avgPoints.toFixed(0)} avg)
                        </span>
                      </div>
                    </div>
                    <div className="relative">
                      <Progress value={percentage} className="h-2" />
                      {index === 0 && (
                        <Badge variant="secondary" className="absolute -top-1 right-0 text-xs">
                          Strongest
                        </Badge>
                      )}
                    </div>
                  </div>
                );
              })}
          </div>
        </div>

        {/* Adaptive Weight Calculations (if used) */}
        {adaptiveCalculations.length > 0 && (
          <div className="space-y-3 border-t border-border pt-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsAdaptiveExpanded(!isAdaptiveExpanded)}
              className="w-full flex items-center justify-between p-2 h-auto"
            >
              <span className="text-sm font-medium text-foreground flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-blue-400" />
                Adaptive Weight Calculations ({adaptiveCalculations.length} players)
              </span>
              {isAdaptiveExpanded ? (
                <ChevronUp className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              )}
            </Button>
            
            {isAdaptiveExpanded && (
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {/* Why Adaptive is Better Section */}
                <div className="p-4 rounded-lg bg-blue-50/50 border border-blue-200/50 dark:bg-blue-950/30 dark:border-blue-800/30">
                  <h5 className="text-sm font-semibold text-blue-800 dark:text-blue-300 mb-2 flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    Why Adaptive Weighting is Superior
                  </h5>
                  <div className="text-xs text-blue-700 dark:text-blue-400 space-y-1">
                    <div>• <strong>Tier-aware decay:</strong> Considers rank tier gaps, not just point differences</div>
                    <div>• <strong>Time-based degradation:</strong> Exponential skill decay modeling over time</div>
                    <div>• <strong>Confidence scoring:</strong> Higher weight for significant peak advantages</div>
                    <div>• <strong>Smart penalties:</strong> Tier-appropriate unranked penalties</div>
                    <div>• <strong>Variance reduction:</strong> Smoother transitions for consistent balancing</div>
                  </div>
                </div>

                {/* Individual Calculations */}
                {adaptiveCalculations.map((calc, index) => {
                  const stepPlayer = balanceSteps.find(step => 
                    step.player.id === calc.userId || 
                    step.player.id === calc.userId ||
                    (step.player as any).user_id === calc.userId
                  );
                  const playerName = stepPlayer?.player.discord_username || stepPlayer?.player.name || `Player ${index + 1}`;
                  
                  // Calculate what standard system would give
                  const standardPoints = calc.calculation.currentRank === 'Unranked' || !calc.calculation.currentRank 
                    ? calc.calculation.peakRankPoints || 150
                    : calc.calculation.currentRankPoints;
                  const adaptiveAdvantage = calc.calculation.calculatedAdaptiveWeight - standardPoints;
                  
                  return (
                    <div key={index} className="p-4 rounded-lg bg-card border border-border shadow-sm">
                      {/* Player Header */}
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-foreground">
                            {playerName}
                          </span>
                          {adaptiveAdvantage !== 0 && (
                            <Badge 
                              variant="outline" 
                              className={`text-xs ${
                                adaptiveAdvantage > 0 
                                  ? 'border-green-400 text-green-600 dark:text-green-400' 
                                  : 'border-orange-400 text-orange-600 dark:text-orange-400'
                              }`}
                            >
                              {adaptiveAdvantage > 0 ? '+' : ''}{adaptiveAdvantage} pts vs standard
                            </Badge>
                          )}
                        </div>
                        <Badge className="bg-gradient-to-r from-blue-600 to-purple-600 text-white text-xs font-medium">
                          {calc.calculation.calculatedAdaptiveWeight} pts (ADAPTIVE)
                        </Badge>
                      </div>

                      {/* Reasoning */}
                      <div className="text-sm text-foreground/80 mb-3 p-2 rounded bg-muted/30">
                        {calc.calculation.calculationReasoning.split('. ').map((line, i) => (
                          <div key={i} className="py-0.5">{line.trim()}</div>
                        ))}
                      </div>

                      {/* Detailed Metrics Grid */}
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                        <div className="space-y-1">
                          <div className="text-muted-foreground font-medium">Current Rank</div>
                          <div className="text-foreground font-semibold">
                            {calc.calculation.currentRank || 'Unranked'}
                          </div>
                          <div className="text-muted-foreground">
                            {calc.calculation.currentRankPoints} points
                          </div>
                        </div>
                        
                        <div className="space-y-1">
                          <div className="text-muted-foreground font-medium">Peak Rank</div>
                          <div className="text-foreground font-semibold">
                            {calc.calculation.peakRank || 'N/A'}
                          </div>
                          <div className="text-muted-foreground">
                            {calc.calculation.peakRankPoints} points
                          </div>
                        </div>
                        
                        <div className="space-y-1">
                          <div className="text-muted-foreground font-medium">Adaptive Blend</div>
                          <div className="text-foreground font-semibold">
                            {Math.round(calc.calculation.adaptiveFactor * 100)}% peak
                          </div>
                          <div className="text-muted-foreground">
                            {Math.round((1 - calc.calculation.adaptiveFactor) * 100)}% current
                          </div>
                        </div>
                        
                        {calc.calculation.rankDecayFactor !== undefined && (
                          <div className="space-y-1">
                            <div className="text-muted-foreground font-medium">Tier Decay</div>
                            <div className="text-foreground font-semibold">
                              {Math.round(calc.calculation.rankDecayFactor * 100)}%
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Tier-based adjustment
                            </div>
                          </div>
                        )}
                        
                        {calc.calculation.timeSincePeakDays && (
                          <div className="space-y-1">
                            <div className="text-muted-foreground font-medium">Time Factor</div>
                            <div className="text-foreground font-semibold">
                              {calc.calculation.timeSincePeakDays} days
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Since peak rank
                            </div>
                          </div>
                        )}
                        
                        <div className="space-y-1">
                          <div className="text-muted-foreground font-medium">Standard vs Adaptive</div>
                          <div className="text-foreground font-semibold">
                            {standardPoints} → {calc.calculation.calculatedAdaptiveWeight}
                          </div>
                          <div className={`text-xs ${
                            adaptiveAdvantage > 0 
                              ? 'text-green-600 dark:text-green-400' 
                              : adaptiveAdvantage < 0
                                ? 'text-orange-600 dark:text-orange-400'
                                : 'text-muted-foreground'
                          }`}>
                            {adaptiveAdvantage === 0 ? 'No change' : 
                             adaptiveAdvantage > 0 ? `+${adaptiveAdvantage} more accurate` : 
                             `${adaptiveAdvantage} more conservative`}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ATLAS Decision System Section */}
        {(() => {
          const evidenceCalcs = balanceAnalysis.evidenceCalculations || balanceAnalysis.adaptiveWeightCalculations || balanceAnalysis.adaptive_weight_calculations;
          console.log('🏛️ ATLAS UI DEBUG:', { 
            evidenceCalculations: balanceAnalysis.evidenceCalculations,
            adaptiveWeightCalculations: balanceAnalysis.adaptiveWeightCalculations, 
            adaptive_weight_calculations: balanceAnalysis.adaptive_weight_calculations,
            method: balanceAnalysis.method,
            balanceAnalysisKeys: Object.keys(balanceAnalysis)
          });
          return evidenceCalcs && evidenceCalcs.length > 0;
        })() && (
          <div className="border-t border-border pt-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsAtlasExpanded(!isAtlasExpanded)}
              className="w-full flex items-center justify-between p-2 h-auto"
            >
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-purple-500" />
                <span className="text-sm font-medium text-foreground">
                  ATLAS Decision System
                </span>
              </div>
              {isAtlasExpanded ? (
                <ChevronUp className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              )}
            </Button>
            
            {isAtlasExpanded && (
              <div className="mt-4 space-y-4">
                {/* ATLAS Summary Stats */}
                <div className="grid grid-cols-3 gap-4 p-3 bg-muted/20 rounded-lg border border-border">
                  <div className="text-center">
                    <div className="text-lg font-bold text-foreground">
                      {getEvidenceCalculations().length}
                    </div>
                    <div className="text-xs text-muted-foreground">Players Analyzed</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-yellow-600">
                      {getBalanceQuality()}
                    </div>
                    <div className="text-xs text-muted-foreground">Balance Quality</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-foreground">
                      {Math.round(getMaxTeamDifference())}
                    </div>
                    <div className="text-xs text-muted-foreground">Max Difference</div>
                  </div>
                </div>

                {/* ATLAS Adaptive Weight Calculations */}
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold text-foreground">ATLAS Adaptive Weight Calculations</h4>
                  
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {getEvidenceCalculations()
                      .sort((a, b) => (b.calculation.finalPoints || 0) - (a.calculation.finalPoints || 0))
                      .map((calc, index) => {
                        // First try to find player in balance steps
                        const balanceSteps = getBalanceSteps();
                        const playerFromSteps = balanceSteps.find(step => step.player.id === calc.userId);
                        
                        // Fallback to team members if not found in steps
                        const playerFromTeams = teams.flatMap(team => team.team_members || [])
                          .find(member => member.users?.id === calc.userId)?.users;
                        
                        const player = playerFromSteps?.player || playerFromTeams;
                        const playerName = player?.discord_username || (playerFromSteps?.player?.name) || `Player ${index + 1}`;
                        const points = calc.calculation.finalPoints || calc.calculation.calculatedAdaptiveWeight || 0;
                        
                        return (
                          <div key={calc.userId} className="p-3 bg-muted/30 rounded-lg border border-border">
                            <div className="flex items-start justify-between mb-2">
                              <span className="font-medium text-foreground">{playerName}</span>
                              <span className="text-sm font-bold text-foreground">{points} pts</span>
                            </div>
                            
                            {calc.calculation.calculationReasoning && (
                              <div className="mb-3 p-2 bg-blue-50 dark:bg-blue-950/30 rounded border border-blue-200/50 dark:border-blue-800/30">
                                <div className="text-xs font-medium text-blue-800 dark:text-blue-300 mb-1">ATLAS Analysis:</div>
                                <div className="text-xs text-blue-700 dark:text-blue-400">
                                  {calc.calculation.calculationReasoning}
                                </div>
                              </div>
                            )}
                            
                            <div className="grid grid-cols-2 gap-3 text-xs">
                              <div>
                                <span className="text-muted-foreground">Current Rank:</span>
                                <span className="ml-1 text-foreground font-medium">
                                  {(player as any)?.current_rank || calc.calculation.currentRank || 'Unranked'} ({calc.calculation.currentRankPoints || 0} pts)
                                </span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Peak Rank:</span>
                                <span className="ml-1 text-foreground font-medium">
                                  {(player as any)?.peak_rank || calc.calculation.peakRank || 'Unranked'} ({calc.calculation.peakRankPoints || 0} pts)
                                </span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Weight Source:</span>
                                <span className="ml-1 text-foreground font-medium">{calc.calculation.weightSource || 'evidence based'}</span>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Rank Decay:</span>
                                <span className="ml-1 text-foreground font-medium">
                                  {Math.round((calc.calculation.rankDecayFactor || 0) * 100)}%
                                </span>
                              </div>
                              {calc.calculation.tournamentsWon && (
                                <div className="col-span-2">
                                  <span className="text-muted-foreground">Tournaments Won:</span>
                                  <span className="ml-1 text-foreground font-medium">{calc.calculation.tournamentsWon}</span>
                                </div>
                              )}
                            </div>
                            
                            {calc.calculation.evidenceFactors && calc.calculation.evidenceFactors.length > 0 && (
                              <div className="mt-3">
                                <div className="text-xs font-medium text-muted-foreground mb-2">Evidence Factors:</div>
                                <div className="space-y-1">
                                  {calc.calculation.evidenceFactors.map((factor: string, i: number) => (
                                    <div key={i} className="text-xs text-muted-foreground bg-background/50 p-2 rounded border border-border/50">
                                      {factor}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                  </div>
                </div>

                {/* How ATLAS Works */}
                <div className="p-3 bg-muted/20 rounded-lg border border-border">
                  <h4 className="text-sm font-semibold text-foreground mb-3">How ATLAS Works</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                    <div className="flex items-start gap-2">
                      <Clock className="h-3 w-3 text-muted-foreground mt-0.5 flex-shrink-0" />
                      <div>
                        <div className="font-medium text-foreground">Rank Decay Analysis</div>
                        <div className="text-muted-foreground">Adjusts weights based on time since peak rank</div>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <Trophy className="h-3 w-3 text-muted-foreground mt-0.5 flex-shrink-0" />
                      <div>
                        <div className="font-medium text-foreground">Tournament History</div>
                        <div className="text-muted-foreground">Factors in past tournament wins and performance</div>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <Users className="h-3 w-3 text-muted-foreground mt-0.5 flex-shrink-0" />
                      <div>
                        <div className="font-medium text-foreground">Skill Distribution</div>
                        <div className="text-muted-foreground">Prevents stacking of elite players on same team</div>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <Brain className="h-3 w-3 text-muted-foreground mt-0.5 flex-shrink-0" />
                      <div>
                        <div className="font-medium text-foreground">AI Validation</div>
                        <div className="text-muted-foreground">Mini-AI system validates and refines assignments</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
        <div className="border-t border-border pt-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="w-full flex items-center justify-between p-2 h-auto"
          >
            <span className="text-sm font-medium text-foreground">
              View Balance Assignment Steps ({balanceSteps.length} steps)
            </span>
            {isExpanded ? (
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            )}
          </Button>
          
          {isExpanded && (
            <div className="mt-4 space-y-3 max-h-96 overflow-y-auto">
              {balanceSteps.map((step, index) => {
                const playerName = step.player.discord_username || step.player.name || 'Unknown';
                const stepNumber = step.step || step.round || index + 1;
                const assignedTo = step.assignedTo || `Team ${(step.assignedTeam || 0) + 1}`;
                const playerSource = step.player.source || 'current_rank';
                
                return (
                  <div key={index} className="w-full p-3 rounded-lg bg-muted/30 border border-border">
                    <div className="w-full flex items-start justify-between">
                      <div className="w-full space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="outline" className="text-xs">
                            Step {stepNumber}
                          </Badge>
                          <span className="text-sm font-medium text-foreground">
                            {playerName}
                          </span>
                          <Badge variant="secondary" className="text-xs">
                            {step.player.rank} ({step.player.points}pts)
                          </Badge>
                          {playerSource !== 'current_rank' && (
                            <Badge 
                              variant="outline" 
                              className={`text-xs ${
                                playerSource === 'adaptive_weight' ? 'border-blue-400 text-blue-400' :
                                playerSource === 'manual_override' ? 'border-purple-400 text-purple-400' :
                                playerSource === 'peak_rank' ? 'border-amber-400 text-amber-400' :
                                'border-slate-400 text-slate-400'
                              }`}
                            >
                              {playerSource === 'adaptive_weight' ? 'Adaptive' :
                               playerSource === 'manual_override' ? 'Override' :
                               playerSource === 'peak_rank' ? 'Peak' : 
                               playerSource}
                            </Badge>
                          )}
                        </div>
                        <div className="w-full space-y-3">
                          <p className="text-xs text-muted-foreground">
                            Assigned to <span className="font-medium text-foreground">{assignedTo}</span>
                          </p>
                          
                          {(() => {
                            const atlasData = parseAtlasReasoning(step.reasoning);
                            
                            if (atlasData) {
                              return (
                                <div className="w-full bg-muted/20 rounded-lg border border-border p-3 space-y-3">
                                  {/* Compact Assignment Header */}
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                       <div className={`w-2 h-2 rounded-full ${
                                          atlasData.type === 'Elite Player Distribution' ? 'bg-purple-500' :
                                          atlasData.type === 'High-Level Player Distribution' ? 'bg-orange-500' :
                                          atlasData.type === 'Smart Team Balancing' ? 'bg-blue-500' :
                                          'bg-green-500' // Default for 'Standard Assignment'
                                        }`} />
                                      <span className="text-sm font-semibold text-foreground">{atlasData.type}</span>
                                    </div>
                                    <Badge variant="outline" className="text-xs">
                                      {atlasData.points} pts
                                    </Badge>
                                  </div>

                                  {/* Condensed Explanation */}
                                  <p className="text-sm text-muted-foreground leading-relaxed">
                                    {atlasData.explanation}
                                  </p>

                                  {/* Compact Factor Grid */}
                                  {atlasData.factors.length > 0 && (
                                    <div className="grid grid-cols-1 gap-1.5">
                                      {atlasData.factors.map((factor, i) => (
                                        <div key={i} className="flex items-center justify-between py-1.5 px-2 bg-background/50 rounded border border-border/50">
                                            <div className="flex items-center gap-1.5">
                                               <div className={`w-1.5 h-1.5 rounded-full ${
                                                  factor.type === 'skill' ? 'bg-blue-500' :
                                                  factor.type === 'peak' ? 'bg-amber-500' :
                                                  factor.type === 'balance' ? 'bg-green-500' :
                                                  factor.type === 'rule' ? 'bg-purple-500' :
                                                  factor.type === 'achievement' ? 'bg-yellow-500' :
                                                  'bg-gray-500'
                                                }`} />
                                              <span className="text-xs font-medium text-foreground">{factor.label}</span>
                                            </div>
                                          <span className="text-xs text-muted-foreground">{factor.value}</span>
                                        </div>
                                      ))}
                                    </div>
                                  )}

                                  {/* Compact Balance Result */}
                                  <div className="flex items-start gap-2 p-2 bg-green-50 dark:bg-green-950/30 rounded border border-green-200/50 dark:border-green-800/30">
                                    <Shield className="h-3 w-3 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                                    <p className="text-xs text-green-800 dark:text-green-400 leading-relaxed">{atlasData.impact}</p>
                                  </div>
                                </div>
                              );
                            } else {
                              // Fallback for non-ATLAS reasoning
                              return (
                                <p className="text-xs text-muted-foreground bg-muted/30 p-2 rounded">
                                  {step.reasoning}
                                </p>
                              );
                            }
                          })()}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="text-xs text-muted-foreground text-center pt-2 border-t border-border">
          Balanced on {new Date(balanceAnalysis.timestamp).toLocaleString()}
        </div>
      </CardContent>
    </Card>
  );
};

export default TournamentBalanceTransparency;