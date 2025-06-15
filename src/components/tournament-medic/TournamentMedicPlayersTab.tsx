
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

type Player = {
  id: string;
  discord_username: string | null;
  riot_id: string | null;
  is_substitute?: boolean;
};
type Tournament = { id: string };

export default function TournamentMedicPlayersTab({ tournament, onRefresh }: {
  tournament: Tournament;
  onRefresh: () => void;
}) {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [addId, setAddId] = useState("");

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data, error } = await supabase.rpc("get_tournament_players", { tournament_id: tournament.id });
      setPlayers(data || []);
      setLoading(false);
    })();
  }, [tournament.id]);

  async function handleAddPlayer() {
    setLoading(true);
    // Supabase function should exist to forcibly add a user to tournament
    const { error } = await supabase.rpc("add_user_to_tournament", {
      user_id: addId,
      tournament_id: tournament.id
    });
    setLoading(false);
    if (error) {
      toast({ title: "Add Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Player forcibly added" });
      onRefresh();
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2">
        <Input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by username/riot_id"
          className="max-w-xs"
        />
      </div>
      <div className="flex flex-col gap-2 max-h-48 overflow-y-auto scrollbar-thin text-xs">
        {loading ? (
          <div>Loading...</div>
        ) : (
          players.filter(p =>
            !search ||
            (p.discord_username && p.discord_username.toLowerCase().includes(search.toLowerCase())) ||
            (p.riot_id && p.riot_id.toLowerCase().includes(search.toLowerCase()))
          ).map(p => (
            <div key={p.id} className="flex items-center gap-2 bg-slate-800 p-2 rounded">
              <span className="font-mono">{p.discord_username || "No Discord"}</span>
              <span className="text-xs opacity-60">{p.riot_id}</span>
              <Button size="sm" variant="outline" onClick={async () => {
                setLoading(true);
                // Supabase function to remove from tournament
                const { error } = await supabase.rpc("remove_user_from_tournament", {
                  user_id: p.id,
                  tournament_id: tournament.id
                });
                setLoading(false);
                if (error) {
                  toast({ title: "Remove Error", description: error.message, variant: "destructive" });
                } else {
                  toast({ title: "Player forcibly removed" });
                  onRefresh();
                }
              }}>Remove</Button>
            </div>
          ))
        )}
      </div>
      <div className="font-semibold text-xs mt-3">Force Add Player by User ID:</div>
      <div className="flex gap-2 items-center">
        <Input
          value={addId}
          onChange={e => setAddId(e.target.value)}
          placeholder="user_id (uuid)"
          className="max-w-xs"
        />
        <Button size="sm" onClick={handleAddPlayer} disabled={!addId || loading}>Force Add</Button>
      </div>
    </div>
  );
}
