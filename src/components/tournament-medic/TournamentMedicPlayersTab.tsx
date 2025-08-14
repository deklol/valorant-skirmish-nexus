import { useEffect, useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useDebouncedValue } from "./useDebouncedValue";
import ForceCheckInManager from "@/components/ForceCheckInManager";
import { Badge } from "@/components/ui/badge";
import { CheckSquare } from "lucide-react";
import { Copy } from "lucide-react";
import { Tournament } from "@/types/tournament";

// Central types
type Player = {
  id: string;
  discord_username: string | null;
  riot_id: string | null;
  is_substitute?: boolean;
};

// Get all players signed up for this tournament
function useTournamentPlayers(tournamentId: string) {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(false);

  async function fetchPlayers() {
    setLoading(true);
    const { data, error } = await supabase
      .from("users")
      .select("id, discord_username, riot_id")
      .in(
        "id",
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
      toast({
        title: "Player Load Error",
        description: error.message,
        variant: "destructive",
      });
    }
  }
  useEffect(() => { fetchPlayers(); }, [tournamentId]);
  return { players, fetchPlayers, loading };
}

// Modular user search: real-time, excludes already signed-up players
function UserSearchBox({
  onSelect,
  excludeIds = [],
}: {
  onSelect: (user: Player) => void;
  excludeIds?: string[];
}) {
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query, 300);
  const [results, setResults] = useState<Player[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!debouncedQuery) {
      setResults([]);
      return;
    }
    setLoading(true);
    // Search by Discord username or Riot ID (case-insensitive)
    supabase
      .from("users")
      .select("id, discord_username, riot_id")
      .or(
        [
          `discord_username.ilike.%${debouncedQuery}%`,
          `riot_id.ilike.%${debouncedQuery}%`,
        ].join(",")
      )
      .limit(10)
      .then(({ data, error }) => {
        setLoading(false);
        if (error) {
          toast({
            title: "Search Error",
            description: error.message,
            variant: "destructive",
          });
        }
        // Exclude users already signed up or manually excluded
        const filtered =
          data?.filter(
            (u: Player) => !excludeIds.includes(u.id)
          ) || [];
        setResults(filtered);
      });
  }, [debouncedQuery, excludeIds]);

  return (
    <div className="flex flex-col gap-1 mt-1">
      <Input
        value={query}
        onChange={e => setQuery(e.target.value)}
        placeholder="Type Discord or Riot ID to search…"
        className="max-w-xs"
      />
      <div className="flex flex-col gap-1 mt-1 max-h-40 overflow-y-auto">
        {loading && <div className="text-xs text-slate-400">Searching…</div>}
        {!loading && debouncedQuery && results.length === 0 && (
          <div className="text-xs text-slate-500">No results found.</div>
        )}
        {results.map(u => (
          <div key={u.id} className="bg-slate-700 rounded p-1 flex items-center gap-2 text-xs">
            <span className="font-mono">{u.discord_username || "No Discord"}</span>
            <span className="opacity-50">{u.riot_id || "No Riot"}</span>
            <Button
              size="sm"
              onClick={() => {
                onSelect(u);
                setResults([]);
                setQuery("");
              }}
            >Add</Button>
          </div>
        ))}
      </div>
    </div>
  );
}

// Copy Discord usernames to clipboard as "@username\n" if present and not null
function CopyDiscordUsernamesButton({ players }: { players: { discord_username: string | null }[] }) {
  const handleCopy = async () => {
    const list = players
      .map(p => p.discord_username ? `@${p.discord_username}` : null)
      .filter(v => v)
      .join("\n");
    if (list.length === 0) {
      toast({ title: "Copy Failed", description: "No Discord usernames found in the player list.", variant: "destructive" });
      return;
    }
    try {
      await navigator.clipboard.writeText(list);
      toast({ title: "Copied!", description: "Discord usernames copied to clipboard." });
    } catch (err) {
      toast({ title: "Copy Failed", description: "Could not copy to clipboard.", variant: "destructive" });
    }
  };
  return (
    <Button variant="outline" size="sm" className="mb-2 flex items-center gap-2" onClick={handleCopy}>
      <Copy className="w-4 h-4" />
      Copy Discord Usernames
    </Button>
  );
}

