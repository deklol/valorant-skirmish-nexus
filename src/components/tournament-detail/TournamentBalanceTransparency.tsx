import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp, BarChart3, TrendingUp, Users, Trophy, Target, Brain } from "lucide-react";
import { useState } from "react";
import { Team } from "@/types/tournamentDetail";
import SwapSuggestionsSection from "./SwapSuggestionsSection";

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

interface UnifiedATLASCalculation {
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
    // Unified ATLAS fields
    finalPoints?: number;
    tournamentsWon?: number;
    evidenceFactors?: string[];
    tournamentBonus?: number;
    basePoints?: number;
    rankDecayApplied?: number;
    isEliteTier?: boolean;
    // Enhanced reasoning components
    rankSource?: 'current' | 'peak' | 'manual' | 'default';
    bonusBreakdown?: {
      tournamentWins?: number;
      recentWinBonus?: number;
      eliteWinnerBonus?: number;
    };
  };
}

interface SwapSuggestion {
  strategy: 'direct' | 'secondary' | 'cascading' | 'fallback';
  player1: {
    name: string;
    rank: string;
    points: number;
    currentTeam: number;
  };
  player2?: {
    name: string;
    rank: string;
    points: number;
    currentTeam: number;
  };
  targetTeam?: number;
  expectedImprovement: number;
  reasoning: string;
  outcome: 'executed' | 'rejected' | 'considered';
  rejectionReason?: string;
  balanceImpact: {
    beforeBalance: number;
    afterBalance: number;
    violationResolved: boolean;
  };
}

interface SwapAnalysis {
  totalSuggestionsConsidered: number;
  strategiesAttempted: string[];
  successfulSwaps: SwapSuggestion[];
  rejectedSwaps: SwapSuggestion[];
  finalOutcome: 'improved' | 'no_improvement' | 'fallback_used';
  overallImprovement: number;
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
  
  // Unified ATLAS Adaptive Weight calculations
  atlasCalculations?: UnifiedATLASCalculation[];
  adaptiveWeightCalculations?: UnifiedATLASCalculation[];
  adaptive_weight_calculations?: UnifiedATLASCalculation[]; // Database format
  evidenceCalculations?: UnifiedATLASCalculation[]; // ATLAS evidence format
  
  // Swap analysis (new)
  swapAnalysis?: SwapAnalysis;
  
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
  const [isATLASExpanded, setIsATLASExpanded] = useState(false);
  const [isSwapExpanded, setIsSwapExpanded] = useState(false);
  
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

  const getUnifiedATLASCalculations = () => {
    // Unified ATLAS data handling - merge all calculation sources
    const calculations = balanceAnalysis.atlasCalculations || 
                        balanceAnalysis.adaptiveWeightCalculations || 
                        balanceAnalysis.adaptive_weight_calculations || 
                        balanceAnalysis.evidenceCalculations || 
                        [];
    
    // Remove duplicates based on userId
    const uniqueCalculations = calculations.filter((calc, index, self) => 
      index === self.findIndex(c => c.userId === calc.userId)
    );
    
    // Enhanced filtering: show calculations for players in balance steps
    const balanceSteps = getBalanceSteps();
    const balancedPlayerIds = balanceSteps.map(step => step.player.id);
    const balancedCalculations = uniqueCalculations.filter(calc => 
      balancedPlayerIds.includes(calc.userId)
    );
    
    console.log('🏛️ ATLAS TRANSPARENCY: Retrieved unified calculations:', {
      total: calculations.length,
      unique: uniqueCalculations.length,
      balanced: balancedCalculations.length,
      sources: [...new Set(balancedCalculations.map(c => c.calculation?.weightSource))]
    });
    
    return balancedCalculations;
  };

