import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, Plus, AlertCircle, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface RandomPlayerRegistrationProps {
  tournamentId: string;
  onPlayersAdded: () => void;
}

export function RandomPlayerRegistration({ tournamentId, onPlayersAdded }: RandomPlayerRegistrationProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [playerCount, setPlayerCount] = useState<string>("10");
  const [lastAddedCount, setLastAddedCount] = useState<number | null>(null);

  const addRandomPlayers = async () => {
    if (!playerCount) {
      toast.error("Please select number of players to add");
      return;
    }

    setIsLoading(true);
    try {
      const count = parseInt(playerCount);

      // Get users who are NOT already registered for this tournament
      const { data: registeredUsers } = await supabase
        .from('tournament_signups')
        .select('user_id')
        .eq('tournament_id', tournamentId);

      const registeredUserIds = registeredUsers?.map(r => r.user_id) || [];

      // Get random users excluding already registered ones
      const { data: availableUsers, error: fetchError } = await supabase
        .from('users')
        .select('id, discord_username')
        .not('id', 'in', `(${registeredUserIds.length > 0 ? registeredUserIds.join(',') : 'null'})`)
        .not('discord_username', 'is', null)
        .limit(count * 2); // Get more than needed to ensure randomness

      if (fetchError) throw fetchError;

      if (!availableUsers || availableUsers.length === 0) {
        toast.error("No available users to add");
        return;
      }

      // Randomly select the requested number of users
      const shuffled = availableUsers.sort(() => 0.5 - Math.random());
      const selectedUsers = shuffled.slice(0, Math.min(count, availableUsers.length));

      // Add them to the tournament
      const signups = selectedUsers.map(user => ({
        tournament_id: tournamentId,
        user_id: user.id,
        is_substitute: false,
        is_checked_in: false,
        signed_up_at: new Date().toISOString()
      }));

      const { error: insertError } = await supabase
        .from('tournament_signups')
        .insert(signups);

      if (insertError) throw insertError;

      setLastAddedCount(selectedUsers.length);
      toast.success(`Successfully added ${selectedUsers.length} random players to the tournament`);
      onPlayersAdded();

    } catch (error) {
      console.error('Error adding random players:', error);
      toast.error('Failed to add random players');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="text-foreground flex items-center gap-2">
          <Users className="w-5 h-5" />
          Random Player Registration
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-sm text-muted-foreground">
          <p className="mb-2">
            Add random registered users to this tournament for testing purposes.
          </p>
          <ul className="list-disc list-inside space-y-1 text-xs">
            <li>Only adds users not already registered</li>
            <li>Randomly selects from available users</li>
            <li>Sets them as main players (not substitutes)</li>
            <li>Leaves them unchecked-in by default</li>
          </ul>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex-1">
            <label className="text-sm font-medium text-foreground mb-2 block">
              Number of Players
            </label>
            <Select value={playerCount} onValueChange={setPlayerCount}>
              <SelectTrigger>
                <SelectValue placeholder="Select count" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10 Players</SelectItem>
                <SelectItem value="20">20 Players</SelectItem>
                <SelectItem value="30">30 Players</SelectItem>
                <SelectItem value="40">40 Players</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex-1">
            <label className="text-sm font-medium text-foreground mb-2 block">
              Action
            </label>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  disabled={isLoading || !playerCount}
                  className="w-full"
                >
                  {isLoading ? (
                    <>
                      <Users className="w-4 h-4 mr-2 animate-pulse" />
                      Adding...
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4 mr-2" />
                      Add {playerCount} Players
                    </>
                  )}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Confirm Random Player Addition</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will add {playerCount} random users to the tournament. This action cannot be undone easily.
                    Are you sure you want to proceed?
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={addRandomPlayers}>
                    Add Players
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>

        {lastAddedCount !== null && (
          <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-500" />
              <div className="text-sm text-green-700 dark:text-green-300">
                Successfully added {lastAddedCount} random players to the tournament.
              </div>
            </div>
          </div>
        )}

        <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-blue-500 mt-0.5" />
            <div className="text-xs text-blue-700 dark:text-blue-300">
              <div className="font-semibold mb-1">Testing Feature</div>
              <p>This is designed for testing tournaments with random players. Only use this for test tournaments or when you need to quickly populate a tournament.</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}