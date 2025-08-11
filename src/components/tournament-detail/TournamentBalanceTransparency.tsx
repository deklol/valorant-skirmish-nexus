import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp, BarChart3, TrendingUp, Users, Trophy, Target, Brain, Play, Pause, RefreshCw } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { Team } from "@/types/tournamentDetail";
import SwapSuggestionsSection from "./SwapSuggestionsSection";
import { useRecentTournamentWinners } from "@/hooks/useRecentTournamentWinners";
import { RANK_POINT_MAPPING } from "@/utils/rankingSystem";
import { EVIDENCE_CONFIG } from "@/utils/evidenceBasedWeightSystem";

// Rank configuration with emojis and colors
const RANK_CONFIG = {
  'Iron 1': { emoji: '⬛', primary: '#4A4A4A', accent: '#7E7E7E', skill: 'Low Skilled' },
  'Iron 2': { emoji: '⬛', primary: '#4A4A4A', accent: '#7E7E7E', skill: 'Low Skilled' },
  'Iron 3': { emoji: '⬛', primary: '#4A4A4A', accent: '#7E7E7E', skill: 'Low Skilled' },
  'Bronze 1': { emoji: '🟫', primary: '#A97142', accent: '#C28E5C', skill: 'Low Skilled' },
  'Bronze 2': { emoji: '🟫', primary: '#A97142', accent: '#C28E5C', skill: 'Low Skilled' },
  'Bronze 3': { emoji: '🟫', primary: '#A97142', accent: '#C28E5C', skill: 'Low Skilled' },
  'Silver 1': { emoji: '⬜', primary: '#C0C0C0', accent: '#D8D8D8', skill: 'Medium Skilled' },
  'Silver 2': { emoji: '⬜', primary: '#C0C0C0', accent: '#D8D8D8', skill: 'Medium Skilled' },
  'Silver 3': { emoji: '⬜', primary: '#C0C0C0', accent: '#D8D8D8', skill: 'Medium Skilled' },
  'Gold 1': { emoji: '🟨', primary: '#FFD700', accent: '#FFEA8A', skill: 'Medium Skilled' },
  'Gold 2': { emoji: '🟨', primary: '#FFD700', accent: '#FFEA8A', skill: 'Medium Skilled' },
  'Gold 3': { emoji: '🟨', primary: '#FFD700', accent: '#FFEA8A', skill: 'Medium Skilled' },
  'Platinum 1': { emoji: '🟦', primary: '#5CA3E4', accent: '#B3DAFF', skill: 'High Skilled' },
  'Platinum 2': { emoji: '🟦', primary: '#5CA3E4', accent: '#B3DAFF', skill: 'High Skilled' },
  'Platinum 3': { emoji: '🟦', primary: '#5CA3E4', accent: '#B3DAFF', skill: 'High Skilled' },
  'Diamond 1': { emoji: '🟪', primary: '#8d64e2', accent: '#B3DAFF', skill: 'High Skilled' },
  'Diamond 2': { emoji: '🟪', primary: '#8d64e2', accent: '#B3DAFF', skill: 'High Skilled' },
  'Diamond 3': { emoji: '🟪', primary: '#8d64e2', accent: '#B3DAFF', skill: 'High Skilled' },
  'Ascendant 1': { emoji: '🟩', primary: '#84FF6F', accent: '#B6FFA8', skill: 'Elite Skilled' },
  'Ascendant 2': { emoji: '🟩', primary: '#84FF6F', accent: '#B6FFA8', skill: 'Elite Skilled' },
  'Ascendant 3': { emoji: '🟩', primary: '#84FF6F', accent: '#B6FFA8', skill: 'Elite Skilled' },
  'Immortal 1': { emoji: '🟥', primary: '#A52834', accent: '#D24357', skill: 'Elite Skilled' },
  'Immortal 2': { emoji: '🟥', primary: '#A52834', accent: '#D24357', skill: 'Elite Skilled' },
  'Immortal 3': { emoji: '🟥', primary: '#A52834', accent: '#D24357', skill: 'Elite Skilled' },
  'Radiant': { emoji: '✨', primary: '#FFF176', accent: '#FFFFFF', skill: 'Elite Skilled' },
  'Unrated': { emoji: '❓', primary: '#9CA3AF', accent: '#D1D5DB', skill: 'Unknown' },
  'Unranked': { emoji: '❓', primary: '#9CA3AF', accent: '#D1D5DB', skill: 'Unknown' }
};

