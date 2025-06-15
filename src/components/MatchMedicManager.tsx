
import React, { useCallback, useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RefreshCw, ShieldAlert, Calendar, Edit, Flag, Activity, Trophy, MapPinned } from "lucide-react";
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
        id, round_number, match_number, status, score_team1, score_team2, completed_at, scheduled_time,
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
          {loading ? (
            <div className="text-center text-slate-300 py-8">Loading matches...</div>
          ) : filteredMatches.length === 0 ? (
            <div className="text-center text-slate-400 py-8">No matches found.</div>
          ) : (
            <div className="space-y-3">
              {filteredMatches.map(match => (
                <div
                  key={match.id}
                  className="flex flex-col md:flex-row md:items-start md:justify-between border border-slate-700 bg-slate-900 rounded-lg p-4 shadow"
                >
                  <div className="flex flex-col flex-1 gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline" className={`border-${match.status === "completed" ? "blue" : match.status === "live" ? "green" : match.status === "pending" ? "yellow" : "slate"}-500/40 bg-${match.status === "completed" ? "blue" : match.status === "live" ? "green" : match.status === "pending" ? "yellow" : "slate"}-500/10 text-${match.status === "completed" ? "blue" : match.status === "live" ? "green" : match.status === "pending" ? "yellow" : "slate"}-400`}>
                        {match.status.charAt(0).toUpperCase() + match.status.slice(1)}
                      </Badge>
                      {match.tournament && (
                        <span className="text-xs font-bold px-2 rounded bg-amber-900/60 text-amber-300">
                          {match.tournament.name}
                        </span>
                      )}
                      <span className="text-xs px-2 text-blue-200 font-mono">{match.team1?.name || "?"} <span className="text-slate-500">vs</span> {match.team2?.name || "?"}</span>
                      <span className="text-sm text-slate-200 font-mono">Match ID: {match.id.slice(0, 8)}...</span>
                      {/* --- New: Home/Away display (if veto session exists) --- */}
                      {match.vetoSession && (
                        <span className="ml-2 text-xs px-2 rounded bg-yellow-900/30 text-yellow-200 border border-yellow-800">
                          Home: {match.team1?.id === match.vetoSession.home_team_id ? match.team1?.name : match.team2?.name}
                        </span>
                      )}
                      {/* --- New: Veto session summary chip --- */}
                      <VetoSessionChip session={match.vetoSession} matchId={match.id} />
                    </div>
                    <div className="flex flex-col text-xs gap-1">
                      <span className="text-slate-400">
                        <Flag className="inline-block w-4 h-4 mr-1" />
                        Round {match.round_number}, #{match.match_number}
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
                        Score: <span className="font-mono">{match.score_team1} - {match.score_team2}</span>
                        {match.winner && (
                          <> | <span className="text-green-400">{match.winner.name} won</span></>
                        )}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 items-end justify-end mt-2 md:mt-0">
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-amber-600/40 text-amber-400"
                      disabled={!!actionMatchId}
                      onClick={() => openEditModal(match)}
                    >
                      <Edit className="w-4 h-4 mr-1" /> Edit Match
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Modal (basic HTML, refactor to shadcn Dialog if needed) */}
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

// NOTE: This file is now 419+ lines and does a lot; consider refactoring to smaller files after this update.

