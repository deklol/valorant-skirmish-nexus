import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp, BarChart3, TrendingUp, Users, Trophy, Target, Brain } from "lucide-react";
import { useState } from "react";
import { Team } from "@/types/tournamentDetail";
import SwapSuggestionsSection from "./SwapSuggestionsSection";
import { useRecentTournamentWinners } from "@/hooks/useRecentTournamentWinners";

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
  const [isExpanded, setIsExpanded] = useState(true); // Start expanded
  const [isATLASExpanded, setIsATLASExpanded] = useState(false);
  const [hasInteractedWithATLAS, setHasInteractedWithATLAS] = useState(false);
  const [isSwapExpanded, setIsSwapExpanded] = useState(false);
  
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
    const RANK_POINTS = {
      'Radiant': 500, 'Immortal 3': 450, 'Immortal 2': 415, 'Immortal 1': 300,
      'Ascendant 3': 265, 'Ascendant 2': 240, 'Ascendant 1': 215,
      'Diamond 3': 190, 'Diamond 2': 170, 'Diamond 1': 150,
      'Platinum 3': 130, 'Platinum 2': 115, 'Platinum 1': 100,
      'Gold 3': 85, 'Gold 2': 75, 'Gold 1': 70,
      'Silver 3': 60, 'Silver 2': 55, 'Silver 1': 50,
      'Bronze 3': 40, 'Bronze 2': 35, 'Bronze 1': 30,
      'Iron 3': 25, 'Iron 2': 20, 'Iron 1': 15,
      'Unrated': 150, 'Unranked': 150
    };
    
    const currentRankPoints = RANK_POINTS[currentRank] || 150;
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
      tournamentsWon = Math.floor(tournamentBonus / 15);
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
      tournamentsWon = Math.floor(tournamentBonus / 15);
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
      peakRank = Object.keys(RANK_POINTS).find(rank => RANK_POINTS[rank] === possiblePeakPoints) || currentRank;
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
              className={`flex items-center justify-between p-4 bg-secondary/5 rounded-xl cursor-pointer hover:bg-secondary/10 transition-all duration-300 ${
                !isATLASExpanded && !hasInteractedWithATLAS
                  ? 'border-2 border-blue-400/40 shadow-[0_0_20px_rgba(59,130,246,0.2)] animate-[breathe_3s_ease-in-out_infinite]' 
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
                    Enhanced ranking calculations for {atlasCalculations.length} players • {atlasStats.balanceQuality} balance quality • {atlasStats.maxDifference}pts max difference
                  </p>
                </div>
              </div>
              {isATLASExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </div>
            
            {isATLASExpanded && (
              <div className="mt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
                  {atlasCalculations.map((calc, index) => {
                    // Find matching player name from balance steps
                    const matchingStep = balanceSteps.find(step => step.player.id === calc.userId);
                    const playerName = matchingStep?.player.discord_username || matchingStep?.player.name || `Player ${index + 1}`;
                    const playerRank = matchingStep?.player.rank || calc.calculation.currentRank || 'Unknown';
                    const finalPoints = calc.calculation.finalPoints || calc.calculation.calculatedAdaptiveWeight || 0;
                    
                    // Find what team the player is on
                    const playerTeam = teams.find(team => 
                      team.team_members?.some(member => member.user_id === calc.userId)
                    );
                    
                    // Get skill tier based on points
                    const getSkillTier = (points: number) => {
                      if (points >= 400) return { label: 'Elite', color: 'bg-red-500/10 text-red-600 border-red-500/20' };
                      if (points >= 300) return { label: 'High Skilled', color: 'bg-purple-500/10 text-purple-600 border-purple-500/20' };
                      if (points >= 200) return { label: 'Intermediate', color: 'bg-blue-500/10 text-blue-600 border-blue-500/20' };
                      return { label: 'Developing', color: 'bg-gray-500/10 text-gray-600 border-gray-500/20' };
                    };
                    
                    const skillTier = getSkillTier(finalPoints);
                    const tournamentWins = calc.calculation.tournamentsWon || 0;
                    const tournamentBonus = calc.calculation.tournamentBonus || 0;
                    const isRecentWinner = recentWinnerIds.has(calc.userId);
                    
                    return (
                      <div key={calc.userId || index} className={`relative p-4 bg-gradient-to-br from-card/80 to-card/40 rounded-xl border hover:border-primary/30 transition-all duration-200 hover:shadow-lg ${
                        isRecentWinner 
                          ? 'border-amber-500/40 shadow-[0_0_8px_rgba(245,158,11,0.4)]' 
                          : 'border-border/30'
                      }`}>
                        {/* Header with player info */}
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-foreground text-sm truncate">{playerName}</h4>
                             <div className="flex flex-col gap-1 mt-1">
                               <Badge 
                                 variant="outline" 
                                 className="text-xs px-2 py-0.5 border-[1px] inline-flex items-center gap-1 w-fit"
                                 style={{
                                   color: getRankInfo(playerRank).primary,
                                   borderColor: getRankInfo(playerRank).primary + '80'
                                 }}
                               >
                                 <span>{getRankInfo(playerRank).emoji}</span>
                                 {playerRank}
                               </Badge>
                                <Badge 
                                  className="text-xs px-2 py-0.5 w-fit inline-block"
                                  style={{
                                    backgroundColor: getRankInfo(playerRank).primary + '20',
                                    color: getRankInfo(playerRank).primary,
                                    borderColor: getRankInfo(playerRank).primary + '40'
                                  }}
                                >
                                  {skillTier.label}
                                </Badge>
                             </div>
                          </div>
                          <div className="text-right">
                            <div className="text-lg font-bold text-primary">{finalPoints}</div>
                            <div className="text-xs text-muted-foreground">points</div>
                          </div>
                        </div>

                        {/* Team assignment */}
                        {playerTeam && (
                          <div className="mb-3 p-2 bg-muted/20 rounded-lg border border-muted/30">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full bg-primary"></div>
                              <span className="text-xs font-medium text-foreground">{playerTeam.name}</span>
                            </div>
                          </div>
                        )}
                        
                        {/* Tournament achievements */}
                        {tournamentWins > 0 && (
                          <div className="mb-3 p-2 bg-amber-500/10 rounded-lg border border-amber-500/20">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Trophy className="h-3 w-3 text-amber-600" />
                                <span className="text-xs font-medium text-amber-700">
                                  {tournamentWins} Tournament Win{tournamentWins !== 1 ? 's' : ''}
                                </span>
                              </div>
                              {tournamentBonus > 0 && (
                                <Badge className="text-xs bg-green-500/10 text-green-600 border-green-500/20">
                                  +{tournamentBonus}pts
                                </Badge>
                              )}
                            </div>
                          </div>
                        )}
                        
                        {/* Calculation breakdown */}
                        <div className="bg-muted/10 p-3 rounded-lg border border-muted/20">
                          <div className="text-xs font-medium text-foreground mb-2">Calculation Details:</div>
                          <div className="text-xs text-muted-foreground leading-relaxed">
                            {calc.calculation.calculationReasoning || `${playerRank} ranking (${finalPoints} total points)`}
                          </div>
                        </div>
                        
                        {/* Evidence factors (simplified) */}
                        {calc.calculation.evidenceFactors && calc.calculation.evidenceFactors.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {calc.calculation.evidenceFactors.slice(0, 2).map((factor, idx) => (
                              <Badge key={idx} variant="outline" className="text-xs px-2 py-0.5">
                                {factor.replace('🏆 ', '').substring(0, 20)}
                                {factor.length > 20 ? '...' : ''}
                              </Badge>
                            ))}
                            {calc.calculation.evidenceFactors.length > 2 && (
                              <Badge variant="outline" className="text-xs px-2 py-0.5 opacity-60">
                                +{calc.calculation.evidenceFactors.length - 2}
                              </Badge>
                            )}
                          </div>
                        )}
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