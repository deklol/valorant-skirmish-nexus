
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogFooter, AlertDialogTitle, AlertDialogDescription, AlertDialogAction, AlertDialogCancel } from "@/components/ui/alert-dialog";
import { Target, Shuffle, RotateCcw, AlertTriangle } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import TournamentMedicBracketTabExtras from "./TournamentMedicBracketTabExtras";
import MatchEditModal from "@/components/MatchEditModal";
import { processMatchResults } from "@/components/MatchResultsProcessor";

// Update Match type to include team objects
type TeamObj = { id: string; name: string };
type Match = {
  id: string;
  team1: TeamObj | null;
  team2: TeamObj | null;
  team1_id: string | null;
  team2_id: string | null;
  winner_id: string | null;
  round_number: number;
  match_number: number;
  status: string | null;
  score_team1: number | null;
  score_team2: number | null;
};
type Tournament = { id: string };

type MatchStatus = "completed" | "pending" | "live";
function parseStatus(s: any): MatchStatus {
  if (s === "completed" || s === "pending" || s === "live") return s;
  return "pending";
}

// Helper to normalize possible supabase join output
function parseTeam(obj: any): TeamObj | null {
  if (obj && typeof obj === "object" && "id" in obj && "name" in obj) {
    return { id: obj.id, name: obj.name };
  }
  return null;
}

