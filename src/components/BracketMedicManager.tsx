
import React, { useState, useEffect, useCallback } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Wrench, RefreshCw, Trophy, ShieldAlert, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

type TournamentInfo = {
  id: string;
  name: string;
};

type MatchInfo = {
  id: string;
  round_number: number;
  match_number: number;
  status: "pending" | "live" | "completed";
  team1_id: string | null;
  team2_id: string | null;
  winner_id: string | null;
  score_team1: number | null;
  score_team2: number | null;
};

function groupMatchesByRound(matches: MatchInfo[]): Record<number, MatchInfo[]> {
  return matches.reduce((acc, match) => {
    if (!acc[match.round_number]) {
      acc[match.round_number] = [];
    }
    acc[match.round_number].push(match);
    return acc;
  }, {} as Record<number, MatchInfo[]>);
}

/**
 * Find bracket inconsistencies:
 * - A team appearing more than once in active matches in later rounds.
 * - A team in next round whose previous round match is not completed.
 */
function detectBracketIssues(matches: MatchInfo[]) {
  const issues: string[] = [];
  const activeTeams: Record<string, string[]> = {}; // team_id -> [match_ids]
  for (const match of matches) {
    if (match.team1_id)
      activeTeams[match.team1_id] = (activeTeams[match.team1_id] || []).concat([match.id]);
    if (match.team2_id)
      activeTeams[match.team2_id] = (activeTeams[match.team2_id] || []).concat([match.id]);
  }
  for (const [tid, mids] of Object.entries(activeTeams)) {
    if (mids.length > 1)
      issues.push(`Team ${tid.slice(0, 8)} appears in multiple matches (${mids.map(m => m.slice(0, 8)).join(", ")})`);
  }
  // Furthermore: check teams whose round advanced but previous match not completed
  // (implemented in per-match round details in UI)
  return issues;
}