// Helper functions for rank styling
const getRankInfo = (rank: string) => {
  return RANK_CONFIG[rank] || RANK_CONFIG['Unranked'];
};

interface BalanceStep {
  step?: number;
  round?: number;
  player: {
    id?: string;
    name?: string;
    discord_username?: string;
    rank: string;
    points: number;
    source?: string;
    evidenceWeight?: number;
    evidenceReasoning?: string;
  };
  assignedTo?: string;
  assignedTeam?: number;
  reasoning: string;
  teamStates?: Array<{ name: string; totalPoints: number; playerCount: number; }>;
  teamStatesAfter?: Array<{ teamIndex: number; totalPoints: number; playerCount: number; }>;
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
    finalPoints?: number;
    tournamentsWon?: number;
    evidenceFactors?: string[];
    tournamentBonus?: number;
    perWinBonus?: number;
    basePoints?: number;
    rankDecayApplied?: number;
    isEliteTier?: boolean;
    rankSource?: 'current' | 'peak' | 'manual' | 'default';
    bonusBreakdown?: { tournamentWins?: number; recentWinBonus?: number; eliteWinnerBonus?: number; };
  };
}

interface SwapAnalysis {
  totalSuggestionsConsidered: number;
  strategiesAttempted: string[];
  successfulSwaps: any[];
  rejectedSwaps: any[];
  finalOutcome: 'improved' | 'no_improvement' | 'fallback_used';
  overallImprovement: number;
}

interface BalanceAnalysis {
  qualityScore?: number;
  maxPointDifference?: number;
  avgPointDifference?: number;
  balanceSteps?: BalanceStep[];
  finalTeamStats?: Array<{ name: string; totalPoints: number; playerCount: number; avgPoints: number; }>;
  final_balance?: FinalBalance;
  balance_steps?: BalanceStep[];
  teams_created?: Array<{ name: string; members: Array<any>; total_points: number; seed: number; }>;
  atlasCalculations?: UnifiedATLASCalculation[];
  adaptiveWeightCalculations?: UnifiedATLASCalculation[];
  adaptive_weight_calculations?: UnifiedATLASCalculation[];
  evidenceCalculations?: UnifiedATLASCalculation[];
  swapAnalysis?: SwapAnalysis;
  method: string;
  timestamp: string;
}

interface TournamentBalanceTransparencyProps {
  balanceAnalysis: BalanceAnalysis;
  teams: Team[];
}

