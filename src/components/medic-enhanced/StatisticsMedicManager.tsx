import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogFooter, AlertDialogTitle, AlertDialogDescription, AlertDialogAction, AlertDialogCancel } from "@/components/ui/alert-dialog";
import { Progress } from "@/components/ui/progress";
import { BarChart, Database, RefreshCw, AlertTriangle, CheckCircle, Wrench, RotateCcw } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
  const [showRecalculateConfirm, setShowRecalculateConfirm] = useState(false);
  const [recalculateLoading, setRecalculateLoading] = useState(false);
  const [selectedFix, setSelectedFix] = useState<StatisticsIssue | null>(null);
  const [recalculateResults, setRecalculateResults] = useState<{
    users_updated: number;
    total_wins: number;
    total_losses: number;
    total_tournament_wins: number;
    total_tournaments_played: number;
  } | null>(null);
  const { toast } = useToast();

  const runStatisticsScan = async () => {
    console.log("🔄 StatisticsMedic: Starting comprehensive statistics scan");
    setLoading(true);
    setScanProgress(0);
    setIssues([]);

    try {
      const foundIssues: StatisticsIssue[] = [];

      // Scan 1: Check for missing match statistics
      console.log("📊 StatisticsMedic: Checking match statistics (25%)");
      setScanProgress(25);
      const { data: missingWinsData, error: winsError } = await supabase.rpc('fix_missing_match_statistics');
      if (!winsError && missingWinsData?.[0]) {
        const stats = missingWinsData[0];
        console.log("📈 StatisticsMedic: Match statistics scan results:", stats);
        if (stats.wins_added > 0 || stats.losses_added > 0) {
          foundIssues.push({
            type: 'missing_wins',
            severity: 'error',
            description: `Found ${stats.matches_processed} matches with missing win/loss statistics`,
            count: stats.matches_processed,
            canAutoFix: true
          });
          console.log(`⚠️ StatisticsMedic: Found ${stats.matches_processed} matches with missing statistics`);
        }
      } else if (winsError) {
        console.error("❌ StatisticsMedic: Match statistics scan failed:", winsError);
      }

      // Scan 2: Check for missing tournament statistics
      console.log("🏆 StatisticsMedic: Checking tournament statistics (50%)");
      setScanProgress(50);
      const { data: missingTournamentData, error: tournamentError } = await supabase.rpc('fix_missing_tournament_wins');
      if (!tournamentError && missingTournamentData && missingTournamentData > 0) {
        console.log(`⚠️ StatisticsMedic: Found ${missingTournamentData} users with missing tournament statistics`);
        foundIssues.push({
          type: 'missing_tournament_stats',
          severity: 'warning',
          description: `Found ${missingTournamentData} users with missing tournament win statistics`,
          count: missingTournamentData,
          canAutoFix: true
        });
      } else if (tournamentError) {
        console.error("❌ StatisticsMedic: Tournament statistics scan failed:", tournamentError);
      }

      // Scan 3: Check for rank inconsistencies
      console.log("⭐ StatisticsMedic: Checking rank consistency (75%)");
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

        console.log(`🔍 StatisticsMedic: Checked ${rankData.length} users for rank consistency, found ${rankInconsistencies.length} inconsistencies`);

        if (rankInconsistencies.length > 0) {
          foundIssues.push({
            type: 'rank_inconsistency',
            severity: 'warning',
            description: `Found ${rankInconsistencies.length} users with rank/points inconsistencies`,
            count: rankInconsistencies.length,
            canAutoFix: false
          });
        }
      } else if (rankError) {
        console.error("❌ StatisticsMedic: Rank consistency scan failed:", rankError);
      }

      // Scan 4: Check for general data integrity
      console.log("🔧 StatisticsMedic: Checking data integrity (90%)");
      setScanProgress(90);
      const { data: integrityData, error: integrityError } = await supabase
        .from('users')
        .select('id, wins, losses, tournaments_played, tournaments_won')
        .or('wins.is.null,losses.is.null,tournaments_played.is.null,tournaments_won.is.null');

      if (!integrityError && integrityData && integrityData.length > 0) {
        console.log(`⚠️ StatisticsMedic: Found ${integrityData.length} users with null statistics`);
        foundIssues.push({
          type: 'missing_losses',
          severity: 'info',
          description: `Found ${integrityData.length} users with null statistics that should be initialized to 0`,
          count: integrityData.length,
          canAutoFix: true
        });
      } else if (integrityError) {
        console.error("❌ StatisticsMedic: Data integrity scan failed:", integrityError);
      }

      setScanProgress(100);
      setIssues(foundIssues);

      console.log(`✅ StatisticsMedic: Scan complete - found ${foundIssues.length} types of issues:`, foundIssues.map(i => `${i.type} (${i.count})`));

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
      'Iron 1': 25, 'Iron 2': 40, 'Iron 3': 55,
      'Bronze 1': 75, 'Bronze 2': 90, 'Bronze 3': 105,
      'Silver 1': 125, 'Silver 2': 140, 'Silver 3': 155,
      'Gold 1': 180, 'Gold 2': 195, 'Gold 3': 210,
      'Platinum 1': 230, 'Platinum 2': 245, 'Platinum 3': 260,
      'Diamond 1': 285, 'Diamond 2': 300, 'Diamond 3': 315,
      'Ascendant 1': 335, 'Ascendant 2': 350, 'Ascendant 3': 365,
      'Immortal 1': 395, 'Immortal 2': 410, 'Immortal 3': 440,
      'Radiant': 500
    };
    return rankMap[rank] || 150;
  };

  const fixIssue = async (issue: StatisticsIssue) => {
    console.log(`🔧 StatisticsMedic: Fixing issue type ${issue.type} affecting ${issue.count} records`);
    setFixing(true);
    try {
      switch (issue.type) {
        case 'missing_wins':
          console.log("🔄 StatisticsMedic: Running fix_missing_match_statistics");
          const { data: matchFixData, error: matchFixError } = await supabase.rpc('fix_missing_match_statistics');
          if (matchFixError) throw matchFixError;
          
          console.log("✅ StatisticsMedic: Match statistics fix completed:", matchFixData);
          toast({
            title: "Match Statistics Fixed",
            description: `Fixed win/loss statistics for ${matchFixData?.[0]?.matches_processed || 0} matches`
          });
          break;

        case 'missing_tournament_stats':
          console.log("🔄 StatisticsMedic: Running fix_missing_tournament_wins");
          const { data: tournamentFixData, error: tournamentFixError } = await supabase.rpc('fix_missing_tournament_wins');
          if (tournamentFixError) throw tournamentFixError;
          
          console.log("✅ StatisticsMedic: Tournament statistics fix completed:", tournamentFixData);
          toast({
            title: "Tournament Statistics Fixed",
            description: `Fixed tournament win statistics for ${tournamentFixData || 0} users`
          });
          break;

        case 'missing_losses':
          console.log("🔄 StatisticsMedic: Initializing null statistics to 0");
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
          
          console.log("✅ StatisticsMedic: Null statistics initialized successfully");
          toast({
            title: "Null Statistics Fixed",
            description: "Initialized null statistics to 0 for all affected users"
          });
          break;

        default:
          console.warn(`⚠️ StatisticsMedic: Cannot auto-fix issue type: ${issue.type}`);
          toast({
            title: "Cannot Auto-Fix",
            description: "This issue type requires manual intervention",
            variant: "destructive"
          });
          return;
      }

      // Re-run scan to update issues list
      console.log("🔄 StatisticsMedic: Re-running scan to verify fixes");
      await runStatisticsScan();
    } catch (error: any) {
      console.error(`❌ StatisticsMedic: Fix failed for ${issue.type}:`, error);
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

  const handleRecalculateStatistics = async () => {
    setRecalculateLoading(true);
    setShowRecalculateConfirm(false);
    try {
      const { data, error } = await supabase.rpc('recalculate_all_user_statistics');
      
      if (error) throw error;
      
      if (data && data[0]) {
        setRecalculateResults(data[0]);
        toast({
          title: "Statistics Recalculated!",
          description: `Updated ${data[0].users_updated} users. Total: ${data[0].total_wins} wins, ${data[0].total_losses} losses, ${data[0].total_tournament_wins} tournament wins`,
        });
      }
    } catch (error: any) {
      console.error('Error recalculating statistics:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to recalculate statistics",
        variant: "destructive",
      });
    } finally {
      setRecalculateLoading(false);
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

          {/* Full Recalculation Section */}
          <div className="border-t border-slate-700 pt-6">
            <h4 className="text-white font-medium mb-3 flex items-center gap-2">
              <RotateCcw className="w-4 h-4 text-orange-400" />
              Full Statistics Recalculation
            </h4>
            
            <Alert className="bg-orange-500/10 border-orange-500/30 mb-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="text-orange-200 text-sm">
                This will <strong>reset ALL user statistics to zero</strong> and recalculate from ground truth 
                (completed matches in completed tournaments only). Use this to fix inflated or incorrect statistics.
              </AlertDescription>
            </Alert>

            {recalculateResults && (
              <Alert className="bg-green-500/10 border-green-500/30 mb-4">
                <CheckCircle className="h-4 w-4" />
                <AlertDescription className="text-green-200">
                  <div className="space-y-2">
                    <div className="font-medium">Recalculation Results:</div>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-sm">
                      <div>
                        <Badge variant="secondary" className="bg-blue-600/20 text-blue-400">
                          {recalculateResults.users_updated}
                        </Badge>
                        <div className="mt-1">Users Updated</div>
                      </div>
                      <div>
                        <Badge variant="secondary" className="bg-green-600/20 text-green-400">
                          {recalculateResults.total_wins}
                        </Badge>
                        <div className="mt-1">Total Wins</div>
                      </div>
                      <div>
                        <Badge variant="secondary" className="bg-red-600/20 text-red-400">
                          {recalculateResults.total_losses}
                        </Badge>
                        <div className="mt-1">Total Losses</div>
                      </div>
                      <div>
                        <Badge variant="secondary" className="bg-yellow-600/20 text-yellow-400">
                          {recalculateResults.total_tournament_wins}
                        </Badge>
                        <div className="mt-1">Tournament Wins</div>
                      </div>
                      <div>
                        <Badge variant="secondary" className="bg-purple-600/20 text-purple-400">
                          {recalculateResults.total_tournaments_played}
                        </Badge>
                        <div className="mt-1">Tournaments Played</div>
                      </div>
                    </div>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            <Button
              onClick={() => setShowRecalculateConfirm(true)}
              disabled={recalculateLoading || loading || fixing}
              variant="destructive"
              className="w-full"
            >
              {recalculateLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Recalculating Statistics...
                </>
              ) : (
                <>
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Recalculate All Statistics from Ground Truth
                </>
              )}
            </Button>
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

      {/* Recalculate Confirmation Dialog */}
      <AlertDialog open={showRecalculateConfirm} onOpenChange={setShowRecalculateConfirm}>
        <AlertDialogContent className="bg-slate-800 border-slate-700">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Recalculate All Statistics?</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-300">
              This will <strong className="text-orange-400">reset ALL user statistics to zero</strong> and recalculate them 
              from completed matches in completed tournaments only. This action cannot be undone.
              <br /><br />
              Use this if statistics are inflated due to:
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Matches from non-completed tournaments being counted</li>
                <li>Double-counting from match result resubmissions</li>
                <li>Orphaned statistics from deleted or reset tournaments</li>
              </ul>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-slate-700 text-white hover:bg-slate-600">Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleRecalculateStatistics}
              className="bg-red-600 hover:bg-red-700"
            >
              Yes, Recalculate All
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}