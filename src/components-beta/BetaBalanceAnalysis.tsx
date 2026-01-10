import { useState } from "react";
import { GlassCard, BetaBadge } from "./ui-beta";
import { 
  Scale, ChevronDown, ChevronUp, TrendingUp, Users, 
  CheckCircle, AlertTriangle, Info, Zap, Target
} from "lucide-react";

interface BalanceAnalysisProps {
  analysis: any;
  teams?: any[];
  className?: string;
}

// Parse balance analysis data from various formats
const parseAnalysis = (analysis: any) => {
  if (!analysis) return null;
  
  try {
    const data = typeof analysis === 'string' ? JSON.parse(analysis) : analysis;
    
    // Handle nested structure (final_balance inside analysis)
    const finalBalance = data.final_balance ?? data.finalBalance ?? data;
    const balanceSteps = data.balance_steps ?? data.balanceSteps ?? [];
    
    // Extract key metrics from various possible formats
    const metrics = {
      // Overall quality - check final_balance first then root
      qualityScore: finalBalance.balanceQuality ?? finalBalance.qualityScore ?? 
                    data.qualityScore ?? data.balanceScore ?? null,
      qualityLabel: finalBalance.qualityLabel ?? data.qualityLabel ?? null,
      
      // Weight metrics
      maxDifference: finalBalance.maxPointDifference ?? finalBalance.maxDifference ?? 
                     data.maxPointDifference ?? data.totalWeightDifference ?? null,
      averageWeight: finalBalance.averageTeamPoints ?? finalBalance.averageWeight ?? 
                     data.averageTeamWeight ?? data.avgWeight ?? null,
      minPoints: finalBalance.minTeamPoints ?? null,
      maxPoints: finalBalance.maxTeamPoints ?? null,
      
      // Count players from balance steps if not directly available
      totalPlayers: data.totalPlayersAnalyzed ?? data.total_players ?? 
                    balanceSteps.length ?? null,
      
      // Team stats from validation or teams_created
      teamStats: data.teams_created?.map((t: any, idx: number) => ({
        name: t.name,
        totalPoints: t.total_rank_points ?? t.total_points,
        playerCount: t.members?.length ?? t.team_members?.length ?? 0
      })) ?? data.finalTeamStats ?? data.team_stats ?? [],
      
      // Algorithm info
      algorithm: data.method ?? data.algorithm ?? data.balancingMethod ?? null,
      
      // ATLAS-specific
      atlasCalculations: data.atlasCalculations ?? data.atlas_calculations ?? [],
      
      // Swap suggestions
      swapSuggestions: data.swapSuggestions ?? data.swap_suggestions ?? [],
      
      // Assignment steps
      assignmentSteps: balanceSteps,
      
      // Validation result
      validationResult: data.validation_result ?? null,
    };
    
    return metrics;
  } catch {
    return null;
  }
};

// Get quality color based on score
const getQualityColor = (score: number | null) => {
  if (score === null) return 'text-[hsl(var(--beta-text-muted))]';
  if (score >= 90) return 'text-[hsl(var(--beta-success))]';
  if (score >= 75) return 'text-green-400';
  if (score >= 60) return 'text-yellow-400';
  if (score >= 40) return 'text-orange-400';
  return 'text-[hsl(var(--beta-error))]';
};

// Get quality badge variant
const getQualityBadge = (score: number | null) => {
  if (score === null) return { variant: 'default' as const, label: 'Unknown' };
  if (score >= 90) return { variant: 'success' as const, label: 'Excellent' };
  if (score >= 75) return { variant: 'success' as const, label: 'Good' };
  if (score >= 60) return { variant: 'warning' as const, label: 'Fair' };
  if (score >= 40) return { variant: 'warning' as const, label: 'Poor' };
  return { variant: 'error' as const, label: 'Unbalanced' };
};

