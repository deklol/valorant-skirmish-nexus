import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RefreshCw, AlertTriangle, CheckCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { RANK_POINT_MAPPING } from "@/utils/rankingSystem";

export function RankWeightSyncManager() {
  const [isLoading, setIsLoading] = useState(false);
  const [syncStats, setSyncStats] = useState<{
    total: number;
    updated: number;
    errors: number;
  } | null>(null);

  const syncPlayerWeights = async () => {
    setIsLoading(true);
    setSyncStats(null);
    
    try {
      // Get all users with ranks
      const { data: users, error: fetchError } = await supabase
        .from('users')
        .select('id, current_rank, peak_rank, weight_rating, manual_weight_override, use_manual_override')
        .not('current_rank', 'is', null);

      if (fetchError) throw fetchError;

      let updated = 0;
      let errors = 0;

      for (const user of users || []) {
        try {
          // Skip users with manual overrides enabled
          if (user.use_manual_override) {
            continue;
          }

          // Calculate new weight based on current system
          let newWeight = 150; // default
          
          if (user.current_rank && user.current_rank !== 'Unranked' && user.current_rank !== 'Unrated') {
            newWeight = RANK_POINT_MAPPING[user.current_rank] || 150;
          } else if (user.peak_rank) {
            newWeight = RANK_POINT_MAPPING[user.peak_rank] || 150;
          }

          // Only update if weight has changed
          if (user.weight_rating !== newWeight) {
            const { error: updateError } = await supabase
              .from('users')
              .update({ weight_rating: newWeight })
              .eq('id', user.id);

            if (updateError) {
              console.error(`Error updating user ${user.id}:`, updateError);
              errors++;
            } else {
              updated++;
            }
          }
        } catch (error) {
          console.error(`Error processing user ${user.id}:`, error);
          errors++;
        }
      }

      setSyncStats({
        total: users?.length || 0,
        updated,
        errors
      });

      if (errors === 0) {
        toast.success(`Successfully updated ${updated} player weights`);
      } else {
        toast.warning(`Updated ${updated} weights with ${errors} errors`);
      }

    } catch (error) {
      console.error('Error syncing player weights:', error);
      toast.error('Failed to sync player weights');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="text-foreground flex items-center gap-2">
          <RefreshCw className="w-5 h-5" />
          Rank Weight Sync
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-sm text-muted-foreground">
          <p className="mb-2">
            Synchronize all player weights with the current ranking system. This will:
          </p>
          <ul className="list-disc list-inside space-y-1 text-xs">
            <li>Update all non-manual override players to use current rank point values</li>
            <li>Apply peak rank fallback for unranked players</li>
            <li>Skip players with manual overrides enabled</li>
            <li>Use the latest RANK_POINT_MAPPING values</li>
          </ul>
        </div>

        {syncStats && (
          <div className="bg-muted/50 rounded-lg p-3 space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span>Sync completed</span>
            </div>
            <div className="grid grid-cols-3 gap-4 text-xs">
              <div>
                <div className="font-semibold">Total Players</div>
                <div className="text-muted-foreground">{syncStats.total}</div>
              </div>
              <div>
                <div className="font-semibold">Updated</div>
                <div className="text-green-600">{syncStats.updated}</div>
              </div>
              <div>
                <div className="font-semibold">Errors</div>
                <div className="text-red-600">{syncStats.errors}</div>
              </div>
            </div>
          </div>
        )}

        <div className="flex gap-2">
          <Button
            onClick={syncPlayerWeights}
            disabled={isLoading}
            className="flex-1"
          >
            {isLoading ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Syncing...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4 mr-2" />
                Sync All Player Weights
              </>
            )}
          </Button>
        </div>

        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-yellow-500 mt-0.5" />
            <div className="text-xs text-yellow-700 dark:text-yellow-300">
              <div className="font-semibold mb-1">Warning</div>
              <p>This operation will update player weights in the database. Make sure you have tested the new rank point values thoroughly before running this sync.</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}