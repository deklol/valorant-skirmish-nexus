import { useEffect, useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useDebouncedValue } from "./useDebouncedValue";
import ForceCheckInManager from "@/components/ForceCheckInManager";
import { Badge } from "@/components/ui/badge";
import { CheckSquare, Copy, Users, ChevronDown } from "lucide-react";
import { Tournament } from "@/types/tournament";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";


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

export default function TournamentMedicPlayersTab({
  tournament,
  onRefresh,
}: {
  tournament: Tournament;
  onRefresh: () => void;
}) {
  const { players, fetchPlayers, loading } = useTournamentPlayers(tournament.id);
  const [forceUser, setForceUser] = useState<Player | null>(null);
  const [adding, setAdding] = useState(false);
  const [forceReadyLoading, setForceReadyLoading] = useState(false);
  
  // State for the new random player feature
  const [randomAddCount, setRandomAddCount] = useState<number>(10);
  const [addingRandom, setAddingRandom] = useState(false);

  // Remove player modularized:
  async function forceRemovePlayer(playerId: string) {
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
    const { data } = await supabase
      .from("tournament_signups")
      .select("id")
      .eq("tournament_id", tournament.id)
      .eq("user_id", forceUser.id);
    if (data && data.length > 0) {
      toast({
        title: "Already signed up",
        description: "User already present in tournament",
        variant: "destructive",
      });
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

  // --- NEW FUNCTION: Force add random players ---
  async function handleForceAddRandomPlayers() {
    setAddingRandom(true);
    try {
      // 1. Get IDs of players already in the tournament to exclude them
      const existingPlayerIds = players.map(p => p.id);

      // 2. Fetch all users who are NOT in the tournament
      const { data: availableUsers, error: usersError } = await supabase
        .from("users")
        .select("id")
        .not("id", "in", `(${existingPlayerIds.join(",")})`);

      if (usersError) throw usersError;
      if (!availableUsers || availableUsers.length === 0) {
        toast({ title: "No available players", description: "All registered users are already in this tournament.", variant: "destructive" });
        return;
      }

      // 3. Shuffle the available users and pick the amount requested
      const shuffled = availableUsers.sort(() => 0.5 - Math.random());
      const playersToAdd = shuffled.slice(0, randomAddCount);

      if (playersToAdd.length === 0) {
        toast({ title: "No players to add", description: `Could not find ${randomAddCount} available players to add.` });
        return;
      }

      // 4. Prepare the new signup records
      const newSignups = playersToAdd.map(user => ({
        tournament_id: tournament.id,
        user_id: user.id,
      }));

      // 5. Insert the new signups into the database
      const { error: insertError } = await supabase
        .from("tournament_signups")
        .insert(newSignups);

      if (insertError) throw insertError;

      toast({
        title: "Players Added",
        description: `Successfully added ${playersToAdd.length} random players to the tournament.`,
      });
      
      // 6. Refresh the player list
      await fetchPlayers();
      onRefresh();

    } catch (error: any) {
      toast({
        title: "Error Adding Random Players",
        description: error.message || "An unknown error occurred.",
        variant: "destructive",
      });
    } finally {
      setAddingRandom(false);
    }
  }

  // Force Ready Up (set to "live" and update Supabase)
  async function handleForceReadyUp() {
    setForceReadyLoading(true);
    try {
      const { error } = await supabase
        .from('tournaments')
        .update({
          status: "live",
          updated_at: new Date().toISOString()
        })
        .eq('id', tournament.id);

      if (error) throw error;

      toast({
        title: "Tournament Forced Live",
        description: "The tournament is now 'live'.",
      });
      onRefresh();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Could not set tournament to live",
        variant: "destructive",
      });
    } finally {
      setForceReadyLoading(false);
    }
  }

  // Track if check-in is required (from tournament)
  const checkInRequired = tournament.check_in_required;

  const [search, setSearch] = useState("");
  const filteredPlayers = useMemo(
    () =>
      players.filter(
        p =>
          !search ||
          (p.discord_username &&
            p.discord_username.toLowerCase().includes(search.toLowerCase())) ||
          (p.riot_id &&
            p.riot_id.toLowerCase().includes(search.toLowerCase()))
      ),
    [players, search]
  );

  // Render status badge utility
  function getStatusBadge(status: string) {
    let color = "bg-gray-600";
    switch (status) {
      case "live": color = "bg-red-500/30 text-red-200"; break;
      case "open": color = "bg-green-600/30 text-green-200"; break;
      case "completed": color = "bg-blue-600/30 text-blue-200"; break;
      case "draft": color = "bg-gray-700/50 text-gray-100"; break;
      default: break;
    }
    return (
      <Badge className={color + " ml-2"}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <CopyDiscordUsernamesButton players={players} />
      </div>
      {/* Force Ready Up Section */}
      <div className="rounded-lg border border-yellow-700 bg-slate-900 p-4 flex flex-col gap-2 mb-3">
        <div className="flex items-center gap-3">
          <CheckSquare className="text-yellow-400 w-5 h-5" />
          <span className="font-semibold text-yellow-300">Force Ready Up (Set tournament live)</span>
          {getStatusBadge(tournament.status)}
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            className="bg-green-700 text-white"
            onClick={handleForceReadyUp}
            disabled={forceReadyLoading || tournament.status === "live"}
          >
            <CheckSquare className="w-4 h-4 mr-1" />
            {forceReadyLoading ? "Processing..." : "Force Ready Up"}
          </Button>
          <span className="text-xs text-slate-400">
            This will transition the tournament to <b>live</b> status immediately. Disabled if already live.
          </span>
        </div>
      </div>
      {/* Check-in summary and tools */}
      {checkInRequired && (
        <div>
          <ForceCheckInManager
            tournamentId={tournament.id}
            onCheckInUpdate={onRefresh}
          />
        </div>
      )}
      {/* Small filter for signed-up list only */}
      <div className="flex gap-2">
        <Input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Filter players in tournament"
          className="max-w-xs"
        />
      </div>
      <div className="flex flex-col gap-2 max-h-48 overflow-y-auto scrollbar-thin text-xs">
        {loading ? (
          <div>Loading...</div>
        ) : filteredPlayers.length === 0 ? (
          <div className="text-slate-400 text-xs">No players in this tournament.</div>
        ) : (
          filteredPlayers.map(p => (
            <div key={p.id} className="flex items-center gap-2 bg-slate-800 p-2 rounded">
              <span className="font-mono">{p.discord_username || "No Discord"}</span>
              <span className="text-xs opacity-60">{p.riot_id}</span>
              <Button
                size="sm"
                variant="outline"
                onClick={() => forceRemovePlayer(p.id)}
              >
                Remove
              </Button>
            </div>
          ))
        )}
      </div>

      {/* --- NEW SECTION: ADD RANDOM PLAYERS --- */}
      <div className="border-t border-slate-700 pt-4 mt-4">
        <div className="font-semibold text-xs mb-2">Add Random Players:</div>
        <div className="flex items-center gap-2">
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="w-[150px] justify-between">
                        <span>Add {randomAddCount} players</span>
                        <ChevronDown className="w-4 h-4 opacity-50" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                    {[10, 20, 30, 40].map(num => (
                        <DropdownMenuItem key={num} onSelect={() => setRandomAddCount(num)}>
                            Add {num} players
                        </DropdownMenuItem>
                    ))}
                </DropdownMenuContent>
            </DropdownMenu>
            <Button onClick={handleForceAddRandomPlayers} disabled={addingRandom}>
                <Users className="w-4 h-4 mr-2" />
                {addingRandom ? `Adding ${randomAddCount}...` : `Add Random Players`}
            </Button>
        </div>
         <p className="text-xs text-slate-400 mt-2">
            Select a number and click to add random registered users who are not already in this tournament.
         </p>
      </div>

      <div className="border-t border-slate-700 pt-4 mt-4">
        <div className="font-semibold text-xs">Force Add Specific Player:</div>
        <UserSearchBox
          onSelect={setForceUser}
          excludeIds={players.map(p => p.id)}
        />
        {forceUser && (
          <div className="flex gap-2 items-center mt-1">
            <div className="text-xs">
              Add <span className="font-mono">{forceUser.discord_username || forceUser.riot_id || forceUser.id}</span> to tournament?
            </div>
            <Button size="sm" onClick={handleForceAddPlayer} disabled={adding}>
              Force Add
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setForceUser(null)}>
              Cancel
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
