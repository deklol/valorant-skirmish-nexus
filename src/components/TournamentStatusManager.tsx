
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

type TournamentStatus = 'draft' | 'open' | 'balancing' | 'live' | 'completed' | 'archived';

const TOURNAMENT_STATUSES = [
  { value: 'draft' as TournamentStatus, label: 'Draft', color: 'bg-gray-500/20 text-gray-400', description: 'Tournament being prepared' },
  { value: 'open' as TournamentStatus, label: 'Open', color: 'bg-green-500/20 text-green-400', description: 'Registration is open' },
  { value: 'balancing' as TournamentStatus, label: 'Balancing', color: 'bg-yellow-500/20 text-yellow-400', description: 'Teams being balanced' },
  { value: 'live' as TournamentStatus, label: 'Live', color: 'bg-red-500/20 text-red-400', description: 'Tournament in progress' },
  { value: 'completed' as TournamentStatus, label: 'Completed', color: 'bg-blue-500/20 text-blue-400', description: 'Tournament finished' },
  { value: 'archived' as TournamentStatus, label: 'Archived', color: 'bg-slate-500/20 text-slate-400', description: 'Tournament archived' }
];

const TournamentStatusManager = ({ tournamentId, currentStatus, onStatusChange }: TournamentStatusManagerProps) => {
  const [loading, setLoading] = useState(false);
  const [newStatus, setNewStatus] = useState<TournamentStatus>(currentStatus as TournamentStatus);
  const [showConfirm, setShowConfirm] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<TournamentStatus | null>(null);
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
    const typedStatus = selectedStatus as TournamentStatus;
    setNewStatus(typedStatus);
    if (getStatusIndex(selectedStatus) < getStatusIndex(currentStatus)) {
      setPendingStatus(typedStatus);
      setShowConfirm(true);
    } else {
      updateTournamentStatus(typedStatus);
    }
  };

  const clearTournamentData = async () => {
    try {
      // Get all teams for this tournament
      const { data: teams } = await supabase
        .from('teams')
        .select('id')
        .eq('tournament_id', tournamentId);

      if (teams && teams.length > 0) {
        const teamIds = teams.map(t => t.id);

        // Delete team members
        await supabase
          .from('team_members')
          .delete()
          .in('team_id', teamIds);

        // Delete teams
        await supabase
          .from('teams')
          .delete()
          .eq('tournament_id', tournamentId);
      }

      // Delete any matches
      await supabase
        .from('matches')
        .delete()
        .eq('tournament_id', tournamentId);

      console.log('Tournament data cleared successfully');
    } catch (error) {
      console.error('Error clearing tournament data:', error);
      throw error;
    }
  };

  const validateStatusTransition = async (targetStatus: TournamentStatus) => {
    try {
      // Get tournament and related data counts
      const [
        { data: signups, count: signupCount },
        { data: teams, count: teamCount },
        { data: matches, count: matchCount }
      ] = await Promise.all([
        supabase.from('tournament_signups').select('*', { count: 'exact' }).eq('tournament_id', tournamentId),
        supabase.from('teams').select('*', { count: 'exact' }).eq('tournament_id', tournamentId),
        supabase.from('matches').select('*', { count: 'exact' }).eq('tournament_id', tournamentId)
      ]);

      const issues = [];

      // Validate transition rules
      if (targetStatus === 'live' && (!teamCount || teamCount < 2)) {
        issues.push('Need at least 2 teams to go live');
      }

      if (targetStatus === 'live' && (!matchCount || matchCount === 0)) {
        issues.push('Need bracket/matches generated to go live');
      }

      if (targetStatus === 'balancing' && (!signupCount || signupCount < 2)) {
        issues.push('Need at least 2 signups to balance teams');
      }

      return issues;
    } catch (error) {
      console.error('Error validating status transition:', error);
      return ['Failed to validate transition'];
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

  const updateTournamentStatus = async (forcedStatus?: TournamentStatus) => {
    const targetStatus = forcedStatus || newStatus;
    if (targetStatus === currentStatus) return;
    setLoading(true);

    try {
      // Validate the transition
      const validationIssues = await validateStatusTransition(targetStatus);
      if (validationIssues.length > 0) {
        toast({
          title: "Cannot Change Status",
          description: validationIssues.join(', '),
          variant: "destructive"
        });
        setLoading(false);
        return;
      }

      // Handle data cleanup for rollbacks
      const isRollback = getStatusIndex(targetStatus) < getStatusIndex(currentStatus);
      
      if (isRollback) {
        if ((currentStatus === 'balancing' || currentStatus === 'live') && 
            (targetStatus === 'draft' || targetStatus === 'open')) {
          await clearTournamentData();
          toast({
            title: "Tournament Reset",
            description: "Teams and matches have been cleared due to status rollback.",
          });
        }
      }

      if (targetStatus === 'completed') {
        // Get all matches and team count for proper final detection
        const [matchesResult, teamsResult] = await Promise.all([
          supabase
            .from('matches')
            .select('id, winner_id, round_number, status, team1_id, team2_id, match_number')
            .eq('tournament_id', tournamentId),
          supabase
            .from('teams')
            .select('id')
            .eq('tournament_id', tournamentId)
        ]);

        if (matchesResult.error || !matchesResult.data || matchesResult.data.length === 0) {
          throw new Error("Cannot fetch matches to determine winner");
        }
        
        if (teamsResult.error || !teamsResult.data) {
          throw new Error("Cannot fetch team count for bracket validation");
        }

        const matches = matchesResult.data;
        const teamCount = teamsResult.data.length;
        
        // Use enhanced final match detection
        const { findTournamentFinal } = await import("@/utils/bracketCalculations");
        const finalMatch = findTournamentFinal(matches, teamCount);
        
        if (!finalMatch) {
          toast({
            title: "Cannot Complete Tournament",
            description: "No final match found. Please ensure the bracket is properly set up.",
            variant: "destructive"
          });
          setLoading(false);
          return;
        }

        if (finalMatch.status !== 'completed' || !finalMatch.winner_id) {
          toast({
            title: "Cannot Complete Tournament",
            description: `Final match (Round ${finalMatch.round_number}, Match ${finalMatch.match_number}) is not completed or has no winner.`,
            variant: "destructive"
          });
          setLoading(false);
          return;
        }

        console.log(`🏆 Tournament completion: Final match R${finalMatch.round_number}M${finalMatch.match_number}, winner: ${finalMatch.winner_id}`);

        // Use completeTournament utility
        const result = await completeTournament(tournamentId, finalMatch.winner_id);
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
                {((currentStatus === 'balancing' || currentStatus === 'live') && 
                  (pendingStatus === 'draft' || pendingStatus === 'open')) && (
                  <span className="block mt-2 text-yellow-400 font-semibold">
                    ⚠️ This will DELETE all teams and matches for this tournament!
                  </span>
                )}
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
