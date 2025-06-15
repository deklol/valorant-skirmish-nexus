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

  // Show all statuses as options except for the current one
  const getAllManualStatuses = () => {
    return statusOptions.filter(option => option.value !== currentStatus);
  };

  // When updating, prompt if rolling back (previous stage)
  const handleManualChange = (selectedStatus: string) => {
    setNewStatus(selectedStatus);
    // compare indexes to determine if rollback
    if (getStatusIndex(selectedStatus) < getStatusIndex(currentStatus)) {
      setPendingStatus(selectedStatus);
      setShowConfirm(true);
    }
  };

  // Called after confirmation or if moving forward
  const updateTournamentStatus = async (forcedStatus?: string) => {
    const targetStatus = forcedStatus || newStatus;
    if (targetStatus === currentStatus) return;
    setLoading(true);

    try {
      if (targetStatus === 'completed') {
        // Try to auto-detect winner as before
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
          onStatusChange();
        } else {
          throw new Error("Failed to fully complete tournament. Please check console for errors.");
        }
      } else {
        // Allow any status change (admin only); update fields for "live" stage.
        const updateData: any = { status: targetStatus };
        if (targetStatus === 'live') {
          updateData.start_time = new Date().toISOString();
        }
        const { error } = await supabase
          .from('tournaments')
          .update(updateData)
          .eq('id', tournamentId);
        if (error) throw error;

        toast({
          title: "Status Updated",
          description: `Tournament status changed to ${targetStatus}`,
        });

        onStatusChange();
      }
    } catch (error: any) {
      console.error('Error updating status:', error);
      toast({
        title: "Error",
        description: "Failed to update tournament status",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setShowConfirm(false);
      setPendingStatus(null);
    }
  };

  const getStatusActions = () => {
    switch (currentStatus) {
      case 'draft':
        return [
          {
            action: 'open',
            label: 'Open Registration',
            icon: <Play className="w-4 h-4" />,
            color: 'bg-green-600 hover:bg-green-700'
          }
        ];
      case 'open':
        return [
          {
            action: 'balancing',
            label: 'Start Balancing',
            icon: <Edit className="w-4 h-4" />,
            color: 'bg-yellow-600 hover:bg-yellow-700'
          }
        ];
      case 'balancing':
        return [
          {
            action: 'live',
            label: 'Start Tournament',
            icon: <Play className="w-4 h-4" />,
            color: 'bg-red-600 hover:bg-red-700'
          }
        ];
      case 'live':
        return [
          {
            action: 'completed',
            label: 'Complete Tournament',
            icon: <Square className="w-4 h-4" />,
            color: 'bg-blue-600 hover:bg-blue-700'
          }
        ];
      case 'completed':
        return [
          {
            action: 'archived',
            label: 'Archive Tournament',
            icon: <Archive className="w-4 h-4" />,
            color: 'bg-slate-600 hover:bg-slate-700'
          }
        ];
      default:
        return [];
    }
  };

  const quickStatusChange = async (status: string) => {
    setNewStatus(status);
    setLoading(true);

    try {
      const updateData: any = { status };

      if (status === 'live') {
        updateData.start_time = new Date().toISOString();
      }

      const { error } = await supabase
        .from('tournaments')
        .update(updateData)
        .eq('id', tournamentId);

      if (error) throw error;

      toast({
        title: "Status Updated",
        description: `Tournament status changed to ${status}`,
      });

      onStatusChange();
    } catch (error: any) {
      console.error('Error updating status:', error);
      toast({
        title: "Error",
        description: "Failed to update tournament status",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const currentStatusInfo = getCurrentStatusInfo();
  const manualStatuses = getAllManualStatuses();
  const statusActions = getStatusActions();

  return (
    <Card className="bg-slate-800 border-slate-700">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <Settings className="w-5 h-5" />
          Tournament Status
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm text-slate-400 mb-1">Current Status</div>
            <Badge className={currentStatusInfo.color}>
              {currentStatusInfo.label}
            </Badge>
          </div>
          <div className="text-right text-sm text-slate-400">
            {currentStatusInfo.description}
          </div>
        </div>

        {/* Quick Actions */}
        {statusActions.length > 0 && (
          <div className="space-y-2">
            <div className="text-sm text-slate-400">Quick Actions</div>
            <div className="flex gap-2">
              {statusActions.map((action) => (
                <Button
                  key={action.action}
                  onClick={() => quickStatusChange(action.action)}
                  disabled={loading}
                  className={action.color}
                  size="sm"
                >
                  {action.icon}
                  <span className="ml-2">{action.label}</span>
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Manual Status Change */}
        {manualStatuses.length > 0 && (
          <div className="space-y-2">
            <div className="text-sm text-slate-400">Manual Status Change</div>
            <div className="flex gap-2">
              <Select value={newStatus} onValueChange={handleManualChange}>
                <SelectTrigger className="bg-slate-700 border-slate-600">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map(statusOpt => (
                    statusOpt.value !== currentStatus && (
                      <SelectItem key={statusOpt.value} value={statusOpt.value}>
                        {statusOpt.label}
                      </SelectItem>
                    )
                  ))}
                </SelectContent>
              </Select>
              <Button
                onClick={() =>
                  (getStatusIndex(newStatus) < getStatusIndex(currentStatus)
                    ? setShowConfirm(true)
                    : updateTournamentStatus())
                }
                disabled={loading || newStatus === currentStatus}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {loading ? "Updating..." : "Update"}
              </Button>
            </div>
          </div>
        )}

        {/* Admin Confirmation Dialog for Rollback */}
        <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
          <AlertDialogTrigger asChild>
            <span></span>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirm Tournament Status Rollback</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to revert the tournament status from <b>{currentStatusInfo.label}</b> to <b>{statusOptions.find(opt => opt.value === (pendingStatus || newStatus))?.label}</b>?<br />
                <span className="text-red-500">
                  This may require participants or admins to re-verify results or matches.
                </span>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel
                onClick={() => {
                  setShowConfirm(false);
                  setPendingStatus(null);
                  setNewStatus(currentStatus);
                }}
              >Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-blue-600 hover:bg-blue-700"
                onClick={() => updateTournamentStatus(pendingStatus || newStatus)}
              >
                Yes, Revert Status
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {currentStatus === 'archived' && (
          <div className="text-center py-4">
            <div className="text-slate-400">This tournament has been archived</div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TournamentStatusManager;