export default function BracketMedicManager() {
  const { toast } = useToast();
  const [tournaments, setTournaments] = useState<TournamentInfo[]>([]);
  const [selectedTournament, setSelectedTournament] = useState<TournamentInfo | null>(null);
  const [matches, setMatches] = useState<MatchInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionInProgress, setActionInProgress] = useState(false);

  // Load the tournament list
  useEffect(() => {
    const fetchTournaments = async () => {
      const { data, error } = await supabase
        .from("tournaments")
        .select("id, name")
        .order("created_at", { ascending: false })
        .limit(70);
      setTournaments(data ?? []);
    };
    fetchTournaments();
  }, []);

  // Load matches for selected tournament
  const loadBracket = useCallback(async (tournamentId: string) => {
    setLoading(true);
    const { data, error } = await supabase
      .from("matches")
      .select("id, round_number, match_number, status, team1_id, team2_id, winner_id, score_team1, score_team2")
      .eq("tournament_id", tournamentId)
      .order("round_number", { ascending: true })
      .order("match_number", { ascending: true });

    setMatches(data ?? []);
    setLoading(false);
  }, []);

  // Handle tournament selection
  const handleSelectTournament = (id: string) => {
    const t = tournaments.find(t => t.id === id) || null;
    setSelectedTournament(t);
    if (t) loadBracket(t.id);
    else setMatches([]);
  };

  // Cascade reset a match and downstream matches
  async function handleCascadeReset(matchId: string) {
    if (!selectedTournament) return;
    if (!window.confirm("Are you sure you want to RESET this match and all downstream matches? This action cannot be undone. Completed matches will NOT be changed.")) return;
    setActionInProgress(true);
    // Cascade: for this match and all later rounds, clear team assignments if match status is not "completed"
    try {
      // Get all matches in order
      const affected: MatchInfo[] = [];
      let toCheck = [matchId];
      const matchMap: Record<string, MatchInfo> = Object.fromEntries(matches.map(m => [m.id, m]));

      while (toCheck.length) {
        const currentId = toCheck.shift()!;
        const current = matchMap[currentId];
        if (!current) continue;
        affected.push(current);
        // Find downstream matches depending on this one's winner assignment
        const downstreamMatches = matches.filter(
          m =>
            m.round_number > current.round_number &&
            (
              m.team1_id === current.winner_id ||
              m.team2_id === current.winner_id
            )
        );
        for (const d of downstreamMatches) {
          if (d.status !== "completed" && !affected.find(dm => dm.id === d.id)) {
            toCheck.push(d.id);
          }
        }
      }
      // Reset team assignments for all affected matches that are not completed
      for (const m of affected) {
        if (m.status !== "completed") {
          await supabase
            .from("matches")
            .update({
              team1_id: null,
              team2_id: null,
              winner_id: null,
              score_team1: 0,
              score_team2: 0,
              status: "pending"
            })
            .eq("id", m.id);
        }
      }
      toast({
        title: "Bracket Cascade Reset",
        description: `Reset ${affected.filter(m => m.status !== "completed").length} matches (leaving completed matches unchanged).`,
      });
      loadBracket(selectedTournament.id);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setActionInProgress(false);
    }
  }

  // Simple team swap within one match (does not cascade)
  async function handleSwapTeamsInMatch(matchId: string) {
    if (!selectedTournament) return;
    const match = matches.find(m => m.id === matchId);
    if (!match || match.status === "completed") {
      toast({ title: "Cannot swap", description: "Match is completed." });
      return;
    }
    setActionInProgress(true);
    try {
      await supabase
        .from("matches")
        .update({
          team1_id: match.team2_id,
          team2_id: match.team1_id
        })
        .eq("id", match.id);
      toast({ title: "Teams swapped" });
      loadBracket(selectedTournament.id);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setActionInProgress(false);
    }
  }

  // Trigger bracket advancement logic (re-calculate progression – safe: only for pending/live)
  async function handleAdvanceBracket() {
    if (!selectedTournament) return;
    setActionInProgress(true);
    try {
      // For each match in order, if winner assigned and next round exists, assign winner downstream (skipping completed matches)
      for (const match of matches) {
        if (!match.winner_id) continue;
        const nextRound = match.round_number + 1;
        const nextMatchNumber = Math.ceil(match.match_number / 2);
        const downstream = matches.find(
          m =>
            m.round_number === nextRound &&
            m.match_number === nextMatchNumber
        );
        if (downstream && downstream.status !== "completed") {
          // Assign this winner to the correct team slot (odd/even pattern)
          const isOdd = match.match_number % 2 === 1;
          const updateField = isOdd ? "team1_id" : "team2_id";
          await supabase
            .from("matches")
            .update({ [updateField]: match.winner_id })
            .eq("id", downstream.id);
          // Optionally set status to live if both slots filled
          const { data: check } = await supabase
            .from("matches")
            .select("team1_id, team2_id")
            .eq("id", downstream.id)
            .maybeSingle();
          if (check?.team1_id && check?.team2_id) {
            await supabase
              .from("matches")
              .update({ status: "live" })
              .eq("id", downstream.id);
          }
        }
      }
      toast({ title: "Bracket Advanced", description: "Re-applied winner progression for all non-completed matches." });
      loadBracket(selectedTournament.id);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setActionInProgress(false);
    }
  }

  // UI
  const roundGroups = groupMatchesByRound(matches);
  const issues = detectBracketIssues(matches);

  return (
    <Card className="bg-slate-800 border-slate-700 mb-8">
      <CardHeader>
        <CardTitle className="flex gap-2 items-center text-white">
          <Wrench className="w-5 h-5 text-cyan-300" />
          Bracket Medic <span className="text-xs text-cyan-300">(Bracket Integrity Repair)</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-3 flex gap-2 items-center">
          <Input
            className="w-64"
            type="text"
            placeholder="Search tournament by name"
            disabled={loading}
            onChange={e => {
              const q = e.target.value.trim().toLowerCase();
              setTournaments(tournaments =>
                tournaments.slice().sort((a, b) => {
                  if (!q) return 0;
                  const aMatch = a.name?.toLowerCase().includes(q) ? -1 : 0;
                  const bMatch = b.name?.toLowerCase().includes(q) ? -1 : 0;
                  return aMatch - bMatch;
                })
              );
            }}
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => selectedTournament && loadBracket(selectedTournament.id)}
            disabled={loading}
          >
            <RefreshCw className="w-4 h-4 mr-1" /> Refresh Bracket
          </Button>
        </div>
        {/* Tournament selector */}
        <div className="flex flex-wrap gap-2 mb-4">
          {tournaments.map(t =>
            <Button
              key={t.id}
              size="sm"
              className={selectedTournament?.id === t.id ? "bg-cyan-600 text-white" : ""}
              variant={selectedTournament?.id === t.id ? "default" : "outline"}
              onClick={() => handleSelectTournament(t.id)}
            >
              <Trophy className="w-4 h-4 mr-1" />
              {t.name}
            </Button>
          )}
        </div>

        {!selectedTournament && (
          <div className="text-slate-300 text-center py-8">Select a tournament to use Bracket Medic.</div>
        )}

        {selectedTournament && (
          <>
            {/* Bracket Health Summary */}
            <div className="mb-3">
              {issues.length === 0 ? (
                <Badge className="bg-green-700 text-white mr-2">Healthy</Badge>
              ) : (
                <Badge className="bg-red-700 text-white mr-2">
                  <AlertTriangle className="inline w-3 h-3 mr-1" /> Issues
                </Badge>
              )}
              <span className="text-slate-400 text-sm">{issues.length === 0 ? "No bracket issues detected." : issues.join("; ")}</span>
              <div className="mt-2">
                <Button variant="outline" size="sm" className="mr-2" onClick={handleAdvanceBracket} disabled={actionInProgress}>
                  Cascade Advance Winners
                </Button>
              </div>
            </div>

            {/* Bracket Detail Table */}
            <div className="overflow-x-auto">
              {Object.keys(roundGroups).length === 0 && (
                <div className="text-slate-400 py-8">No matches created yet.</div>
              )}

              {Object.entries(roundGroups).map(([round, matches]) => (
                <div key={round} className="mb-4">
                  <div className="text-blue-400 font-bold mb-2">Round {round}</div>
                  <table className="min-w-full text-xs mb-2 bg-slate-900 rounded-lg shadow">
                    <thead>
                      <tr>
                        <th className="px-3 py-2">Match #</th>
                        <th className="px-3 py-2">Team 1</th>
                        <th className="px-3 py-2">Team 2</th>
                        <th className="px-3 py-2">Winner</th>
                        <th className="px-3 py-2">Status</th>
                        <th className="px-3 py-2">Score</th>
                        <th className="px-3 py-2">Tools</th>
                      </tr>
                    </thead>
                    <tbody>
                      {matches.map(match => {
                        // Highlight if team advanced without previous match completed
                        let advWarn = "";
                        if (round !== "1" && (match.team1_id || match.team2_id)) {
                          const prevRound = roundGroups[(+round) - 1] || [];
                          const getsHereVia = (tid: string | null) =>
                            !!prevRound.find(m => m.winner_id === tid && m.status !== "completed");
                          if (match.team1_id && getsHereVia(match.team1_id))
                            advWarn += "Team1 assigned before prior match completed. ";
                          if (match.team2_id && getsHereVia(match.team2_id))
                            advWarn += "Team2 assigned before prior match completed.";
                        }
                        return (
                          <tr key={match.id} className={advWarn ? "bg-yellow-900/30" : ""}>
                            <td className="px-3 py-2">{match.match_number}</td>
                            <td className="px-3 py-2 font-mono">{match.team1_id?.slice(0, 8) || <span className="text-slate-600">?</span>}</td>
                            <td className="px-3 py-2 font-mono">{match.team2_id?.slice(0, 8) || <span className="text-slate-600">?</span>}</td>
                            <td className="px-3 py-2 font-mono">{match.winner_id?.slice(0, 8) || "-"}</td>
                            <td className="px-3 py-2">
                              <Badge
                                variant={match.status === "completed" ? "default" : "outline"}
                                className={
                                  match.status === "completed"
                                    ? "bg-blue-700 text-white"
                                    : match.status === "live"
                                    ? "bg-green-700 text-white"
                                    : "bg-yellow-700 text-white"
                                }
                              >
                                {match.status}
                              </Badge>
                            </td>
                            <td className="px-3 py-2">
                              {match.score_team1 ?? "-"} : {match.score_team2 ?? "-"}
                            </td>
                            <td className="px-3 py-2">
                              {match.status !== "completed" && (
                                <>
                                  <Button
                                    size="xs"
                                    variant="outline"
                                    className="text-amber-400 border-amber-500/40 mr-2 mb-1"
                                    disabled={actionInProgress}
                                    onClick={() => handleCascadeReset(match.id)}
                                  >
                                    Cascade Reset
                                  </Button>
                                  <Button
                                    size="xs"
                                    variant="outline"
                                    className="text-cyan-400 border-cyan-500/40 mb-1"
                                    disabled={actionInProgress}
                                    onClick={() => handleSwapTeamsInMatch(match.id)}
                                  >
                                    Swap
                                  </Button>
                                </>
                              )}
                              {advWarn && (
                                <span className="ml-2 text-yellow-400" title={advWarn}>⚠</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
