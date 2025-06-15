
import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";

type Player = {
  id: string;
  discord_username: string;
  current_rank: string;
  rank_points: number;
  discord_avatar_url: string | null;
};

export default function TopPlayersDisplay() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPlayers() {
      setLoading(true);
      const { data } = await supabase
        .from("users")
        .select("id,discord_username,current_rank,rank_points,discord_avatar_url,is_phantom")
        .order("rank_points", { ascending: false })
        .lt("is_phantom", true)
        .limit(5);

      // Remove phantom users (shouldn't show up)
      const nonPhantom = (data || []).filter(p => !p.is_phantom);
      setPlayers(nonPhantom);
      setLoading(false);
    }
    fetchPlayers();
  }, []);

  if (loading) {
    return <Card className="bg-slate-800 border-slate-700"><CardHeader><CardTitle className="text-white">Top Players</CardTitle></CardHeader><CardContent>Loading...</CardContent></Card>;
  }

  if (players.length === 0) {
    return (
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white">Top Players</CardTitle>
        </CardHeader>
        <CardContent>No results</CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-slate-800 border-slate-700">
      <CardHeader>
        <CardTitle className="text-white">Top Players</CardTitle>
      </CardHeader>
      <CardContent>
        <ul>
          {players.map(player => (
            <li key={player.id} className="flex items-center gap-3 border-b border-slate-700 py-2 last:border-none">
              {player.discord_avatar_url ? (
                <img src={player.discord_avatar_url} className="rounded-full w-8 h-8" alt={player.discord_username} />
              ) : (
                <Users className="w-8 h-8 text-slate-400" />
              )}
              <span className="font-medium text-white">{player.discord_username}</span>
              <Badge variant="outline" className="ml-auto">{player.current_rank || "Unranked"}</Badge>
              <span className="text-slate-400 text-xs ml-2">{player.rank_points ?? 0} pts</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
