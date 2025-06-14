
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import ClickableUsername from '@/components/ClickableUsername';

interface Player {
  id: string;
  discord_username: string;
  current_rank: string;
  rank_points: number;
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
        .select('id, discord_username, current_rank, rank_points, tournaments_won, mvp_awards, wins, losses')
        .eq('is_phantom', false)
        .order('discord_username', { ascending: true });

      if (error) throw error;
      setPlayers(data || []);
    } catch (error) {
      console.error('Error fetching players:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-900">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <p className="text-white">Loading players...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-900">
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-8">
          <Users className="w-8 h-8 text-blue-500" />
          <h1 className="text-3xl font-bold text-white">Players</h1>
        </div>

        <Card className="bg-slate-800/90 border-slate-700">
          <CardHeader>
            <CardTitle className="text-xl text-white">All Players</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {players.map((player) => (
                <div 
                  key={player.id}
                  className="flex items-center justify-between p-4 bg-slate-700/50 rounded-lg hover:bg-slate-700 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div>
                      <div className="font-semibold text-white">
                        <ClickableUsername 
                          userId={player.id}
                          username={player.discord_username || 'Unknown Player'}
                        />
                      </div>
                      <div className="text-sm text-slate-400">{player.current_rank || 'Unranked'}</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-6 text-sm">
                    <div className="text-center">
                      <div className="font-bold text-indigo-400">{player.rank_points || 0}</div>
                      <div className="text-slate-400">Points</div>
                    </div>
                    <div className="text-center">
                      <div className="font-bold text-green-400">{player.tournaments_won || 0}</div>
                      <div className="text-slate-400">Tournaments</div>
                    </div>
                    <div className="text-center">
                      <div className="font-bold text-yellow-400">{player.mvp_awards || 0}</div>
                      <div className="text-slate-400">MVPs</div>
                    </div>
                    <div className="text-center">
                      <div className="font-bold text-blue-400">{player.wins || 0}-{player.losses || 0}</div>
                      <div className="text-slate-400">W-L</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {players.length === 0 && (
          <Card className="bg-slate-800/90 border-slate-700">
            <CardContent className="text-center py-12">
              <Users className="w-12 h-12 text-slate-500 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">No Players Found</h3>
              <p className="text-slate-400">No players have registered yet.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Players;
