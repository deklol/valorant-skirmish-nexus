import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"; // Import Tooltip components
import { ChevronDown, ChevronUp, BarChart3, TrendingUp, Users, Trophy, Target, Brain, Play, Pause, RotateCcw, ArrowRight, CheckCircle2, Crown, ArrowUp, ArrowDown, ShieldQuestion } from "lucide-react";
import { useEffect, useMemo, useState, useRef } from "react";
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
  'Silver 1': { emoji: '⬜', primary: '#C0C0C0', accent: '#D8D8D8', skill: 'Low Skilled' },
  'Silver 2': { emoji: '⬜', primary: '#C0C0C0', accent: '#D8D8D8', skill: 'Low Skilled' },
  'Silver 3': { emoji: '⬜', primary: '#C0C0C0', accent: '#D8D8D8', skill: 'Low Skilled' },
  'Gold 1': { emoji: '🟨', primary: '#FFD700', accent: '#FFEA8A', skill: 'Low Skilled' },
  'Gold 2': { emoji: '🟨', primary: '#FFD700', accent: '#FFEA8A', skill: 'Low Skilled' },
  'Gold 3': { emoji: '🟨', primary: '#FFD700', accent: '#FFEA8A', skill: 'Low Skilled' },
  'Platinum 1': { emoji: '🟦', primary: '#5CA3E4', accent: '#B3DAFF', skill: 'Medium Skilled' },
  'Platinum 2': { emoji: '🟦', primary: '#5CA3E4', accent: '#B3DAFF', skill: 'Medium Skilled' },
  'Platinum 3': { emoji: '🟦', primary: '#5CA3E4', accent: '#B3DAFF', skill: 'Medium Skilled' },
  'Diamond 1': { emoji: '🟪', primary: '#8d64e2', accent: '#B3DAFF', skill: 'Medium Skilled' },
  'Diamond 2': { emoji: '🟪', primary: '#8d64e2', accent: '#B3DAFF', skill: 'Medium Skilled' },
  'Diamond 3': { emoji: '🟪', primary: '#8d64e2', accent: '#B3DAFF', skill: 'Medium Skilled' },
  'Ascendant 1': { emoji: '🟩', primary: '#84FF6F', accent: '#B6FFA8', skill: 'Medium Skilled' },
  'Ascendant 2': { emoji: '🟩', primary: '#84FF6F', accent: '#B6FFA8', skill: 'Medium Skilled' },
  'Ascendant 3': { emoji: '🟩', primary: '#84FF6F', accent: '#B6FFA8', skill: 'Medium Skilled' },
  'Immortal 1': { emoji: '🟥', primary: '#A52834', accent: '#D24357', skill: 'Medium Skilled' },
  'Immortal 2': { emoji: '🟥', primary: '#A52834', accent: '#D24357', skill: 'High Skilled' },
  'Immortal 3': { emoji: '🟥', primary: '#A52834', accent: '#D24357', skill: 'High Skilled' },
  'Radiant': { emoji: '✨', primary: '#FFF176', accent: '#FFFFFF', skill: 'Elite Skilled' },
  'Unrated': { emoji: '❓', primary: '#9CA3AF', accent: '#D1D5DB', skill: 'Unknown' },
  'Unranked': { emoji: '❓', primary: '#9CA3AF', accent: '#D1D5DB', skill: 'Unknown' }
};

// Configuration for the skill tiers in the fairness graph
const SKILL_TIER_CONFIG = {
  'Elite Skilled': { color: '#ef4444', label: 'Elite' }, // Red-500
  'High Skilled': { color: '#8b5cf6', label: 'High' }, // Violet-500
  'Medium Skilled': { color: '#3b82f6', label: 'Medium' }, // Blue-500
  'Low Skilled': { color: '#22c55e', label: 'Low' }, // Green-500
  'Unknown': { color: '#a1a1aa', label: 'Unknown' } // Zinc-400
};
const SKILL_TIER_ORDER = ['Elite Skilled', 'High Skilled', 'Medium Skilled', 'Low Skilled', 'Unknown'];

// Helper functions for rank styling
const getRankInfo = (rank: string) => {
  return RANK_CONFIG[rank] || RANK_CONFIG['Unranked'];
};

const getSkillLevel = (rank: string) => {
  return getRankInfo(rank).skill;
};

