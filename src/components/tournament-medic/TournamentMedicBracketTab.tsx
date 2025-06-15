import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import TournamentMedicBracketTabExtras from "./TournamentMedicBracketTabExtras";

type Match = {
  id: string;
  team1_id: string | null;
  team2_id: string | null;
  winner_id: string | null;
  round_number: number;
  match_number: number;
  status: string | null;
};
type Tournament = { id: string };

export default function TournamentMedicBracketTab({ tournament, onRefresh }: {
  tournament: Tournament;
  onRefresh: () => void;
}) {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(false);

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

  async function forceAdvance(match: Match) {
    if (!match.team1_id || !match.team2_id) {
      toast({ title: "Teams missing", description: "Cannot advance, both teams are required", variant: "destructive" });
      return;
    }
    try {
      const advanceWinner = window.prompt("Enter winner team ID to force advance:");
      if (!advanceWinner) return;
      const loser = advanceWinner === match.team1_id ? match.team2_id : match.team1_id;
      const { error } = await supabase
        .from("matches")
        .update({ winner_id: advanceWinner, status: "completed", completed_at: new Date().toISOString() })
        .eq("id", match.id);
      if (error) throw error;
      toast({ title: "Advanced", description: "Match marked complete" });
      // Optionally: re-generate bracket or trigger edge logic
      onRefresh();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
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
            <Button size="sm" variant="outline" onClick={() => forceAdvance(match)}>
              Force Result
            </Button>
          </div>
        ))
      )}
    </div>
  );
}
