import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import TournamentMedicBracketTabExtras from "./TournamentMedicBracketTabExtras";
import MatchEditModal, { parseStatus } from "@/components/MatchEditModal";

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

  async function handleEditSubmit({ status, score_team1, score_team2, winner_id }: { status: string, score_team1: number, score_team2: number, winner_id: string | null }) {
    if (!editModal) return;
    setActionMatchId(editModal.id);

    try {
      // If marked completed and given winner, use normal update path (admin bracket safe)
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
      // Optionally immediately refetch the matches list here:
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

  return (
    <div className="flex flex-col gap-2">
      {/* Bracket Admin Tools */}
      <TournamentMedicBracketTabExtras tournament={tournament} onRefresh={onRefresh} />
      {/* Existing match raw listing */}
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
      {/* Shared Match Edit Modal */}
      <MatchEditModal
        open={!!editModal}
        match={editModal && {
          ...editModal,
          match_number: editModal.match_number,
          team1: editModal.team1_id ? { id: editModal.team1_id, name: matchOr(editModal.team1_id, "Team 1") } : null,
          team2: editModal.team2_id ? { id: editModal.team2_id, name: matchOr(editModal.team2_id, "Team 2") } : null,
          winner: editModal.winner_id
            ? (editModal.team1_id === editModal.winner_id
                ? { id: editModal.winner_id, name: matchOr(editModal.team1_id, "Team 1") }
                : { id: editModal.winner_id, name: matchOr(editModal.team2_id, "Team 2") }
              )
            : null,
          status: editModal.status || "pending",
          score_team1: editModal.score_team1 || 0,
          score_team2: editModal.score_team2 || 0,
        }}
        actionMatchId={actionMatchId}
        onChange={m => setEditModal(m)}
        onCancel={() => setEditModal(null)}
        onSave={handleEditSubmit}
      />
    </div>
  );

  /** Helper to convert team id → shortened label (id or fallback) */
  function matchOr(id: string, fallback: string): string {
    if (!id) return fallback;
    const match = matches.find(m => m.team1_id === id || m.team2_id === id);
    if (match) {
      if (match.team1_id === id && match.team1_id) return "Team 1";
      if (match.team2_id === id && match.team2_id) return "Team 2";
    }
    return id.slice(0, 8);
  }
}
