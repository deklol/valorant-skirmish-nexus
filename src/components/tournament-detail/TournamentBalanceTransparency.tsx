import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp, BarChart3, TrendingUp, Users, Trophy } from "lucide-react";
import { useState } from "react";
import { Team } from "@/types/tournamentDetail";

interface BalanceStep {
  round: number;
  player: {
    name: string;
    rank: string;
    points: number;
  };
  assignedTo: string;
  reasoning: string;
  teamStates: Array<{
    name: string;
    totalPoints: number;
    playerCount: number;
  }>;
}

interface BalanceAnalysis {
  qualityScore: number;
  maxPointDifference: number;
  avgPointDifference: number;
  balanceSteps: BalanceStep[];
  finalTeamStats: Array<{
    name: string;
    totalPoints: number;
    playerCount: number;
    avgPoints: number;
  }>;
  method: string;
  timestamp: string;
}

interface TournamentBalanceTransparencyProps {
  balanceAnalysis: BalanceAnalysis;
  teams: Team[];
}

const TournamentBalanceTransparency = ({ balanceAnalysis, teams }: TournamentBalanceTransparencyProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
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
              <p className="text-sm text-muted-foreground">Auto-balanced using {balanceAnalysis.method}</p>
            </div>
          </div>
          <Badge 
            variant="outline" 
            className={`px-3 py-1 ${getQualityColor(balanceAnalysis.qualityScore)}`}
          >
            {getQualityLabel(balanceAnalysis.qualityScore)} ({balanceAnalysis.qualityScore}%)
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
            <Progress value={balanceAnalysis.qualityScore} className="h-2" />
            <p className="text-xs text-muted-foreground">{balanceAnalysis.qualityScore}% balanced</p>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium text-foreground">Max Point Difference</span>
            </div>
            <div className="text-lg font-semibold text-foreground">{balanceAnalysis.maxPointDifference}</div>
            <p className="text-xs text-muted-foreground">Between strongest/weakest teams</p>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Trophy className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium text-foreground">Avg Difference</span>
            </div>
            <div className="text-lg font-semibold text-foreground">{balanceAnalysis.avgPointDifference.toFixed(1)}</div>
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
            {balanceAnalysis.finalTeamStats
              .sort((a, b) => b.totalPoints - a.totalPoints)
              .map((team, index) => {
                const maxPoints = Math.max(...balanceAnalysis.finalTeamStats.map(t => t.totalPoints));
                const percentage = (team.totalPoints / maxPoints) * 100;
                
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

        {/* Expandable Balance Steps */}
        <div className="border-t border-border pt-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="w-full flex items-center justify-between p-2 h-auto"
          >
            <span className="text-sm font-medium text-foreground">
              View Balance Assignment Steps ({balanceAnalysis.balanceSteps.length} steps)
            </span>
            {isExpanded ? (
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            )}
          </Button>
          
          {isExpanded && (
            <div className="mt-4 space-y-3 max-h-96 overflow-y-auto">
              {balanceAnalysis.balanceSteps.map((step, index) => (
                <div key={index} className="p-3 rounded-lg bg-muted/30 border border-border">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          Round {step.round}
                        </Badge>
                        <span className="text-sm font-medium text-foreground">
                          {step.player.name}
                        </span>
                        <Badge variant="secondary" className="text-xs">
                          {step.player.rank} ({step.player.points}pts)
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Assigned to <span className="font-medium text-foreground">{step.assignedTo}</span>
                      </p>
                      <p className="text-xs text-muted-foreground">{step.reasoning}</p>
                    </div>
                  </div>
                </div>
              ))}
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