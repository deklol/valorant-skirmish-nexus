import React, { useEffect, useState, useCallback } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Map, RefreshCw, ShieldAlert, CheckCircle2, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import MapPickerDialog from "./MapPickerDialog";
import VetoMedicHistory from "./VetoMedicHistory";
import { generateBO1VetoFlow } from "./map-veto/vetoFlowBO1";

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

// -- Update: Add home_team_id and away_team_id for correct type
interface VetoSession {
  id: string;
  match_id: string | null;
  match: MatchInfo | null;
  status: string | null;
  current_turn_team_id: string | null;
  started_at: string | null;
  completed_at: string | null;
  home_team_id: string | null;    // <-- ADDED
  away_team_id: string | null;    // <-- ADDED
  // ... Add any other session-level fields if needed ...
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
  // -- REPLACE veto action history from audit_logs with veto actions --
  const [actionsBySession, setActionsBySession] = useState<Record<string, any[]>>({});
  const [actionsLoadingBySession, setActionsLoadingBySession] = useState<Record<string, boolean>>({});
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [search, setSearch] = useState<string>("");
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
      // ^^^ By using `*`, home_team_id and away_team_id ARE selected!
      .order("started_at", { ascending: false })
      .limit(40); // for admin, fetch the latest 40

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      setSessions([]);
    } else {
      setSessions(
        (data || []).map((session: any) => ({
          ...session,
          match_id: session.match_id ?? null,
          home_team_id: session.home_team_id ?? null,    // <-- Defensive mapping
          away_team_id: session.away_team_id ?? null,    // <-- Defensive mapping
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

  // Filtering, search, and status controls
  const filteredSessions = sessions.filter(session => {
    let sessionStatus = filterStatus === "all" || session.status === filterStatus;
    // Search in tournament, team names, or session id (first 8 chars if user types short)
    let s = search.trim().toLowerCase();
    let sessionSearch =
      !s ||
      [
        session.match?.tournament?.name,
        session.match?.team1?.name,
        session.match?.team2?.name,
        session.id,
        session.id?.slice(0, 8),
        session.match_id
      ]
        .filter(Boolean)
        .some(field => field!.toLowerCase().includes(s));
    return sessionStatus && sessionSearch;
  });

  // Hook for canonical veto actions for a session
  function useVetoActions(sessionId: string) {
    const [actions, setActions] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    const fetch = useCallback(async () => {
      setLoading(true);
      // Join maps and users
      const { data, error } = await supabase
        .from("map_veto_actions")
        .select(`
          *,
          maps:map_id ( display_name ),
          users:performed_by ( discord_username )
        `)
        .eq("veto_session_id", sessionId)
        .order("order_number", { ascending: true });
      setActions(error ? [] : (data || []));
      setLoading(false);
    }, [sessionId]);

    useEffect(() => {
      if (sessionId) fetch();
    }, [sessionId, fetch]);

    return { actions, loading, reload: fetch };
  }

  // When viewing session details, fetch actions (not audit log)
  const fetchVetoActions = useCallback(async (sessionId: string) => {
    setActionsLoadingBySession((m) => ({ ...m, [sessionId]: true }));
    // Join maps and user for canonical actions (no audit log)
    const { data, error } = await supabase
      .from("map_veto_actions")
      .select("*, maps:map_id(display_name), users:performed_by(discord_username)")
      .eq("veto_session_id", sessionId)
      .order("order_number", { ascending: true });

    setActionsBySession((a) => ({
      ...a,
      [sessionId]: error ? [] : (data || []),
    }));
    setActionsLoadingBySession((m) => ({ ...m, [sessionId]: false }));
  }, []);

  const handleExpandHistory = (sessionId: string, expand: boolean) => {
    if (expand && !actionsBySession[sessionId]) fetchVetoActions(sessionId);
  };

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

      // 2. Fetch the session to get the home_team_id
      const { data: sessionRow, error: sessionFetchErr } = await supabase
        .from("map_veto_sessions")
        .select("home_team_id")
        .eq("id", sessionId)
        .maybeSingle();
      if (sessionFetchErr) throw sessionFetchErr;

      // 3. Reset the session itself, setting current_turn_team_id to home_team_id
      const { error: sessionErr } = await supabase
        .from("map_veto_sessions")
        .update({
          status: "pending",
          current_turn_team_id: sessionRow?.home_team_id || null,
          started_at: null,
          completed_at: null,
        })
        .eq("id", sessionId);

      if (sessionErr) throw sessionErr;

      toast({
        title: "Veto Reset",
        description: "Veto session has been reset. Home team is now set for first turn.",
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

  const handleRollbackLast = async (sessionId: string) => {
    setActionSessionId(sessionId);
    try {
      // 1. Get last action
      const actions = actionsBySession[sessionId] || [];
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

  // --- Start: Helper for progress steps calculation (B/E alignment, canonical logic) ---
  function getCanonicalProgressStats(session: VetoSessionWithDetails, allActions: any[], allMaps: any[]) {
    const team1Id = session.match?.team1?.id || null;
    const team2Id = session.match?.team2?.id || null;
    if (!team1Id || !team2Id || allMaps.length < 2) return { completed: 0, total: allMaps.length };
    const vetoFlow = generateBO1VetoFlow({
      homeTeamId: session.home_team_id!,
      awayTeamId: session.away_team_id!,
      maps: allMaps.map((m: any) => ({ id: m.id, name: m.display_name || m.name })),
    });
    // Only count ban/pick steps for step progress
    const total = vetoFlow.filter(s => s.action === "ban" || s.action === "pick").length;
    const completed = (allActions || []).filter((a: any) => a.action === "ban" || a.action === "pick").length;
    return { completed, total };
  }
  // --- End: Helper ---

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
          {/* --- Search/filter controls, unchanged --- */}
          <div className="mb-4 flex flex-wrap gap-2 items-center">
            <Input
              type="text"
              placeholder="Search by tournament, team, or session ID"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-56"
            />
            <div className="flex gap-1">
              {["all", "pending", "in_progress", "completed"].map(s =>
                <Button
                  key={s}
                  variant={filterStatus === s ? "default" : "outline"}
                  className={filterStatus === s ? "bg-yellow-600 text-white" : ""}
                  size="sm"
                  onClick={() => setFilterStatus(s)}
                >
                  {s === "all"
                    ? "All"
                    : s === "pending"
                    ? "Pending"
                    : s === "in_progress"
                    ? "In Progress"
                    : s === "completed"
                    ? "Completed"
                    : s}
                </Button>
              )}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchSessions}
              className="ml-auto"
              disabled={loading}
            >
              <RefreshCw className="w-4 h-4 mr-1" />
              Refresh
            </Button>
          </div>
          {loading ? (
            <div className="text-center text-slate-300 py-8">Loading veto sessions...</div>
          ) : filteredSessions.length === 0 ? (
            <div className="text-center text-slate-400 py-8">No veto sessions found.</div>
          ) : (
            <div className="space-y-4">
              {filteredSessions.map((session) => {
                // Carefully extract match/team info
                const match = session.match;
                const team1 = match?.team1;
                const team2 = match?.team2;
                const tournament = match?.tournament;

                // Always use canonical map_veto_actions:
                const actions = actionsBySession[session.id] || [];

                // Calculate expected steps for the current flow given map count
                const mapCount = maps.length;
                let totalSteps = mapCount; // for BO1 competitive
                // Use the canonical BO1 sequence for BO1 (to match backend)
                const vetoFlowSteps = (team1 && team2 && mapCount > 1)
                  ? generateBO1VetoFlow({
                      homeTeamId: session.home_team_id,
                      awayTeamId: session.away_team_id,
                      maps: maps.map(m => ({ id: m.id, name: m.display_name || m.name }))
                    })
                  : [];
                // Count only ban/pick actions, not side_pick
                const progressActions = actions.filter(a => a.action === 'ban' || a.action === 'pick');
                // Step label: bans+picks (canonical)
                const vetoProgressLabel = `${progressActions.length}/${vetoFlowSteps.filter(s => s.action !== 'side_pick').length || totalSteps}`;

                return (
                  <div
                    key={session.id}
                    className="flex flex-col md:flex-row md:items-start md:justify-between border border-slate-700 bg-slate-900 rounded-lg p-4 shadow"
                    id={`vetomedic-session-${session.id}`}
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
                        {tournament && (
                          <span className="text-xs font-bold px-2 rounded bg-blue-900/60 text-sky-300">
                            {tournament.name}
                          </span>
                        )}
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
                          Progress: <span className="font-mono">{vetoProgressLabel} actions</span>
                          {session.status === "in_progress" && (
                            <span> &middot; <span className="text-green-400">{actions.filter(a => a.action === "ban").length} bans</span>, <span className="text-blue-400">{actions.filter(a => a.action === "pick").length} picks</span></span>
                          )}
                        </span>
                        {session.started_at && (
                          <span className="text-slate-500">Started: {new Date(session.started_at).toLocaleString()}</span>
                        )}
                        {session.completed_at && (
                          <span className="text-blue-400">Completed: {new Date(session.completed_at).toLocaleString()}</span>
                        )}
                      </div>
                      {/* Canonical veto action log (history, point C/F) */}
                      <div className="bg-slate-800 border border-slate-700 mt-2 mb-1 rounded-lg p-2 max-w-xl">
                        <div className="font-semibold text-sm text-yellow-200 mb-1">Veto Action History</div>
                        <ol className="space-y-1">
                          {/* Defensive: display only if actions present */}
                          {actions.length === 0 && (
                            <li className="text-slate-500 text-xs py-1">No actions yet.</li>
                          )}
                          {actions.map((act, idx) => (
                            <li key={act.id} className="flex items-center justify-between text-xs bg-slate-700/40 p-1 rounded">
                              <span className="flex items-center gap-3">
                                <span className="text-slate-400 font-mono">#{idx + 1}</span>
                                <span className={
                                  act.action === "ban"
                                    ? "bg-red-700/40 text-red-300 px-2 py-0.5 rounded font-bold"
                                    : act.action === "pick"
                                      ? "bg-green-700/30 text-green-200 px-2 py-0.5 rounded font-bold"
                                      : "bg-blue-600/30 text-blue-100 px-2 py-0.5 rounded font-bold"
                                }>
                                  {act.action.toUpperCase()}
                                </span>
                                <span className="text-white font-medium">{act.maps?.display_name || "??"}</span>
                                {/* Show side_choice badge if pick and available */}
                                {act.action === "pick" && act.side_choice && (
                                  <span className={
                                    act.side_choice === "attack"
                                      ? "bg-red-700/30 text-red-200 px-2 py-0.5 rounded font-bold"
                                      : "bg-blue-700/30 text-blue-200 px-2 py-0.5 rounded font-bold"
                                  }>
                                    {act.side_choice.toUpperCase()} SIDE
                                  </span>
                                )}
                                {act.users?.discord_username && (
                                  <span className="ml-2 text-blue-200">by {act.users.discord_username}</span>
                                )}
                              </span>
                              <span className="text-slate-400">{act.performed_at ? new Date(act.performed_at).toLocaleTimeString() : ""}</span>
                            </li>
                          ))}
                        </ol>
                      </div>
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

// NOTE: This file is now 470+ lines. It is getting too long and should be refactored into smaller components, matching the structure of MatchMedicManager and other admin tools.
