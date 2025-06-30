import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { getRankPoints } from "@/utils/rankingSystem";
import ClickableUsername from './ClickableUsername';

type Player = {
  id: string;
  discord_username: string;
  current_rank: string;
  rank_points: number;
  discord_avatar_url: string | null;
  is_phantom?: boolean;
};

export default function TopPlayersDisplay() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPlayers() {
      setLoading(true);
      const { data } = await supabase
        .from("users")
        .select("id,discord_username,current_rank,rank_points,discord_avatar_url,is_phantom");

      // Remove phantom users (shouldn't show up)
      let nonPhantom = (data || []).filter(p => !p.is_phantom);

      // Sort:
      // 1. By rank tier (using getRankPoints(current_rank) DESC)
      // 2. Then by rank_points DESC (within same tier)
      // 3. Unranked always last
      nonPhantom.sort((a, b) => {
        const aRankPoints = getRankPoints(a.current_rank || "Unranked");
        const bRankPoints = getRankPoints(b.current_rank || "Unranked");

        if (aRankPoints !== bRankPoints) {
          return bRankPoints - aRankPoints; // Higher tier rank first
        }
        // Secondary: break ties by rank_points (higher RR first)
        const rrA = isNaN(Number(a.rank_points)) ? 0 : a.rank_points;
        const rrB = isNaN(Number(b.rank_points)) ? 0 : b.rank_points;
        return rrB - rrA;
      });

      // Limit to top 5 after sorting
      setPlayers(nonPhantom.slice(0, 5));
      setLoading(false);
    }
    fetchPlayers();
  }, []);

  if (loading) {
    return (
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white">Highest Ranked Players</CardTitle>
        </CardHeader>
        <CardContent>Loading...</CardContent>
      </Card>
    );
  }

  if (players.length === 0) {
    return (
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white">Highest Ranked Players</CardTitle>
        </CardHeader>
        <CardContent>No results</CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-slate-800 border-slate-700">
      <CardHeader>
        <CardTitle className="text-white">Highest Ranked Players</CardTitle>
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
              <ClickableUsername
                userId={player.id}
                username={player.discord_username}
                className="font-medium text-white"
              />
              <Badge variant="outline" className="ml-auto">{player.current_rank || "Unranked"}</Badge>
              <span className="text-slate-400 text-xs ml-2">{player.rank_points ?? 0} rr</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
