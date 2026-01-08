
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import ClickableUsername from '@/components/ClickableUsername';

// Rank configuration with emojis and colors
const RANK_CONFIG = {
  'Iron 1': { emoji: '⬛', primary: '#4A4A4A', accent: '#7E7E7E', skill: 'Developing' },
  'Iron 2': { emoji: '⬛', primary: '#4A4A4A', accent: '#7E7E7E', skill: 'Developing' },
  'Iron 3': { emoji: '⬛', primary: '#4A4A4A', accent: '#7E7E7E', skill: 'Developing' },
  'Bronze 1': { emoji: '🟫', primary: '#A97142', accent: '#C28E5C', skill: 'Beginner' },
  'Bronze 2': { emoji: '🟫', primary: '#A97142', accent: '#C28E5C', skill: 'Beginner' },
  'Bronze 3': { emoji: '🟫', primary: '#A97142', accent: '#C28E5C', skill: 'Beginner' },
  'Silver 1': { emoji: '⬜', primary: '#C0C0C0', accent: '#D8D8D8', skill: 'Beginner' },
  'Silver 2': { emoji: '⬜', primary: '#C0C0C0', accent: '#D8D8D8', skill: 'Beginner' },
  'Silver 3': { emoji: '⬜', primary: '#C0C0C0', accent: '#D8D8D8', skill: 'Beginner' },
  'Gold 1': { emoji: '🟨', primary: '#FFD700', accent: '#FFEA8A', skill: 'Beginner' },
  'Gold 2': { emoji: '🟨', primary: '#FFD700', accent: '#FFEA8A', skill: 'Beginner' },
  'Gold 3': { emoji: '🟨', primary: '#FFD700', accent: '#FFEA8A', skill: 'Beginner' },
  'Platinum 1': { emoji: '🟦', primary: '#5CA3E4', accent: '#B3DAFF', skill: 'Intermediate' },
  'Platinum 2': { emoji: '🟦', primary: '#5CA3E4', accent: '#B3DAFF', skill: 'Intermediate' },
  'Platinum 3': { emoji: '🟦', primary: '#5CA3E4', accent: '#B3DAFF', skill: 'Intermediate' },
  'Diamond 1': { emoji: '🟪', primary: '#8d64e2', accent: '#B3DAFF', skill: 'Intermediate' },
  'Diamond 2': { emoji: '🟪', primary: '#8d64e2', accent: '#B3DAFF', skill: 'Intermediate' },
  'Diamond 3': { emoji: '🟪', primary: '#8d64e2', accent: '#B3DAFF', skill: 'Intermediate' },
  'Ascendant 1': { emoji: '🟩', primary: '#84FF6F', accent: '#B6FFA8', skill: 'Intermediate' },
  'Ascendant 2': { emoji: '🟩', primary: '#84FF6F', accent: '#B6FFA8', skill: 'Intermediate' },
  'Ascendant 3': { emoji: '🟩', primary: '#84FF6F', accent: '#B6FFA8', skill: 'Intermediate' },
  'Immortal 1': { emoji: '🟥', primary: '#A52834', accent: '#D24357', skill: 'High Skilled' },
  'Immortal 2': { emoji: '🟥', primary: '#A52834', accent: '#D24357', skill: 'Elite' },
  'Immortal 3': { emoji: '🟥', primary: '#A52834', accent: '#D24357', skill: 'Elite' },
  'Radiant': { emoji: '✨', primary: '#FFF176', accent: '#FFFFFF', skill: 'Elite' },
  'Unrated': { emoji: '❓', primary: '#9CA3AF', accent: '#D1D5DB', skill: 'Unknown' },
  'Unranked': { emoji: '❓', primary: '#9CA3AF', accent: '#D1D5DB', skill: 'Unknown' }
};

// Helper functions for rank styling
const getRankInfo = (rank: string) => {
  return RANK_CONFIG[rank] || RANK_CONFIG['Unranked'];
};

interface Player {
  id: string;
  discord_username: string;
  discord_avatar_url: string | null;
  current_rank: string;
  rank_points: number;
  weight_rating: number;
  tournaments_won: number;
  mvp_awards: number;
  wins: number;
  losses: number;
  is_admin_user: boolean;
  valorant_role: string | null;
  looking_for_team: boolean | null;
}