export default function TournamentMedicBracketTab({ tournament, onRefresh }: {
  tournament: Tournament;
  onRefresh: () => void;
}) {
  const [matches, setMatches] = useState<Match[]>([]);
  const [teams, setTeams] = useState<TeamObj[]>([]);
  const [loading, setLoading] = useState(false);
  const [editModal, setEditModal] = useState<Match | null>(null);
  const [actionMatchId, setActionMatchId] = useState<string | null>(null);
  
  // States for bracket controls
  const [forceProgressionTeam, setForceProgressionTeam] = useState<string>("");
  const [targetRound, setTargetRound] = useState<number>(1);
  const [targetMatchNumber, setTargetMatchNumber] = useState<number>(1);
  const [progressionReason, setProgressionReason] = useState<string>("");
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingAction, setPendingAction] = useState<() => void>(() => {});
  const [rollbackMatchId, setRollbackMatchId] = useState<string | null>(null);
  const [showRollbackDialog, setShowRollbackDialog] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      // Fetch matches and teams
      const [matchesResponse, teamsResponse] = await Promise.all([
        supabase
          .from("matches")
          .select(`
            id, team1_id, team2_id, winner_id, round_number, match_number, status, score_team1, score_team2,
            team1:team1_id (id, name),
            team2:team2_id (id, name)
          `)
          .eq("tournament_id", tournament.id)
          .order("round_number", { ascending: true })
          .order("match_number", { ascending: true }),
        supabase
          .from("teams")
          .select("id, name, status")
          .eq("tournament_id", tournament.id)
      ]);

      // Transform results to ensure types are correct and joins are parsed safely
      const sanitized: Match[] = (matchesResponse.data || []).map((m: any) => ({
        id: m.id,
        team1: parseTeam(m.team1),
        team2: parseTeam(m.team2),
        team1_id: m.team1_id ?? null,
        team2_id: m.team2_id ?? null,
        winner_id: m.winner_id ?? null,
        round_number: m.round_number,
        match_number: m.match_number,
        status: m.status ?? null,
        score_team1: m.score_team1 ?? null,
        score_team2: m.score_team2 ?? null,
      }));

      setMatches(sanitized);
      setTeams((teamsResponse.data || []).map((t: any) => ({ id: t.id, name: t.name })));
      setLoading(false);
    })();
  }, [tournament.id]);

  async function handleEditSubmit({ status, score_team1, score_team2, winner_id }: { status: MatchStatus, score_team1: number, score_team2: number, winner_id: string | null }) {
    if (!editModal) return;
    setActionMatchId(editModal.id);

    try {
      // PRODUCTION FIX: If marking as completed with a winner, route through RPC for proper bracket progression
      if (status === 'completed' && winner_id && editModal.team1_id && editModal.team2_id) {
        const loserId = winner_id === editModal.team1_id ? editModal.team2_id : editModal.team1_id;
        
        // Use the centralized match results processor
        await processMatchResults(
          {
            matchId: editModal.id,
            winnerId: winner_id,
            loserId: loserId,
            tournamentId: tournament.id,
            scoreTeam1: score_team1,
            scoreTeam2: score_team2,
          },
          {
            toast: (args) => toast(args),
          }
        );
        
        toast({ 
          title: "Match Completed via RPC",
          description: "Winner advanced to next round using database-level logic"
        });
      } else {
        // For non-completion updates (changing status to pending/live, updating scores without winner)
        await supabase
          .from("matches")
          .update({
            status,
            score_team1,
            score_team2,
            winner_id,
            ...(status === "completed" ? { completed_at: new Date().toISOString() } : {})
          })
          .eq("id", editModal.id);
        toast({ title: "Match updated" });
      }
      
      onRefresh();
      await refreshMatches();
    } catch (err: any) {
      toast({
        title: "Error updating match",
        description: err.message,
        variant: "destructive"
      });
    } finally {
      setActionMatchId(null);
      setEditModal(null);
    }
  }

  // Helper to refresh matches list
  async function refreshMatches() {
    const { data } = await supabase
      .from("matches")
      .select(`
        id, team1_id, team2_id, winner_id, round_number, match_number, status, score_team1, score_team2,
        team1:team1_id (id, name),
        team2:team2_id (id, name)
      `)
      .eq("tournament_id", tournament.id)
      .order("round_number", { ascending: true })
      .order("match_number", { ascending: true });

    const sanitized: Match[] = (data || []).map((m: any) => ({
      id: m.id,
      team1: parseTeam(m.team1),
      team2: parseTeam(m.team2),
      team1_id: m.team1_id ?? null,
      team2_id: m.team2_id ?? null,
      winner_id: m.winner_id ?? null,
      round_number: m.round_number,
      match_number: m.match_number,
      status: m.status ?? null,
      score_team1: m.score_team1 ?? null,
      score_team2: m.score_team2 ?? null,
    }));

    setMatches(sanitized);
  }

  // NEW: Handle match result rollback
  async function handleRollbackMatch() {
    if (!rollbackMatchId) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('rollback_match_result', {
        p_match_id: rollbackMatchId,
        p_reason: 'Admin rollback via Medic tools'
      });

      if (error) throw error;

      const result = data as { success: boolean; error?: string; matches_rolled_back?: string[]; cascade_count?: number };
      
      if (!result.success) {
        throw new Error(result.error || 'Rollback failed');
      }

      toast({
        title: "Match Result Rolled Back",
        description: result.cascade_count && result.cascade_count > 0 
          ? `Match reset. ${result.cascade_count} subsequent match(es) also affected.`
          : "Match reset to live status. Winner cleared from next round."
      });

      onRefresh();
      await refreshMatches();
    } catch (error: any) {
      toast({
        title: "Rollback Failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
      setShowRollbackDialog(false);
      setRollbackMatchId(null);
    }
  }

  // NEW: Handle individual match reset
  async function handleResetMatch(matchId: string) {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('reset_match_secure', {
        p_match_id: matchId,
        p_reason: 'Admin reset via Medic tools'
      });

      if (error) throw error;

      const result = data as { success: boolean; error?: string };
      
      if (!result.success) {
        throw new Error(result.error || 'Reset failed');
      }

      toast({
        title: "Match Reset",
        description: "Match cleared and set back to live status."
      });

      onRefresh();
      await refreshMatches();
    } catch (error: any) {
      toast({
        title: "Reset Failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }

  // Helper to give correct modal props
  function getModalMatchObj(editModal: Match | null): any {
    if (!editModal) return null;
    const team1_name = editModal.team1?.name || "Team 1";
    const team2_name = editModal.team2?.name || "Team 2";
    // Winner
    let winnerObj = null;
    if (editModal.winner_id) {
      if (editModal.team1?.id === editModal.winner_id) {
        winnerObj = {
          id: editModal.winner_id,
          name: team1_name,
        };
      } else if (editModal.team2?.id === editModal.winner_id) {
        winnerObj = {
          id: editModal.winner_id,
          name: team2_name,
        };
      } else {
        winnerObj = {
          id: editModal.winner_id,
          name: editModal.winner_id.slice(0, 8),
        };
      }
    }
    return {
      id: editModal.id,
      match_number: editModal.match_number,
      team1: editModal.team1
        ? { id: editModal.team1.id, name: team1_name }
        : null,
      team2: editModal.team2
        ? { id: editModal.team2.id, name: team2_name }
        : null,
      winner: winnerObj,
      status: parseStatus(editModal.status),
      score_team1: typeof editModal.score_team1 === "number" ? editModal.score_team1 : 0,
      score_team2: typeof editModal.score_team2 === "number" ? editModal.score_team2 : 0,
    };
  }

  // Bracket control functions
  const activeTeams = teams.filter(team => team.name && !team.name.includes('eliminated'));
  const maxRound = Math.max(...matches.map(m => m.round_number), 1);

  const handleForcedProgression = async () => {
    if (!forceProgressionTeam || !targetRound || !targetMatchNumber || !progressionReason.trim()) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('manually_advance_team', {
        p_team_id: forceProgressionTeam,
        p_to_round: targetRound,
        p_to_match_number: targetMatchNumber,
        p_reason: progressionReason.trim()
      });

      if (error) throw error;

      const result = data as any;
      if (result?.success) {
        toast({
          title: "Forced Progression Complete",
          description: `Team advanced to Round ${targetRound}, Match ${targetMatchNumber}`
        });
        onRefresh();
        setForceProgressionTeam("");
        setTargetRound(1);
        setTargetMatchNumber(1);
        setProgressionReason("");
      } else {
        throw new Error(result?.error || 'Unknown error');
      }
    } catch (error: any) {
      toast({
        title: "Forced Progression Failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleBracketShuffle = async () => {
    if (!window.confirm("This will randomly reassign all teams in Round 1. Continue?")) return;
    
    setLoading(true);
    try {
      const round1Matches = matches.filter(m => m.round_number === 1);
      const shuffledTeams = [...activeTeams].sort(() => Math.random() - 0.5);
      
      let teamIndex = 0;
      for (const match of round1Matches) {
        const team1 = shuffledTeams[teamIndex++];
        const team2 = shuffledTeams[teamIndex++];
        
        await supabase
          .from('matches')
          .update({
            team1_id: team1?.id || null,
            team2_id: team2?.id || null
          })
          .eq('id', match.id);
      }

      toast({
        title: "Bracket Shuffled",
        description: "All Round 1 teams have been randomly reassigned."
      });
      onRefresh();
    } catch (error: any) {
      toast({
        title: "Shuffle Failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const confirmActionHandler = (action: () => void) => {
    setPendingAction(() => action);
    setShowConfirmDialog(true);
  };

  return (
    <div className="flex flex-col gap-4">
      <TournamentMedicBracketTabExtras tournament={tournament} onRefresh={onRefresh} />
      
      {/* Forced Progression Controls */}
      <div className="border border-purple-600/30 bg-purple-950/20 rounded-lg p-4">
        <h3 className="text-purple-400 font-medium mb-3 flex items-center gap-2">
          <Target className="w-4 h-4" />
          Forced Progression Controls
        </h3>
        <div className="space-y-4">
          <div>
            <Label className="text-slate-300">Team to Advance</Label>
            <Select value={forceProgressionTeam} onValueChange={setForceProgressionTeam}>
              <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                <SelectValue placeholder="Select team to force advance..." />
              </SelectTrigger>
              <SelectContent className="bg-slate-700 border-slate-600">
                {activeTeams.map(team => (
                  <SelectItem key={team.id} value={team.id}>
                    {team.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-slate-300">Target Round</Label>
              <Input
                type="number"
                min="1"
                max={maxRound}
                value={targetRound}
                onChange={(e) => setTargetRound(parseInt(e.target.value) || 1)}
                className="bg-slate-700 border-slate-600 text-white"
              />
            </div>
            <div>
              <Label className="text-slate-300">Target Match</Label>
              <Input
                type="number"
                min="1"
                value={targetMatchNumber}
                onChange={(e) => setTargetMatchNumber(parseInt(e.target.value) || 1)}
                className="bg-slate-700 border-slate-600 text-white"
              />
            </div>
          </div>
          
          <div>
            <Label className="text-slate-300">Progression Reason</Label>
            <Textarea
              value={progressionReason}
              onChange={(e) => setProgressionReason(e.target.value)}
              placeholder="Explain why this team is being advanced..."
              className="bg-slate-700 border-slate-600 text-white"
            />
          </div>
          
          <Button
            onClick={() => confirmActionHandler(handleForcedProgression)}
            disabled={!forceProgressionTeam || !progressionReason.trim() || loading}
            className="w-full bg-purple-600 hover:bg-purple-700"
          >
            <Target className="w-4 h-4 mr-2" />
            Force Team Progression
          </Button>
        </div>
      </div>

      {/* Bracket Utilities */}
      <div className="border border-orange-600/30 bg-orange-950/20 rounded-lg p-4">
        <h3 className="text-orange-400 font-medium mb-3 flex items-center gap-2">
          <Shuffle className="w-4 h-4" />
          Bracket Utilities
        </h3>
        <Button
          onClick={() => confirmActionHandler(handleBracketShuffle)}
          disabled={loading}
          className="w-full bg-orange-600 hover:bg-orange-700"
        >
          <Shuffle className="w-4 h-4 mr-2" />
          Shuffle Round 1 Teams
        </Button>
      </div>
      
      {/* Match List */}
      {loading ? (
        <span>Loading...</span>
      ) : (
        matches.map(match => (
          <div key={match.id} className="bg-slate-800 rounded px-3 py-2 text-xs flex flex-wrap items-center gap-2">
            <Badge className="bg-amber-900/60">
              R{match.round_number} M{match.match_number}
            </Badge>
            <span className="font-mono">
              {match.team1?.name || (match.team1_id?.slice(0, 8) ?? "?")} vs {match.team2?.name || (match.team2_id?.slice(0, 8) ?? "?")}
            </span>
            <Badge variant={match.status === 'completed' ? 'default' : match.status === 'live' ? 'secondary' : 'outline'}>
              {match.status}
            </Badge>
            <div className="flex gap-1 ml-auto">
              <Button size="sm" variant="outline" onClick={() => setEditModal(match)}>
                Force Result
              </Button>
              {match.winner_id && (
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="text-orange-400 border-orange-600 hover:bg-orange-900/30"
                  onClick={() => {
                    setRollbackMatchId(match.id);
                    setShowRollbackDialog(true);
                  }}
                >
                  <RotateCcw className="w-3 h-3 mr-1" />
                  Rollback
                </Button>
              )}
            </div>
          </div>
        ))
      )}
      
      <MatchEditModal
        open={!!editModal}
        match={getModalMatchObj(editModal)}
        actionMatchId={actionMatchId}
        onChange={m => setEditModal(o =>
          o
            ? {
                ...o,
                status: m.status ?? o.status,
                score_team1:
                  typeof m.score_team1 === "number" ? m.score_team1 : o.score_team1,
                score_team2:
                  typeof m.score_team2 === "number" ? m.score_team2 : o.score_team2,
                winner_id: m.winner?.id ?? null,
              }
            : o
        )}
        onCancel={() => setEditModal(null)}
        onSave={handleEditSubmit}
      />

      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent className="bg-slate-800 border-slate-700">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Confirm Action</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              Are you sure you want to perform this action? This will modify the tournament bracket structure.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-slate-700 border-slate-600 text-white hover:bg-slate-600">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => {
                pendingAction();
                setShowConfirmDialog(false);
              }}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Rollback Confirmation Dialog */}
      <AlertDialog open={showRollbackDialog} onOpenChange={setShowRollbackDialog}>
        <AlertDialogContent className="bg-slate-800 border-slate-700">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-orange-400" />
              Confirm Match Rollback
            </AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              This will reset the match result and remove the winner from any subsequent matches.
              <br /><br />
              <span className="text-orange-400 font-medium">
                ⚠️ Warning: If the winner has already played in the next round, that match will also be rolled back (cascading effect).
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-slate-700 border-slate-600 text-white hover:bg-slate-600">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleRollbackMatch}
              className="bg-orange-600 hover:bg-orange-700"
              disabled={loading}
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              {loading ? "Rolling back..." : "Confirm Rollback"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
