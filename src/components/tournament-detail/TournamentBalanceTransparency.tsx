import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ChevronDown, ChevronUp, BarChart3, TrendingUp, Users, Trophy, Target, Brain, Play, Pause, RotateCcw, ArrowRight, CheckCircle2, Crown, ArrowUp, ArrowDown, ShieldQuestion } from "lucide-react";
import { useEffect, useMemo, useState, useRef } from "react";
import { Team } from "@/types/tournamentDetail";
import SwapSuggestionsSection from "./SwapSuggestionsSection";
import { useRecentTournamentWinners } from "@/hooks/useRecentTournamentWinners";
import { RANK_POINT_MAPPING } from "@/utils/rankingSystem";
import { EVIDENCE_CONFIG } from "@/utils/evidenceBasedWeightSystem";

// Rank configuration with emojis and colors
const RANK_CONFIG = {
  'Iron 1': { emoji: '⬛', primary: '#4A4A4A', accent: '#7E7E7E', skill: 'Developing' },
  'Iron 2': { emoji: '⬛', primary: '#4A4A4A', accent: '#7E7E7E', skill: 'Developing' },
  'Iron 3': { emoji: '⬛', primary: '#4A4A4A', accent: '#7E7E7E', skill: 'Developing' },
  'Bronze 1': { emoji: '🟫', primary: '#A97142', accent: '#C28E5C', skill: 'Beginner' },
  'Bronze 2': { emoji: '🟫', primary: '#A97142', accent: '#C28E5C', skill: 'Beginner' },
  'Bronze 3': { emoji: '🟫', primary: '#A97142', accent: '#C28E5C', skill: 'Beginner' },
  'Silver 1': { emoji: '⬜', primary: '#C0C0C0', accent: '#D8D8D8', skill: 'Beginner' },
  'Silver 2': { emoji: '⬜', primary: '#C0C0C0', accent: '#D8D8D8', skill: 'Beginner' },
  'Silver 3': { emoji: '⬜', primary: '#C0C0C0', accent: '#D8D8D8', skill: 'Beginner' },
  'Gold 1': { emoji: '🟨', primary: '#FFD700', accent: '#FFEA8A', skill: 'Beginner' },
  'Gold 2': { emoji: '🟨', primary: '#FFD700', accent: '#FFEA8A', skill: 'Beginner' },
  'Gold 3': { emoji: '🟨', primary: '#FFD700', accent: '#FFEA8A', skill: 'Beginner' },
  'Platinum 1': { emoji: '🟦', primary: '#5CA3E4', accent: '#B3DAFF', skill: 'Intermediate' },
  'Platinum 2': { emoji: '🟦', primary: '#5CA3E4', accent: '#B3DAFF', skill: 'Intermediate' },
  'Platinum 3': { emoji: '🟦', primary: '#5CA3E4', accent: '#B3DAFF', skill: 'Intermediate' },
  'Diamond 1': { emoji: '🟪', primary: '#8d64e2', accent: '#B3DAFF', skill: 'Intermediate' },
  'Diamond 2': { emoji: '🟪', primary: '#8d64e2', accent: '#B3DAFF', skill: 'Intermediate' },
  'Diamond 3': { emoji: '🟪', primary: '#8d64e2', accent: '#B3DAFF', skill: 'Intermediate' },
  'Ascendant 1': { emoji: '🟩', primary: '#84FF6F', accent: '#B6FFA8', skill: 'Intermediate' },
  'Ascendant 2': { emoji: '🟩', primary: '#84FF6F', accent: '#B6FFA8', skill: 'Intermediate' },
  'Ascendant 3': { emoji: '🟩', primary: '#84FF6F', accent: '#B6FFA8', skill: 'Intermediate' },
  'Immortal 1': { emoji: '🟥', primary: '#A52834', accent: '#D24357', skill: 'High Skilled' },
  'Immortal 2': { emoji: '🟥', primary: '#A52834', accent: '#D24357', skill: 'High Skilled' },
  'Immortal 3': { emoji: '🟥', primary: '#A52834', accent: '#D24357', skill: 'Elite' },
  'Radiant': { emoji: '✨', primary: '#FFF176', accent: '#FFFFFF', skill: 'Elite' },
  'Unrated': { emoji: '❓', primary: '#9CA3AF', accent: '#D1D5DB', skill: 'Unknown' },
  'Unranked': { emoji: '❓', primary: '#9CA3AF', accent: '#D1D5DB', skill: 'Unknown' },
};

