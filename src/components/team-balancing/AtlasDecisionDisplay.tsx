import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Brain, HelpCircle, TrendingUp, Zap, Settings, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";
import { EnhancedTeamResult } from "./EnhancedSnakeDraft";
import { EvidenceTeamResult } from "./EvidenceBasedSnakeDraft";

interface AtlasDecisionDisplayProps {
  balanceResult: EnhancedTeamResult | EvidenceTeamResult | null;
  isVisible: boolean;
  tournamentName?: string;
}

const AtlasDecisionDisplay = ({ balanceResult, isVisible, tournamentName }: AtlasDecisionDisplayProps) => {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!isVisible || !balanceResult) return null;

  // Check if this is an ATLAS result (either Enhanced or Evidence-based)
  const isEnhancedResult = 'adaptiveWeightCalculations' in balanceResult;
  const isEvidenceResult = 'evidenceCalculations' in balanceResult;
  const isAtlasResult = isEnhancedResult || isEvidenceResult;
  
  if (!isAtlasResult) return null;

  // Get the calculations from either result type
  const atlasCalculations = isEnhancedResult 
    ? (balanceResult.adaptiveWeightCalculations || [])
    : (balanceResult as any).evidenceCalculations || [];

  // Get balance info from either result type
  const balanceInfo = isEnhancedResult 
    ? balanceResult.finalBalance
    : (balanceResult as any).finalAnalysis?.pointBalance;

  return (
    <Card className="bg-gradient-to-br from-emerald-900/20 to-blue-900/20 border-emerald-500/30">
      <CardHeader className="pb-3">
        <CardTitle className="text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-emerald-400" />
            ATLAS Decision System
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <HelpCircle className="w-4 h-4 text-slate-400 cursor-help" />
                </TooltipTrigger>
                <TooltipContent className="max-w-md">
                  <div className="space-y-2">
                    <p className="font-medium">Advanced Team Learning & Assignment System</p>
                    <p>ATLAS uses AI-powered analysis to:</p>
                    <ul className="list-disc pl-4 space-y-1 text-sm">
                      <li>Analyze rank decay patterns over time</li>
                      <li>Factor in tournament win history</li>
                      <li>Apply skill-based weight adjustments</li>
                      <li>Prevent skill stacking in teams</li>
                      <li>Create more balanced and competitive matches</li>
                    </ul>
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-emerald-400 hover:text-emerald-300"
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </Button>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-slate-700/50 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-emerald-400">{atlasCalculations.length}</div>
            <div className="text-xs text-slate-400">Players Analyzed</div>
          </div>
          <div className="bg-slate-700/50 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-blue-400">{balanceInfo?.balanceQuality || 'N/A'}</div>
            <div className="text-xs text-slate-400">Balance Quality</div>
          </div>
          <div className="bg-slate-700/50 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-yellow-400">{balanceInfo?.maxPointDifference || balanceInfo?.maxDifference || 'N/A'}</div>
            <div className="text-xs text-slate-400">Max Difference</div>
          </div>
        </div>

        {/* Expanded Details */}
        {isExpanded && (
          <div className="space-y-4">
            <div className="border-t border-slate-600 pt-4">
              <h4 className="text-white font-medium mb-3 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-400" />
                ATLAS Adaptive Weight Calculations
              </h4>
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {atlasCalculations.map((calc, index) => {
                  const player = balanceResult.balanceSteps?.find(step => step.player.id === calc.userId);
                  return (
                    <div key={index} className="bg-slate-700/30 rounded-lg p-3 border border-slate-600/50">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-white font-medium">
                          {player?.player.discord_username || 'Unknown Player'}
                        </span>
                        <Badge className="bg-emerald-600 text-white">
                          {calc.calculation.calculatedAdaptiveWeight || calc.calculation.finalPoints} pts
                        </Badge>
                      </div>
                      
                      <div className="text-sm text-slate-300 mb-2">
                        <strong>ATLAS Analysis:</strong> {calc.calculation.calculationReasoning}
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3 text-xs text-slate-400">
                        <div>
                          <span className="font-medium">Current Rank:</span> 
                          <span className="ml-1">{calc.calculation.currentRank || 'Unranked'} ({calc.calculation.currentRankPoints} pts)</span>
                        </div>
                        <div>
                          <span className="font-medium">Peak Rank:</span> 
                          <span className="ml-1">{calc.calculation.peakRank || 'N/A'} ({calc.calculation.peakRankPoints} pts)</span>
                        </div>
                        {calc.calculation.adaptiveFactor !== undefined && (
                          <div>
                            <span className="font-medium">Adaptive Factor:</span> 
                            <span className="ml-1 text-emerald-400">{Math.round(calc.calculation.adaptiveFactor * 100)}%</span>
                          </div>
                        )}
                        <div>
                          <span className="font-medium">Weight Source:</span> 
                          <span className="ml-1">{calc.calculation.weightSource?.replace('_', ' ') || 'ATLAS'}</span>
                        </div>
                        {calc.calculation.rankDecayFactor !== undefined && (
                          <div>
                            <span className="font-medium">Rank Decay:</span> 
                            <span className="ml-1 text-amber-400">{Math.round(calc.calculation.rankDecayFactor * 100)}%</span>
                          </div>
                        )}
                        {calc.calculation.tournamentsWon > 0 && (
                          <div>
                            <span className="font-medium">Tournaments Won:</span> 
                            <span className="ml-1 text-yellow-400">{calc.calculation.tournamentsWon}</span>
                          </div>
                        )}
                      </div>
                      
                      {/* Evidence factors */}
                      {calc.calculation.evidenceFactors && calc.calculation.evidenceFactors.length > 0 && (
                        <div className="mt-2 pt-2 border-t border-slate-600">
                          <div className="text-xs text-slate-400">
                            <span className="font-medium">Evidence Factors:</span>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {calc.calculation.evidenceFactors.map((factor: string, i: number) => (
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

            {/* ATLAS Methodology */}
            <div className="border-t border-slate-600 pt-4">
              <h4 className="text-white font-medium mb-2 flex items-center gap-2">
                <Brain className="w-4 h-4 text-blue-400" />
                How ATLAS Works
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-slate-300">
                <div className="space-y-2">
                  <div className="flex items-start gap-2">
                    <TrendingUp className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="font-medium">Rank Decay Analysis</div>
                      <div className="text-xs text-slate-400">Adjusts weights based on time since peak rank</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Zap className="w-4 h-4 text-yellow-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="font-medium">Tournament History</div>
                      <div className="text-xs text-slate-400">Factors in past tournament wins and performance</div>
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-start gap-2">
                    <Settings className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="font-medium">Skill Distribution</div>
                      <div className="text-xs text-slate-400">Prevents stacking of elite players on same team</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Brain className="w-4 h-4 text-purple-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="font-medium">AI Validation</div>
                      <div className="text-xs text-slate-400">Mini-AI system validates and refines assignments</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AtlasDecisionDisplay;