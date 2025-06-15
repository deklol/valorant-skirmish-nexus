
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import TournamentMedicBracketTabExtras from "./TournamentMedicBracketTabExtras";
import MatchEditModal from "@/components/MatchEditModal";

// Update Match type to include team objects
type TeamObj = { id: string; name: string };
type Match = {
  id: string;
  team1: TeamObj | null;
  team2: TeamObj | null;
  team1_id: string | null; // for compatibility
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
      // Updated query: include team joins!
      const { data, error } = await supabase
        .from("matches")
        .select(`
          id, team1_id, team2_id, winner_id, round_number, match_number, status, score_team1, score_team2,
          team1:team1_id (id, name),
          team2:team2_id (id, name)
        `)
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
        .select(`
          id, team1_id, team2_id, winner_id, round_number, match_number, status, score_team1, score_team2,
          team1:team1_id (id, name),
          team2:team2_id (id, name)
        `)
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

  // No longer need matchOr helper, delete it

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
            {/* Show real team names */}
            <span className="font-mono">
              {match.team1?.name || (match.team1_id?.slice(0, 8) ?? "?")} vs {match.team2?.name || (match.team2_id?.slice(0, 8) ?? "?")}
            </span>
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
    </div>
  );
}
