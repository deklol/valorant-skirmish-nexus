
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

type Team = {
  id: string;
  name: string | null;
  status: string | null;
  captain_id: string | null;
  players: { id: string; discord_username: string | null }[];
};

type Tournament = { id: string };

export default function TournamentMedicTeamsTab({ tournament, onRefresh }: {
  tournament: Tournament;
  onRefresh: () => void;
}) {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("teams")
        .select("id, name, status, captain_id, team_members:user_id(discord_username)")
        .eq("tournament_id", tournament.id);
      setTeams(
        data
          ? data.map((t: any) => ({
              ...t,
              players: t.team_members || []
            }))
          : []
      );
      setLoading(false);
    })();
  }, [tournament.id]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2">
        <Input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by team or player"
          className="max-w-xs"
        />
      </div>
      <div className="flex flex-col gap-2 max-h-52 overflow-y-auto scrollbar-thin text-xs">
        {loading ? (
          <div>Loading...</div>
        ) : (
          teams.filter(t =>
            !search ||
            (t.name && t.name.toLowerCase().includes(search.toLowerCase())) ||
            t.players.some(
              p => p.discord_username && p.discord_username.toLowerCase().includes(search.toLowerCase())
            )
          ).map(team => (
            <div
              key={team.id}
              className="bg-slate-800 rounded p-2 flex flex-col md:flex-row md:items-center gap-2"
            >
              <div className="flex-1 flex flex-col">
                <span className="font-mono font-bold text-yellow-200">{team.name || "Untitled"}</span>
                <div className="flex flex-wrap gap-2 mt-1">
                  {team.players.map(p => (
                    <span key={p.id} className="bg-slate-900 px-2 py-1 rounded text-xs">{p.discord_username}</span>
                  ))}
                </div>
              </div>
              <div className="flex flex-col gap-1 min-w-[110px]">
                <Button size="sm" variant="outline" onClick={async () => {
                  // Eliminate team
                  setLoading(true);
                  const { error } = await supabase
                    .from("teams")
                    .update({ status: "eliminated" })
                    .eq("id", team.id);
                  setLoading(false);
                  if (error) {
                    toast({ title: "Eliminate Error", description: error.message, variant: "destructive" });
                  } else {
                    toast({ title: "Eliminated" });
                    onRefresh();
                  }
                }}>Eliminate</Button>
                <Button size="sm" variant="outline" onClick={async () => {
                  // Declare winner
                  setLoading(true);
                  const { error } = await supabase
                    .from("teams")
                    .update({ status: "winner" })
                    .eq("id", team.id);
                  setLoading(false);
                  if (error) {
                    toast({ title: "Error", description: error.message, variant: "destructive" });
                  } else {
                    toast({ title: "Set Winner" });
                    onRefresh();
                  }
                }}>Winner</Button>
                <Button size="sm" variant="outline" onClick={async () => {
                  // Reset status to pending
                  setLoading(true);
                  const { error } = await supabase
                    .from("teams")
                    .update({ status: "pending" })
                    .eq("id", team.id);
                  setLoading(false);
                  if (error) {
                    toast({ title: "Error", description: error.message, variant: "destructive" });
                  } else {
                    toast({ title: "Reset" });
                    onRefresh();
                  }
                }}>Reset</Button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
