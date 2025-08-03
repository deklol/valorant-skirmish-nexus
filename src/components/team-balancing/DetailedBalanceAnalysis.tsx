// Detailed Balance Analysis Component
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, CheckCircle, TrendingUp, Copy, Download, BarChart3, Users } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { EnhancedTeamResult, BalanceStep } from "./EnhancedSnakeDraft";
import { getRankPointsWithManualOverride } from "@/utils/rankingSystemWithOverrides";

interface DetailedBalanceAnalysisProps {
  balanceResult: EnhancedTeamResult | null;
  tournamentName?: string;
}

const DetailedBalanceAnalysis = ({ balanceResult, tournamentName }: DetailedBalanceAnalysisProps) => {
  const [expandedSteps, setExpandedSteps] = useState<boolean>(false);
  const { toast } = useToast();

  if (!balanceResult) {
    return (
      <Card className="bg-slate-800 border-slate-700">
        <CardContent className="p-6 text-center text-slate-400">
          <BarChart3 className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>Run auto-balance to see detailed analysis</p>
        </CardContent>
      </Card>
    );
  }

  const { teams, balanceSteps, finalBalance } = balanceResult;

  const getBalanceStatusIcon = () => {
    switch (finalBalance.balanceQuality) {
      case 'ideal':
        return <CheckCircle className="w-5 h-5 text-green-400" />;
      case 'good':
        return <CheckCircle className="w-5 h-5 text-blue-400" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-yellow-400" />;
      case 'poor':
        return <AlertTriangle className="w-5 h-5 text-red-400" />;
    }
  };

  const getBalanceStatusColor = () => {
    switch (finalBalance.balanceQuality) {
      case 'ideal': return 'bg-green-600';
      case 'good': return 'bg-blue-600';
      case 'warning': return 'bg-yellow-600';
      case 'poor': return 'bg-red-600';
    }
  };

  const exportBalanceReport = () => {
    const report = generateBalanceReport();
    navigator.clipboard.writeText(report);
    toast({
      title: "Balance Report Copied",
      description: "Detailed balance analysis copied to clipboard",
    });
  };

  const downloadBalanceReport = () => {
    const report = generateBalanceReport();
    const blob = new Blob([report], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `team-balance-${tournamentName || 'tournament'}-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast({
      title: "Report Downloaded",
      description: "Balance analysis saved as text file",
    });
  };

  const generateBalanceReport = () => {
    const date = new Date().toLocaleString();
    let report = `TEAM BALANCE ANALYSIS REPORT\n`;
    report += `Tournament: ${tournamentName || 'Unknown'}\n`;
    report += `Generated: ${date}\n`;
    report += `==================================================\n\n`;

    // Overall Balance Summary
    report += `BALANCE SUMMARY:\n`;
    report += `Quality: ${finalBalance.balanceQuality.toUpperCase()}\n`;
    report += `Average Team Points: ${finalBalance.averageTeamPoints}\n`;
    report += `Point Range: ${finalBalance.minTeamPoints} - ${finalBalance.maxTeamPoints}\n`;
    report += `Max Difference: ${finalBalance.maxPointDifference} points\n\n`;

    // Team Breakdown
    report += `TEAM BREAKDOWN:\n`;
    teams.forEach((team, index) => {
      const teamTotal = team.reduce((sum, player) => {
        const result = getRankPointsWithManualOverride(player);
        return sum + result.points;
      }, 0);
      
      report += `\nTeam ${index + 1}: ${teamTotal} points\n`;
      team.forEach((player, playerIndex) => {
        const result = getRankPointsWithManualOverride(player);
        const captainMark = playerIndex === 0 ? ' (Captain)' : '';
        report += `  ${player.discord_username}: ${result.rank} (${result.points}pts)${captainMark}\n`;
      });
    });

    // Step-by-Step Analysis
    if (balanceSteps.length > 0) {
      report += `\n\nSTEP-BY-STEP ASSIGNMENT:\n`;
      balanceSteps.forEach((step, index) => {
        report += `${index + 1}. ${step.reasoning}\n`;
      });
    }

    return report;
  };

  return (
    <div className="space-y-4">
      {/* Balance Summary Card */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center justify-between">
            <div className="flex items-center gap-2">
              {getBalanceStatusIcon()}
              Balance Analysis
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={exportBalanceReport}
                className="text-slate-300 border-slate-600 hover:bg-slate-700"
              >
                <Copy className="w-4 h-4 mr-1" />
                Copy
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={downloadBalanceReport}
                className="text-slate-300 border-slate-600 hover:bg-slate-700"
              >
                <Download className="w-4 h-4 mr-1" />
                Export
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Quality Badge */}
          <div className="flex items-center gap-4">
            <Badge className={`${getBalanceStatusColor()} text-white`}>
              {finalBalance.balanceQuality.toUpperCase()} BALANCE
            </Badge>
            <span className="text-slate-300">
              Max difference: {finalBalance.maxPointDifference} points
            </span>
          </div>

          {/* Balance Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-slate-700 rounded-lg p-3">
              <div className="text-slate-400 text-xs uppercase tracking-wide">Average</div>
              <div className="text-white text-lg font-semibold">{finalBalance.averageTeamPoints}</div>
            </div>
            <div className="bg-slate-700 rounded-lg p-3">
              <div className="text-slate-400 text-xs uppercase tracking-wide">Minimum</div>
              <div className="text-white text-lg font-semibold">{finalBalance.minTeamPoints}</div>
            </div>
            <div className="bg-slate-700 rounded-lg p-3">
              <div className="text-slate-400 text-xs uppercase tracking-wide">Maximum</div>
              <div className="text-white text-lg font-semibold">{finalBalance.maxTeamPoints}</div>
            </div>
            <div className="bg-slate-700 rounded-lg p-3">
              <div className="text-slate-400 text-xs uppercase tracking-wide">Difference</div>
              <div className={`text-lg font-semibold ${
                finalBalance.balanceQuality === 'ideal' ? 'text-green-400' :
                finalBalance.balanceQuality === 'good' ? 'text-blue-400' :
                finalBalance.balanceQuality === 'warning' ? 'text-yellow-400' : 'text-red-400'
              }`}>
                {finalBalance.maxPointDifference}
              </div>
            </div>
          </div>

          {/* Team-by-Team Breakdown */}
          <div className="space-y-3">
            <h4 className="text-white font-medium flex items-center gap-2">
              <Users className="w-4 h-4" />
              Team Breakdown
            </h4>
            <div className="grid gap-3">
              {teams.map((team, index) => {
                const teamTotal = team.reduce((sum, player) => {
                  const result = getRankPointsWithManualOverride(player);
                  return sum + result.points;
                }, 0);
                
                const differenceFromAverage = teamTotal - finalBalance.averageTeamPoints;
                const diffColor = Math.abs(differenceFromAverage) <= 15 ? 'text-green-400' :
                                 Math.abs(differenceFromAverage) <= 30 ? 'text-yellow-400' : 'text-red-400';

                return (
                  <div key={index} className="bg-slate-700 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="font-medium text-white">Team {index + 1}</div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-slate-300 border-slate-500">
                          {teamTotal} pts
                        </Badge>
                        <span className={`text-sm ${diffColor}`}>
                          {differenceFromAverage > 0 ? '+' : ''}{differenceFromAverage}
                        </span>
                      </div>
                    </div>
                    <div className="text-sm text-slate-400">
                      {team.map((player, playerIndex) => (
                        <span key={player.id}>
                          {player.discord_username}{playerIndex === 0 ? ' (C)' : ''}
                          {playerIndex < team.length - 1 ? ', ' : ''}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Adaptive Weight Calculations Section - Works for both ATLAS and regular adaptive */}
          {(() => {
            // Check for ATLAS evidence calculations first (Evidence-based ATLAS)
            const evidenceCalculations = (balanceResult as any).evidenceCalculations;
            // Check for regular adaptive weight calculations (Enhanced ATLAS)
            const adaptiveCalculations = balanceResult.adaptiveWeightCalculations;
            
            const calculations = evidenceCalculations || adaptiveCalculations;
            
            if (!calculations || calculations.length === 0) return null;
            
            const isAtlasEvidence = !!evidenceCalculations;
            const title = isAtlasEvidence ? "ATLAS Evidence Weight Calculations" : "Adaptive Weight Calculations";
            
            return (
              <div className="space-y-3">
                <h4 className="text-white font-medium flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-400" />
                  {title}
                </h4>
                <div className="space-y-3">
                  {calculations.map((calc, index) => {
                    const player = balanceSteps.find(step => step.player.id === calc.userId);
                    const calculation = calc.calculation;
                    
                    return (
                      <div key={index} className="bg-slate-700 rounded-lg p-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-white font-medium">
                            {player?.player.discord_username || 'Unknown Player'}
                          </span>
                          <Badge className="bg-emerald-600 text-white">
                            {calculation.calculatedAdaptiveWeight || calculation.finalPoints} pts ({isAtlasEvidence ? 'ATLAS' : 'ADAPTIVE'})
                          </Badge>
                        </div>
                        <div className="text-sm text-slate-300 mb-2">
                          <strong>{isAtlasEvidence ? 'ATLAS Analysis:' : 'Calculation:'}</strong> {calculation.calculationReasoning}
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-xs text-slate-400">
                          <div>
                            <span className="font-medium">Current:</span> {calculation.currentRank || 'Unranked'} ({calculation.currentRankPoints || calculation.basePoints} pts)
                          </div>
                          <div>
                            <span className="font-medium">Peak:</span> {calculation.peakRank || 'N/A'} ({calculation.peakRankPoints} pts)
                          </div>
                          {calculation.adaptiveFactor !== undefined && (
                            <div>
                              <span className="font-medium">Adaptive Factor:</span> {Math.round(calculation.adaptiveFactor * 100)}%
                            </div>
                          )}
                          <div>
                            <span className="font-medium">Source:</span> {calculation.weightSource?.replace('_', ' ') || 'ATLAS'}
                          </div>
                          {calculation.rankDecayFactor !== undefined && (
                            <div>
                              <span className="font-medium">Rank Decay:</span> {Math.round(calculation.rankDecayFactor * 100)}%
                            </div>
                          )}
                          {calculation.rankDecayApplied !== undefined && (
                            <div>
                              <span className="font-medium">Decay Applied:</span> -{calculation.rankDecayApplied} pts
                            </div>
                          )}
                          {calculation.tournamentBonus > 0 && (
                            <div>
                              <span className="font-medium">Tournament Bonus:</span> +{calculation.tournamentBonus} pts
                            </div>
                          )}
                          {calculation.tournamentsWon > 0 && (
                            <div>
                              <span className="font-medium">Tournaments Won:</span> {calculation.tournamentsWon}
                            </div>
                          )}
                          {calculation.timeSincePeakDays && (
                            <div>
                              <span className="font-medium">Days Since Peak:</span> {calculation.timeSincePeakDays}
                            </div>
                          )}
                        </div>
                        
                        {/* Evidence factors for ATLAS */}
                        {calculation.evidenceFactors && calculation.evidenceFactors.length > 0 && (
                          <div className="mt-2 pt-2 border-t border-slate-600">
                            <div className="text-xs text-slate-400">
                              <span className="font-medium">Evidence Factors:</span>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {calculation.evidenceFactors.map((factor: string, i: number) => (
                                  <Badge key={i} variant="outline" className="text-xs border-emerald-500 text-emerald-400">
                                    {factor}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}

          {/* Assignment Steps (Expandable) */}
          {balanceSteps.length > 0 && (
            <div className="space-y-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setExpandedSteps(!expandedSteps)}
                className="text-slate-300 border-slate-600 hover:bg-slate-700"
              >
                <TrendingUp className="w-4 h-4 mr-2" />
                {expandedSteps ? 'Hide' : 'Show'} Assignment Steps ({balanceSteps.length})
              </Button>
              
              {expandedSteps && (
                <div className="bg-slate-700 rounded-lg p-4 max-h-96 overflow-y-auto">
                  <div className="space-y-2">
                     {balanceSteps.map((step, index) => (
                       <div key={index} className="text-sm border-l-2 border-slate-600 pl-3 mb-3">
                         <div className="text-slate-300">
                           <span className="font-medium text-white">Step {step.step}:</span> 
                           <span className="text-emerald-400 ml-2">{step.player.discord_username}</span>
                           <span className="text-slate-400 ml-2">
                             ({step.player.rank} • {step.player.points} pts
                             {step.player.weightSource === 'adaptive_weight' && <span className="text-emerald-400"> • ADAPTIVE</span>}
                             {step.player.weightSource === 'manual_override' && <span className="text-purple-400"> • OVERRIDE</span>}
                             {step.player.weightSource === 'peak_rank' && <span className="text-amber-400"> • PEAK</span>}
                             ) → Team {step.assignedTeam + 1}
                           </span>
                         </div>
                         <div className="text-xs text-slate-500 mt-1">{step.reasoning}</div>
                         {step.player.adaptiveReasoning && (
                           <div className="text-xs text-emerald-300 mt-1 italic">
                             Adaptive: {step.player.adaptiveReasoning}
                           </div>
                         )}
                       </div>
                     ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default DetailedBalanceAnalysis;