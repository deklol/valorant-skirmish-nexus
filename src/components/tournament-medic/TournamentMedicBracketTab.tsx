
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import TournamentMedicBracketTabExtras from "./TournamentMedicBracketTabExtras";
import MatchEditModal from "@/components/MatchEditModal";

type Match = {
  id: string;
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

export default function TournamentMedicBracketTab({ tournament, onRefresh }: {
  tournament: Tournament;
  onRefresh: () => void;
}) {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(false);
  const [editModal, setEditModal] = useState<Match | null>(null);
  const [actionMatchId, setActionMatchId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("matches")
        .select("*")
        .eq("tournament_id", tournament.id)
        .order("round_number", { ascending: true })
        .order("match_number", { ascending: true });
      setMatches(data || []);
      setLoading(false);
    })();
  }, [tournament.id]);

  async function handleEditSubmit({ status, score_team1, score_team2, winner_id }: { status: MatchStatus, score_team1: number, score_team2: number, winner_id: string | null }) {
    if (!editModal) return;
    setActionMatchId(editModal.id);

    try {
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
      onRefresh();
      const { data, error } = await supabase
        .from("matches")
        .select("*")
        .eq("tournament_id", tournament.id)
        .order("round_number", { ascending: true })
        .order("match_number", { ascending: true });
      setMatches(data || []);
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

  // Helper to get a label for a team id
  function matchOr(id: string | null, fallback: string): string {
    if (!id) return fallback;
    const match = matches.find(m => m.team1_id === id || m.team2_id === id);
    if (match) {
      if (match.team1_id === id && match.team1_id) return "Team 1";
      if (match.team2_id === id && match.team2_id) return "Team 2";
    }
    return id.slice(0, 8);
  }

  // Helper to give correct modal props
  function getModalMatchObj(editModal: Match | null): any {
    if (!editModal) return null;
    // Names for both teams
    const team1_name = editModal.team1_id
      ? matchOr(editModal.team1_id, "Team 1")
      : "";
    const team2_name = editModal.team2_id
      ? matchOr(editModal.team2_id, "Team 2")
      : "";
    // Winner
    let winnerObj = null;
    if (editModal.winner_id) {
      if (editModal.team1_id === editModal.winner_id) {
        winnerObj = {
          id: editModal.winner_id,
          name: team1_name,
        };
      } else if (editModal.team2_id === editModal.winner_id) {
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
      team1: editModal.team1_id
        ? { id: editModal.team1_id, name: team1_name }
        : null,
      team2: editModal.team2_id
        ? { id: editModal.team2_id, name: team2_name }
        : null,
      winner: winnerObj,
      status: parseStatus(editModal.status),
      score_team1: typeof editModal.score_team1 === "number" ? editModal.score_team1 : 0,
      score_team2: typeof editModal.score_team2 === "number" ? editModal.score_team2 : 0,
    };
  }

  return (
    <div className="flex flex-col gap-2">
      <TournamentMedicBracketTabExtras tournament={tournament} onRefresh={onRefresh} />
      {loading ? (
        <span>Loading...</span>
      ) : (
        matches.map(match => (
          <div key={match.id} className="bg-slate-800 rounded px-2 py-1 text-xs flex flex-wrap items-center gap-2">
            <Badge className="bg-amber-900/60">
              R{match.round_number} M{match.match_number}
            </Badge>
            <span className="font-mono">{match.team1_id?.slice(0,8)} vs {match.team2_id?.slice(0,8)}</span>
            <span>Status: {match.status}</span>
            <Button size="sm" variant="outline" onClick={() => setEditModal(match)}>
              Force Result
            </Button>
          </div>
        ))
      )}
      <MatchEditModal
        open={!!editModal}
        match={getModalMatchObj(editModal)}
        actionMatchId={actionMatchId}
        onChange={/* modal returns partial modal props, so patch for next render */ m => setEditModal(o =>
          o
            ? {
                ...o,
                // patch scores and winner fields. Only override if m has them.
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
    </div>
  );
}
