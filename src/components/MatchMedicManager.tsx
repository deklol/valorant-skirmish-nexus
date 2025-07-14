import React, { useCallback, useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RefreshCw, ShieldAlert, Calendar, Edit, Flag, Activity, Trophy, MapPinned, ShieldCheck, AlertCircle, CheckCircle2, Play, Pause, RotateCcw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useEnhancedNotifications } from "@/hooks/useEnhancedNotifications";
import { processMatchResults } from "./MatchResultsProcessor";
import MatchEditModal from "./MatchEditModal";

// --- Additional: For Veto Session display ---
type VetoSessionSummary = {
  id: string;
  status: string;
  home_team_id: string | null;
  away_team_id: string | null;
  current_turn_team_id: string | null;
};

interface TeamInfo {
  id: string;
  name: string;
}
interface TournamentInfo {
  id: string;
  name: string;
}
interface WinnerInfo {
  id: string;
  name: string;
}
type MatchStatus = "completed" | "pending" | "live";
interface MatchInfo {
  id: string;
  tournament: TournamentInfo | null;
  team1: TeamInfo | null;
  team2: TeamInfo | null;
  winner: WinnerInfo | null;
  round_number: number;
  match_number: number;
  status: MatchStatus;
  score_team1: number;
  score_team2: number;
  completed_at: string | null;
  scheduled_time: string | null;
  started_at?: string | null;
  // New: veto session summary fields
  vetoSession?: VetoSessionSummary | null;
}

function parseTeamInfo(obj: any): TeamInfo | null {
  return obj && typeof obj === "object" && "id" in obj && "name" in obj
    ? { id: obj.id, name: obj.name }
    : null;
}
function parseWinnerInfo(obj: any): WinnerInfo | null {
  return obj && typeof obj === "object" && "id" in obj && "name" in obj
    ? { id: obj.id, name: obj.name }
    : null;
}
function parseTournamentInfo(obj: any): TournamentInfo | null {
  return obj && typeof obj === "object" && "id" in obj && "name" in obj
    ? { id: obj.id, name: obj.name }
    : null;
}

// Parse match status safely for enum
function parseStatus(s: any): "completed" | "pending" | "live" {
  if (s === "completed" || s === "pending" || s === "live") return s;
  return "pending";
}

// New: Small summary chip for veto session
function VetoSessionChip({ session, matchId }: { session: VetoSessionSummary | null | undefined, matchId: string }) {
  if (!session) return null;
  let color = "bg-slate-600 text-slate-200 border-slate-800";
  if (session.status === "pending") color = "bg-yellow-900/70 text-yellow-200 border-yellow-700";
  else if (session.status === "in_progress") color = "bg-green-900/70 text-green-200 border-green-700";
  else if (session.status === "completed") color = "bg-blue-900/70 text-blue-200 border-blue-700";
  return (
    <span
      className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded border ${color} ml-2`}
      title={`Veto session for this match. Status: ${session.status}`}
    >
      <MapPinned className="w-4 h-4 mr-1 inline" />
      Veto: {session.status.charAt(0).toUpperCase() + session.status.slice(1)}
      <a
        href={`#vetomedic-session-${session.id}`}
        target="_blank"
        rel="noopener noreferrer"
        className="ml-1 text-blue-400 underline hover:text-blue-200"
        title="Open in VetoMedic"
        onClick={e => {
          e.preventDefault();
          // Try to route to the admin veto-medic tab if available (simulate tab switch)
          // Show as anchor for fallback, but user will need to scroll yourself
          const vetomedicTab = document.querySelector('[data-state="active"][value="veto-medic"]');
          if (vetomedicTab) {
            (vetomedicTab as HTMLElement).click();
            setTimeout(() => {
              const el = document.getElementById(`vetomedic-session-${session.id}`);
              if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
            }, 600);
          }
        }}
      >Manage</a>
    </span>
  );
}

// Add an AuditLogTurn type
type AuditLogTurn = {
  id: string;
  record_id: string;
  action: string;
  created_at: string;
  new_values: any;
  old_values: any;
};

