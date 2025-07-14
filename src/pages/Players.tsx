
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import ClickableUsername from '@/components/ClickableUsername';

interface Player {
  id: string;
  discord_username: string;
  discord_avatar_url: string | null;
  current_rank: string;
  rank_points: number;
  weight_rating: number;
  manual_weight_override: number | null;
  use_manual_override: boolean | null;
  tournaments_won: number;
  mvp_awards: number;
  wins: number;
  losses: number;
}

const Players = () => {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPlayers();
  }, []);

  const fetchPlayers = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, discord_username, discord_avatar_url, current_rank, rank_points, weight_rating, manual_weight_override, use_manual_override, tournaments_won, mvp_awards, wins, losses')
        .eq('is_phantom', false)
        .order('weight_rating', { ascending: false }); // Sort by weight_rating instead

      if (error) throw error;
      setPlayers(data || []);
    } catch (error) {
      console.error('Error fetching players:', error);
    } finally {
      setLoading(false);
    }
  };

  const getEffectiveWeight = (player: Player) => {
    if (player.use_manual_override && player.manual_weight_override !== null) {
      return player.manual_weight_override;
    }
    return player.weight_rating || 150;
  };

  const calculateWinRate = (wins: number, losses: number) => {
    if (wins + losses === 0) return 0;
    return Math.round((wins / (wins + losses)) * 100);
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <p className="text-white">Loading players...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-2">
          <Users className="w-8 h-8 text-blue-500" />
          <h1 className="text-3xl font-bold text-white">Players</h1>
        </div>
        <p className="text-slate-400 mb-8">Q: Balancing Weight? A: Number represents rank, used for balancing purposes. <span className="text-orange-400">*</span> indicates manual override.</p>

        {players.length === 0 ? (
          <Card className="bg-slate-800/90 border-slate-700">
            <CardContent className="text-center py-12">
              <Users className="w-12 h-12 text-slate-500 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">No Players Found</h3>
              <p className="text-slate-400">No players have registered yet.</p>
            </CardContent>
          </Card>
        ) : (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {players.map((player) => (
              <Card key={player.id} className="bg-slate-800/90 border-slate-700 hover:bg-slate-800 transition-colors">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="w-12 h-12 bg-slate-600 rounded-full flex items-center justify-center overflow-hidden">
                      {player.discord_avatar_url ? (
                        <img 
                          src={player.discord_avatar_url} 
                          alt={`${player.discord_username}'s avatar`}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            // Fallback to letter avatar if image fails to load
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                            const parent = target.parentElement;
                            if (parent) {
                              parent.innerHTML = `<span class="text-lg font-bold text-slate-300">${player.discord_username?.charAt(0).toUpperCase() || 'U'}</span>`;
                            }
                          }}
                        />
                      ) : (
                        <span className="text-lg font-bold text-slate-300">
                          {player.discord_username?.charAt(0).toUpperCase() || 'U'}
                        </span>
                      )}
                    </div>
                    <Badge variant="secondary" className="bg-slate-700 text-slate-300">
                      {player.current_rank || 'Unranked'}
                    </Badge>
                  </div>
                  <CardTitle className="text-lg text-white">
                    <ClickableUsername 
                      userId={player.id}
                      username={player.discord_username || 'Unknown Player'}
                      variant="ghost"
                      className="text-white hover:text-blue-400 p-0 h-auto justify-start"
                    />
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="text-center p-2 bg-slate-700/50 rounded">
                      <div className="font-bold text-indigo-400">{getEffectiveWeight(player)}</div>
                      <div className="text-slate-400 text-xs">
                        Balancing Weight
                        {player.use_manual_override && player.manual_weight_override !== null && (
                          <span className="text-orange-400 ml-1">*</span>
                        )}
                      </div>
                    </div>
                    <div className="text-center p-2 bg-slate-700/50 rounded">
                      <div className="font-bold text-purple-400">{player.rank_points || 0}</div>
                      <div className="text-slate-400 text-xs">Ranked RR</div>
                    </div>
                    <div className="text-center p-2 bg-slate-700/50 rounded">
                      <div className="font-bold text-yellow-400">{player.tournaments_won || 0}</div>
                      <div className="text-yellow-400 text-xs">Tournaments Won</div>
                    </div>
                    <div className="text-center p-2 bg-slate-700/50 rounded">
                      <div className="font-bold text-blue-400">{calculateWinRate(player.wins || 0, player.losses || 0)}%</div>
                      <div className="text-slate-400 text-xs">Win Rate</div>
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t border-slate-700">
                    <div className="flex justify-between text-xs text-slate-400">
                      <span>W: {player.wins || 0}</span>
                      <span>L: {player.losses || 0}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
    </div>
  );
};

export default Players;
