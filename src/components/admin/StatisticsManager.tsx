import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { BarChart3, RefreshCw, CheckCircle, AlertTriangle, Info, RotateCcw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

const StatisticsManager = () => {
  const { isAdmin } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [recalculateLoading, setRecalculateLoading] = useState(false);
  const [showRecalculateConfirm, setShowRecalculateConfirm] = useState(false);
  const [results, setResults] = useState<{
    matches_processed: number;
    wins_added: number;
    losses_added: number;
  } | null>(null);
  const [recalculateResults, setRecalculateResults] = useState<{
    users_updated: number;
    total_wins: number;
    total_losses: number;
    total_tournament_wins: number;
    total_tournaments_played: number;
  } | null>(null);

  const handleFixStatistics = async () => {
    if (!isAdmin) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('fix_missing_match_statistics');
      
      if (error) throw error;
      
      if (data && data[0]) {
        setResults(data[0]);
        toast({
          title: "Statistics Fixed!",
          description: `Processed ${data[0].matches_processed} matches, added ${data[0].wins_added} wins and ${data[0].losses_added} losses`,
        });
      }
    } catch (error: any) {
      console.error('Error fixing statistics:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to fix statistics",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRecalculateStatistics = async () => {
    if (!isAdmin) return;
    
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

  if (!isAdmin) {
    return null;
  }

  return (
    <>
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-blue-400" />
            Match Statistics Manager
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert className="bg-blue-500/10 border-blue-500/30">
            <Info className="h-4 w-4" />
            <AlertDescription className="text-blue-200">
              This tool fixes missing match win/loss statistics for players. New matches will automatically 
              have statistics applied via database triggers.
            </AlertDescription>
          </Alert>

          <div className="space-y-3">
            <h4 className="text-white font-medium">Automatic Statistics Features:</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="flex items-center gap-2 text-slate-300">
                <CheckCircle className="w-4 h-4 text-green-400" />
                <span className="text-sm">Match completion triggers</span>
              </div>
              <div className="flex items-center gap-2 text-slate-300">
                <CheckCircle className="w-4 h-4 text-green-400" />
                <span className="text-sm">Tournament completion triggers</span>
              </div>
              <div className="flex items-center gap-2 text-slate-300">
                <CheckCircle className="w-4 h-4 text-green-400" />
                <span className="text-sm">Team member win/loss tracking</span>
              </div>
              <div className="flex items-center gap-2 text-slate-300">
                <CheckCircle className="w-4 h-4 text-green-400" />
                <span className="text-sm">Tournament deletion reversal</span>
              </div>
            </div>
          </div>

          {results && (
            <Alert className="bg-green-500/10 border-green-500/30">
              <CheckCircle className="h-4 w-4" />
              <AlertDescription className="text-green-200">
                <div className="space-y-2">
                  <div className="font-medium">Backfill Results:</div>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <Badge variant="secondary" className="bg-blue-600/20 text-blue-400">
                        {results.matches_processed}
                      </Badge>
                      <div className="mt-1">Matches Processed</div>
                    </div>
                    <div>
                      <Badge variant="secondary" className="bg-green-600/20 text-green-400">
                        {results.wins_added}
                      </Badge>
                      <div className="mt-1">Wins Added</div>
                    </div>
                    <div>
                      <Badge variant="secondary" className="bg-red-600/20 text-red-400">
                        {results.losses_added}
                      </Badge>
                      <div className="mt-1">Losses Added</div>
                    </div>
                  </div>
                </div>
              </AlertDescription>
            </Alert>
          )}

          <div className="pt-4">
            <Button
              onClick={handleFixStatistics}
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Fixing Statistics...
                </>
              ) : (
                <>
                  <BarChart3 className="w-4 h-4 mr-2" />
                  Fix Missing Match Statistics
                </>
              )}
            </Button>
            
            <Alert className="mt-3 bg-yellow-500/10 border-yellow-500/30">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="text-yellow-200 text-sm">
                This will backfill missing statistics for all completed matches. 
                Run this once to fix existing data. Future matches will be handled automatically.
              </AlertDescription>
            </Alert>
          </div>

          {/* Full Recalculation Section */}
          <div className="pt-6 border-t border-slate-700">
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
              disabled={recalculateLoading}
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
    </>
  );
};

export default StatisticsManager;