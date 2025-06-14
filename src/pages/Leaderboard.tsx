
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trophy, Medal, Award, Target, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import ClickableUsername from '@/components/ClickableUsername';

interface Player {
  id: string;
  discord_username: string;
  current_rank: string;
  rank_points: number;
  tournaments_won: number;
  tournaments_played: number;
  wins: number;
  losses: number;
}

type SortOption = 'tournament_wins' | 'match_wins' | 'rank_points';

const Leaderboard = () => {
  const [topPlayers, setTopPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<SortOption>('tournament_wins');

  useEffect(() => {
    fetchLeaderboard();
  }, [sortBy]);

  const fetchLeaderboard = async () => {
    try {
      let orderColumn = 'tournaments_won';
      let orderDirection = { ascending: false };

      switch (sortBy) {
        case 'tournament_wins':
          orderColumn = 'tournaments_won';
          break;
        case 'match_wins':
          orderColumn = 'wins';
          break;
        case 'rank_points':
          orderColumn = 'rank_points';
          break;
      }

      const { data, error } = await supabase
        .from('users')
        .select('id, discord_username, current_rank, rank_points, tournaments_won, tournaments_played, wins, losses')
        .eq('is_phantom', false)
        .order(orderColumn, orderDirection)
        .limit(20);

      if (error) throw error;
      setTopPlayers(data || []);
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Trophy className="w-6 h-6 text-yellow-500" />;
      case 2:
        return <Medal className="w-6 h-6 text-gray-400" />;
      case 3:
        return <Award className="w-6 h-6 text-amber-600" />;
      default:
        return (
          <div className="w-6 h-6 bg-slate-600 rounded-full flex items-center justify-center">
            <span className="text-xs font-bold text-slate-300">{rank}</span>
          </div>
        );
    }
  };

  const getSortTitle = () => {
    switch (sortBy) {
      case 'tournament_wins':
        return 'Tournament Winners';
      case 'match_wins':
        return 'Match Winners';
      case 'rank_points':
        return 'Rank Points Leaders';
      default:
        return 'Leaderboard';
    }
  };

  const getSortIcon = () => {
    switch (sortBy) {
      case 'tournament_wins':
        return <Trophy className="w-8 h-8 text-yellow-500" />;
      case 'match_wins':
        return <Target className="w-8 h-8 text-green-500" />;
      case 'rank_points':
        return <Calendar className="w-8 h-8 text-blue-500" />;
      default:
        return <Trophy className="w-8 h-8 text-blue-500" />;
    }
  };

  const calculateWinRate = (wins: number, losses: number) => {
    if (wins + losses === 0) return 0;
    return Math.round((wins / (wins + losses)) * 100);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-900">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <p className="text-white">Loading leaderboard...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-900">
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            {getSortIcon()}
            <h1 className="text-3xl font-bold text-white">{getSortTitle()}</h1>
          </div>
          
          <Select value={sortBy} onValueChange={(value: SortOption) => setSortBy(value)}>
            <SelectTrigger className="w-48 bg-slate-800 border-slate-700 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-slate-800 border-slate-700">
              <SelectItem value="tournament_wins" className="text-white">Tournament Wins</SelectItem>
              <SelectItem value="match_wins" className="text-white">Match Wins</SelectItem>
              <SelectItem value="rank_points" className="text-white">Rank Points</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Card className="bg-slate-800/90 border-slate-700">
          <CardHeader>
            <CardTitle className="text-xl text-white">Top Players</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {topPlayers.map((player, index) => (
                <div 
                  key={player.id}
                  className="flex items-center justify-between p-4 bg-slate-700/50 rounded-lg hover:bg-slate-700 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-3">
                      {getRankIcon(index + 1)}
                    </div>
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
                      <div className="font-bold text-yellow-400">{player.tournaments_won || 0}</div>
                      <div className="text-slate-400">Tournament Wins</div>
                    </div>
                    <div className="text-center">
                      <div className="font-bold text-green-400">{player.wins || 0}</div>
                      <div className="text-slate-400">Match Wins</div>
                    </div>
                    <div className="text-center">
                      <div className="font-bold text-blue-400">{calculateWinRate(player.wins || 0, player.losses || 0)}%</div>
                      <div className="text-slate-400">Win Rate</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {topPlayers.length === 0 && (
          <Card className="bg-slate-800/90 border-slate-700">
            <CardContent className="text-center py-12">
              <Trophy className="w-12 h-12 text-slate-500 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">No Rankings Yet</h3>
              <p className="text-slate-400">Rankings will appear after tournaments are completed.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Leaderboard;