// Skill tier configuration for fairness graph
const SKILL_TIER_CONFIG = {
  'Elite': { color: '#ef4444', label: 'Elite' },          // Red-500
  'High Skilled': { color: '#8b5cf6', label: 'High' },    // Violet-500
  'Intermediate': { color: '#3b82f6', label: 'Intermediate' }, // Blue-500
  'Beginner': { color: '#22c55e', label: 'Beginner' },    // Green-500
  'Developing': { color: '#9ca3af', label: 'Developing' } // Zinc-400
  'Unknown': { color: '#a1a1aa', label: 'Unknown' }      // Zinc-400
};

const SKILL_TIER_ORDER = ['Elite', 'High Skilled', 'Intermediate', 'Beginner', 'Developing', 'Unknown'];

// Helper functions for rank styling
const getRankInfo = (rank: string) => {
  return RANK_CONFIG[rank] || RANK_CONFIG['Unranked'];
};

const getSkillLevel = (rank: string) => {
  return getRankInfo(rank).skill;
};

const getSkillLevelColor = (rank: string) => {
  const info = getRankInfo(rank);
  return info.primary;
};

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
  const [expandedPlayerFactors, setExpandedPlayerFactors] = useState<Set<string>>(new Set());
  const [isStepsExpanded, setIsStepsExpanded] = useState(false);
  const [isRankDistributionExpanded, setIsRankDistributionExpanded] = useState(false); // Collapsed by default
  
  const togglePlayerFactors = (playerId: string) => {
    const newExpanded = new Set(expandedPlayerFactors);
    if (newExpanded.has(playerId)) {
      newExpanded.delete(playerId);
    } else {
      newExpanded.add(playerId);
    }
    setExpandedPlayerFactors(newExpanded);
  };
  
  const { recentWinnerIds } = useRecentTournamentWinners();
  
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
        avgPoints: team.total_points / (team.members.length || 1)
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
    
    console.log('🔍 ATLAS TRANSPARENCY DEBUG:', {
      hasBalanceAnalysis: !!balanceAnalysis,
      hasEvidenceCalculations: !!(balanceAnalysis.evidenceCalculations),
      calculationsLength: calculations.length,
      firstCalculation: calculations[0],
      balanceAnalysisKeys: Object.keys(balanceAnalysis || {}),
      rawBalanceAnalysis: balanceAnalysis
    });
    
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
      
      console.log('🏛️ ATLAS TRANSPARENCY: Retrieved unified calculations:', {
        total: calculations.length,
        unique: uniqueCalculations.length,
        balanced: balancedCalculations.length,
        sources: [...new Set(balancedCalculations.map(c => (c.calculation as any)?.weightSource || (c.calculation as any)?.source || 'unknown'))],
        sampleCalculation: balancedCalculations[0],
        calculationStructure: balancedCalculations[0] ? Object.keys(balancedCalculations[0].calculation || {}) : []
      });
      
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
      
      // FIRST: Check if we already have evidence reasoning from the balancing process
      if (step.player.evidenceReasoning) {
        console.log(`🔍 Found existing evidence reasoning for ${step.player.discord_username}:`, step.player.evidenceReasoning);
      }
      
      // Reconstruct ATLAS reasoning based on evidence
      const reasoning = step.player.evidenceReasoning 
        ? { reasoning: step.player.evidenceReasoning, evidenceFactors: [], currentRankPoints: 0, peakRank: currentRank, peakRankPoints: 0, basePoints: 0, tournamentBonus: 0, tournamentsWon: 0, rankDecay: 0, adaptiveFactor: 1.0 }
        : reconstructATLASReasoning(currentRank, finalPoints);
      
      return {
        userId: step.player.id || 'unknown',
        calculation: {
          currentRank: currentRank,
          currentRankPoints: typeof reasoning === 'string' ? 0 : reasoning.currentRankPoints,
          peakRank: typeof reasoning === 'string' ? currentRank : reasoning.peakRank,
          peakRankPoints: typeof reasoning === 'string' ? 0 : reasoning.peakRankPoints,
          calculatedAdaptiveWeight: finalPoints,
          adaptiveFactor: typeof reasoning === 'string' ? 1.0 : reasoning.adaptiveFactor,
          calculationReasoning: (typeof reasoning === 'string' ? reasoning : reasoning.reasoning).replace(/Elite Tier Player \(300\+ points\)/g, 'Elite Tier Player (400+ points)'),
          weightSource: 'evidence_based',
          finalPoints: finalPoints,
          tournamentsWon: typeof reasoning === 'string' ? 0 : reasoning.tournamentsWon,
          evidenceFactors: typeof reasoning === 'string' ? [] : reasoning.evidenceFactors,
          tournamentBonus: typeof reasoning === 'string' ? 0 : reasoning.tournamentBonus,
          basePoints: typeof reasoning === 'string' ? 0 : reasoning.basePoints,
          rankDecayApplied: typeof reasoning === 'string' ? 0 : reasoning.rankDecay,
          isEliteTier: finalPoints >= 400
        }
      };
    });
    
    console.log('🏛️ ATLAS TRANSPARENCY: Generated ATLAS reasoning from evidence:', {
      total: atlasCalculations.length,
      source: 'reconstructed_from_evidence'
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

  const getMaxTeamDifference = () => {
    return getMaxPointDifference();
  };

  // Process data for the rank distribution chart
  const rankDistributionData = useMemo(() => {
    const teamsData = balanceAnalysis.teams_created || [];
    if (!teamsData.length) return [];

    return teamsData.map(team => {
    const rankCounts: { [key: string]: number } = {
      'Elite': 0,
      'High Skilled': 0,
      'Intermediate': 0,
      'Beginner': 0,
      'Developing': 0,
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


  // Enhanced reasoning generation for unified ATLAS display
  const generateEnhancedReasoning = (calc: UnifiedATLASCalculation): string => {
    const { calculation } = calc;
    
    // Return the pre-calculated reasoning if available
    if (calculation?.calculationReasoning && !calculation.calculationReasoning.includes('Assignment based on balance algorithm')) {
      return calculation.calculationReasoning;
    }
    
    // Fallback generation
    const parts: string[] = [];
    
    // Base rank information
    if (calculation?.peakRank && calculation.currentRank !== calculation.peakRank) {
      parts.push(`Peak: ${calculation.peakRank} (${calculation.peakRankPoints} pts)`);
      if (calculation.currentRank && calculation.currentRank !== 'Unranked') {
        parts.push(`Current: ${calculation.currentRank} (${calculation.currentRankPoints} pts)`);
      } else {
        parts.push(`Currently Unranked`);
      }
    } else if (calculation?.currentRank) {
      parts.push(`${calculation.currentRank} (${calculation.currentRankPoints || calculation.finalPoints} pts)`);
    }
    
    // Tournament bonuses
    if (calculation?.tournamentBonus && calculation.tournamentBonus > 0) {
      parts.push(`+${calculation.tournamentBonus} tournament bonus (${calculation.tournamentsWon || 0} wins)`);
    }
    
    // Rank decay
    if (calculation?.rankDecayApplied && calculation.rankDecayApplied > 0) {
      parts.push(`-${calculation.rankDecayApplied} rank decay`);
    }
    
    // Final calculation
    parts.push(`= ${calculation?.finalPoints || calculation?.calculatedAdaptiveWeight || 0} pts total`);
    
    return parts.join(' ');
  };
  
  const qualityScore = getQualityScore();
  const maxPointDifference = getMaxPointDifference();
  const avgPointDifference = getAvgPointDifference();
  const finalTeamStats = getFinalTeamStats();
  const balanceSteps = getBalanceSteps();
  const atlasCalculations = getUnifiedATLASCalculations();
  const atlasStats = getATLASStats();
  
  // Assignment Simulator state and helpers
  const executedSwaps = useMemo(() => (balanceAnalysis.swapAnalysis?.successfulSwaps || []).filter(s => s.outcome === 'executed'), [balanceAnalysis.swapAnalysis]);
  const [isSimPlaying, setIsSimPlaying] = useState(false);
  const [simIndex, setSimIndex] = useState(0);
  const [swapIndex, setSwapIndex] = useState(0);
  const [simPhase, setSimPhase] = useState<'assign' | 'swaps' | 'done'>('assign');
const [simTeams, setSimTeams] = useState<{ id?: string; name: string; key: string; points?: number; assignedOrder?: number; originTeam?: number; movedFromTeam?: number; swapped?: boolean; isSub?: boolean; }[][]>(
    Array.from({ length: teamCount }, () => [])
  );

  // Simulator: computed totals and deltas per team
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

  // Determine if a player is the captain of a given team
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
                <p className="text-sm text-muted-foreground">Max Point Difference</p>
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
                <p className="text-sm text-muted-foreground">Avg Point Difference</p>
                <p className="text-lg font-semibold text-foreground">{Math.round(avgPointDifference)} pts</p>
              </div>
              <div className="p-2 rounded-lg bg-green-500/10">
                <BarChart3 className="h-4 w-4 text-green-500" />
              </div>
            </div>
          </div>
        </div>

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
                    Click for Enhanced ranking calculations for {atlasCalculations.length} players
                  </p>
                </div>
              </div>
              {isATLASExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </div>
            
            {isATLASExpanded && (
              <div className="mt-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
                  {atlasCalculations.map((calc, index) => {
                    // Find matching player name from balance steps
                    const matchingStep = balanceSteps.find(step => step.player.id === calc.userId);
                    const playerName = matchingStep?.player.discord_username || matchingStep?.player.name || `Player ${index + 1}`;
                    const playerRank = matchingStep?.player.rank || calc.calculation.currentRank || 'Unknown';
                    const finalPoints = calc.calculation.finalPoints || calc.calculation.calculatedAdaptiveWeight || 0;
                    
                    // Get riot ID from team member data
                    const playerTeamMember = teams.find(team => 
                      team.team_members?.some(member => member.user_id === calc.userId)
                    )?.team_members?.find(member => member.user_id === calc.userId);
                    const riotId = playerTeamMember?.users?.riot_id;
                    
                    // Find what team the player is on
                    const playerTeam = teams.find(team => 
                      team.team_members?.some(member => member.user_id === calc.userId)
                    );
                    
                    // Get skill tier based on points
                    const getSkillTier = (points: number) => {
                      if (points >= 440) return { label: 'Elite', color: 'bg-red-500/10 text-red-600 border-red-500/20' };
                      if (points >= 380) return { label: 'High Skilled', color: 'bg-purple-500/10 text-purple-600 border-purple-500/20' };
                      if (points >= 235) return { label: 'Intermediate', color: 'bg-blue-500/10 text-blue-600 border-blue-500/20' };
                      if (points >= 75) return { label: 'Beginner', color: 'bg-green-500/10 text-green-600 border-green-500/20' };
                      return { label: 'Developing', color: 'bg-gray-500/10 text-gray-600 border-gray-500/20' };
                    };
                    
                    const skillTier = getSkillTier(finalPoints);
                    const tournamentWins = calc.calculation.tournamentsWon || 0;
                    const tournamentBonus = calc.calculation.tournamentBonus || 0;
                    const perWinBonus = calc.calculation.perWinBonus || 15; // ✅ ADDED: Extract perWinBonus for use in JSX
                    const isRecentWinner = recentWinnerIds.has(calc.userId);
                    
                    return (
                      <div key={calc.userId || index} className={`group relative p-4 sm:p-6 bg-gradient-to-br from-card to-card/60 rounded-xl sm:rounded-2xl border transition-all duration-300 hover:shadow-xl hover:scale-[1.02] ${
                        isRecentWinner 
                          ? 'border-amber-400/50 shadow-[0_0_20px_rgba(245,158,11,0.15)] ring-1 ring-amber-400/20' 
                          : 'border-border/20 hover:border-primary/40'
                      }`}>
                        
                        {/* Header Section */}
                        <div className="space-y-3 sm:space-y-4">
                          {/* Player Name & Points */}
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <h4 className="font-bold text-foreground text-sm sm:text-base leading-tight">{playerName}</h4>
                              {riotId && (
                                <p className="text-xs text-muted-foreground italic mt-0.5">{riotId}</p>
                              )}
                            </div>
                            <div className="text-right flex-shrink-0">
                              <div className="text-xl sm:text-2xl font-black text-primary">{finalPoints}</div>
                              <div className="text-xs text-muted-foreground font-medium">POINTS</div>
                            </div>
                          </div>
                          
                          {/* Rank & Skill Level */}
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge 
                              variant="outline" 
                              className="text-xs sm:text-sm px-2 sm:px-3 py-1 sm:py-1.5 font-medium border-2"
                              style={{
                                color: getRankInfo(playerRank).primary,
                                borderColor: getRankInfo(playerRank).primary + '60',
                                backgroundColor: getRankInfo(playerRank).primary + '10'
                              }}
                            >
                              <span className="mr-1 sm:mr-2">{getRankInfo(playerRank).emoji}</span>
                              {playerRank}
                            </Badge>
                            <Badge 
                              className={`text-xs px-2 py-1 font-medium ${skillTier.color}`}
                            >
                              {skillTier.label}
                            </Badge>
                          </div>
                        </div>

                        {/* Team Assignment */}
                        {playerTeam && (
                          <div className="mt-4 p-3 bg-gradient-to-r from-muted/30 to-muted/10 rounded-xl border border-muted/40">
                            <div className="flex items-center gap-3">
                              <div className="w-3 h-3 rounded-full bg-primary shadow-sm"></div>
                              <span className="text-sm font-semibold text-foreground">{playerTeam.name}</span>
                            </div>
                          </div>
                        )}
                        
                        {/* Tournament Achievements */}
                        {tournamentWins > 0 && (
                          <div className="mt-4 p-4 bg-gradient-to-r from-amber-500/10 to-yellow-500/5 rounded-xl border border-amber-400/30">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Trophy className="h-4 w-4 text-amber-600" />
                                <span className="text-sm font-bold text-amber-800">
                                  {tournamentWins} Tournament Win{tournamentWins !== 1 ? 's' : ''}
                                </span>
                              </div>
                              {tournamentBonus > 0 && (
                                <Badge className="text-sm bg-emerald-500/20 text-emerald-700 border-emerald-500/30 font-bold">
                                  +{tournamentBonus}pts
                                </Badge>
                              )}
                            </div>
                            
                          </div>
                        )}
                        
                        {/* Calculation Details */}
                        <div className="mt-4 p-4 bg-gradient-to-br from-muted/20 to-muted/5 rounded-xl border border-muted/30">
                          <div className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
                            <Brain className="h-4 w-4" />
                            Calculation Breakdown
                          </div>
                          <div className="text-sm text-muted-foreground leading-relaxed">
                            {generateEnhancedReasoning(calc)}
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
                  <p className="text-sm text-muted-foreground">Click for a visual breakdown of skill tiers across all teams</p>
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
                            const height = (count / (team.playerCount || 1)) * 100;
                            const tierInfo = SKILL_TIER_CONFIG[tier as keyof typeof SKILL_TIER_CONFIG];
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
                      const tierInfo = SKILL_TIER_CONFIG[tier as keyof typeof SKILL_TIER_CONFIG];
                      if(!rankDistributionData.some(team => team.rankCounts[tier] > 0)) return null;
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
          <p className="text-sm text-muted-foreground">Click for step by step breakdown of each team, including subs</p>
        </div>
      </div>
      {isStepsExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
    </div>
    {isStepsExpanded && (
      <div className="mt-3 space-y-2 max-h-64 overflow-y-auto">
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