  const getATLASStats = () => {
    const calculations = getUnifiedATLASCalculations();
    const playersAnalyzed = calculations.length;
    const qualityScore = getQualityScore();
    const maxDifference = getMaxPointDifference();
    
    return {
      playersAnalyzed,
      balanceQuality: getBalanceQuality(),
      qualityScore,
      maxDifference
    };
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

  // Enhanced reasoning generation for unified ATLAS display
  const generateEnhancedReasoning = (calc: UnifiedATLASCalculation): string => {
    const { calculation } = calc;
    const parts: string[] = [];
    
    // Base rank information
    if (calculation.peakRank && calculation.currentRank !== calculation.peakRank) {
      parts.push(`Peak: ${calculation.peakRank} (${calculation.peakRankPoints} pts)`);
      if (calculation.currentRank && calculation.currentRank !== 'Unranked') {
        parts.push(`Current: ${calculation.currentRank} (${calculation.currentRankPoints} pts)`);
      } else {
        parts.push(`Currently Unranked`);
      }
    } else if (calculation.currentRank) {
      parts.push(`${calculation.currentRank} (${calculation.currentRankPoints} pts)`);
    }
    
    // Tournament bonuses
    if (calculation.tournamentBonus && calculation.tournamentBonus > 0) {
      parts.push(`+${calculation.tournamentBonus} tournament bonus (${calculation.tournamentsWon || 0} wins)`);
    }
    
    // Rank decay
    if (calculation.rankDecayApplied && calculation.rankDecayApplied > 0) {
      parts.push(`-${calculation.rankDecayApplied} rank decay`);
    }
    
    // Final calculation
    parts.push(`= ${calculation.finalPoints || calculation.calculatedAdaptiveWeight} pts total`);
    
    return parts.join(' ');
  };
  
  const qualityScore = getQualityScore();
  const maxPointDifference = getMaxPointDifference();
  const avgPointDifference = getAvgPointDifference();
  const finalTeamStats = getFinalTeamStats();
  const balanceSteps = getBalanceSteps();
  const atlasCalculations = getUnifiedATLASCalculations();
  const atlasStats = getATLASStats();
  
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
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="shrink-0"
          >
            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent className="pt-0">
        {/* ATLAS Summary Section */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="p-4 rounded-lg bg-secondary/10 border border-secondary/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Players Analyzed</p>
                <p className="text-lg font-semibold text-foreground">{atlasStats.playersAnalyzed}</p>
              </div>
              <div className="p-2 rounded-lg bg-blue-500/10">
                <Users className="h-4 w-4 text-blue-500" />
              </div>
            </div>
          </div>

          <div className="p-4 rounded-lg bg-secondary/10 border border-secondary/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Balance Quality</p>
                <p className="text-lg font-semibold text-foreground">{getQualityLabel(qualityScore)}</p>
              </div>
              <div className="p-2 rounded-lg bg-primary/10">
                <TrendingUp className="h-4 w-4 text-primary" />
              </div>
            </div>
            <Progress value={qualityScore} className="mt-2 h-2" />
          </div>
          
          <div className="p-4 rounded-lg bg-secondary/10 border border-secondary/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Max Difference</p>
                <p className="text-lg font-semibold text-foreground">{maxPointDifference} pts</p>
              </div>
              <div className="p-2 rounded-lg bg-orange-500/10">
                <Target className="h-4 w-4 text-orange-500" />
              </div>
            </div>
          </div>
          
          <div className="p-4 rounded-lg bg-secondary/10 border border-secondary/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg Difference</p>
                <p className="text-lg font-semibold text-foreground">{Math.round(avgPointDifference)} pts</p>
              </div>
              <div className="p-2 rounded-lg bg-green-500/10">
                <BarChart3 className="h-4 w-4 text-green-500" />
              </div>
            </div>
          </div>
        </div>

        {/* Team Point Distribution */}
        {finalTeamStats.length > 0 && (
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
              <Users className="h-4 w-4" />
              Team Point Distribution
            </h3>
            <div className="space-y-2">
              {finalTeamStats.map((team, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-secondary/5 rounded-lg border border-secondary/10">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full bg-primary" style={{ backgroundColor: `hsl(${index * 120}, 60%, 50%)` }} />
                    <span className="font-medium text-foreground">{team.name}</span>
                    <Badge variant="outline" className="text-xs">
                      {team.playerCount} players
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-muted-foreground">
                      {Math.round(team.avgPoints)} avg
                    </span>
                    <span className="font-semibold text-foreground">
                      {team.totalPoints} pts
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ATLAS Adaptive Weight Analysis - Unified Section */}
        {atlasCalculations.length > 0 && (
          <div className="mb-6">
            <div 
              className="flex items-center justify-between p-4 bg-secondary/5 rounded-lg border border-secondary/20 cursor-pointer hover:bg-secondary/10 transition-colors"
              onClick={() => setIsATLASExpanded(!isATLASExpanded)}
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-indigo-500/10">
                  <Brain className="h-4 w-4 text-indigo-500" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">ATLAS Adaptive Weight Analysis</h3>
                  <p className="text-sm text-muted-foreground">
                    Enhanced ranking calculations for {atlasCalculations.length} players • {atlasStats.balanceQuality} balance quality • {atlasStats.maxDifference}pts max difference
                  </p>
                </div>
              </div>
              {isATLASExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </div>
            
            {isATLASExpanded && (
              <div className="mt-4 space-y-3">
                {atlasCalculations.map((calc, index) => {
                  // Find matching player name from balance steps
                  const matchingStep = balanceSteps.find(step => step.player.id === calc.userId);
                  const playerName = matchingStep?.player.discord_username || matchingStep?.player.name || `Player ${index + 1}`;
                  const playerRank = matchingStep?.player.rank || calc.calculation.currentRank || 'Unknown';
                  
                  return (
                    <div key={calc.userId || index} className="p-4 bg-card/30 rounded-lg border border-secondary/10">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium text-foreground">{playerName}</h4>
                          <Badge variant="outline" className="text-xs">
                            {playerRank}
                          </Badge>
                          <Badge variant="secondary" className="text-xs">
                            {calc.calculation.finalPoints || calc.calculation.calculatedAdaptiveWeight} pts
                          </Badge>
                        </div>
                        {calc.calculation.isEliteTier && (
                          <Badge variant="destructive" className="text-xs">
                            Elite Tier
                          </Badge>
                        )}
                      </div>
                      
                      <div className="space-y-2">
                        {/* Enhanced reasoning with breakdown */}
                        <div className="text-sm bg-secondary/5 p-3 rounded border border-secondary/10">
                          <div className="font-medium text-foreground mb-1">Calculation Breakdown:</div>
                          <div className="text-muted-foreground">
                            {generateEnhancedReasoning(calc)}
                          </div>
                        </div>
                        
                        {/* Evidence factors as badges */}
                        {calc.calculation.evidenceFactors && calc.calculation.evidenceFactors.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {calc.calculation.evidenceFactors.map((factor, idx) => (
                              <Badge key={idx} variant="outline" className="text-xs">
                                {factor}
                              </Badge>
                            ))}
                          </div>
                        )}
                        
                        {/* Tournament achievements */}
                        {calc.calculation.tournamentsWon && calc.calculation.tournamentsWon > 0 && (
                          <div className="flex items-center gap-2 text-sm p-2 bg-yellow-500/5 rounded border border-yellow-500/20">
                            <Trophy className="h-3 w-3 text-yellow-500" />
                            <span className="text-foreground">
                              {calc.calculation.tournamentsWon} tournament win{calc.calculation.tournamentsWon !== 1 ? 's' : ''}
                              {calc.calculation.tournamentBonus && (
                                <span className="text-green-400 ml-1">+{calc.calculation.tournamentBonus} bonus pts</span>
                              )}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Balance Assignment Steps */}
        {balanceSteps.length > 0 && (
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
              <Target className="h-4 w-4" />
              Balance Assignment Steps ({balanceSteps.length} players)
            </h3>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {balanceSteps.map((step, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-secondary/5 rounded-lg border border-secondary/10">
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center">
                      <span className="text-xs font-medium text-primary">{step.step || step.round || index + 1}</span>
                    </div>
                    <div>
                      <div className="font-medium text-foreground">
                        {step.player.discord_username || step.player.name}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {step.player.rank} • {step.player.points} pts
                        {step.player.source && (
                          <span className="ml-1">• {step.player.source}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium text-foreground">
                      Team {(step.assignedTeam !== undefined ? step.assignedTeam + 1 : step.assignedTo) || 'TBD'}
                    </div>
                    <div className="text-xs text-muted-foreground max-w-xs truncate">
                      {step.reasoning}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Swap Suggestions */}
        {balanceAnalysis.swapAnalysis && (
          <SwapSuggestionsSection swapAnalysis={balanceAnalysis.swapAnalysis} />
        )}
      </CardContent>
      )}
    </Card>
  );
};

export default TournamentBalanceTransparency;