const Players = () => {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPlayers();
  }, []);

  const fetchPlayers = async () => {
    try {
      // Use public_user_profiles view for secure public access
      const { data, error } = await supabase
        .from('public_user_profiles')
        .select('id, discord_username, discord_avatar_url, current_rank, rank_points, weight_rating, tournaments_won, mvp_awards, wins, losses, is_admin_user, valorant_role, looking_for_team')
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

  const getEffectiveWeight = (player: Player) => {
    return player.weight_rating || 150;
  };

  const calculateWinRate = (wins: number, losses: number) => {
    if (wins + losses === 0) return 0;
    return Math.round((wins / (wins + losses)) * 100);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-primary/5">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <div className="w-12 h-12 bg-primary/10 rounded-lg mx-auto mb-4 flex items-center justify-center">
                <Users className="w-6 h-6 text-primary animate-pulse" />
              </div>
              <p className="text-muted-foreground">Loading players...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-primary/5">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Users className="w-8 h-8 text-primary" />
            </div>
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                Players
              </h1>
              <p className="text-muted-foreground mt-1">
                Discover competitive players and their stats
              </p>
            </div>
          </div>
          <div className="bg-card/50 backdrop-blur border rounded-lg p-4">
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-primary">Balancing Weight:</span> Numerical rank representation used for team balancing. 
              <span className="text-orange-400 font-medium ml-2">*</span> indicates manual override by admins.
            </p>
          </div>
        </div>

        {players.length === 0 ? (
          <div className="flex items-center justify-center min-h-[400px]">
            <Card className="bg-card/50 backdrop-blur border-border/50 max-w-md w-full">
              <CardContent className="text-center py-12">
                <div className="p-4 bg-muted/50 rounded-full w-fit mx-auto mb-4">
                  <Users className="w-12 h-12 text-muted-foreground" />
                </div>
                <h3 className="text-xl font-semibold mb-2">No Players Found</h3>
                <p className="text-muted-foreground">No players have registered yet.</p>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {players.map((player, index) => (
              <Card 
                key={player.id} 
                className="group bg-card/50 backdrop-blur border-border/50 hover:border-primary/30 transition-all duration-300 hover:shadow-lg hover:shadow-primary/10 hover-scale animate-fade-in"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <CardHeader className="pb-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <div className="w-14 h-14 bg-gradient-to-br from-primary/20 to-primary/5 rounded-xl flex items-center justify-center overflow-hidden border border-border/50">
                          {player.discord_avatar_url ? (
                            <img 
                              src={player.discord_avatar_url} 
                              alt={`${player.discord_username}'s avatar`}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.style.display = 'none';
                                const parent = target.parentElement;
                                if (parent) {
                                  const span = document.createElement('span');
                                  span.className = 'text-xl font-bold text-primary';
                                  span.textContent = player.discord_username?.charAt(0).toUpperCase() || 'U';
                                  parent.appendChild(span);
                                }
                              }}
                            />
                          ) : (
                            <span className="text-xl font-bold text-primary">
                              {player.discord_username?.charAt(0).toUpperCase() || 'U'}
                            </span>
                          )}
                        </div>
                        {player.looking_for_team && (
                          <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-background animate-pulse"></div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <ClickableUsername 
                          userId={player.id}
                          username={player.discord_username || 'Unknown Player'}
                          variant="ghost"
                          className="text-foreground hover:text-primary p-0 h-auto justify-start font-medium text-base truncate w-full"
                        />
                        <div className="flex flex-wrap gap-1 mt-1">
                          {(() => {
                            const rankInfo = getRankInfo(player.current_rank || 'Unranked');
                            return (
                              <Badge 
                                variant="secondary" 
                                className="text-xs px-2 py-0.5 flex items-center gap-1"
                                style={{ 
                                  backgroundColor: `${rankInfo.primary}20`,
                                  borderColor: `${rankInfo.primary}40`,
                                  color: rankInfo.primary 
                                }}
                              >
                                <span>{rankInfo.emoji}</span>
                                <span>{player.current_rank || 'Unranked'}</span>
                              </Badge>
                            );
                          })()}
                          {player.valorant_role && (
                            <Badge variant="outline" className="text-xs px-2 py-0.5 text-blue-400 border-blue-400/50 bg-blue-400/10">
                              {player.valorant_role}
                            </Badge>
                          )}
                          {player.looking_for_team && (
                            <Badge variant="outline" className="text-xs px-2 py-0.5 text-green-400 border-green-400/50 bg-green-400/10">
                              LFT
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="pt-0 space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-lg p-3 text-center border border-primary/20">
                      <div className="text-lg font-bold text-primary flex items-center justify-center gap-1">
                        {getEffectiveWeight(player)}
                      </div>
                      <div className="text-xs text-muted-foreground font-medium">
                        Balance Weight
                      </div>
                    </div>
                    
                    <div className="bg-gradient-to-br from-purple-500/10 to-purple-500/5 rounded-lg p-3 text-center border border-purple-500/20">
                      <div className="text-lg font-bold text-purple-400">
                        {player.rank_points || 0}
                      </div>
                      <div className="text-xs text-muted-foreground font-medium">
                        Ranked RR
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-gradient-to-br from-yellow-500/10 to-yellow-500/5 rounded-lg p-3 text-center border border-yellow-500/20">
                      <div className="text-lg font-bold text-yellow-400">
                        {player.tournaments_won || 0}
                      </div>
                      <div className="text-xs text-yellow-400/80 font-medium">
                        Tournaments Won
                      </div>
                    </div>
                    
                    <div className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 rounded-lg p-3 text-center border border-blue-500/20">
                      <div className="text-lg font-bold text-blue-400">
                        {calculateWinRate(player.wins || 0, player.losses || 0)}%
                      </div>
                      <div className="text-xs text-muted-foreground font-medium">
                        Win Rate
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-gradient-to-r from-border/50 to-transparent h-px"></div>
                  
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3 text-sm">
                      <div className="flex items-center gap-1">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span className="text-muted-foreground">W:</span>
                        <span className="font-medium text-green-400">{player.wins || 0}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                        <span className="text-muted-foreground">L:</span>
                        <span className="font-medium text-red-400">{player.losses || 0}</span>
                      </div>
                    </div>
                    
                    {player.is_admin_user && (
                      <Badge variant="destructive" className="text-xs px-2 py-0.5">
                        Admin
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Players;
