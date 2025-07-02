import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { BarChart3, RefreshCw, CheckCircle, AlertTriangle, Info } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

const StatisticsManager = () => {
  const { isAdmin } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<{
    matches_processed: number;
    wins_added: number;
    losses_added: number;
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

  if (!isAdmin) {
    return null;
  }

  return (
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
      </CardContent>
    </Card>
  );
};

export default StatisticsManager;