// ✅ NEW COMPONENT: BalanceStepAnimator (No external dependencies)
const BalanceStepAnimator = ({ steps, teams: initialTeams }: { steps: BalanceStep[], teams: any[] }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentStep, setCurrentStep] = useState(-1);
  const [animatedTeams, setAnimatedTeams] = useState<any[][]>(() => initialTeams.map(() => []));
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const teamNames = initialTeams.map(t => t.name);

  useEffect(() => {
    if (isPlaying && currentStep < steps.length - 1) {
      intervalRef.current = setTimeout(() => {
        setCurrentStep(prev => prev + 1);
      }, 500);
    } else if (currentStep >= steps.length - 1) {
      setIsPlaying(false);
    }
    return () => { if (intervalRef.current) clearTimeout(intervalRef.current); };
  }, [isPlaying, currentStep, steps.length]);

  useEffect(() => {
    if (currentStep === -1) {
      setAnimatedTeams(initialTeams.map(() => []));
      return;
    }
    const step = steps[currentStep];
    if (!step || typeof step.assignedTeam === 'undefined') return;

    setAnimatedTeams(prev => {
      const newTeams = prev.map(t => [...t]);
      if (newTeams[step.assignedTeam] && !newTeams[step.assignedTeam].some(p => p.player.id === step.player.id)) {
        newTeams[step.assignedTeam].push(step);
      }
      return newTeams;
    });
  }, [currentStep, steps, initialTeams]);

  const handlePlayPause = () => {
    if (currentStep >= steps.length - 1) {
      setCurrentStep(-1);
      setIsPlaying(true);
    } else {
      setIsPlaying(!isPlaying);
    }
  };

  const handleReset = () => {
    setIsPlaying(false);
    setCurrentStep(-1);
  };

  return (
    <div className="mb-6">
      <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
        <Target className="h-4 w-4" />
        Balance Assignment Steps ({steps.length} players)
      </h3>
      <div className="p-4 bg-secondary/10 border border-secondary/20 rounded-lg">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {animatedTeams.map((team, index) => (
            <div key={index} className="bg-slate-800/50 p-3 rounded-md min-h-[200px] flex flex-col">
              <h4 className="font-bold text-sm text-white mb-2 border-b border-slate-700 pb-2">{teamNames[index] || `Team ${index + 1}`}</h4>
              <div className="space-y-1 flex-grow">
                {team.map((step) => (
                  <div key={step.player.id} className="text-xs bg-slate-700/50 p-1.5 rounded animate-fade-in">
                    <p className="font-medium text-slate-200 truncate">{step.player.discord_username || step.player.name}</p>
                    <p className="text-slate-400">{step.player.points} pts • {step.player.rank}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-center gap-4 mt-4 pt-4 border-t border-secondary/20">
          <Button onClick={handlePlayPause} variant="outline" size="sm" className="w-28">
            {isPlaying ? <Pause className="h-4 w-4 mr-2" /> : <Play className="h-4 w-4 mr-2" />}
            {isPlaying ? 'Pause' : (currentStep >= steps.length - 1 ? 'Replay' : 'Play')}
          </Button>
          <Button onClick={handleReset} variant="ghost" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Reset
          </Button>
        </div>
      </div>
    </div>
  );
};

const TournamentBalanceTransparency = ({ balanceAnalysis, teams }: TournamentBalanceTransparencyProps) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isATLASExpanded, setIsATLASExpanded] = useState(false);
  const [hasInteractedWithATLAS, setHasInteractedWithATLAS] = useState(false);
  
  const { recentWinnerIds } = useRecentTournamentWinners();
  
  const getQualityScore = () => {
    if (balanceAnalysis.qualityScore !== undefined) return balanceAnalysis.qualityScore;
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

  const getMaxPointDifference = () => balanceAnalysis.maxPointDifference ?? balanceAnalysis.final_balance?.maxPointDifference ?? 0;
  const getAvgPointDifference = () => {
    if (balanceAnalysis.avgPointDifference !== undefined) return balanceAnalysis.avgPointDifference;
    if (balanceAnalysis.final_balance) return balanceAnalysis.final_balance.maxPointDifference / 2;
    return 0;
  };

  const getFinalTeamStats = () => {
    if (balanceAnalysis.finalTeamStats) return balanceAnalysis.finalTeamStats;
    if (balanceAnalysis.teams_created) {
      return balanceAnalysis.teams_created.map(team => ({
        name: team.name,
        totalPoints: team.total_points,
        playerCount: team.members.length,
        avgPoints: team.members.length > 0 ? team.total_points / team.members.length : 0
      }));
    }
    return [];
  };

  const getBalanceSteps = () => balanceAnalysis.balanceSteps ?? balanceAnalysis.balance_steps ?? [];

  const getUnifiedATLASCalculations = () => {
    const calculations = balanceAnalysis.atlasCalculations || 
                         balanceAnalysis.adaptiveWeightCalculations || 
                         balanceAnalysis.adaptive_weight_calculations || 
                         balanceAnalysis.evidenceCalculations || 
                         [];
    
    if (calculations.length > 0) {
      const uniqueCalculations = calculations.filter((calc, index, self) => index === self.findIndex(c => c.userId === calc.userId));
      const balanceSteps = getBalanceSteps();
      const balancedPlayerIds = balanceSteps.map(step => step.player.id);
      return uniqueCalculations
        .filter(calc => calc.userId && balancedPlayerIds.includes(calc.userId))
        .map(calc => ({ ...calc, calculation: { ...calc.calculation, perWinBonus: calc.calculation.perWinBonus || 15 } }));
    }
    return [];
  };
  
  const qualityScore = getQualityScore();
  const maxPointDifference = getMaxPointDifference();
  const avgPointDifference = getAvgPointDifference();
  const finalTeamStats = getFinalTeamStats();
  const balanceSteps = getBalanceSteps();
  const atlasCalculations = getUnifiedATLASCalculations();
  const atlasStats = {
    playersAnalyzed: atlasCalculations.length,
    balanceQuality: balanceAnalysis.final_balance?.balanceQuality || 'N/A',
    maxDifference: maxPointDifference
  };

  return (
    <Card className="border-secondary/20 bg-card/50 backdrop-blur-sm">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10"><BarChart3 className="h-5 w-5 text-primary" /></div>
            <div>
              <CardTitle className="text-lg text-foreground">Balance Analysis</CardTitle>
              <p className="text-sm text-muted-foreground">
                Auto-balanced using {balanceAnalysis.method}
                {balanceAnalysis.method?.includes('Adaptive') && (<span className="ml-2 text-blue-400 font-medium">• Enhanced Weighting</span>)}
              </p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setIsExpanded(!isExpanded)} className="shrink-0">
            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent className="pt-0">
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
            <div className="p-4 rounded-lg bg-secondary/10 border border-secondary/20">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Players Analyzed</p>
                  <p className="text-lg font-semibold text-foreground">{atlasStats.playersAnalyzed}</p>
                </div>
                <div className="p-2 rounded-lg bg-blue-500/10"><Users className="h-4 w-4 text-blue-500" /></div>
              </div>
            </div>
            <div className="p-4 rounded-lg bg-secondary/10 border border-secondary/20">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Balance Quality</p>
                  <p className="text-lg font-semibold text-foreground">{atlasStats.balanceQuality}</p>
                </div>
                <div className="p-2 rounded-lg bg-primary/10"><TrendingUp className="h-4 w-4 text-primary" /></div>
              </div>
              <Progress value={qualityScore} className="mt-2 h-2" />
            </div>
            <div className="p-4 rounded-lg bg-secondary/10 border border-secondary/20">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Max Difference</p>
                  <p className="text-lg font-semibold text-foreground">{maxPointDifference} pts</p>
                </div>
                <div className="p-2 rounded-lg bg-orange-500/10"><Target className="h-4 w-4 text-orange-500" /></div>
              </div>
            </div>
            <div className="p-4 rounded-lg bg-secondary/10 border border-secondary/20">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Avg Difference</p>
                  <p className="text-lg font-semibold text-foreground">{Math.round(avgPointDifference)} pts</p>
                </div>
                <div className="p-2 rounded-lg bg-green-500/10"><BarChart3 className="h-4 w-4 text-green-500" /></div>
              </div>
            </div>
          </div>

          {finalTeamStats.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2"><Users className="h-4 w-4" />Team Point Distribution</h3>
              <div className="space-y-2">
                {finalTeamStats.map((team, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-secondary/5 rounded-lg border border-secondary/10">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full bg-primary" style={{ backgroundColor: `hsl(${index * 120}, 60%, 50%)` }} />
                      <span className="font-medium text-foreground">{team.name}</span>
                      <Badge variant="outline" className="text-xs">{team.playerCount} players</Badge>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-muted-foreground">{Math.round(team.avgPoints)} avg</span>
                      <span className="font-semibold text-foreground">{team.totalPoints} pts</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {atlasCalculations.length > 0 && (
            <div className="mb-6">
              <div className={`flex items-center justify-between p-4 bg-secondary/5 rounded-xl cursor-pointer hover:bg-secondary/10 transition-all duration-300 ${!isATLASExpanded && !hasInteractedWithATLAS ? 'border-2 border-blue-400/40 shadow-[0_0_20px_rgba(59,130,246,0.2)] animate-breathe-slow' : 'border border-secondary/20'}`}
                onClick={() => { setIsATLASExpanded(!isATLASExpanded); setHasInteractedWithATLAS(true); }}>
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-indigo-500/10"><Brain className="h-4 w-4 text-indigo-500" /></div>
                  <div>
                    <h3 className="font-semibold text-foreground">ATLAS Adaptive Weight Analysis</h3>
                    <p className="text-sm text-muted-foreground">Enhanced ranking calculations for {atlasCalculations.length} players</p>
                  </div>
                </div>
                {isATLASExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </div>
              
              {isATLASExpanded && (
                <div className="mt-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
                    {atlasCalculations.map((calc, index) => {
                      const matchingStep = balanceSteps.find(step => step.player.id === calc.userId);
                      const playerName = matchingStep?.player.discord_username || `Player ${index + 1}`;
                      const playerRank = matchingStep?.player.rank || calc.calculation.currentRank || 'Unknown';
                      const finalPoints = calc.calculation.finalPoints || 0;
                      const tournamentWins = calc.calculation.tournamentsWon || 0;
                      const tournamentBonus = calc.calculation.tournamentBonus || 0;
                      const isRecentWinner = recentWinnerIds.has(calc.userId);

                      return (
                        <div key={calc.userId || index} className={`group relative p-4 sm:p-6 bg-gradient-to-br from-card to-card/60 rounded-xl sm:rounded-2xl border transition-all duration-300 hover:shadow-xl hover:scale-[1.02] ${isRecentWinner ? 'border-amber-400/50' : 'border-border/20'}`}>
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <h4 className="font-bold text-foreground text-sm sm:text-base">{playerName}</h4>
                              <Badge variant="outline" style={{ color: getRankInfo(playerRank).primary, borderColor: getRankInfo(playerRank).primary + '60', backgroundColor: getRankInfo(playerRank).primary + '10' }}>
                                {getRankInfo(playerRank).emoji} {playerRank}
                              </Badge>
                            </div>
                            <div className="text-right">
                              <div className="text-xl sm:text-2xl font-black text-primary">{finalPoints}</div>
                              <div className="text-xs text-muted-foreground">POINTS</div>
                            </div>
                          </div>
                          {tournamentWins > 0 && (
                            <div className="mt-4 p-4 bg-gradient-to-r from-amber-500/10 to-yellow-500/5 rounded-xl border border-amber-400/30">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <Trophy className="h-4 w-4 text-amber-600" />
                                  <span className="text-sm font-bold text-amber-800">{tournamentWins} Tournament Win{tournamentWins > 1 ? 's' : ''}</span>
                                </div>
                                <Badge className="text-sm bg-emerald-500/20 text-emerald-700 border-emerald-500/30 font-bold">+{tournamentBonus}pts</Badge>
                              </div>
                            </div>
                          )}
                          <div className="mt-4 p-4 bg-gradient-to-br from-muted/20 to-muted/5 rounded-xl border border-muted/30">
                            <div className="text-sm font-bold text-foreground mb-3 flex items-center gap-2"><Brain className="h-4 w-4" />Calculation Breakdown</div>
                            <div className="text-sm text-muted-foreground leading-relaxed space-y-1.5">
                              {calc.calculation.calculationReasoning.split('\n').map((line: string, idx: number) => (<div key={idx}>{line}</div>))}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ✅ REPLACED: Static list is now the animator component */}
          {balanceSteps.length > 0 && finalTeamStats.length > 0 ? (
            <BalanceStepAnimator steps={balanceSteps} teams={finalTeamStats} />
          ) : (
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                <Target className="h-4 w-4" />
                Balance Assignment Steps ({balanceSteps.length} players)
              </h3>
              <div className="text-center text-slate-400 text-sm py-8 bg-secondary/10 rounded-lg">
                No balancing steps to display.
              </div>
            </div>
          )}

          {balanceAnalysis.swapAnalysis && (
            <SwapSuggestionsSection swapAnalysis={balanceAnalysis.swapAnalysis} />
          )}
        </CardContent>
      )}
    </Card>
  );
};

export default TournamentBalanceTransparency;
