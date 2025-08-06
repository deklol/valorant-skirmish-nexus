// Detailed Balance Analysis Component
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, CheckCircle, TrendingUp, Copy, Download, BarChart3, Users, Brain, Settings, Zap } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { EvidenceTeamResult, EvidenceBalanceStep } from "./EvidenceBasedSnakeDraft";
import { getRankPointsWithManualOverride } from "@/utils/rankingSystemWithOverrides";

interface DetailedBalanceAnalysisProps {
  balanceResult: EvidenceTeamResult | null;
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

  const { teams, balanceSteps, finalAnalysis } = balanceResult;

  const getBalanceStatusIcon = () => {
    switch (finalAnalysis.pointBalance.balanceQuality) {
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
    switch (finalAnalysis.pointBalance.balanceQuality) {
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
    report += `Quality: ${finalAnalysis.pointBalance.balanceQuality.toUpperCase()}\n`;
    report += `Average Team Points: ${finalAnalysis.pointBalance.averageTeamPoints}\n`;
    report += `Point Range: ${finalAnalysis.pointBalance.minTeamPoints} - ${finalAnalysis.pointBalance.maxTeamPoints}\n`;
    report += `Max Difference: ${finalAnalysis.pointBalance.maxPointDifference} points\n\n`;

    // Team Breakdown
    report += `TEAM BREAKDOWN:\n`;
    teams.forEach((team, index) => {
      const teamTotal = team.reduce((sum, player) => {
        // Use ATLAS weights when available for consistency with UI
        if (player.adaptiveWeight) {
          return sum + player.adaptiveWeight;
        }
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
              {finalAnalysis.pointBalance.balanceQuality.toUpperCase()} BALANCE
            </Badge>
            <span className="text-slate-300">
              Max difference: {finalAnalysis.pointBalance.maxPointDifference} points
            </span>
          </div>

          {/* Balance Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-slate-700 rounded-lg p-3">
              <div className="text-slate-400 text-xs uppercase tracking-wide">Average</div>
              <div className="text-white text-lg font-semibold">{finalAnalysis.pointBalance.averageTeamPoints}</div>
            </div>
            <div className="bg-slate-700 rounded-lg p-3">
              <div className="text-slate-400 text-xs uppercase tracking-wide">Minimum</div>
              <div className="text-white text-lg font-semibold">{finalAnalysis.pointBalance.minTeamPoints}</div>
            </div>
            <div className="bg-slate-700 rounded-lg p-3">
              <div className="text-slate-400 text-xs uppercase tracking-wide">Maximum</div>
              <div className="text-white text-lg font-semibold">{finalAnalysis.pointBalance.maxTeamPoints}</div>
            </div>
            <div className="bg-slate-700 rounded-lg p-3">
              <div className="text-slate-400 text-xs uppercase tracking-wide">Difference</div>
              <div className={`text-lg font-semibold ${
                finalAnalysis.pointBalance.balanceQuality === 'ideal' ? 'text-green-400' :
                finalAnalysis.pointBalance.balanceQuality === 'good' ? 'text-blue-400' :
                finalAnalysis.pointBalance.balanceQuality === 'warning' ? 'text-yellow-400' : 'text-red-400'
              }`}>
                {finalAnalysis.pointBalance.maxPointDifference}
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
                  // Use ATLAS weights when available for consistency with UI
                  if (player.adaptiveWeight) {
                    return sum + player.adaptiveWeight;
                  }
                  const result = getRankPointsWithManualOverride(player);
                  return sum + result.points;
                }, 0);
                
                const differenceFromAverage = teamTotal - finalAnalysis.pointBalance.averageTeamPoints;
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
            const adaptiveCalculations = (balanceResult as any).adaptiveWeightCalculations;
            
            // Debug logging to see what we actually have
            console.log('🔍 DetailedBalanceAnalysis - Calculation data:', {
              evidenceCalculations: evidenceCalculations?.length || 0,
              adaptiveCalculations: adaptiveCalculations?.length || 0,
              balanceResultKeys: Object.keys(balanceResult || {}),
              sampleEvidence: evidenceCalculations?.[0],
              sampleAdaptive: adaptiveCalculations?.[0]
            });
            
            const calculations = evidenceCalculations || adaptiveCalculations;
            
            if (!calculations || calculations.length === 0) {
              console.log('⚠️ No calculations found to display');
              return null;
            }
            
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
                  <div className="space-y-4">
                     {balanceSteps.map((step, index) => {
                        // Parse ATLAS reasoning for better display - Updated to match actual format
                        const parseAtlasReasoning = (reasoning: string) => {
                          const sections = {
                            playerInfo: '',
                            atlasAnalysis: '',
                            evidenceFactors: '',
                            teamSelection: '',
                            balanceImpact: ''
                          };
                          
                          // Handle Smart Balancing format: 🏛️ ATLAS Smart Balancing: PlayerName (XXXpts) → Team X. ATLAS evaluated: ...
                          if (reasoning.includes('🏛️ ATLAS Smart Balancing:') && reasoning.includes('ATLAS evaluated:')) {
                            const mainParts = reasoning.split('ATLAS evaluated:');
                            sections.playerInfo = mainParts[0].replace('🏛️ ATLAS Smart Balancing:', '').trim();
                            
                            const remaining = mainParts[1];
                            
                            // Extract ATLAS analysis: "RankName rank worth XXXpts base"
                            if (remaining.includes('Evidence factors considered:')) {
                              const evidenceParts = remaining.split('Evidence factors considered:');
                              sections.atlasAnalysis = evidenceParts[0].trim();
                              
                              const afterEvidence = evidenceParts[1];
                              
                              // Extract evidence factors: "[factors]"
                              if (afterEvidence.includes('Team selection logic:')) {
                                const teamParts = afterEvidence.split('Team selection logic:');
                                sections.evidenceFactors = teamParts[0].replace(/[\[\]]/g, '').trim();
                                
                                // Extract team selection: "Chose team with lowest total..."
                                if (teamParts[1].includes('Post-assignment:')) {
                                  const balanceParts = teamParts[1].split('Post-assignment:');
                                  sections.teamSelection = balanceParts[0].trim();
                                  sections.balanceImpact = balanceParts[1].trim();
                                } else {
                                  sections.teamSelection = teamParts[1].trim();
                                }
                              }
                            } else {
                              // Handle case where there are no evidence factors
                              if (remaining.includes('Team selection logic:')) {
                                const teamParts = remaining.split('Team selection logic:');
                                sections.atlasAnalysis = teamParts[0].trim();
                                
                                if (teamParts[1].includes('Post-assignment:')) {
                                  const balanceParts = teamParts[1].split('Post-assignment:');
                                  sections.teamSelection = balanceParts[0].trim();
                                  sections.balanceImpact = balanceParts[1].trim();
                                } else {
                                  sections.teamSelection = teamParts[1].trim();
                                }
                              }
                            }
                          }
                          // Handle Elite Distribution format: 🏛️ ATLAS Elite Distribution: PlayerName (XXXpts) → Team X. ATLAS Analysis: ...
                          else if (reasoning.includes('🏛️ ATLAS Elite Distribution:')) {
                            const parts = reasoning.split('ATLAS Analysis:');
                            sections.playerInfo = parts[0].replace('🏛️ ATLAS Elite Distribution:', '').trim();
                            
                            if (parts[1]) {
                              const remaining = parts[1];
                              
                              if (remaining.includes('Evidence factors:')) {
                                const evidenceParts = remaining.split('Evidence factors:');
                                sections.atlasAnalysis = evidenceParts[0].trim();
                                
                                if (evidenceParts[1].includes('Elite skill distribution:')) {
                                  const skillParts = evidenceParts[1].split('Elite skill distribution:');
                                  sections.evidenceFactors = skillParts[0].replace(/[\[\]]/g, '').trim();
                                  sections.teamSelection = skillParts[1].trim();
                                }
                              } else {
                                sections.atlasAnalysis = remaining.trim();
                              }
                            }
                          }
                          
                          return sections;
                        };
                       
                       const isAtlasStep = step.reasoning.includes('🏛️ ATLAS');
                       const parsedReasoning = isAtlasStep ? parseAtlasReasoning(step.reasoning) : null;
                       
                       return (
                        <div key={index} className="border border-slate-600 rounded-lg p-4 bg-slate-800/50">
                          {/* Step Header */}
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-3">
                              <Badge variant="outline" className="text-slate-300 border-slate-500">
                                Step {step.step}
                              </Badge>
                              <span className="font-medium text-emerald-400 text-lg">{step.player.discord_username}</span>
                            </div>
                            <Badge className="bg-blue-600 text-white">
                              Team {step.assignedTeam + 1}
                            </Badge>
                          </div>
                          
                          {/* Player Info Bar */}
                          <div className="flex items-center gap-4 mb-3 p-2 bg-slate-700/50 rounded">
                            <div className="flex items-center gap-2">
                              <span className="text-slate-400 text-sm">Rank:</span>
                              <Badge variant="outline" className="text-white border-slate-500">
                                {step.player.rank}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-slate-400 text-sm">Points:</span>
                              <Badge className="bg-emerald-600 text-white">
                                {step.player.points} pts
                              </Badge>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-slate-400 text-sm">Source:</span>
                              <Badge 
                                className={
                                  step.player.weightSource === 'adaptive_weight' ? 'bg-emerald-600 text-white' :
                                  step.player.weightSource === 'manual_override' ? 'bg-purple-600 text-white' :
                                  step.player.weightSource === 'peak_rank' ? 'bg-amber-600 text-white' :
                                  'bg-slate-600 text-white'
                                }
                              >
                                {step.player.weightSource === 'adaptive_weight' ? 'ATLAS' :
                                 step.player.weightSource === 'manual_override' ? 'OVERRIDE' :
                                 step.player.weightSource === 'peak_rank' ? 'PEAK' : 'STANDARD'}
                              </Badge>
                            </div>
                          </div>
                          
                          {/* ATLAS Structured Reasoning */}
                          {isAtlasStep && parsedReasoning ? (
                            <div className="space-y-3">
                              {parsedReasoning.atlasAnalysis && (
                                <div className="bg-slate-700/30 rounded p-3">
                                  <div className="flex items-center gap-2 mb-2">
                                    <Brain className="w-4 h-4 text-emerald-400" />
                                    <span className="font-medium text-white text-sm">ATLAS Analysis</span>
                                  </div>
                                  <p className="text-slate-300 text-sm">{parsedReasoning.atlasAnalysis}</p>
                                </div>
                              )}
                              
                              {parsedReasoning.evidenceFactors && (
                                <div className="bg-slate-700/30 rounded p-3">
                                  <div className="flex items-center gap-2 mb-2">
                                    <TrendingUp className="w-4 h-4 text-blue-400" />
                                    <span className="font-medium text-white text-sm">Evidence Factors</span>
                                  </div>
                                  <div className="flex flex-wrap gap-1">
                                    {parsedReasoning.evidenceFactors.split(',').map((factor, i) => (
                                      <Badge key={i} variant="outline" className="text-xs border-blue-400 text-blue-400">
                                        {factor.trim()}
                                      </Badge>
                                    ))}
                                  </div>
                                </div>
                              )}
                              
                              {parsedReasoning.teamSelection && (
                                <div className="bg-slate-700/30 rounded p-3">
                                  <div className="flex items-center gap-2 mb-2">
                                    <Users className="w-4 h-4 text-purple-400" />
                                    <span className="font-medium text-white text-sm">Team Selection Logic</span>
                                  </div>
                                  <p className="text-slate-300 text-sm">{parsedReasoning.teamSelection}</p>
                                </div>
                              )}
                              
                              {parsedReasoning.balanceImpact && (
                                <div className="bg-slate-700/30 rounded p-3">
                                  <div className="flex items-center gap-2 mb-2">
                                    <BarChart3 className="w-4 h-4 text-yellow-400" />
                                    <span className="font-medium text-white text-sm">Balance Impact</span>
                                  </div>
                                  <p className="text-slate-300 text-sm">{parsedReasoning.balanceImpact}</p>
                                </div>
                              )}
                            </div>
                          ) : (
                            /* Fallback for non-ATLAS reasoning */
                            <div className="bg-slate-700/30 rounded p-3">
                              <div className="flex items-center gap-2 mb-2">
                                <Settings className="w-4 h-4 text-slate-400" />
                                <span className="font-medium text-white text-sm">Assignment Reasoning</span>
                              </div>
                              <p className="text-slate-300 text-sm">{step.reasoning}</p>
                            </div>
                          )}
                          
                           {/* Adaptive Reasoning (if present) */}
                          {step.player.evidenceReasoning && (
                            <div className="mt-3 bg-emerald-900/20 border border-emerald-500/30 rounded p-3">
                              <div className="flex items-center gap-2 mb-2">
                                <Zap className="w-4 h-4 text-emerald-400" />
                                <span className="font-medium text-emerald-400 text-sm">Adaptive Weight Details</span>
                              </div>
                              <p className="text-emerald-300 text-sm italic">{step.player.evidenceReasoning}</p>
                            </div>
                          )}
                          
                           {/* Current Team State After Assignment */}
                           {step.teamStatesAfter && step.teamStatesAfter.length > 0 && (
                             <div className="mt-3 pt-2 border-t border-slate-600">
                               <div className="text-xs text-slate-400 mb-1">Teams after assignment:</div>
                               <div className="grid grid-cols-2 gap-2 text-xs">
                                 {step.teamStatesAfter.slice(0, 4).map((teamState, teamIdx) => (
                                   <div key={teamIdx} className={`flex justify-between p-1 rounded ${
                                     teamState.teamIndex === step.assignedTeam ? 'bg-blue-600/20 border border-blue-500/30' : 'bg-slate-700/30'
                                   }`}>
                                     <span className="text-slate-300">Team {teamState.teamIndex + 1}</span>
                                     <span className="text-white font-medium">{teamState.totalPoints}pts</span>
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
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default DetailedBalanceAnalysis;