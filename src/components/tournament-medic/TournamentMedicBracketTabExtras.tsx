
import { useState, useEffect } from "react";
import BracketGenerator from "@/components/BracketGenerator";
import IntegratedBracketView from "@/components/IntegratedBracketView";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

export default function TournamentMedicBracketTabExtras({ tournament, onRefresh }: { tournament: any, onRefresh: () => void }) {
  const [teams, setTeams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const { data, error } = await supabase
        .from("teams")
        .select("*")
        .eq("tournament_id", tournament.id);
      setTeams(data || []);
      setLoading(false);
    }
    load();
  }, [tournament.id]);

  if (loading) return <span>Loading bracket tools...</span>;

  return (
    <div className="flex flex-col gap-4 mt-3">
      <BracketGenerator
        tournamentId={tournament.id}
        teams={teams}
        onBracketGenerated={onRefresh}
      />
      <div>
        <IntegratedBracketView tournamentId={tournament.id} />
      </div>
      <Button size="sm" onClick={onRefresh} variant="outline">
        Refresh Matches
      </Button>
    </div>
  );
}
