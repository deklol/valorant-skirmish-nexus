
import { useState, useEffect } from "react";
import BracketGenerator from "@/components/BracketGenerator";
import IntegratedBracketView from "@/components/IntegratedBracketView";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

export default function TournamentMedicBracketTabExtras({ tournament, onRefresh }: { tournament: any; onRefresh: () => void }) {
  const [teams, setTeams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [generationInProgress, setGenerationInProgress] = useState(false);

  useEffect(() => {
    async function load() {
      setLoading(true);

      const [teamsRes, tournamentRes] = await Promise.all([
        supabase.from("teams").select("*").eq("tournament_id", tournament.id),
        supabase.from("tournaments").select("generating_bracket").eq("id", tournament.id).maybeSingle(),
      ]);

      if (teamsRes.error) {
        toast({
          title: "Failed to load teams",
          description: teamsRes.error.message,
          variant: "destructive",
        });
      }

      if (tournamentRes.error) {
        toast({
          title: "Failed to load tournament status",
          description: tournamentRes.error.message,
          variant: "destructive",
        });
      }

      setTeams(teamsRes.data || []);
      setGenerationInProgress(Boolean(tournamentRes.data?.generating_bracket));
      setLoading(false);
    }
    load();
  }, [tournament.id]);

  const refreshStatus = async () => {
    const { data } = await supabase
      .from("tournaments")
      .select("generating_bracket")
      .eq("id", tournament.id)
      .maybeSingle();

    setGenerationInProgress(Boolean(data?.generating_bracket));
    onRefresh();
  };

  const forceUnlock = async () => {
    const confirmed = window.confirm(
      "Force unlock bracket generation?\n\nUse this only if generation is stuck (e.g., browser closed mid-generation)."
    );
    if (!confirmed) return;

    const { error } = await supabase.rpc("complete_bracket_generation", {
      p_tournament_id: tournament.id,
      p_success: false,
    });

    if (error) {
      toast({
        title: "Unlock Failed",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Unlocked",
      description: "Generation lock cleared. You can generate again.",
    });

    await refreshStatus();
  };

  if (loading) return <span>Loading bracket tools...</span>;

  return (
    <div className="flex flex-col gap-4 mt-3">
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="outline" onClick={refreshStatus}>
          Refresh status
        </Button>
        <Button size="sm" variant="outline" onClick={forceUnlock}>
          Force unlock
        </Button>
      </div>

      {generationInProgress && (
        <div className="text-sm text-muted-foreground">
          Bracket generation is currently marked as in progress. If this is wrong (e.g. browser closed mid-run), use Force unlock.
        </div>
      )}

      <BracketGenerator tournamentId={tournament.id} teams={teams} onBracketGenerated={onRefresh} />

      <div>
        <IntegratedBracketView tournamentId={tournament.id} />
      </div>

      <Button size="sm" onClick={onRefresh} variant="outline">
        Refresh Matches
      </Button>
    </div>
  );
}
