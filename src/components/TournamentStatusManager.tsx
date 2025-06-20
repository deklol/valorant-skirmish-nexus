
import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogFooter, AlertDialogTitle, AlertDialogDescription, AlertDialogAction, AlertDialogCancel } from "@/components/ui/alert-dialog";
import { Settings, Play, Square, Archive, Edit } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { completeTournament } from "@/utils/completeTournament";

interface TournamentStatusManagerProps {
  tournamentId: string;
  currentStatus: string;
  onStatusChange: () => void;
}

const TOURNAMENT_STATUSES = [
  { value: 'draft', label: 'Draft', color: 'bg-gray-500/20 text-gray-400', description: 'Tournament being prepared' },
  { value: 'open', label: 'Open', color: 'bg-green-500/20 text-green-400', description: 'Registration is open' },
  { value: 'balancing', label: 'Balancing', color: 'bg-yellow-500/20 text-yellow-400', description: 'Teams being balanced' },
  { value: 'live', label: 'Live', color: 'bg-red-500/20 text-red-400', description: 'Tournament in progress' },
  { value: 'completed', label: 'Completed', color: 'bg-blue-500/20 text-blue-400', description: 'Tournament finished' },
  { value: 'archived', label: 'Archived', color: 'bg-slate-500/20 text-slate-400', description: 'Tournament archived' }
];

const TournamentStatusManager = ({ tournamentId, currentStatus, onStatusChange }: TournamentStatusManagerProps) => {
  const [loading, setLoading] = useState(false);
  const [newStatus, setNewStatus] = useState(currentStatus);
  const [showConfirm, setShowConfirm] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<string | null>(null);
  const { toast } = useToast();

  const statusOptions = TOURNAMENT_STATUSES;

  const getStatusIndex = (status: string) => statusOptions.findIndex(option => option.value === status);

  const getCurrentStatusInfo = () => {
    return statusOptions.find(option => option.value === currentStatus) || statusOptions[0];
  };

  const getAllManualStatuses = () => {
    return statusOptions.filter(option => option.value !== currentStatus);
  };

  const handleManualChange = (selectedStatus: string) => {
    setNewStatus(selectedStatus);
    if (getStatusIndex(selectedStatus) < getStatusIndex(currentStatus)) {
      setPendingStatus(selectedStatus);
      setShowConfirm(true);
    } else {
      updateTournamentStatus(selectedStatus);
    }
  };

  const startFirstRoundMatches = async () => {
    const { data, error } = await supabase
      .from('matches')
      .update({ status: 'live', started_at: new Date().toISOString() })
      .eq('tournament_id', tournamentId)
      .eq('round_number', 1)
      .not('team1_id', 'is', null)
      .not('team2_id', 'is', null)
      .in('status', ['pending', 'live'])
      .select();

    if (error) {
      toast({
        title: "Error starting matches",
        description: error.message || "Could not set first matches live when starting tournament.",
        variant: "destructive",
      });
      return 0;
    }
    const count = data && Array.isArray(data) ? data.length : 0;
    if (count > 0) {
      toast({
        title: "First Round Started",
        description: `${count} match${count > 1 ? 'es' : ''} set to live!`,
      });
    }
    return count;
  };

  const updateTournamentStatus = async (forcedStatus?: string) => {
    const targetStatus = forcedStatus || newStatus;
    if (targetStatus === currentStatus) return;
    setLoading(true);

    try {
      if (targetStatus === 'completed') {
        const { data: matches, error: fetchMatchesError } = await supabase
          .from('matches')
          .select('id, winner_id, round_number, status')
          .eq('tournament_id', tournamentId)
          .order('round_number', { ascending: false });

        if (fetchMatchesError || !matches || matches.length === 0) {
          throw new Error("Cannot fetch matches to determine winner");
        }
        const highestRound = Math.max(...matches.map(m => m.round_number));
        const finalMatch = matches.find(m => m.round_number === highestRound && m.status === 'completed');
        const winnerId = finalMatch?.winner_id;

        if (!winnerId) {
          toast({
            title: "Cannot Complete Tournament",
            description: "No winner detected in the final match. Please finish the final match or mark a winner team.",
            variant: "destructive"
          });
          setLoading(false);
          return;
        }

        const result = await completeTournament(tournamentId, winnerId);
        if (result) {
          toast({
            title: "Tournament Completed!",
            description: "Tournament has been marked complete and stats have been updated."
          });
        }
      } else {
        const { error } = await supabase
          .from('tournaments')
          .update({ status: targetStatus })
          .eq('id', tournamentId);

        if (error) throw error;

        if (targetStatus === 'live') {
          await startFirstRoundMatches();
        }

        toast({
          title: "Status Updated",
          description: `Tournament status changed to ${targetStatus}`,
        });
      }

      onStatusChange();
    } catch (error: any) {
      console.error('Error updating tournament status:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update tournament status",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setShowConfirm(false);
      setPendingStatus(null);
    }
  };

  return (
    <Card className="bg-slate-800 border-slate-700">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <Settings className="w-5 h-5" />
          Tournament Status Management
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-4">
          <span className="text-white font-medium">Current Status:</span>
          <Badge className={getCurrentStatusInfo().color}>
            {getCurrentStatusInfo().label}
          </Badge>
          <span className="text-slate-400 text-sm">
            {getCurrentStatusInfo().description}
          </span>
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <Select value={newStatus} onValueChange={handleManualChange}>
              <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                <SelectValue placeholder="Change status to..." />
              </SelectTrigger>
              <SelectContent className="bg-slate-700 border-slate-600">
                {getAllManualStatuses().map((status) => (
                  <SelectItem key={status.value} value={status.value}>
                    <div className="flex items-center gap-2">
                      <Badge className={status.color} variant="outline">
                        {status.label}
                      </Badge>
                      <span className="text-slate-300 text-xs">
                        {status.description}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
          <AlertDialogContent className="bg-slate-800 border-slate-700">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-white">Confirm Status Rollback</AlertDialogTitle>
              <AlertDialogDescription className="text-slate-400">
                You are about to roll back the tournament status from "{getCurrentStatusInfo().label}" to "{statusOptions.find(s => s.value === pendingStatus)?.label}". 
                This may affect tournament data and participant experience. Are you sure?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="bg-slate-700 border-slate-600 text-white hover:bg-slate-600">
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction 
                onClick={() => updateTournamentStatus(pendingStatus!)}
                className="bg-red-600 hover:bg-red-700"
                disabled={loading}
              >
                {loading ? "Updating..." : "Confirm Rollback"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
};

export default TournamentStatusManager;
