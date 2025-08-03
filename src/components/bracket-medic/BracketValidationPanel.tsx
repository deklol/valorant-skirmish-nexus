import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Trash2, AlertTriangle, CheckCircle, RefreshCw, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface BracketValidationPanelProps {
  tournamentId: string;
  matches: any[];
  onCleanupComplete: () => void;
}

interface ValidationIssue {
  type: 'duplicate' | 'orphaned' | 'missing_teams' | 'invalid_results';
  severity: 'high' | 'medium' | 'low';
  message: string;
  matchId?: string;
  action?: () => Promise<void>;
}

export const BracketValidationPanel: React.FC<BracketValidationPanelProps> = ({
  tournamentId,
  matches,
  onCleanupComplete
}) => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isFixing, setIsFixing] = useState(false);
  const [issues, setIssues] = useState<ValidationIssue[]>([]);
  const { toast } = useToast();

  const analyzebracket = () => {
    setIsAnalyzing(true);
    const foundIssues: ValidationIssue[] = [];

    // Check for duplicate matches (same teams, same round)
    const matchGroups = new Map<string, any[]>();
    matches.forEach(match => {
      if (match.team1_id && match.team2_id) {
        const key = `${Math.min(match.team1_id, match.team2_id)}-${Math.max(match.team1_id, match.team2_id)}-${match.round_number}`;
        if (!matchGroups.has(key)) {
          matchGroups.set(key, []);
        }
        matchGroups.get(key)!.push(match);
      }
    });

    matchGroups.forEach((groupMatches, key) => {
      if (groupMatches.length > 1) {
        foundIssues.push({
          type: 'duplicate',
          severity: 'high',
          message: `Duplicate matches found: ${groupMatches.length} matches between ${groupMatches[0].team1?.name} and ${groupMatches[0].team2?.name} in round ${groupMatches[0].round_number}`,
          action: async () => {
            // Keep the first match, delete the rest
            const matchesToDelete = groupMatches.slice(1);
            for (const match of matchesToDelete) {
              await supabase.from('matches').delete().eq('id', match.id);
            }
          }
        });
      }
    });

    // Check for orphaned matches (no teams assigned)
    matches.forEach(match => {
      if (!match.team1_id && !match.team2_id) {
        foundIssues.push({
          type: 'orphaned',
          severity: 'medium',
          message: `Orphaned match found: Round ${match.round_number}, Match ${match.match_number} has no teams assigned`,
          matchId: match.id,
          action: async () => {
            await supabase.from('matches').delete().eq('id', match.id);
          }
        });
      }
    });

    // Check for matches with only one team
    matches.forEach(match => {
      if ((match.team1_id && !match.team2_id) || (!match.team1_id && match.team2_id)) {
        foundIssues.push({
          type: 'missing_teams',
          severity: 'medium',
          message: `Incomplete match: Round ${match.round_number}, Match ${match.match_number} is missing one team`,
          matchId: match.id
        });
      }
    });

    // Check for invalid results (winner not matching teams, impossible scores)
    matches.forEach(match => {
      if (match.status === 'completed') {
        if (match.winner_id && match.winner_id !== match.team1_id && match.winner_id !== match.team2_id) {
          foundIssues.push({
            type: 'invalid_results',
            severity: 'high',
            message: `Invalid winner: Round ${match.round_number}, Match ${match.match_number} has a winner that doesn't match either team`,
            matchId: match.id,
            action: async () => {
              await supabase.from('matches').update({
                winner_id: null,
                status: 'pending',
                completed_at: null
              }).eq('id', match.id);
            }
          });
        }

        if (match.score_team1 < 0 || match.score_team2 < 0) {
          foundIssues.push({
            type: 'invalid_results',
            severity: 'medium',
            message: `Invalid scores: Round ${match.round_number}, Match ${match.match_number} has negative scores`,
            matchId: match.id,
            action: async () => {
              await supabase.from('matches').update({
                score_team1: 0,
                score_team2: 0,
                winner_id: null,
                status: 'pending',
                completed_at: null
              }).eq('id', match.id);
            }
          });
        }
      }
    });

    setIssues(foundIssues);
    setIsAnalyzing(false);

    toast({
      title: "Analysis Complete",
      description: `Found ${foundIssues.length} issue${foundIssues.length !== 1 ? 's' : ''} in the bracket.`,
    });
  };

  const fixIssue = async (issue: ValidationIssue) => {
    if (!issue.action) return;

    try {
      await issue.action();
      toast({
        title: "Issue Fixed",
        description: "The issue has been resolved successfully.",
      });
      
      // Remove the fixed issue from the list
      setIssues(prev => prev.filter(i => i !== issue));
      onCleanupComplete();
    } catch (error) {
      console.error('Error fixing issue:', error);
      toast({
        title: "Error",
        description: "Failed to fix the issue.",
        variant: "destructive",
      });
    }
  };

  const fixAllIssues = async () => {
    setIsFixing(true);
    let fixedCount = 0;
    
    for (const issue of issues) {
      if (issue.action) {
        try {
          await issue.action();
          fixedCount++;
        } catch (error) {
          console.error('Error fixing issue:', error);
        }
      }
    }

    setIssues([]);
    setIsFixing(false);
    onCleanupComplete();

    toast({
      title: "Cleanup Complete",
      description: `Fixed ${fixedCount} issue${fixedCount !== 1 ? 's' : ''}.`,
    });
  };

  const getSeverityBadge = (severity: string) => {
    const variants = {
      'high': 'destructive',
      'medium': 'default',
      'low': 'secondary'
    } as const;
    
    return (
      <Badge variant={variants[severity as keyof typeof variants]}>
        {severity.toUpperCase()}
      </Badge>
    );
  };

  const getIssueIcon = (type: string) => {
    switch (type) {
      case 'duplicate':
      case 'invalid_results':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'orphaned':
        return <Trash2 className="h-4 w-4 text-orange-500" />;
      case 'missing_teams':
        return <X className="h-4 w-4 text-yellow-500" />;
      default:
        return <AlertTriangle className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-sm text-muted-foreground">
        Analyze the bracket for common issues and fix them automatically. This includes duplicate matches, 
        orphaned matches, invalid results, and missing team assignments.
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Bracket Analysis</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Button onClick={analyzebracket} disabled={isAnalyzing}>
              <RefreshCw className={`h-4 w-4 mr-2 ${isAnalyzing ? 'animate-spin' : ''}`} />
              {isAnalyzing ? 'Analyzing...' : 'Analyze Bracket'}
            </Button>
            
            {issues.length > 0 && (
              <Button 
                onClick={fixAllIssues} 
                disabled={isFixing}
                variant="destructive"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                {isFixing ? 'Fixing...' : `Fix All (${issues.length})`}
              </Button>
            )}
          </div>

          {issues.length === 0 && !isAnalyzing && (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                No issues found in the bracket. Everything looks good!
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {issues.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              Issues Found ({issues.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {issues.map((issue, index) => (
              <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  {getIssueIcon(issue.type)}
                  <div className="flex-1">
                    <div className="text-sm">{issue.message}</div>
                  </div>
                  {getSeverityBadge(issue.severity)}
                </div>
                {issue.action && (
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => fixIssue(issue)}
                  >
                    Fix
                  </Button>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          <strong>Note:</strong> All cleanup actions are permanent and will be logged for audit purposes. 
          Make sure to review issues carefully before applying fixes.
        </AlertDescription>
      </Alert>
    </div>
  );
};