// ... (rest of the interfaces: BalanceStep, FinalBalance, etc. remain the same)
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
    evidenceWeight?: number; // ATLAS evidence weight
    evidenceReasoning?: string; // ATLAS reasoning
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
    perWinBonus?: number; // ✅ ADDED: To hold the adaptive rate
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
  const safeTeams = teams || [];
  const safeBalanceAnalysis = balanceAnalysis || {};

  const teamCount = safeTeams.length > 0 ? safeTeams.length : 4;
  const [isExpanded, setIsExpanded] = useState(true); // Start expanded
  const [isATLASExpanded, setIsATLASExpanded] = useState(false);
  const [hasInteractedWithATLAS, setHasInteractedWithATLAS] = useState(false);
  const [isSwapExpanded, setIsSwapExpanded] = useState(false);
  const [isStepsExpanded, setIsStepsExpanded] = useState(false);
  const [isRankDistributionExpanded, setIsRankDistributionExpanded] = useState(false); // Collapsed by default

  const { recentWinnerIds } = useRecentTournamentWinners();
  
  // ... (rest of the helper functions: getQualityScore, getMaxPointDifference, etc. remain the same)
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
    // First try to get actual calculation data
    const calculations = balanceAnalysis.atlasCalculations || 
                         balanceAnalysis.adaptiveWeightCalculations || 
                         balanceAnalysis.adaptive_weight_calculations || 
                         balanceAnalysis.evidenceCalculations || 
                         [];
    
    // If we have calculation data, use it
    if (calculations.length > 0) {
      const uniqueCalculations = calculations.filter((calc, index, self) => 
        index === self.findIndex(c => c.userId === calc.userId)
      );
      
      const balanceSteps = getBalanceSteps();
      const balancedPlayerIds = balanceSteps.map(step => step.player.id);
      const balancedCalculations = uniqueCalculations.filter(calc => 
        balancedPlayerIds.includes(calc.userId)
      );
      
      // Map stored calculation structure to expected format
      return balancedCalculations.map(calc => {
        const storedCalc = calc.calculation as any; // Type assertion for stored structure
        return {
          userId: calc.userId,
          calculation: {
            currentRank: storedCalc.rank || 'Unranked',
            currentRankPoints: storedCalc.evidenceCalculation?.currentRankPoints || 0,
            peakRank: storedCalc.evidenceCalculation?.peakRank || storedCalc.rank || 'Unranked',
            peakRankPoints: storedCalc.evidenceCalculation?.peakRankPoints || 0,
            calculatedAdaptiveWeight: storedCalc.points || 0,
            adaptiveFactor: storedCalc.evidenceCalculation?.adaptiveFactor || 1.0,
            calculationReasoning: (storedCalc.evidenceCalculation?.calculationReasoning || `${storedCalc.rank || 'Unranked'} (${storedCalc.points || 0} points)`).replace(/Elite Tier Player \(300\+ points\)/g, 'Elite Tier Player (400+ points)'),
            weightSource: storedCalc.source || 'adaptive_weight',
            finalPoints: storedCalc.points || 0,
            tournamentsWon: storedCalc.evidenceCalculation?.tournamentsWon || 0,
            evidenceFactors: storedCalc.evidenceCalculation?.evidenceFactors || [],
            tournamentBonus: storedCalc.evidenceCalculation?.tournamentBonus || 0,
            perWinBonus: storedCalc.evidenceCalculation?.perWinBonus || 15, // ✅ ADDED: Map the per-win bonus with a safe fallback
            basePoints: storedCalc.evidenceCalculation?.basePoints || 0,
            rankDecayApplied: storedCalc.evidenceCalculation?.rankDecayApplied || 0,
            isEliteTier: (storedCalc.points || 0) >= 400
          }
        };
      });
    }
    
    // Generate ATLAS reasoning from balance steps evidence
    const balanceSteps = getBalanceSteps();
    const atlasCalculations = balanceSteps.map(step => {
      const currentRank = step.player.rank;
      const finalPoints = step.player.evidenceWeight || step.player.points || 0;
      
      // Reconstruct ATLAS reasoning based on evidence
      const reasoning = reconstructATLASReasoning(currentRank, finalPoints);
      
      return {
        userId: step.player.id || 'unknown',
        calculation: {
          currentRank: currentRank,
          currentRankPoints: reasoning.currentRankPoints,
          peakRank: reasoning.peakRank,
          peakRankPoints: reasoning.peakRankPoints,
          calculatedAdaptiveWeight: finalPoints,
          adaptiveFactor: reasoning.adaptiveFactor,
          calculationReasoning: reasoning.reasoning.replace(/Elite Tier Player \(300\+ points\)/g, 'Elite Tier Player (400+ points)'),
          weightSource: 'evidence_based',
          finalPoints: finalPoints,
          tournamentsWon: reasoning.tournamentsWon,
          evidenceFactors: reasoning.evidenceFactors,
          tournamentBonus: reasoning.tournamentBonus,
          basePoints: reasoning.basePoints,
          rankDecayApplied: reasoning.rankDecay,
          isEliteTier: finalPoints >= 400
        }
      };
    });
    
    return atlasCalculations;
  };

  // Reconstruct ATLAS reasoning based on current rank and final points
  const reconstructATLASReasoning = (currentRank: string, finalPoints: number) => {
  // Use shared rank mapping to avoid drift
  const currentRankPoints = RANK_POINT_MAPPING[currentRank] || 150;
    const pointDifference = finalPoints - currentRankPoints;
    
    let reasoning = '';
    let evidenceFactors: string[] = [];
    let peakRank = currentRank;
    let peakRankPoints = currentRankPoints;
    let basePoints = currentRankPoints;
    let tournamentBonus = 0;
    let tournamentsWon = 0;
    let rankDecay = 0;
    let adaptiveFactor = 1.0;
    
    // Analysis based on point difference
    if (currentRank === 'Unrated' && finalPoints > 400) {
      // Likely peaked at Radiant/Immortal
      peakRank = 'Radiant';
      peakRankPoints = 500;
      basePoints = 500;
      tournamentBonus = Math.max(0, finalPoints - 500);
      tournamentsWon = Math.floor(tournamentBonus / EVIDENCE_CONFIG.tournamentWinBonus);
      reasoning = `Peak Radiant (500 pts)`;
      evidenceFactors.push('Peak Rank: Radiant');
      evidenceFactors.push('Currently Unrated');
      if (tournamentBonus > 0) {
        evidenceFactors.push(`Tournament Winner Bonus: +${tournamentBonus} pts`);
        reasoning += ` + Tournament bonus (+${tournamentBonus} pts)`;
      }
    } else if (pointDifference > 50) {
      // Likely has tournament bonuses or peak rank boost
      tournamentBonus = pointDifference;
      tournamentsWon = Math.floor(tournamentBonus / EVIDENCE_CONFIG.tournamentWinBonus);
      basePoints = currentRankPoints;
      reasoning = `${currentRank} (${currentRankPoints} pts)`;
      evidenceFactors.push(`Current Rank: ${currentRank}`);
      if (tournamentBonus > 0) {
        evidenceFactors.push(`Tournament Winner Bonus: +${tournamentBonus} pts`);
        reasoning += ` + Tournament bonus (+${tournamentBonus} pts)`;
      }
    } else if (pointDifference < 0) {
      // Likely has rank decay from peak
      const possiblePeakPoints = finalPoints + Math.abs(pointDifference);
      const rankEntry = Object.entries(RANK_POINT_MAPPING).find(([_, pts]) => pts === possiblePeakPoints);
      peakRank = (rankEntry && rankEntry[0]) || currentRank;
      peakRankPoints = possiblePeakPoints;
      rankDecay = Math.abs(pointDifference);
      basePoints = peakRankPoints;
      adaptiveFactor = 0.7;
      reasoning = `Peak ${peakRank} (${peakRankPoints} pts) → Current ${currentRank}`;
      evidenceFactors.push(`Peak Rank: ${peakRank}`);
      evidenceFactors.push(`Current Rank: ${currentRank}`);
      evidenceFactors.push(`Rank Decay: -${rankDecay} pts`);
    } else {
      // Standard ranking
      reasoning = `${currentRank} (${currentRankPoints} pts)`;
      evidenceFactors.push(`Current Rank: ${currentRank}`);
      basePoints = currentRankPoints;
    }
    
    if (finalPoints >= 400) {
      evidenceFactors.push('🏆 Elite Tier Player (400+ points)');
    }
    
    reasoning += ` = ${finalPoints} pts total`;
    
    return {
      reasoning,
      evidenceFactors,
      currentRankPoints,
      peakRank,
      peakRankPoints,
      basePoints,
      tournamentBonus,
      tournamentsWon,
      rankDecay,
      adaptiveFactor
    };
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

  // Process data for the rank distribution chart
  const rankDistributionData = useMemo(() => {
    const teamsData = balanceAnalysis.teams_created || [];
    if (!teamsData.length) return [];

    return teamsData.map(team => {
      const rankCounts = {
        'Elite Skilled': 0,
        'High Skilled': 0,
        'Medium Skilled': 0,
        'Low Skilled': 0,
        'Unknown': 0,
      };

      team.members.forEach(member => {
        const skillLevel = getSkillLevel(member.rank);
        if (skillLevel in rankCounts) {
          rankCounts[skillLevel]++;
        }
      });

      return {
        name: team.name,
        playerCount: team.members.length,
        rankCounts: rankCounts,
      };
    });
  }, [balanceAnalysis.teams_created]);


  const qualityScore = getQualityScore();
  const maxPointDifference = getMaxPointDifference();
  const avgPointDifference = getAvgPointDifference();
  const finalTeamStats = getFinalTeamStats();
  const balanceSteps = getBalanceSteps();
  const atlasCalculations = getUnifiedATLASCalculations();
  const atlasStats = getATLASStats();

  const maxTotalPoints = useMemo(() => {
    if (finalTeamStats.length === 0) return 1;
    return Math.max(...finalTeamStats.map(team => team.totalPoints));
  }, [finalTeamStats]);
  
  // Assignment Simulator state and helpers (remains the same)
  const executedSwaps = useMemo(() => (balanceAnalysis.swapAnalysis?.successfulSwaps || []).filter(s => s.outcome === 'executed'), [balanceAnalysis.swapAnalysis]);
  const [isSimPlaying, setIsSimPlaying] = useState(false);
  const [simIndex, setSimIndex] = useState(0);
  const [swapIndex, setSwapIndex] = useState(0);
  const [simPhase, setSimPhase] = useState<'assign' | 'swaps' | 'done'>('assign');
const [simTeams, setSimTeams] = useState<{ id?: string; name: string; key: string; points?: number; assignedOrder?: number; originTeam?: number; movedFromTeam?: number; swapped?: boolean; isSub?: boolean; }[][]>(
    Array.from({ length: teamCount }, () => [])
  );

  // ... (rest of the simulator logic remains the same)
    const teamTotals = useMemo(() => simTeams.map(col => col.reduce((sum, p) => sum + (p.points || 0), 0)), [simTeams]);
  const prevTotalsRef = useRef<number[]>(Array(teamCount).fill(0));
  const teamDeltas = teamTotals.map((val, idx) => val - (prevTotalsRef.current[idx] ?? 0));
  useEffect(() => {
    prevTotalsRef.current = [...teamTotals];
  }, [teamTotals]);

  const parseTeamIndex = (step: BalanceStep): number | null => {
    if (typeof step.assignedTeam === 'number') return step.assignedTeam;
    if (typeof step.assignedTo === 'string') {
      const m = step.assignedTo.match(/(\d+)/);
      if (m) return Math.max(0, parseInt(m[1]) - 1);
    }
    return null;
  };

const applyAssignmentStep = (step: BalanceStep) => {
    const teamIdx = parseTeamIndex(step);
    const playerId = step.player.id || step.player.discord_username || step.player.name || `anon-${Math.random()}`;
    const playerName = step.player.discord_username || step.player.name || 'Unknown';
    const order = (step.step || step.round || simIndex + 1);
    const points = (step.player as any).evidenceWeight ?? step.player.points ?? 0;
    setSimTeams(prev => {
      const next = prev.map(col => col.filter(p => p.id !== playerId)); // remove duplicates
      if (teamIdx !== null && teamIdx >= 0 && teamIdx < teamCount) {
        next[teamIdx] = [
          ...next[teamIdx],
          { id: playerId, name: playerName, key: `${playerId}-${simIndex}`, assignedOrder: order, originTeam: teamIdx, points }
        ];
      }
      return next;
    });
  };

const performSwap = (swap: SwapSuggestion) => {
    const p1Name = swap.player1.name;
    const p2Name = swap.player2?.name;
    setSimTeams(prev => {
      const next = prev.map(col => [...col]);
      const findIdx = (name: string) => {
        for (let t = 0; t < teamCount; t++) {
          const idx = next[t].findIndex(p => p.name === name);
          if (idx !== -1) return { t, idx } as const;
        }
        return null;
      };
if (p2Name) {
        const a = findIdx(p1Name);
        const b = findIdx(p2Name);
        if (a && b) {
          const aObj = next[a.t][a.idx];
          const bObj = next[b.t][b.idx];
          // Swap with annotations
          next[a.t][a.idx] = { ...bObj, movedFromTeam: b.t, swapped: true, key: `${bObj.id}-swap-${swapIndex}` };
          next[b.t][b.idx] = { ...aObj, movedFromTeam: a.t, swapped: true, key: `${aObj.id}-swap-${swapIndex}` };
        } else if (a && swap.player2?.currentTeam !== undefined) {
          const target = Math.min(3, swap.player2.currentTeam);
          const obj = next[a.t].splice(a.idx, 1)[0];
          next[target].push({ ...obj, movedFromTeam: a.t, isSub: true, key: `${obj.id}-swap-${swapIndex}` });
        }
      } else if (swap.targetTeam !== undefined) {
        const a = findIdx(p1Name);
        const target = Math.min(3, swap.targetTeam);
        if (a) {
          const obj = next[a.t].splice(a.idx, 1)[0];
          next[target].push({ ...obj, movedFromTeam: a.t, isSub: true, key: `${obj.id}-swap-${swapIndex}` });
        }
      }
      return next;
    });
  };

  useEffect(() => {
    if (!isSimPlaying) return;
    const timer = setTimeout(() => {
      if (simPhase === 'assign') {
        if (simIndex < balanceSteps.length) {
          applyAssignmentStep(balanceSteps[simIndex]);
          setSimIndex(i => i + 1);
        } else {
          if (executedSwaps.length > 0) {
            setSimPhase('swaps');
          } else {
            setSimPhase('done');
            setIsSimPlaying(false);
          }
        }
      } else if (simPhase === 'swaps') {
        if (swapIndex < executedSwaps.length) {
          performSwap(executedSwaps[swapIndex]);
          setSwapIndex(i => i + 1);
        } else {
          setSimPhase('done');
          setIsSimPlaying(false);
        }
      }
    }, 700);
    return () => clearTimeout(timer);
  }, [isSimPlaying, simPhase, simIndex, swapIndex, balanceSteps, executedSwaps]);

const resetSimulator = () => {
    setSimTeams(Array.from({ length: teamCount }, () => []));
    setSimIndex(0);
    setSwapIndex(0);
    setSimPhase('assign');
    setIsSimPlaying(false);
    prevTotalsRef.current = Array(teamCount).fill(0);
  };

  const getQualityLabel = (score: number) => {
    if (score >= 85) return "Excellent";
    if (score >= 70) return "Good";
    return "Fair";
  };
    const isCaptain = (teamIdx: number, playerName?: string) => {
    const team = teams[teamIdx];
    if (!team?.team_members) return false;
    return team.team_members.some(m => m.is_captain && m.users?.discord_username === playerName);
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
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
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

        {/* Rank Fairness Distribution Chart */}
        {rankDistributionData.length > 0 && (
          <div className="mb-6">
            <div
              className="flex items-center justify-between p-4 bg-secondary/5 rounded-xl cursor-pointer hover:bg-secondary/10 transition-colors duration-300 border border-secondary/20"
              onClick={() => setIsRankDistributionExpanded(!isRankDistributionExpanded)}
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-indigo-500/10">
                  <ShieldQuestion className="h-4 w-4 text-indigo-500" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">Rank Fairness Distribution</h3>
                  <p className="text-sm text-muted-foreground">Visual breakdown of skill tiers across teams</p>
                </div>
              </div>
              {isRankDistributionExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </div>

            {isRankDistributionExpanded && (
              <TooltipProvider>
                <div className="mt-4 p-4 bg-secondary/10 rounded-lg border border-secondary/20 animate-in fade-in duration-500">
                  <div className="flex justify-around items-end w-full h-48 border-b border-dashed border-border/50 pb-2">
                    {rankDistributionData.map((team, teamIdx) => (
                      <div key={teamIdx} className="h-full w-16 flex flex-col justify-end items-center group">
                        <div className="relative w-10 h-full flex flex-col justify-end rounded-t-md overflow-hidden bg-secondary/50">
                          {SKILL_TIER_ORDER.map(tier => {
                            const count = team.rankCounts[tier];
                            if (count === 0) return null;
                            const height = (count / team.playerCount) * 100;
                            const tierInfo = SKILL_TIER_CONFIG[tier];
                            return (
                              <Tooltip key={tier} delayDuration={100}>
                                <TooltipTrigger asChild>
                                  <div
                                    className="w-full transition-all duration-300 hover:brightness-125"
                                    style={{
                                      height: `${height}%`,
                                      backgroundColor: tierInfo.color,
                                    }}
                                  />
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>{tierInfo.label}: {count} player{count > 1 ? 's' : ''}</p>
                                </TooltipContent>
                              </Tooltip>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                   <div className="flex justify-around items-center w-full mt-2">
                      {rankDistributionData.map((team, teamIdx) => (
                         <div key={teamIdx} className="w-16 text-center">
                            <p className="text-xs font-medium text-foreground truncate">{team.name}</p>
                            <p className="text-xs text-muted-foreground">{team.playerCount} players</p>
                         </div>
                      ))}
                   </div>

                  {/* Legend */}
                  <div className="mt-4 flex flex-wrap justify-center items-center gap-x-4 gap-y-1">
                    {SKILL_TIER_ORDER.map(tier => {
                      const tierInfo = SKILL_TIER_CONFIG[tier];
                      return (
                        <div key={tier} className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-sm"
                            style={{ backgroundColor: tierInfo.color }}
                          />
                          <span className="text-xs text-muted-foreground">{tierInfo.label}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </TooltipProvider>
            )}
          </div>
        )}

        {/* Assignment Simulator */}
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <Target className="h-4 w-4" />
            Assignment Simulator
          </h3>

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-3">
            <div className="flex items-center gap-2">
              <Button size="sm" onClick={() => setIsSimPlaying(true)} disabled={isSimPlaying} className="hover-scale">
                <Play className="h-4 w-4 mr-2" /> Play
              </Button>
              <Button size="sm" variant="secondary" onClick={() => setIsSimPlaying(false)} disabled={!isSimPlaying} className="hover-scale">
                <Pause className="h-4 w-4 mr-2" /> Pause
              </Button>
              <Button size="sm" variant="outline" onClick={resetSimulator} className="hover-scale">
                <RotateCcw className="h-4 w-4 mr-2" /> Reset
              </Button>
            </div>
            <div className="text-xs text-muted-foreground">
              Step {Math.min(simIndex + swapIndex, balanceSteps.length + executedSwaps.length)}/{balanceSteps.length + executedSwaps.length}
              {simPhase === 'swaps' && <span className="ml-2">(applying swaps)</span>}
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {safeTeams.map((team, i) => (
              <div key={team.id || i} className="p-3 rounded-lg bg-secondary/5 border border-secondary/10 min-h-[140px] flex flex-col">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-foreground">{team.name || `Team ${i + 1}`}</span>
                    {simPhase === 'done' && (
                      <Badge variant="outline" className="text-xs flex items-center gap-1 bg-emerald-500/15 text-emerald-600 border-emerald-500/30">
                        <CheckCircle2 className="h-3 w-3" /> Completed
                      </Badge>
                    )}
                  </div>
                  <Badge variant="outline" className="text-xs">{simTeams[i]?.length || 0} players</Badge>
                </div>

                {/* Dynamic total points with delta */}
                <div className="mb-2 flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Total points</span>
                  <div className="flex items-center gap-1">
                    <span className="font-semibold text-foreground">{teamTotals[i]} pts</span>
                    {teamDeltas[i] !== 0 && (
                      <span className={`flex items-center gap-1 ${teamDeltas[i] > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                        {teamDeltas[i] > 0 ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
                        {teamDeltas[i] > 0 ? `+${teamDeltas[i]}` : teamDeltas[i]}
                      </span>
                    )}
                  </div>
                </div>

                <div className="space-y-1">
                  {(simTeams[i] || []).map(p => (
                    <div key={p.key} className="px-2 py-1 rounded-md bg-card/50 border border-border/20 text-sm text-foreground animate-fade-in flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {p.assignedOrder && (
                          <div className="w-5 h-5 rounded-full bg-primary/20 text-primary text-xs font-semibold flex items-center justify-center">
                            {p.assignedOrder}
                          </div>
                        )}
                        {isCaptain(i, p.name) && (
                          <Crown className="h-3 w-3 text-amber-500" />
                        )}
                        <span className="truncate">{p.name}</span>
                      </div>
                      {typeof p.movedFromTeam === 'number' && p.movedFromTeam !== i && (
                        <div className={`flex items-center gap-1 ${p.isSub ? 'text-red-600' : 'text-emerald-600'}`}>
                          <ArrowRight className="h-3 w-3" />
                          <span className="text-xs">T{(p.movedFromTeam + 1)}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
        
        {/* ... (rest of the component: ATLAS Analysis, Steps, Swaps) */}

        {/* ATLAS Adaptive Weight Analysis - Unified Section */}
        {atlasCalculations.length > 0 && (
          <div className="mb-6">
            <div 
              className={`flex items-center justify-between p-4 bg-secondary/5 rounded-xl cursor-pointer hover:bg-secondary/10 transition-all duration-300 ${
                !isATLASExpanded && !hasInteractedWithATLAS
                  ? 'border-2 border-blue-400/40 shadow-[0_0_20px_rgba(59,130,246,0.2)] animate-breathe-slow' 
                  : 'border border-secondary/20'
              }`}
              onClick={() => {
                setIsATLASExpanded(!isATLASExpanded);
                setHasInteractedWithATLAS(true);
              }}
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-indigo-500/10">
                  <Brain className="h-4 w-4 text-indigo-500" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">ATLAS Adaptive Weight Analysis</h3>
                  <p className="text-sm text-muted-foreground">
                    Enhanced ranking calculations for {atlasCalculations.length} players • {atlasStats.balanceQuality} balance
                  </p>
                </div>
              </div>
              {isATLASExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </div>
            
            {isATLASExpanded && (
              <div className="mt-4 animate-in fade-in duration-500">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
                  {atlasCalculations.map((calc, index) => {
                    const matchingStep = balanceSteps.find(step => step.player.id === calc.userId);
                    const playerName = matchingStep?.player.discord_username || matchingStep?.player.name || `Player ${index + 1}`;
                    const playerRank = matchingStep?.player.rank || calc.calculation.currentRank || 'Unknown';
                    const finalPoints = calc.calculation.finalPoints || calc.calculation.calculatedAdaptiveWeight || 0;
                    
                    const isRecentWinner = recentWinnerIds.has(calc.userId);
                    
                    return (
                      <div key={calc.userId || index} className={`group relative p-4 bg-gradient-to-br from-card to-card/60 rounded-xl border transition-all duration-300 hover:shadow-xl hover:scale-[1.02] ${
                        isRecentWinner 
                          ? 'border-amber-400/50 shadow-[0_0_20px_rgba(245,158,11,0.15)] ring-1 ring-amber-400/20' 
                          : 'border-border/20 hover:border-primary/40'
                      }`}>
                        {/* Content of ATLAS cards */}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Balance Assignment Steps */}
        {balanceSteps.length > 0 && (
          <div className="mb-6">
            <div
              className="flex items-center justify-between p-4 bg-secondary/5 rounded-xl cursor-pointer hover:bg-secondary/10 transition-all duration-300 border border-secondary/20"
              onClick={() => setIsStepsExpanded(!isStepsExpanded)}
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-indigo-500/10">
                  <Target className="h-4 w-4 text-indigo-500" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">
                    Balance Assignment Steps ({balanceSteps.length} players)
                  </h3>
                </div>
              </div>
              {isStepsExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </div>
            {isStepsExpanded && (
              <div className="mt-3 space-y-2 max-h-64 overflow-y-auto animate-in fade-in duration-500">
                {balanceSteps.map((step, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-secondary/5 rounded-lg border border-secondary/10">
                    {/* Content of balance steps */}
                  </div>
                ))}
              </div>
            )}
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