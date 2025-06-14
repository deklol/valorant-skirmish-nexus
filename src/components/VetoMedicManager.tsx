import React, { useEffect, useState, useCallback } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Map, RefreshCw, ShieldAlert, CheckCircle2, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import MapPickerDialog from "./MapPickerDialog";
import VetoMedicHistory from "./VetoMedicHistory";

// --- Enhanced interfaces for defensive types ---
interface TeamInfo {
  id: string;
  name: string;
}

interface TournamentInfo {
  id: string;
  name: string;
}

interface MatchInfo {
  id: string;
  tournament: TournamentInfo | null;
  team1: TeamInfo | null;
  team2: TeamInfo | null;
}

interface VetoSession {
  id: string;
  match_id: string | null;
  status: string | null;
  current_turn_team_id: string | null;
  started_at: string | null;
  completed_at: string | null;
  match: MatchInfo | null;
}

type VetoSessionWithDetails = VetoSession;

export default function VetoMedicManager() {
  const [sessions, setSessions] = useState<VetoSessionWithDetails[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionSessionId, setActionSessionId] = useState<string | null>(null);
  const [forceDialogOpen, setForceDialogOpen] = useState(false);
  const [maps, setMaps] = useState<any[]>([]);
  const [pickableMaps, setPickableMaps] = useState<any[]>([]);
  const [forceSession, setForceSession] = useState<VetoSessionWithDetails | null>(null);
  const [historyBySession, setHistoryBySession] = useState<Record<string, any[]>>({});
  const { toast } = useToast();

  // Fetch ALL veto sessions (not limited to pending/in_progress!)
  const fetchSessions = useCallback(async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from("map_veto_sessions")
      .select(`
        *,
        match:match_id (
          id,
          tournament:tournament_id ( id, name ),
          team1:team1_id ( id, name ),
          team2:team2_id ( id, name )
        )
      `)
      .order("started_at", { ascending: false })
      .limit(40); // for admin, fetch the latest 40

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      setSessions([]);
    } else {
      // Defensive: ensure correct type
      setSessions(
        (data || []).map((session: any) => ({
          ...session,
          match: session.match
            ? {
                ...session.match,
                tournament: session.match.tournament && session.match.tournament.id
                  ? session.match.tournament
                  : null,
                team1: session.match.team1 && session.match.team1.id
                  ? session.match.team1
                  : null,
                team2: session.match.team2 && session.match.team2.id
                  ? session.match.team2
                  : null,
              }
            : null,
        }))
      );
    }
    setLoading(false);
  }, [toast]);

  // Fetch all active maps once
  const fetchMaps = useCallback(async () => {
    const { data, error } = await supabase
      .from("maps")
      .select("*")
      .eq("is_active", true)
      .order("display_name", { ascending: true });
    if (!error) setMaps(data || []);
  }, []);

  useEffect(() => {
    fetchSessions();
    fetchMaps();
  }, [fetchSessions, fetchMaps]);

  // Reset (clear the session's actions and set to pending)
  const resetSession = async (sessionId: string) => {
    setActionSessionId(sessionId);
    try {
      // 1. Delete all actions for this session
      const { error: actionsErr } = await supabase
        .from("map_veto_actions")
        .delete()
        .eq("veto_session_id", sessionId);
      if (actionsErr) throw actionsErr;

      // 2. Reset the session itself
      const { error: sessionErr } = await supabase
        .from("map_veto_sessions")
        .update({
          status: "pending",
          current_turn_team_id: null,
          started_at: null,
          completed_at: null,
        })
        .eq("id", sessionId);

      if (sessionErr) throw sessionErr;

      toast({
        title: "Veto Reset",
        description: "Veto session has been reset to pending.",
      });
      fetchSessions();
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to reset veto session.",
        variant: "destructive"
      });
    } finally {
      setActionSessionId(null);
    }
  };

  // Open the force-complete dialog, fetch possible maps to pick
  const openForceDialog = async (session: VetoSessionWithDetails) => {
    setForceSession(session);
    setActionSessionId(session.id);

    // 1. Find maps not yet picked/banned in this session
    const { data: takenMaps, error: actionsErr } = await supabase
      .from("map_veto_actions")
      .select("map_id")
      .eq("veto_session_id", session.id);

    if (actionsErr) {
      toast({ title: "Error", description: actionsErr.message, variant: "destructive" });
      setForceSession(null);
      setActionSessionId(null);
      return;
    }
    const takenIds = (takenMaps || []).map(a => a.map_id);
    const availableMaps = maps.filter((m: any) => !takenIds.includes(m.id));
    setPickableMaps(availableMaps || []);
    setForceDialogOpen(true);
    setActionSessionId(null);
  };

  // "Force Complete" + save picks
  const handleForceConfirm = async (selectedMapIds: string[]) => {
    if (!forceSession) return;
    setActionSessionId(forceSession.id);
    try {
      let sessionRow = forceSession;
      // DEFENSIVE: extract team1/team2 from match object
      const team1Id = sessionRow.match?.team1?.id || null;
      const team2Id = sessionRow.match?.team2?.id || null;
      const currentTurnTeamId = sessionRow.current_turn_team_id;
      // Find the opposite team for final pick
      let oppositeTeam: string | null = null;
      if (team1Id && team2Id && currentTurnTeamId) {
        oppositeTeam =
          currentTurnTeamId === team1Id
            ? team2Id
            : team1Id;
      }
      // Insert pick actions for each selected map as 'pick'
      for (const mapId of selectedMapIds) {
        await supabase.from("map_veto_actions").insert({
          veto_session_id: sessionRow.id,
          team_id: oppositeTeam,
          map_id: mapId,
          action: "pick",
          performed_by: null,
          order_number:
            (await getNextOrderNumber(sessionRow.id)),
        });
      }
      // Mark session as completed
      await supabase
        .from("map_veto_sessions")
        .update({
          status: "completed",
          completed_at: new Date().toISOString(),
        })
        .eq("id", sessionRow.id);

      toast({
        title: "Veto Forced Complete",
        description: `Veto session forcibly completed. Map(s) selected.`,
      });
      fetchSessions();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to complete veto.",
        variant: "destructive",
      });
    } finally {
      setActionSessionId(null);
      setForceDialogOpen(false);
    }
  };

  // Helper to get the next order number for actions in a session
  async function getNextOrderNumber(vetoSessionId: string): Promise<number> {
    const { data, error } = await supabase
      .from("map_veto_actions")
      .select("order_number")
      .eq("veto_session_id", vetoSessionId)
      .order("order_number", { ascending: false })
      .limit(1);

    if (error || !data || !data[0]) return 1;
    return (data[0].order_number || 0) + 1;
  }

  // Extra fetch for veto actions for the modal/history
  const fetchVetoActions = useCallback(async (sessionId: string) => {
    const { data, error } = await supabase
      .from("map_veto_actions")
      .select("*")
      .eq("veto_session_id", sessionId)
      .order("order_number", { ascending: true });
    if (!error && data) {
      setHistoryBySession(hist => ({ ...hist, [sessionId]: data }));
    }
  }, []);

  // When viewing session details, fetch history
  const handleExpandHistory = (sessionId: string, expand: boolean) => {
    if (expand && !historyBySession[sessionId]) fetchVetoActions(sessionId);
  };

  const handleRollbackLast = async (sessionId: string) => {
    setActionSessionId(sessionId);
    try {
      // 1. Get last action
      const actions = historyBySession[sessionId] || [];
      if (!actions.length) throw new Error("No veto actions to rollback");
      const last = actions[actions.length - 1];
      // 2. Delete last action only (by id)
      const { error } = await supabase
        .from("map_veto_actions")
        .delete()
        .eq("id", last.id);
      if (error) throw error;
      toast({ title: "Rolled Back", description: "Last veto action has been undone." });
      await fetchVetoActions(sessionId); // Refetch
      fetchSessions(); // Also update parent veto state
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setActionSessionId(null);
    }
  }

  return (
    <>
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="flex gap-2 items-center text-white">
            <ShieldAlert className="w-5 h-5 text-yellow-300" />
            Veto Medic <span className="text-xs text-yellow-300">(Admin Veto Recovery)</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center text-slate-300 py-8">Loading veto sessions...</div>
          ) : sessions.length === 0 ? (
            <div className="text-center text-slate-400 py-8">No veto sessions found.</div>
          ) : (
            <div className="space-y-4">
              {sessions.map((session) => {
                // Carefully extract match/team info
                const match = session.match;
                const team1 = match?.team1;
                const team2 = match?.team2;
                const tournament = match?.tournament;
                // Progress: use veto history if loaded
                const turns = historyBySession[session.id] || [];
                const totalMaps = maps.length || 1;
                const bans = turns.filter(act => act.action === "ban").length;
                const picks = turns.filter(act => act.action === "pick").length;
                const progress = `${turns.length}/${totalMaps}`;
                return (
                  <div
                    key={session.id}
                    className="flex flex-col md:flex-row md:items-start md:justify-between border border-slate-700 bg-slate-900 rounded-lg p-4 shadow"
                  >
                    <div className="flex flex-col gap-1 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className={
                          session.status === "in_progress"
                            ? "bg-green-500/10 text-green-400 border-green-500/40"
                            : session.status === "completed"
                            ? "bg-blue-500/10 text-blue-400 border-blue-500/40"
                            : "bg-yellow-500/10 text-yellow-400 border-yellow-500/40"
                        }>
                          {session.status === "in_progress"
                            ? "In Progress"
                            : session.status === "completed"
                            ? "Completed"
                            : "Pending"}
                        </Badge>

                        {/* Tournament Name */}
                        {tournament && (
                          <span className="text-xs font-bold px-2 rounded bg-blue-900/60 text-sky-300">
                            {tournament.name}
                          </span>
                        )}

                        {/* Match summary */}
                        {(team1 || team2) && (
                          <span className="text-xs px-2 text-blue-200 font-mono">
                            {team1?.name || "?"} <span className="text-slate-500">vs</span> {team2?.name || "?"}
                          </span>
                        )}

                        <span className="text-sm text-slate-200 font-mono">Session ID: {session.id.slice(0, 8)}...</span>
                      </div>
                      <div className="flex flex-col gap-0.5 text-xs mt-1">
                        <span className="text-slate-400">
                          <Map className="inline-block w-4 h-4 mr-1 text-slate-400" />
                          Match ID: <span className="font-mono">{session.match_id || "?"}</span>
                        </span>
                        <span className="text-slate-500">
                          Progress: <span className="font-mono">{progress} actions</span> 
                          {session.status === "in_progress" && (
                            <span> &middot; <span className="text-green-400">{bans} bans</span>, <span className="text-blue-400">{picks} picks</span></span>
                          )}
                        </span>
                        {session.started_at && (
                          <span className="text-slate-500">Started: {new Date(session.started_at).toLocaleString()}</span>
                        )}
                        {session.completed_at && (
                          <span className="text-blue-400">Completed: {new Date(session.completed_at).toLocaleString()}</span>
                        )}
                      </div>
                      {/* Expandable veto history */}
                      <VetoMedicHistory
                        sessionId={session.id}
                        actions={historyBySession[session.id] || []}
                        status={session.status}
                        loading={!!actionSessionId && actionSessionId === session.id}
                        onExpand={expand => handleExpandHistory(session.id, expand)}
                        onRollback={() => handleRollbackLast(session.id)}
                      />
                    </div>
                    <div className="flex flex-col gap-2 items-end justify-end mt-2 md:mt-0">
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-yellow-500/40 text-yellow-400"
                        disabled={!!actionSessionId}
                        onClick={() => resetSession(session.id)}
                      >
                        <RefreshCw className="w-4 h-4 mr-1" /> Reset Veto
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-green-600/40 text-green-400"
                        disabled={!!actionSessionId}
                        onClick={() => openForceDialog(session)}
                      >
                        <CheckCircle2 className="w-4 h-4 mr-1" /> Force Complete
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
      <MapPickerDialog
        open={forceDialogOpen}
        onOpenChange={(open) => setForceDialogOpen(open)}
        availableMaps={pickableMaps}
        onConfirm={handleForceConfirm}
        allowMultiPick={false}
        loading={!!actionSessionId}
      />
    </>
  );
}