export const BetaBalanceAnalysis = ({ analysis, teams, className = "" }: BalanceAnalysisProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const metrics = parseAnalysis(analysis);
  
  if (!metrics) {
    return null;
  }
  
  const qualityBadge = getQualityBadge(metrics.qualityScore);
  const hasDetailedData = metrics.atlasCalculations?.length > 0 || 
                          metrics.swapSuggestions?.length > 0 || 
                          metrics.assignmentSteps?.length > 0 ||
                          metrics.teamStats?.length > 0;
  
  // Calculate team count from teams prop or teamStats
  const teamCount = teams?.length ?? metrics.teamStats?.length ?? 0;

  return (
    <GlassCard className={`overflow-hidden ${className}`}>
      {/* Header - Always visible summary */}
      <div 
        className="p-4 cursor-pointer hover:bg-[hsl(var(--beta-surface-3)/0.3)] transition-colors"
        onClick={() => hasDetailedData && setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-500/20">
              <Scale className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <h3 className="font-semibold text-[hsl(var(--beta-text-primary))]">Team Balance</h3>
              <p className="text-xs text-[hsl(var(--beta-text-muted))]">
                {metrics.algorithm ?? 'ATLAS Adaptive Balancing'}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {metrics.qualityScore !== null && (
              <BetaBadge variant={qualityBadge.variant} size="md">
                {qualityBadge.label} ({Math.round(metrics.qualityScore)}%)
              </BetaBadge>
            )}
            {hasDetailedData && (
              <button className="p-1 text-[hsl(var(--beta-text-muted))] hover:text-[hsl(var(--beta-text-primary))]">
                {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
              </button>
            )}
          </div>
        </div>
        
        {/* Quick Stats Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
          {metrics.totalPlayers !== null && metrics.totalPlayers > 0 && (
            <div className="flex items-center gap-2 p-2 rounded-lg bg-[hsl(var(--beta-surface-3))]">
              <Users className="w-4 h-4 text-[hsl(var(--beta-accent))]" />
              <div>
                <p className="text-xs text-[hsl(var(--beta-text-muted))]">Players</p>
                <p className="text-sm font-semibold text-[hsl(var(--beta-text-primary))]">{metrics.totalPlayers}</p>
              </div>
            </div>
          )}
          
          {metrics.averageWeight !== null && (
            <div className="flex items-center gap-2 p-2 rounded-lg bg-[hsl(var(--beta-surface-3))]">
              <Target className="w-4 h-4 text-purple-400" />
              <div>
                <p className="text-xs text-[hsl(var(--beta-text-muted))]">Avg Weight</p>
                <p className="text-sm font-semibold text-purple-300">{Math.round(metrics.averageWeight)}</p>
              </div>
            </div>
          )}
          
          {metrics.maxDifference !== null && (
            <div className="flex items-center gap-2 p-2 rounded-lg bg-[hsl(var(--beta-surface-3))]">
              <TrendingUp className="w-4 h-4 text-orange-400" />
              <div>
                <p className="text-xs text-[hsl(var(--beta-text-muted))]">Max Diff</p>
                <p className={`text-sm font-semibold ${metrics.maxDifference <= 10 ? 'text-green-400' : metrics.maxDifference <= 30 ? 'text-yellow-400' : 'text-orange-400'}`}>
                  ±{Math.round(metrics.maxDifference)}
                </p>
              </div>
            </div>
          )}
          
          {teamCount > 0 && (
            <div className="flex items-center gap-2 p-2 rounded-lg bg-[hsl(var(--beta-surface-3))]">
              <Zap className="w-4 h-4 text-[hsl(var(--beta-secondary))]" />
              <div>
                <p className="text-xs text-[hsl(var(--beta-text-muted))]">Teams</p>
                <p className="text-sm font-semibold text-[hsl(var(--beta-text-primary))]">{teamCount}</p>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Expanded Details */}
      {isExpanded && hasDetailedData && (
        <div className="border-t border-[hsl(var(--beta-border))] p-4 space-y-4 bg-[hsl(var(--beta-surface-2))]">
          {/* Team Stats */}
          {metrics.teamStats && metrics.teamStats.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-[hsl(var(--beta-text-primary))] mb-2 flex items-center gap-2">
                <Info className="w-4 h-4 text-[hsl(var(--beta-accent))]" />
                Team Weight Distribution
              </h4>
              <div className="space-y-2">
                {metrics.teamStats.map((team: any, idx: number) => {
                  const diff = team.difference ?? team.diff ?? 0;
                  const total = team.totalPoints ?? team.total ?? team.weight ?? 0;
                  const avgWeight = metrics.averageWeight ?? 1800;
                  return (
                    <div key={idx} className="flex items-center gap-3">
                      <span className="text-xs text-[hsl(var(--beta-text-muted))] w-20 truncate">{team.name ?? `Team ${idx + 1}`}</span>
                      <div className="flex-1 h-2 bg-[hsl(var(--beta-surface-4))] rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-purple-500 to-[hsl(var(--beta-accent))]"
                          style={{ width: `${Math.min((total / (avgWeight * 1.2)) * 100, 100)}%` }}
                        />
                      </div>
                      <span className="text-xs font-medium text-purple-300 w-12 text-right">{total}</span>
                      {diff !== 0 && (
                        <span className={`text-xs w-12 text-right ${diff > 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {diff > 0 ? '+' : ''}{Math.round(diff)}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          
          {/* Swap Suggestions */}
          {metrics.swapSuggestions && metrics.swapSuggestions.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-[hsl(var(--beta-text-primary))] mb-2 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-yellow-400" />
                Optimization Suggestions
              </h4>
              <div className="space-y-1">
                {metrics.swapSuggestions.slice(0, 3).map((swap: any, idx: number) => (
                  <div key={idx} className="text-xs p-2 rounded bg-[hsl(var(--beta-surface-3))] text-[hsl(var(--beta-text-secondary))]">
                    Swap could improve balance by {swap.improvement ?? swap.delta ?? 'N/A'} points
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Assignment Summary */}
          {metrics.assignmentSteps && metrics.assignmentSteps.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-[hsl(var(--beta-text-primary))] mb-2 flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-[hsl(var(--beta-success))]" />
                Assignment Summary
              </h4>
              <p className="text-xs text-[hsl(var(--beta-text-muted))]">
                {metrics.assignmentSteps.length} players were assigned using adaptive weight calculations
              </p>
            </div>
          )}
        </div>
      )}
    </GlassCard>
  );
};

export default BetaBalanceAnalysis;
