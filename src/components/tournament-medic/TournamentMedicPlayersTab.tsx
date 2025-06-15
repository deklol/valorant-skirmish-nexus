import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

// Use a central Tournament and Player type
type Player = {
  id: string;
  discord_username: string | null;
  riot_id: string | null;
  is_substitute?: boolean;
};
type Tournament = { id: string };

// -- Logic (same as before) --
function useTournamentPlayers(tournamentId: string) {
  // ... keep existing code (useTournamentPlayers) the same ...
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(false);

  async function fetchPlayers() {
    setLoading(true);
    // Fetch players signed up for this tournament
    const { data, error } = await supabase
      .from("users")
      .select("id, discord_username, riot_id")
      .in("id",
        (
          await supabase
            .from("tournament_signups")
            .select("user_id")
            .eq("tournament_id", tournamentId)
        ).data?.map(row => row.user_id!) || []
      );
    setPlayers(data || []);
    setLoading(false);
    if (error) {
      toast({ title: "Player Load Error", description: error.message, variant: "destructive" });
    }
  }
  useEffect(() => { fetchPlayers(); }, [tournamentId]);
  return { players, fetchPlayers, loading };
}

// Modular: search for any user by discord name or riot id or user id
function UserSearchBox({ onSelect, hideIfSelectedId }: {
  onSelect: (user: Player) => void;
  hideIfSelectedId?: string | null;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Player[]>([]);
  const [loading, setLoading] = useState(false);

  async function handleSearch() {
    setLoading(true);
    const { data, error } = await supabase
      .from("users")
      .select("id, discord_username, riot_id")
      .or(
        [
          `discord_username.ilike.%${query}%`,
          `riot_id.ilike.%${query}%`,
          `id.eq.${query}`
        ].join(",")
      )
      .limit(10);
    setResults(data || []);
    setLoading(false);
    if (error) toast({ title: "Search Error", description: error.message, variant: "destructive" });
  }

  return (
    <div className="flex flex-col gap-1">
      <Input
        value={query}
        onChange={e => setQuery(e.target.value)}
        placeholder="Find user by Discord, Riot ID, or user ID"
        className="max-w-xs"
        onKeyDown={e => { if (e.key === "Enter") handleSearch(); }}
      />
      <Button size="sm" className="w-fit" onClick={handleSearch} disabled={loading || !query}>
        Search
      </Button>
      <div className="flex flex-col gap-1 mt-1 max-h-32 overflow-y-auto">
        {results.filter(r => r.id !== hideIfSelectedId).map(u => (
          <div key={u.id} className="bg-slate-700 rounded p-1 flex items-center gap-2 text-xs">
            <span className="font-mono">{u.discord_username || "No Discord"}</span>
            <span className="opacity-50">{u.riot_id || "No Riot"}</span>
            <Button
              size="sm"
              onClick={() => { onSelect(u); setResults([]); setQuery(""); }}
            >Select</Button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function TournamentMedicPlayersTab({ tournament, onRefresh }: {
  tournament: Tournament;
  onRefresh: () => void;
}) {
  const { players, fetchPlayers, loading } = useTournamentPlayers(tournament.id);
  const [search, setSearch] = useState("");
  const [forceUser, setForceUser] = useState<Player | null>(null);
  const [adding, setAdding] = useState(false);

  // Remove player modularized:
  async function forceRemovePlayer(playerId: string) {
    // Remove from tournament_signups
    const { error } = await supabase
      .from("tournament_signups")
      .delete()
      .eq("tournament_id", tournament.id)
      .eq("user_id", playerId);

    if (error) {
      toast({ title: "Remove Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Player forcibly removed" });
      await fetchPlayers();
      onRefresh();
    }
  }

  // Force add modularized:
  async function handleForceAddPlayer() {
    if (!forceUser) return;
    setAdding(true);
    // Insert only if not already signed up
    const { data } = await supabase
      .from("tournament_signups")
      .select("id")
      .eq("tournament_id", tournament.id)
      .eq("user_id", forceUser.id);
    if (data && data.length > 0) {
      toast({ title: "Already signed up", description: "User already present in tournament", variant: "destructive" });
      setAdding(false);
      return;
    }
    const { error } = await supabase
      .from("tournament_signups")
      .insert({ tournament_id: tournament.id, user_id: forceUser.id });
    setAdding(false);
    if (error) {
      toast({ title: "Add Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Player forcibly added" });
      setForceUser(null);
      await fetchPlayers();
      onRefresh();
    }
  }

  const filteredPlayers = players.filter(p =>
    !search ||
    (p.discord_username && p.discord_username.toLowerCase().includes(search.toLowerCase())) ||
    (p.riot_id && p.riot_id.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2">
        <Input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search Discord username, Riot ID"
          className="max-w-xs"
        />
      </div>
      <div className="flex flex-col gap-2 max-h-48 overflow-y-auto scrollbar-thin text-xs">
        {loading ? (
          <div>Loading...</div>
        ) : (
          filteredPlayers.map(p => (
            <div key={p.id} className="flex items-center gap-2 bg-slate-800 p-2 rounded">
              <span className="font-mono">{p.discord_username || "No Discord"}</span>
              <span className="text-xs opacity-60">{p.riot_id}</span>
              <Button size="sm" variant="outline" onClick={() => forceRemovePlayer(p.id)}>
                Remove
              </Button>
            </div>
          ))
        )}
      </div>
      <div className="font-semibold text-xs mt-3">Force Add Player:</div>
      <UserSearchBox
        onSelect={setForceUser}
        hideIfSelectedId={forceUser?.id || ""}
      />
      {forceUser && (
        <div className="flex gap-2 items-center mt-1">
          <div className="text-xs">
            Add <span className="font-mono">{forceUser.discord_username || forceUser.riot_id || forceUser.id}</span> to tournament?
          </div>
          <Button size="sm" onClick={handleForceAddPlayer} disabled={adding}>
            Force Add
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setForceUser(null)}>Cancel</Button>
        </div>
      )}
    </div>
  );
}
