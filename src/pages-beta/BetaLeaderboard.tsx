import { useState, useEffect } from "react";
import { Trophy, Medal, Award, Target, BarChart3, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { GradientBackground, GlassCard, BetaBadge } from "@/components-beta/ui-beta";
import { getRankPoints } from "@/utils/rankingSystem";
import { getRankIcon, getRankColor } from "@/utils/rankUtils";
import { Link } from "react-router-dom";

interface Player {
  id: string;
  discord_username: string;
  discord_avatar_url: string | null;
  current_rank: string;
  rank_points: number;
  weight_rating: number;
  tournaments_won: number;
  tournaments_played: number;
  wins: number;
  losses: number;
}

type SortOption = 'tournament_wins' | 'match_wins' | 'rank_points' | 'weight_rating';

const BetaLeaderboard = () => {
  const [topPlayers, setTopPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<SortOption>('tournament_wins');

  useEffect(() => {
    fetchLeaderboard();
  }, [sortBy]);

  const fetchLeaderboard = async () => {
    setLoading(true);
    try {
      let { data, error } = await supabase
        .from('public_user_profiles')
        .select('id, discord_username, discord_avatar_url, current_rank, rank_points, weight_rating, tournaments_won, tournaments_played, wins, losses')
        .eq('is_phantom', false);

      if (error) throw error;
      data = data || [];

      if (sortBy === 'rank_points') {
        data.sort((a, b) => {
          const aRank = getRankPoints(a.current_rank || "Unranked");
          const bRank = getRankPoints(b.current_rank || "Unranked");
          if (aRank !== bRank) return bRank - aRank;
          return (b.rank_points || 0) - (a.rank_points || 0);
        });
      } else if (sortBy === 'tournament_wins') {
        data.sort((a, b) => (b.tournaments_won || 0) - (a.tournaments_won || 0));
      } else if (sortBy === 'match_wins') {
        data.sort((a, b) => (b.wins || 0) - (a.wins || 0));
      } else if (sortBy === 'weight_rating') {
        data.sort((a, b) => (b.weight_rating || 0) - (a.weight_rating || 0));
      }

      setTopPlayers(data.slice(0, 20));
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const getPositionDisplay = (rank: number) => {
    switch (rank) {
      case 1:
        return (
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 flex items-center justify-center shadow-lg shadow-yellow-500/30">
            <Trophy className="w-5 h-5 text-yellow-900" />
          </div>
        );
      case 2:
        return (
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-300 to-gray-500 flex items-center justify-center shadow-lg shadow-gray-400/30">
            <Medal className="w-5 h-5 text-gray-700" />
          </div>
        );
      case 3:
        return (
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center shadow-lg shadow-amber-500/30">
            <Award className="w-5 h-5 text-amber-900" />
          </div>
        );
      default:
        return (
          <div className="w-10 h-10 rounded-full bg-[hsl(var(--beta-surface-4))] flex items-center justify-center">
            <span className="text-sm font-bold text-[hsl(var(--beta-text-muted))]">{rank}</span>
          </div>
        );
    }
  };

  const getSortTitle = () => {
    switch (sortBy) {
      case 'tournament_wins': return 'Tournament Winners';
      case 'match_wins': return 'Match Winners';
      case 'rank_points': return 'VALORANT Rank Leaders';
      case 'weight_rating': return 'ATLAS Weight Leaders';
    }
  };

  const getSortIcon = () => {
    switch (sortBy) {
      case 'tournament_wins': return <Trophy className="w-6 h-6 text-yellow-400" />;
      case 'match_wins': return <Target className="w-6 h-6 text-green-400" />;
      case 'rank_points': return <BarChart3 className="w-6 h-6 text-blue-400" />;
      case 'weight_rating': return <BarChart3 className="w-6 h-6 text-purple-400" />;
    }
  };

  const calculateWinRate = (wins: number, losses: number) => {
    if (wins + losses === 0) return 0;
    return Math.round((wins / (wins + losses)) * 100);
  };

  if (loading) {
    return (
      <GradientBackground>
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <Trophy className="w-12 h-12 text-[hsl(var(--beta-accent))] mx-auto mb-4 animate-pulse" />
              <p className="text-[hsl(var(--beta-text-secondary))]">Loading leaderboard...</p>
            </div>
          </div>
        </div>
      </GradientBackground>
    );
  }

  return (
    <GradientBackground>
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-3">
            {getSortIcon()}
            <div>
              <h1 className="text-3xl font-bold text-[hsl(var(--beta-text-primary))]">
                {getSortTitle()}
              </h1>
              <p className="text-[hsl(var(--beta-text-secondary))]">Top 20 players</p>
            </div>
          </div>
          
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            className="h-10 rounded-[var(--beta-radius-md)] px-4 bg-[hsl(var(--beta-surface-3))] text-[hsl(var(--beta-text-primary))] border border-[hsl(var(--beta-glass-border))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--beta-accent))]"
          >
            <option value="tournament_wins">Tournament Wins</option>
            <option value="match_wins">Match Wins</option>
            <option value="rank_points">VALORANT Rank</option>
            <option value="weight_rating">ATLAS Weight</option>
          </select>
        </div>

        {/* Leaderboard */}
        <GlassCard variant="strong" className="overflow-hidden">
          <div className="p-4 border-b border-[hsl(var(--beta-glass-border))]">
            <h2 className="text-lg font-semibold text-[hsl(var(--beta-text-primary))]">
              Top Players
            </h2>
          </div>

          <div className="divide-y divide-[hsl(var(--beta-glass-border))]">
            {topPlayers.map((player, index) => (
              <Link
                key={player.id}
                to={`/beta/profile/${player.id}`}
                className="flex items-center justify-between p-4 hover:bg-[hsl(var(--beta-surface-3))] transition-colors beta-animate-fade-in"
                style={{ animationDelay: `${index * 30}ms` }}
              >
                <div className="flex items-center gap-4">
                  {getPositionDisplay(index + 1)}
                  
                  {/* Avatar */}
                  <div className="w-12 h-12 rounded-xl bg-[hsl(var(--beta-surface-4))] overflow-hidden ring-1 ring-[hsl(var(--beta-border))]">
                    {player.discord_avatar_url ? (
                      <img 
                        src={player.discord_avatar_url} 
                        alt={player.discord_username || 'Player'} 
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <User className="w-6 h-6 text-[hsl(var(--beta-text-muted))]" />
                      </div>
                    )}
                  </div>
                  
                  <div>
                    <p className="font-medium text-[hsl(var(--beta-text-primary))] hover:text-[hsl(var(--beta-accent))] transition-colors">
                      {player.discord_username || 'Unknown Player'}
                    </p>
                    <p className="text-sm flex items-center gap-1" style={{ color: getRankColor(player.current_rank) }}>
                      {getRankIcon(player.current_rank)} {player.current_rank || 'Unranked'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4 md:gap-6 text-sm">
                  <div className="text-center hidden sm:block">
                    <p className="font-bold text-purple-400">{player.weight_rating || 0}</p>
                    <p className="text-[hsl(var(--beta-text-muted))] text-xs">Weight</p>
                  </div>
                  <div className="text-center hidden sm:block">
                    <p className="font-bold text-blue-400">{player.rank_points || 0}</p>
                    <p className="text-[hsl(var(--beta-text-muted))] text-xs">RR</p>
                  </div>
                  <div className="text-center">
                    <p className="font-bold text-yellow-400">{player.tournaments_won || 0}</p>
                    <p className="text-[hsl(var(--beta-text-muted))] text-xs">Tourneys</p>
                  </div>
                  <div className="text-center">
                    <p className="font-bold text-green-400">{player.wins || 0}</p>
                    <p className="text-[hsl(var(--beta-text-muted))] text-xs">Wins</p>
                  </div>
                  <div className="text-center hidden md:block">
                    <p className="font-bold text-[hsl(var(--beta-accent))]">
                      {calculateWinRate(player.wins || 0, player.losses || 0)}%
                    </p>
                    <p className="text-[hsl(var(--beta-text-muted))] text-xs">WR</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </GlassCard>

        {topPlayers.length === 0 && (
          <GlassCard className="p-12 text-center">
            <Trophy className="w-12 h-12 text-[hsl(var(--beta-text-muted))] mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-[hsl(var(--beta-text-primary))] mb-2">
              No Rankings Yet
            </h3>
            <p className="text-[hsl(var(--beta-text-muted))]">
              Rankings will appear after tournaments are completed.
            </p>
          </GlassCard>
        )}
      </div>
    </GradientBackground>
  );
};

export default BetaLeaderboard;
