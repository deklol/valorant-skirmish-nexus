import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp, RotateCcw, CheckCircle, XCircle, AlertTriangle, TrendingUp, Users, ArrowRightLeft } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

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

interface SwapSuggestionsSectionProps {
  swapAnalysis: SwapAnalysis;
}

const SwapSuggestionsSection = ({ swapAnalysis }: SwapSuggestionsSectionProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [expandedSuggestions, setExpandedSuggestions] = useState<Set<number>>(new Set());

  const toggleSuggestion = (index: number) => {
    const newExpanded = new Set(expandedSuggestions);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedSuggestions(newExpanded);
  };

  const getStrategyIcon = (strategy: string) => {
    switch (strategy) {
      case 'direct': return <ArrowRightLeft className="h-4 w-4" />;
      case 'secondary': return <Users className="h-4 w-4" />;
      case 'cascading': return <RotateCcw className="h-4 w-4" />;
      case 'fallback': return <AlertTriangle className="h-4 w-4" />;
      default: return <ArrowRightLeft className="h-4 w-4" />;
    }
  };

  const getStrategyName = (strategy: string) => {
    switch (strategy) {
      case 'direct': return 'Direct Swap';
      case 'secondary': return 'Secondary Swap';
      case 'cascading': return 'Cascading Swap';
      case 'fallback': return 'Fallback Move';
      default: return strategy;
    }
  };

  const getOutcomeIcon = (outcome: string) => {
    switch (outcome) {
      case 'executed': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'rejected': return <XCircle className="h-4 w-4 text-red-500" />;
      case 'considered': return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      default: return <AlertTriangle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getOutcomeBadgeColor = (outcome: string) => {
    switch (outcome) {
      case 'executed': return 'text-green-700 bg-green-50 border-green-200';
      case 'rejected': return 'text-red-700 bg-red-50 border-red-200';
      case 'considered': return 'text-yellow-700 bg-yellow-50 border-yellow-200';
      default: return 'text-gray-700 bg-gray-50 border-gray-200';
    }
  };

  const getOutcomeText = (outcome: string) => {
    switch (outcome) {
      case 'executed': return 'Executed';
      case 'rejected': return 'Rejected';
      case 'considered': return 'Considered';
      default: return outcome;
    }
  };

  const getFinalOutcomeColor = (outcome: string) => {
    switch (outcome) {
      case 'improved': return 'text-green-600 bg-green-50 border-green-200';
      case 'no_improvement': return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'fallback_used': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getFinalOutcomeText = (outcome: string) => {
    switch (outcome) {
      case 'improved': return 'Balance Improved';
      case 'no_improvement': return 'No Changes Needed';
      case 'fallback_used': return 'Fallback Applied';
      default: return outcome;
    }
  };

  const allSuggestions = [...swapAnalysis.successfulSwaps, ...swapAnalysis.rejectedSwaps];

  if (!swapAnalysis || swapAnalysis.totalSuggestionsConsidered === 0) {
    return null;
  }

  return (
    <Card className="border-secondary/20 bg-card/50 backdrop-blur-sm">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10">
              <RotateCcw className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <CardTitle className="text-lg text-foreground">ATLAS Swap Analysis</CardTitle>
              <p className="text-sm text-muted-foreground">
                Smart balancing decisions and alternative strategies
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge 
              variant="outline" 
              className={`px-3 py-1 ${getFinalOutcomeColor(swapAnalysis.finalOutcome)}`}
            >
              {getFinalOutcomeText(swapAnalysis.finalOutcome)}
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="h-8 w-8 p-0"
            >
              {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Summary Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <ArrowRightLeft className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium text-foreground">Strategies Tried</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{swapAnalysis.strategiesAttempted.length}</p>
            <p className="text-xs text-muted-foreground">
              {swapAnalysis.strategiesAttempted.map(s => getStrategyName(s)).join(', ')}
            </p>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span className="text-sm font-medium text-foreground">Successful Swaps</span>
            </div>
            <p className="text-2xl font-bold text-green-600">{swapAnalysis.successfulSwaps.length}</p>
            <p className="text-xs text-muted-foreground">Executed successfully</p>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <XCircle className="h-4 w-4 text-red-500" />
              <span className="text-sm font-medium text-foreground">Rejected Options</span>
            </div>
            <p className="text-2xl font-bold text-red-600">{swapAnalysis.rejectedSwaps.length}</p>
            <p className="text-xs text-muted-foreground">Not beneficial</p>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium text-foreground">Improvement</span>
            </div>
            <p className="text-2xl font-bold text-foreground">
              {swapAnalysis.overallImprovement > 0 ? '+' : ''}{swapAnalysis.overallImprovement.toFixed(1)}
            </p>
            <p className="text-xs text-muted-foreground">Point spread reduction</p>
          </div>
        </div>

        {/* Detailed Swap Analysis */}
        <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
          <CollapsibleContent className="space-y-4">
            <div className="border-t pt-4">
              <h4 className="text-sm font-medium text-foreground mb-3">Detailed Swap Decisions</h4>
              
              {allSuggestions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <RotateCcw className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No swap suggestions were generated</p>
                  <p className="text-xs">Teams were already optimally balanced</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {allSuggestions.map((suggestion, index) => (
                    <Card key={index} className="border border-secondary/10">
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {getStrategyIcon(suggestion.strategy)}
                            <span className="font-medium text-sm">
                              {getStrategyName(suggestion.strategy)}
                            </span>
                            {getOutcomeIcon(suggestion.outcome)}
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge 
                              variant="outline" 
                              className={`text-xs ${getOutcomeBadgeColor(suggestion.outcome)}`}
                            >
                              {getOutcomeText(suggestion.outcome)}
                            </Badge>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleSuggestion(index)}
                              className="h-6 w-6 p-0"
                            >
                              {expandedSuggestions.has(index) ? 
                                <ChevronUp className="h-3 w-3" /> : 
                                <ChevronDown className="h-3 w-3" />
                              }
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      
                      <CardContent className="pt-0">
                        <div className="space-y-2">
                          {/* Player swap summary */}
                          <div className="flex items-center gap-2 text-sm">
                            <span className="font-medium text-foreground">
                              {suggestion.player1.name}
                            </span>
                            <span className="text-muted-foreground">
                              ({suggestion.player1.rank}, {suggestion.player1.points}pts)
                            </span>
                            {suggestion.player2 && (
                              <>
                                <ArrowRightLeft className="h-3 w-3 text-muted-foreground" />
                                <span className="font-medium text-foreground">
                                  {suggestion.player2.name}
                                </span>
                                <span className="text-muted-foreground">
                                  ({suggestion.player2.rank}, {suggestion.player2.points}pts)
                                </span>
                              </>
                            )}
                          </div>
                          
                          {/* Expected improvement */}
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <TrendingUp className="h-3 w-3" />
                            <span>Expected improvement: {suggestion.expectedImprovement.toFixed(1)} points</span>
                            {suggestion.balanceImpact.violationResolved && (
                              <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                                Resolves Violation
                              </Badge>
                            )}
                          </div>
                          
                          {/* Rejection reason */}
                          {suggestion.outcome === 'rejected' && suggestion.rejectionReason && (
                            <div className="flex items-center gap-2 text-xs text-red-600">
                              <XCircle className="h-3 w-3" />
                              <span>{suggestion.rejectionReason}</span>
                            </div>
                          )}
                        </div>
                        
                        {/* Expanded details */}
                        <Collapsible open={expandedSuggestions.has(index)}>
                          <CollapsibleContent className="mt-3 pt-3 border-t border-secondary/10">
                            <div className="space-y-3 text-xs">
                              <div>
                                <span className="font-medium text-foreground">Reasoning:</span>
                                <p className="text-muted-foreground mt-1">{suggestion.reasoning}</p>
                              </div>
                              
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                  <span className="font-medium text-foreground">Balance Impact:</span>
                                  <div className="mt-1 space-y-1">
                                    <div className="flex justify-between">
                                      <span className="text-muted-foreground">Before:</span>
                                      <span className="text-foreground">{suggestion.balanceImpact.beforeBalance.toFixed(1)} pts</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-muted-foreground">After:</span>
                                      <span className="text-foreground">{suggestion.balanceImpact.afterBalance.toFixed(1)} pts</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-muted-foreground">Change:</span>
                                      <span className={suggestion.expectedImprovement > 0 ? 'text-green-600' : 'text-red-600'}>
                                        {suggestion.expectedImprovement > 0 ? '+' : ''}{suggestion.expectedImprovement.toFixed(1)} pts
                                      </span>
                                    </div>
                                  </div>
                                </div>
                                
                                <div>
                                  <span className="font-medium text-foreground">Team Changes:</span>
                                  <div className="mt-1 space-y-1">
                                    <div className="flex justify-between">
                                      <span className="text-muted-foreground">From Team:</span>
                                      <span className="text-foreground">Team {suggestion.player1.currentTeam + 1}</span>
                                    </div>
                                    {suggestion.player2 ? (
                                      <div className="flex justify-between">
                                        <span className="text-muted-foreground">To Team:</span>
                                        <span className="text-foreground">Team {suggestion.player2.currentTeam + 1}</span>
                                      </div>
                                    ) : suggestion.targetTeam !== undefined && (
                                      <div className="flex justify-between">
                                        <span className="text-muted-foreground">To Team:</span>
                                        <span className="text-foreground">Team {suggestion.targetTeam + 1}</span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </CollapsibleContent>
                        </Collapsible>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
};

export default SwapSuggestionsSection;