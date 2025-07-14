import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogFooter, AlertDialogTitle, AlertDialogDescription, AlertDialogAction, AlertDialogCancel } from "@/components/ui/alert-dialog";
import { Progress } from "@/components/ui/progress";
import { BarChart, Database, RefreshCw, AlertTriangle, CheckCircle, Wrench } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface StatisticsIssue {
  type: 'missing_wins' | 'missing_losses' | 'missing_tournament_stats' | 'rank_inconsistency';
  severity: 'error' | 'warning' | 'info';
  description: string;
  count: number;
  canAutoFix: boolean;
}

export default function StatisticsMedicManager() {
  const [issues, setIssues] = useState<StatisticsIssue[]>([]);
  const [loading, setLoading] = useState(false);
  const [fixing, setFixing] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [selectedFix, setSelectedFix] = useState<StatisticsIssue | null>(null);
  const { toast } = useToast();

  const runStatisticsScan = async () => {
    setLoading(true);
    setScanProgress(0);
    setIssues([]);

    try {
      const foundIssues: StatisticsIssue[] = [];

      // Scan 1: Check for missing match statistics
      setScanProgress(25);
      const { data: missingWinsData, error: winsError } = await supabase.rpc('fix_missing_match_statistics');
      if (!winsError && missingWinsData?.[0]) {
        const stats = missingWinsData[0];
        if (stats.wins_added > 0 || stats.losses_added > 0) {
          foundIssues.push({
            type: 'missing_wins',
            severity: 'error',
            description: `Found ${stats.matches_processed} matches with missing win/loss statistics`,
            count: stats.matches_processed,
            canAutoFix: true
          });
        }
      }

      // Scan 2: Check for missing tournament statistics
      setScanProgress(50);
      const { data: missingTournamentData, error: tournamentError } = await supabase.rpc('fix_missing_tournament_wins');
      if (!tournamentError && missingTournamentData && missingTournamentData > 0) {
        foundIssues.push({
          type: 'missing_tournament_stats',
          severity: 'warning',
          description: `Found ${missingTournamentData} users with missing tournament win statistics`,
          count: missingTournamentData,
          canAutoFix: true
        });
      }

      // Scan 3: Check for rank inconsistencies
      setScanProgress(75);
      const { data: rankData, error: rankError } = await supabase
        .from('users')
        .select('id, current_rank, rank_points, manual_rank_override, use_manual_override')
        .not('current_rank', 'is', null);

      if (!rankError && rankData) {
        const rankInconsistencies = rankData.filter(user => {
          if (user.use_manual_override) return false; // Skip manually overridden users
          
          const expectedPoints = getRankPoints(user.current_rank);
          const actualPoints = user.rank_points || 0;
          return Math.abs(expectedPoints - actualPoints) > 50; // 50 point tolerance
        });

        if (rankInconsistencies.length > 0) {
          foundIssues.push({
            type: 'rank_inconsistency',
            severity: 'warning',
            description: `Found ${rankInconsistencies.length} users with rank/points inconsistencies`,
            count: rankInconsistencies.length,
            canAutoFix: false
          });
        }
      }

      // Scan 4: Check for general data integrity
      setScanProgress(90);
      const { data: integrityData, error: integrityError } = await supabase
        .from('users')
        .select('id, wins, losses, tournaments_played, tournaments_won')
        .or('wins.is.null,losses.is.null,tournaments_played.is.null,tournaments_won.is.null');

      if (!integrityError && integrityData && integrityData.length > 0) {
        foundIssues.push({
          type: 'missing_losses',
          severity: 'info',
          description: `Found ${integrityData.length} users with null statistics that should be initialized to 0`,
          count: integrityData.length,
          canAutoFix: true
        });
      }

      setScanProgress(100);
      setIssues(foundIssues);

      if (foundIssues.length === 0) {
        toast({
          title: "Statistics Scan Complete",
          description: "No issues found! All statistics appear to be correct."
        });
      } else {
        toast({
          title: "Statistics Scan Complete",
          description: `Found ${foundIssues.length} types of issues across the database.`
        });
      }
    } catch (error: any) {
      toast({
        title: "Scan Failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
      setScanProgress(0);
    }
  };

  const getRankPoints = (rank: string): number => {
    const rankMap: Record<string, number> = {
      'Iron 1': 10, 'Iron 2': 15, 'Iron 3': 20,
      'Bronze 1': 25, 'Bronze 2': 30, 'Bronze 3': 35,
      'Silver 1': 40, 'Silver 2': 50, 'Silver 3': 60,
      'Gold 1': 70, 'Gold 2': 80, 'Gold 3': 90,
      'Platinum 1': 100, 'Platinum 2': 115, 'Platinum 3': 130,
      'Diamond 1': 150, 'Diamond 2': 170, 'Diamond 3': 190,
      'Ascendant 1': 215, 'Ascendant 2': 240, 'Ascendant 3': 265,
      'Immortal 1': 300, 'Immortal 2': 350, 'Immortal 3': 400,
      'Radiant': 500
    };
    return rankMap[rank] || 150;
  };

  const fixIssue = async (issue: StatisticsIssue) => {
    setFixing(true);
    try {
      switch (issue.type) {
        case 'missing_wins':
          const { data: matchFixData, error: matchFixError } = await supabase.rpc('fix_missing_match_statistics');
          if (matchFixError) throw matchFixError;
          
          toast({
            title: "Match Statistics Fixed",
            description: `Fixed win/loss statistics for ${matchFixData?.[0]?.matches_processed || 0} matches`
          });
          break;

        case 'missing_tournament_stats':
          const { data: tournamentFixData, error: tournamentFixError } = await supabase.rpc('fix_missing_tournament_wins');
          if (tournamentFixError) throw tournamentFixError;
          
          toast({
            title: "Tournament Statistics Fixed",
            description: `Fixed tournament win statistics for ${tournamentFixData || 0} users`
          });
          break;

        case 'missing_losses':
          const { error: nullFixError } = await supabase
            .from('users')
            .update({
              wins: 0,
              losses: 0,
              tournaments_played: 0,
              tournaments_won: 0
            })
            .or('wins.is.null,losses.is.null,tournaments_played.is.null,tournaments_won.is.null');
          
          if (nullFixError) throw nullFixError;
          
          toast({
            title: "Null Statistics Fixed",
            description: "Initialized null statistics to 0 for all affected users"
          });
          break;

        default:
          toast({
            title: "Cannot Auto-Fix",
            description: "This issue type requires manual intervention",
            variant: "destructive"
          });
          return;
      }

      // Re-run scan to update issues list
      await runStatisticsScan();
    } catch (error: any) {
      toast({
        title: "Fix Failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setFixing(false);
      setShowConfirmDialog(false);
      setSelectedFix(null);
    }
  };

  const fixAllIssues = async () => {
    setFixing(true);
    let fixedCount = 0;
    
    try {
      for (const issue of issues.filter(i => i.canAutoFix)) {
        await fixIssue(issue);
        fixedCount++;
      }

      toast({
        title: "Bulk Fix Complete",
        description: `Fixed ${fixedCount} types of issues automatically`
      });
    } catch (error: any) {
      toast({
        title: "Bulk Fix Failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setFixing(false);
    }
  };

  const getIssueIcon = (severity: string) => {
    switch (severity) {
      case 'error': return <AlertTriangle className="w-4 h-4 text-red-400" />;
      case 'warning': return <AlertTriangle className="w-4 h-4 text-yellow-400" />;
      case 'info': return <CheckCircle className="w-4 h-4 text-blue-400" />;
      default: return <CheckCircle className="w-4 h-4 text-slate-400" />;
    }
  };

  const getIssueBadgeColor = (severity: string) => {
    switch (severity) {
      case 'error': return 'bg-red-500/20 text-red-400 border-red-500/40';
      case 'warning': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/40';
      case 'info': return 'bg-blue-500/20 text-blue-400 border-blue-500/40';
      default: return 'bg-slate-500/20 text-slate-400 border-slate-500/40';
    }
  };

  return (
    <div className="space-y-6">
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <BarChart className="w-5 h-5 text-green-400" />
            Statistics Medic Manager
            <span className="text-xs text-green-300">(Phase 3)</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          
          {/* Scan Controls */}
          <div className="flex gap-4 items-center">
            <Button
              onClick={runStatisticsScan}
              disabled={loading || fixing}
              className="bg-green-600 hover:bg-green-700"
            >
              <Database className="w-4 h-4 mr-2" />
              {loading ? 'Scanning...' : 'Run Statistics Scan'}
            </Button>
            
            {issues.length > 0 && (
              <Button
                onClick={fixAllIssues}
                disabled={loading || fixing || !issues.some(i => i.canAutoFix)}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Wrench className="w-4 h-4 mr-2" />
                {fixing ? 'Fixing...' : 'Fix All Auto-Fixable'}
              </Button>
            )}
          </div>

          {/* Scan Progress */}
          {loading && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Scanning database...</span>
                <span className="text-slate-400">{scanProgress}%</span>
              </div>
              <Progress value={scanProgress} className="h-2" />
            </div>
          )}

          {/* Issues List */}
          {issues.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-white font-medium">Statistics Issues Found:</h3>
              
              {issues.map((issue, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-4 bg-slate-900 rounded border border-slate-700"
                >
                  <div className="flex items-start gap-3 flex-1">
                    {getIssueIcon(issue.severity)}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge className={getIssueBadgeColor(issue.severity)}>
                          {issue.severity.toUpperCase()}
                        </Badge>
                        <Badge variant="outline" className="text-slate-400">
                          {issue.count} affected
                        </Badge>
                        {issue.canAutoFix && (
                          <Badge className="bg-green-500/20 text-green-400">
                            Auto-fixable
                          </Badge>
                        )}
                      </div>
                      <p className="text-slate-300">{issue.description}</p>
                    </div>
                  </div>
                  
                  {issue.canAutoFix && (
                    <Button
                      onClick={() => {
                        setSelectedFix(issue);
                        setShowConfirmDialog(true);
                      }}
                      disabled={fixing}
                      size="sm"
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <Wrench className="w-4 h-4 mr-1" />
                      Fix
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* No Issues Found */}
          {!loading && issues.length === 0 && (
            <div className="text-center py-8">
              <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-4" />
              <h3 className="text-white font-medium mb-2">All Statistics Look Good!</h3>
              <p className="text-slate-400">
                No issues were found in the last scan. Run a new scan to check for any new problems.
              </p>
            </div>
          )}

          {/* Statistics Overview */}
          <div className="border-t border-slate-700 pt-6">
            <h3 className="text-white font-medium mb-4">What This Tool Checks:</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-400" />
                  <span className="text-slate-300">Match win/loss statistics</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-400" />
                  <span className="text-slate-300">Tournament participation counts</span>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-400" />
                  <span className="text-slate-300">Rank/points consistency</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-400" />
                  <span className="text-slate-300">Null value initialization</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent className="bg-slate-800 border-slate-700">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Confirm Statistics Fix</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              Are you sure you want to fix this statistics issue? This will modify user statistics in the database.
              <br /><br />
              <strong>Issue:</strong> {selectedFix?.description}
              <br />
              <strong>Affected records:</strong> {selectedFix?.count}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-slate-700 border-slate-600 text-white hover:bg-slate-600">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => selectedFix && fixIssue(selectedFix)}
              className="bg-green-600 hover:bg-green-700"
            >
              Fix Issue
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}