function TurnSwitchLogViewer({ vetoSessionId }: { vetoSessionId: string }) {
  const [logs, setLogs] = useState<AuditLogTurn[]>([]);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (!vetoSessionId) return;
    setLoading(true);
    supabase
      .from("audit_logs")
      .select("*")
      .eq("table_name", "map_veto_sessions")
      .eq("action", "TURN_SWITCH")
      .eq("record_id", vetoSessionId)
      .order("created_at")
      .then(({ data, error }) => {
        setLogs(data || []);
        setLoading(false);
      });
  }, [vetoSessionId]);

  if (!vetoSessionId) return null;
  if (loading) return <div className="text-xs text-yellow-400 p-2">Loading turn switch logs...</div>;
  if (!logs.length) return null;

  return (
    <div className="mt-1 mb-2">
      <button
        className="text-xs text-blue-400 underline hover:text-blue-200 mb-0.5"
        onClick={() => setExpanded(!expanded)}
      >
        {expanded ? "Hide" : "Show"} Veto Turn Change History ({logs.length})
      </button>
      {expanded && (
        <div className="bg-slate-900 border border-blue-800 p-2 rounded text-xs max-h-60 overflow-y-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-blue-700">
                <th className="text-left pl-0">When</th>
                <th className="text-left">Previous Turn</th>
                <th className="text-left">New Turn</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id}>
                  <td className="pr-2">{new Date(log.created_at).toLocaleString()}</td>
                  <td>
                    {log.old_values?.current_turn_team_id || <span className="text-slate-400 italic">None</span>}
                  </td>
                  <td>
                    {log.new_values?.current_turn_team_id || <span className="text-slate-400 italic">None</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function MatchMedicManager() {
  const [matches, setMatches] = useState<MatchInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionMatchId, setActionMatchId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [search, setSearch] = useState<string>("");
  const [editModal, setEditModal] = useState<null | MatchInfo>(null);
  const { toast } = useToast();
  const {
    notifyMatchComplete,
    notifyTournamentWinner,
    notifyMatchReady,
  } = useEnhancedNotifications();

  // Fetch all matches and join with latest veto session for each match (if any)
  const fetchMatches = useCallback(async () => {
    setLoading(true);

    // 1. Get matches and LEFT JOIN (one) map_veto_sessions for each match
    const { data, error } = await supabase
      .from("matches")
      .select(`
        id, round_number, match_number, status, score_team1, score_team2, completed_at, scheduled_time, started_at,
        tournament:tournament_id ( id, name ),
        team1:team1_id ( id, name ),
        team2:team2_id ( id, name ),
        winner:winner_id ( id, name ),
        map_veto_sessions:map_veto_sessions!map_veto_sessions_match_id_fkey (
          id, status, home_team_id, away_team_id, current_turn_team_id
        )
      `)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      setMatches([]);
    } else {
      setMatches(
        (data || []).map((m: any) => ({
          id: m.id,
          round_number: m.round_number,
          match_number: m.match_number,
          status: parseStatus(m.status),
          score_team1: m.score_team1,
          score_team2: m.score_team2,
          completed_at: m.completed_at,
          scheduled_time: m.scheduled_time,
          started_at: m.started_at,
          tournament: parseTournamentInfo(m.tournament),
          team1: parseTeamInfo(m.team1),
          team2: parseTeamInfo(m.team2),
          winner: parseWinnerInfo(m.winner),
          // VetoSession: pick most relevant one (should only be 1 per match)
          vetoSession: Array.isArray(m.map_veto_sessions) && m.map_veto_sessions.length > 0
            ? m.map_veto_sessions[0]
            : m.map_veto_sessions && typeof m.map_veto_sessions === "object"
              ? m.map_veto_sessions
              : null
        }))
      );
    }
    setLoading(false);
  }, [toast]);

  useEffect(() => {
    fetchMatches();
  }, [fetchMatches]);

  // Filtering
  const filteredMatches = matches.filter(match => {
    let matchStatus = filterStatus === "all" || match.status === filterStatus;
    let matchSearch = !search ||
      [match.tournament?.name, match.team1?.name, match.team2?.name, match.id]
        .filter(Boolean)
        .some(field => field!.toLowerCase().includes(search.toLowerCase()));
    return matchStatus && matchSearch;
  });

  // Admin: edit status/score/winner for a match (opens modal)
  function openEditModal(match: MatchInfo) {
    setEditModal(match);
  }

  // Admin: handle update (score, status, winner)
  async function handleEditSubmit({ status, score_team1, score_team2, winner_id }: {status: MatchStatus, score_team1: number, score_team2: number, winner_id: string | null}) {
    if (!editModal) return;
    setActionMatchId(editModal.id);

    try {
      if (status === "completed" && winner_id) {
        // Use bracket processor logic, provide hooks as dependency injection
        await processMatchResults(
          {
            matchId: editModal.id,
            winnerId: winner_id,
            loserId: winner_id === editModal.team1?.id ? editModal.team2?.id ?? "" : editModal.team1?.id ?? "",
            tournamentId: editModal.tournament?.id ?? "",
            scoreTeam1: score_team1,
            scoreTeam2: score_team2,
            onComplete: () => {},
          },
          {
            toast: (args) => toast({
              ...args,
              variant: (args.variant ?? "default") as "default" | "destructive",
            }),
            notifyMatchComplete,
            notifyTournamentWinner,
            notifyMatchReady,
          }
        );
        toast({ title: "Match and bracket updated" });
      } else {
        await supabase
          .from("matches")
          .update({
            status,
            score_team1,
            score_team2,
            winner_id: winner_id,
            ...(status === "completed" ? { completed_at: new Date().toISOString() } : {})
          })
          .eq("id", editModal.id);
        toast({ title: "Match updated" });
      }
      fetchMatches();
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

  // Add match health check function
  const handleMatchHealthCheck = async (matchId: string) => {
    setActionMatchId(matchId);
    try {
      const match = matches.find(m => m.id === matchId);
      if (!match) return;

      let issues = [];
      
      // Check for missing teams
      if (!match.team1 || !match.team2) {
        issues.push("Missing team assignments");
      }
      
      // Check for invalid scores
      if (match.status === "completed" && (!match.winner || (match.score_team1 === 0 && match.score_team2 === 0))) {
        issues.push("Completed match missing winner or scores");
      }
      
      // Check for scheduling conflicts
      if (match.status === "pending" && match.scheduled_time && new Date(match.scheduled_time) < new Date()) {
        issues.push("Match scheduled in the past");
      }

      if (issues.length === 0) {
        toast({ title: "Match Health Check", description: "No issues found!" });
      } else {
        toast({
          title: "Match Issues Detected",
          description: issues.join(" | "),
          variant: "destructive"
        });
      }
    } catch (err: any) {
      toast({
        title: "Health Check Error",
        description: err.message,
        variant: "destructive"
      });
    } finally {
      setActionMatchId(null);
    }
  };

  // Quick status change function
  const handleQuickStatusChange = async (matchId: string, newStatus: "pending" | "live" | "completed") => {
    setActionMatchId(matchId);
    try {
      const updateData: any = { status: newStatus };
      
      if (newStatus === "live") {
        updateData.started_at = new Date().toISOString();
      } else if (newStatus === "completed") {
        updateData.completed_at = new Date().toISOString();
      }

      await supabase
        .from("matches")
        .update(updateData)
        .eq("id", matchId);

      toast({ title: "Status Updated", description: `Match status changed to ${newStatus}` });
      fetchMatches();
    } catch (err: any) {
      toast({
        title: "Status Update Error",
        description: err.message,
        variant: "destructive"
      });
    } finally {
      setActionMatchId(null);
    }
  };

  // Render
  return (
    <>
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="flex gap-2 items-center text-white">
            <ShieldAlert className="w-5 h-5 text-amber-300" />
            Match Medic <span className="text-xs text-amber-300">(Admin Match Override & Recovery)</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Search and filter controls */}
          <div className="mb-4 flex flex-wrap gap-2 items-center">
            <Input
              type="text"
              placeholder="Search by team, tournament, or match ID"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-56"
            />
            <div className="flex gap-1">
              {["all", "pending", "live", "completed"].map(s =>
                <Button
                  key={s}
                  variant={filterStatus === s ? "default" : "outline"}
                  className={filterStatus === s ? "bg-amber-600 text-white" : ""}
                  size="sm"
                  onClick={() => setFilterStatus(s)}
                >
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </Button>
              )}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchMatches}
              className="ml-auto"
              disabled={loading}
            >
              <RefreshCw className="w-4 h-4 mr-1" />
              Refresh
            </Button>
          </div>

          {/* Advanced Match Management Section */}
          <div className="mb-6 border border-blue-600/30 bg-blue-950/20 rounded-lg p-4">
            <h3 className="text-blue-400 font-medium mb-3 flex items-center gap-2">
              <Edit className="w-4 h-4" />
              Advanced Match Management
            </h3>
            <div className="text-sm text-slate-300">
              Click "Edit Match" on any match below to access advanced controls including team reassignment, 
              notes, and detailed match management.
            </div>
          </div>

          {/* Match Scheduling Section */}
          <div className="mb-6 border border-green-600/30 bg-green-950/20 rounded-lg p-4">
            <h3 className="text-green-400 font-medium mb-3 flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Match Scheduling
            </h3>
            <div className="text-sm text-slate-300">
              Scheduling controls are available in the match edit modal. Select a match and click "Edit Match" 
              to set scheduled times and manage timing.
            </div>
          </div>

          {loading ? (
            <div className="text-center text-slate-300 py-8">Loading matches...</div>
          ) : filteredMatches.length === 0 ? (
            <div className="text-center text-slate-400 py-8">No matches found.</div>
          ) : (
            <div className="space-y-4">
              {filteredMatches.map(match => (
                <div
                  key={match.id}
                  className="flex flex-col md:flex-row md:items-start md:justify-between border border-slate-700 bg-slate-900 rounded-lg p-4 shadow"
                >
                  <div className="flex flex-col gap-1 flex-1">
                    {/* Status and Tournament Row */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline" className={
                        match.status === "completed"
                          ? "bg-blue-500/10 text-blue-400 border-blue-500/40"
                          : match.status === "live"
                          ? "bg-green-500/10 text-green-400 border-green-500/40"
                          : "bg-yellow-500/10 text-yellow-400 border-yellow-500/40"
                      }>
                        {match.status === "completed"
                          ? "Completed"
                          : match.status === "live"
                          ? "Live"
                          : "Pending"}
                      </Badge>
                      {match.tournament && (
                        <span className="text-xs font-bold px-2 rounded bg-amber-900/60 text-amber-300">
                          {match.tournament.name}
                        </span>
                      )}
                      <span className="text-xs px-2 text-blue-200 font-mono">
                        {match.team1?.name || "?"} <span className="text-slate-500">vs</span> {match.team2?.name || "?"}
                      </span>
                      <span className="text-sm text-slate-200 font-mono">Match ID: {match.id.slice(0, 8)}...</span>
                      {/* Home/Away display (if veto session exists) */}
                      {match.vetoSession && (
                        <span className="ml-2 text-xs px-2 rounded bg-yellow-900/30 text-yellow-200 border border-yellow-800">
                          Home: {match.team1?.id === match.vetoSession.home_team_id ? match.team1?.name : match.team2?.name}
                        </span>
                      )}
                      {/* Veto session summary chip */}
                      <VetoSessionChip session={match.vetoSession} matchId={match.id} />
                    </div>

                    {/* Match Details */}
                    <div className="flex flex-col gap-0.5 text-xs mt-1">
                      <span className="text-slate-400">
                        <Flag className="inline-block w-4 h-4 mr-1 text-slate-400" />
                        Round {match.round_number}, Match #{match.match_number}
                      </span>
                      {match.scheduled_time && (
                        <span className="text-slate-500">
                          <Calendar className="inline-block w-4 h-4 mr-1" />
                          Scheduled: {new Date(match.scheduled_time).toLocaleString()}
                        </span>
                      )}
                      {match.completed_at && (
                        <span className="text-blue-400">
                          <Trophy className="inline-block w-4 h-4 mr-1" />
                          Completed: {new Date(match.completed_at).toLocaleString()}
                        </span>
                      )}
                      <span className="text-slate-500">
                        <Activity className="inline-block w-4 h-4 mr-1" />
                        Score: <span className="font-mono">{match.score_team1} - {match.score_team2}</span>
                        {match.winner && (
                          <> | <span className="text-green-400">{match.winner.name} won</span></>
                        )}
                      </span>
                    </div>

                    {/* Match Status History */}
                    <div className="bg-slate-800 border border-slate-700 mt-2 mb-1 rounded-lg p-2 max-w-xl">
                      <div className="font-semibold text-sm text-amber-200 mb-1">Match Status & Timeline</div>
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-xs bg-slate-700/40 p-1 rounded">
                          <span className="flex items-center gap-2">
                            <span className="text-slate-400 font-mono">Status:</span>
                            <span className={
                              match.status === "completed"
                                ? "bg-blue-700/40 text-blue-300 px-2 py-0.5 rounded font-bold"
                                : match.status === "live"
                                ? "bg-green-700/30 text-green-200 px-2 py-0.5 rounded font-bold"
                                : "bg-yellow-700/30 text-yellow-200 px-2 py-0.5 rounded font-bold"
                            }>
                              {match.status.toUpperCase()}
                            </span>
                            {match.started_at && (
                              <span className="text-green-200">Started: {new Date(match.started_at).toLocaleTimeString()}</span>
                            )}
                          </span>
                        </div>
                        {match.score_team1 > 0 || match.score_team2 > 0 ? (
                          <div className="flex items-center text-xs bg-slate-700/40 p-1 rounded">
                            <span className="text-slate-400 font-mono mr-2">Scores:</span>
                            <span className="text-white font-medium">{match.team1?.name}: {match.score_team1}</span>
                            <span className="text-slate-500 mx-2">-</span>
                            <span className="text-white font-medium">{match.team2?.name}: {match.score_team2}</span>
                          </div>
                        ) : (
                          <div className="text-slate-500 text-xs py-1">No scores recorded yet.</div>
                        )}
                      </div>
                    </div>

                    {/* Veto turn switches if this match has a session */}
                    {match.vetoSession?.id && (
                      <TurnSwitchLogViewer vetoSessionId={match.vetoSession.id} />
                    )}
                  </div>
                  
                  {/* Action buttons section */}
                  <div className="flex flex-col gap-2 items-end justify-end mt-2 md:mt-0">
                    {/* Diagnostic Tools Group */}
                    <div className="flex flex-col gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-cyan-500/40 text-cyan-300"
                        onClick={() => handleMatchHealthCheck(match.id)}
                        disabled={!!actionMatchId}
                      >
                        <ShieldCheck className="w-4 h-4 mr-1" />
                        Health Check
                      </Button>
                    </div>

                    {/* Quick Status Tools Group */}
                    <div className="flex flex-col gap-1">
                      {match.status === "pending" && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-green-600/40 text-green-400"
                          onClick={() => handleQuickStatusChange(match.id, "live")}
                          disabled={!!actionMatchId}
                        >
                          <Play className="w-4 h-4 mr-1" />
                          Start Match
                        </Button>
                      )}
                      {match.status === "live" && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-blue-600/40 text-blue-400"
                          onClick={() => handleQuickStatusChange(match.id, "completed")}
                          disabled={!!actionMatchId}
                        >
                          <CheckCircle2 className="w-4 h-4 mr-1" />
                          Complete Match
                        </Button>
                      )}
                      {match.status !== "pending" && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-yellow-600/40 text-yellow-400"
                          onClick={() => handleQuickStatusChange(match.id, "pending")}
                          disabled={!!actionMatchId}
                        >
                          <RotateCcw className="w-4 h-4 mr-1" />
                          Reset Status
                        </Button>
                      )}
                    </div>

                    {/* Action Tools Group */}
                    <div className="flex flex-col gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-amber-600/40 text-amber-400"
                        disabled={!!actionMatchId}
                        onClick={() => openEditModal(match)}
                      >
                        <Edit className="w-4 h-4 mr-1" /> 
                        Edit Match
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Modal */}
      <MatchEditModal
        open={!!editModal}
        match={editModal}
        actionMatchId={actionMatchId}
        onChange={setEditModal}
        onCancel={() => setEditModal(null)}
        onSave={handleEditSubmit}
      />
    </>
  );
}

// NOTE: This file is now 400+ lines and does a lot; consider refactoring to smaller files after this update.
