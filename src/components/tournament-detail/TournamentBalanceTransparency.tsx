import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp, BarChart3, TrendingUp, Users, Trophy } from "lucide-react";
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
    const calculations = balanceAnalysis.adaptiveWeightCalculations || balanceAnalysis.adaptive_weight_calculations || [];
    // Remove duplicates based on userId
    const uniqueCalculations = calculations.filter((calc, index, self) => 
      index === self.findIndex(c => c.userId === calc.userId)
    );
    return uniqueCalculations;
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
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {adaptiveCalculations.map((calc, index) => {
                  // Find player in balance steps - try multiple ways to match
                  const stepPlayer = balanceSteps.find(step => 
                    step.player.id === calc.userId || 
                    step.player.id === calc.userId ||
                    (step.player as any).user_id === calc.userId
                  );
                  const playerName = stepPlayer?.player.discord_username || stepPlayer?.player.name || `Player ${index + 1}`;
                  return (
                    <div key={index} className="p-3 rounded-lg bg-muted/30 border border-border">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-foreground">
                          {playerName}
                        </span>
                        <Badge className="bg-blue-600 text-white text-xs">
                          {calc.calculation.calculatedAdaptiveWeight} pts (ADAPTIVE)
                        </Badge>
                      </div>
                      <div className="text-sm text-muted-foreground mb-2">
                        <strong>Calculation:</strong> {calc.calculation.calculationReasoning}
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-xs text-muted-foreground">
                        <div>
                          <span className="font-medium">Current:</span> {calc.calculation.currentRank || 'Unranked'} ({calc.calculation.currentRankPoints} pts)
                        </div>
                        <div>
                          <span className="font-medium">Peak:</span> {calc.calculation.peakRank || 'N/A'} ({calc.calculation.peakRankPoints} pts)
                        </div>
                        <div>
                          <span className="font-medium">Adaptive Factor:</span> {Math.round(calc.calculation.adaptiveFactor * 100)}%
                        </div>
                        <div>
                          <span className="font-medium">Source:</span> {calc.calculation.weightSource.replace('_', ' ')}
                        </div>
                        {calc.calculation.rankDecayFactor !== undefined && (
                          <div>
                            <span className="font-medium">Rank Decay:</span> {Math.round(calc.calculation.rankDecayFactor * 100)}%
                          </div>
                        )}
                        {calc.calculation.timeSincePeakDays && (
                          <div>
                            <span className="font-medium">Days Since Peak:</span> {calc.calculation.timeSincePeakDays}
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

        {/* Expandable Balance Steps */}
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
                  <div key={index} className="p-3 rounded-lg bg-muted/30 border border-border">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
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
                        <p className="text-xs text-muted-foreground">
                          Assigned to <span className="font-medium text-foreground">{assignedTo}</span>
                        </p>
                        <p className="text-xs text-muted-foreground">{step.reasoning}</p>
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