import { useState, useEffect } from "react";
import { Users, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { GradientBackground, GlassCard, BetaInput, BetaBadge } from "@/components-beta/ui-beta";
import { Link } from "react-router-dom";

const RANK_CONFIG: Record<string, { emoji: string; color: string }> = {
  'Iron 1': { emoji: '⬛', color: '#4A4A4A' },
  'Iron 2': { emoji: '⬛', color: '#4A4A4A' },
  'Iron 3': { emoji: '⬛', color: '#4A4A4A' },
  'Bronze 1': { emoji: '🟫', color: '#A97142' },
  'Bronze 2': { emoji: '🟫', color: '#A97142' },
  'Bronze 3': { emoji: '🟫', color: '#A97142' },
  'Silver 1': { emoji: '⬜', color: '#C0C0C0' },
  'Silver 2': { emoji: '⬜', color: '#C0C0C0' },
  'Silver 3': { emoji: '⬜', color: '#C0C0C0' },
  'Gold 1': { emoji: '🟨', color: '#FFD700' },
  'Gold 2': { emoji: '🟨', color: '#FFD700' },
  'Gold 3': { emoji: '🟨', color: '#FFD700' },
  'Platinum 1': { emoji: '🟦', color: '#5CA3E4' },
  'Platinum 2': { emoji: '🟦', color: '#5CA3E4' },
  'Platinum 3': { emoji: '🟦', color: '#5CA3E4' },
  'Diamond 1': { emoji: '🟪', color: '#8d64e2' },
  'Diamond 2': { emoji: '🟪', color: '#8d64e2' },
  'Diamond 3': { emoji: '🟪', color: '#8d64e2' },
  'Ascendant 1': { emoji: '🟩', color: '#84FF6F' },
  'Ascendant 2': { emoji: '🟩', color: '#84FF6F' },
  'Ascendant 3': { emoji: '🟩', color: '#84FF6F' },
  'Immortal 1': { emoji: '🟥', color: '#A52834' },
  'Immortal 2': { emoji: '🟥', color: '#A52834' },
  'Immortal 3': { emoji: '🟥', color: '#A52834' },
  'Radiant': { emoji: '✨', color: '#FFF176' },
  'Unrated': { emoji: '❓', color: '#9CA3AF' },
  'Unranked': { emoji: '❓', color: '#9CA3AF' }
};

interface Player {
  id: string;
  discord_username: string;
  discord_avatar_url: string | null;
  current_rank: string;
  rank_points: number;
  weight_rating: number;
  tournaments_won: number;
  wins: number;
  losses: number;
  is_admin_user: boolean;
  valorant_role: string | null;
  looking_for_team: boolean | null;
}

const BetaPlayers = () => {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchPlayers();
  }, []);

  const fetchPlayers = async () => {
    try {
      const { data, error } = await supabase
        .from('public_user_profiles')
        .select('id, discord_username, discord_avatar_url, current_rank, rank_points, weight_rating, tournaments_won, wins, losses, is_admin_user, valorant_role, looking_for_team')
        .eq('is_phantom', false)
        .order('weight_rating', { ascending: false });

      if (error) throw error;
      setPlayers(data || []);
    } catch (error) {
      console.error('Error fetching players:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRankInfo = (rank: string) => {
    return RANK_CONFIG[rank] || RANK_CONFIG['Unranked'];
  };

  const calculateWinRate = (wins: number, losses: number) => {
    if (wins + losses === 0) return 0;
    return Math.round((wins / (wins + losses)) * 100);
  };

  const filteredPlayers = players.filter(player =>
    player.discord_username?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <GradientBackground>
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <Users className="w-12 h-12 text-[hsl(var(--beta-accent))] mx-auto mb-4 animate-pulse" />
              <p className="text-[hsl(var(--beta-text-secondary))]">Loading players...</p>
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
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-[var(--beta-radius-lg)] bg-[hsl(var(--beta-accent-subtle))]">
              <Users className="w-6 h-6 text-[hsl(var(--beta-accent))]" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-[hsl(var(--beta-text-primary))]">
                Players
              </h1>
              <p className="text-[hsl(var(--beta-text-secondary))]">
                Discover competitive players and their stats
              </p>
            </div>
          </div>

          {/* Search */}
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[hsl(var(--beta-text-muted))]" />
            <BetaInput
              placeholder="Search players..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Players Grid */}
        {filteredPlayers.length === 0 ? (
          <GlassCard className="p-12 text-center">
            <Users className="w-12 h-12 text-[hsl(var(--beta-text-muted))] mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-[hsl(var(--beta-text-primary))] mb-2">
              No Players Found
            </h3>
            <p className="text-[hsl(var(--beta-text-muted))]">
              {searchQuery ? 'Try a different search term.' : 'No players have registered yet.'}
            </p>
          </GlassCard>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredPlayers.map((player, index) => {
              const rankInfo = getRankInfo(player.current_rank || 'Unranked');
              
              return (
                <Link
                  key={player.id}
                  to={`/beta/profile/${player.id}`}
                  className="beta-animate-fade-in"
                  style={{ animationDelay: `${index * 30}ms` }}
                >
                  <GlassCard hover className="p-4 h-full group">
                    {/* Player Header */}
                    <div className="flex items-start gap-3 mb-4">
                      <div className="relative">
                        <div className="w-12 h-12 rounded-[var(--beta-radius-md)] bg-[hsl(var(--beta-surface-4))] flex items-center justify-center overflow-hidden border border-[hsl(var(--beta-glass-border))]">
                          {player.discord_avatar_url ? (
                            <img 
                              src={player.discord_avatar_url} 
                              alt=""
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span className="text-lg font-bold text-[hsl(var(--beta-accent))]">
                              {player.discord_username?.charAt(0).toUpperCase() || 'U'}
                            </span>
                          )}
                        </div>
                        {player.looking_for_team && (
                          <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-[hsl(var(--beta-surface-1))]" />
                        )}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-[hsl(var(--beta-text-primary))] truncate group-hover:text-[hsl(var(--beta-accent))] transition-colors">
                          {player.discord_username || 'Unknown'}
                        </p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          <BetaBadge 
                            size="sm"
                            className="gap-1"
                            style={{ 
                              backgroundColor: `${rankInfo.color}20`,
                              color: rankInfo.color,
                              borderColor: `${rankInfo.color}40`
                            }}
                          >
                            <span>{rankInfo.emoji}</span>
                            <span>{player.current_rank || 'Unranked'}</span>
                          </BetaBadge>
                          {player.valorant_role && (
                            <BetaBadge size="sm" variant="outline">
                              {player.valorant_role}
                            </BetaBadge>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 gap-2 mb-3">
                      <div className="bg-[hsl(var(--beta-surface-3))] rounded-[var(--beta-radius-md)] p-2 text-center">
                        <p className="text-sm font-bold text-[hsl(var(--beta-accent))]">
                          {player.weight_rating || 150}
                        </p>
                        <p className="text-xs text-[hsl(var(--beta-text-muted))]">Weight</p>
                      </div>
                      <div className="bg-[hsl(var(--beta-surface-3))] rounded-[var(--beta-radius-md)] p-2 text-center">
                        <p className="text-sm font-bold text-yellow-400">
                          {player.tournaments_won || 0}
                        </p>
                        <p className="text-xs text-[hsl(var(--beta-text-muted))]">Wins</p>
                      </div>
                    </div>

                    {/* Win/Loss */}
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-3">
                        <span className="text-green-400">W: {player.wins || 0}</span>
                        <span className="text-red-400">L: {player.losses || 0}</span>
                      </div>
                      <span className="text-[hsl(var(--beta-accent))]">
                        {calculateWinRate(player.wins || 0, player.losses || 0)}% WR
                      </span>
                    </div>

                    {/* Admin Badge */}
                    {player.is_admin_user && (
                      <div className="mt-3 pt-3 border-t border-[hsl(var(--beta-glass-border))]">
                        <BetaBadge variant="error" size="sm">Admin</BetaBadge>
                      </div>
                    )}
                  </GlassCard>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </GradientBackground>
  );
};

export default BetaPlayers;
