import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Star, Trophy, Target } from "lucide-react";

interface PlayerData {
  id: string;
  discord_username: string;
  discord_avatar_url?: string;
  current_rank?: string;
  riot_id?: string;
  rank_points?: number;
  weight_rating?: number;
  peak_rank?: string;
  adaptive_weight?: number;
  team_name?: string;
  is_captain?: boolean;
  tournaments_won?: number;
  total_matches?: number;
}

export default function PlayerSpotlightCard() {
  const { id, playerId } = useParams<{ id: string; playerId: string }>();
  const [player, setPlayer] = useState<PlayerData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id || !playerId) return;

    const fetchPlayerData = async () => {
      // Get player from team members in this tournament
      const { data: teamMemberData, error } = await supabase
        .from('team_members')
        .select(`
          user_id,
          is_captain,
          teams!inner (
            id,
            name,
            tournament_id
          ),
          users (
            discord_username,
            discord_avatar_url,
            current_rank,
            riot_id,
            rank_points,
            weight_rating,
            peak_rank
          )
        `)
        .eq('teams.tournament_id', id)
        .eq('user_id', playerId)
        .single();

      if (error || !teamMemberData) {
        setLoading(false);
        return;
      }

      // Get adaptive weight for this tournament
      const { data: adaptiveWeight } = await supabase
        .from('tournament_adaptive_weights')
        .select('calculated_adaptive_weight')
        .eq('tournament_id', id)
        .eq('user_id', playerId)
        .single();

      // Get player statistics (tournaments won, etc.)
      const { data: statsData } = await supabase
        .from('team_members')
        .select(`
          teams (
            tournaments (
              status
            )
          )
        `)
        .eq('user_id', playerId);

      const tournamentsWon = statsData?.filter(
        (stat: any) => stat.teams?.tournaments?.status === 'completed'
      ).length || 0;

      setPlayer({
        id: playerId,
        discord_username: teamMemberData.users?.discord_username || 'Unknown Player',
        discord_avatar_url: teamMemberData.users?.discord_avatar_url,
        current_rank: teamMemberData.users?.current_rank,
        riot_id: teamMemberData.users?.riot_id,
        rank_points: teamMemberData.users?.rank_points,
        weight_rating: teamMemberData.users?.weight_rating,
        peak_rank: teamMemberData.users?.peak_rank,
        adaptive_weight: adaptiveWeight?.calculated_adaptive_weight,
        team_name: (teamMemberData.teams as any)?.name,
        is_captain: teamMemberData.is_captain,
        tournaments_won: tournamentsWon,
        total_matches: statsData?.length || 0,
      });

      setLoading(false);
    };

    fetchPlayerData();
  }, [id, playerId]);

  if (loading || !player) {
    return (
      <div className="w-screen h-screen bg-transparent flex items-center justify-center">
        <div className="text-white text-2xl">Loading player...</div>
      </div>
    );
  }

  const getRankColor = (rank?: string) => {
    if (!rank) return 'text-slate-400';
    const rankLower = rank.toLowerCase();
    if (rankLower.includes('radiant')) return 'text-yellow-400';
    if (rankLower.includes('immortal')) return 'text-purple-400';
    if (rankLower.includes('ascendant')) return 'text-green-400';
    if (rankLower.includes('diamond')) return 'text-blue-400';
    if (rankLower.includes('platinum')) return 'text-cyan-400';
    if (rankLower.includes('gold')) return 'text-yellow-600';
    if (rankLower.includes('silver')) return 'text-gray-400';
    if (rankLower.includes('bronze')) return 'text-orange-600';
    if (rankLower.includes('iron')) return 'text-stone-500';
    return 'text-slate-400';
  };

  return (
    <div className="w-screen h-screen bg-transparent flex items-center justify-center p-8">
      <div className="max-w-2xl w-full">
        {/* Main Card */}
        <div className="bg-black/40 backdrop-blur-sm rounded-2xl border border-white/20 overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-purple-600/20 to-blue-600/20 p-8 text-center">
            <Avatar className="w-32 h-32 mx-auto mb-6 border-4 border-white/20">
              <AvatarImage src={player.discord_avatar_url || undefined} />
              <AvatarFallback className="bg-slate-700 text-white text-4xl">
                {player.discord_username.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            
            <div className="space-y-2">
              <div className="flex items-center justify-center space-x-3">
                <h1 className="text-4xl font-bold text-white">
                  {player.discord_username}
                </h1>
                {player.is_captain && (
                  <Badge variant="outline" className="border-yellow-400 text-yellow-400">
                    CAPTAIN
                  </Badge>
                )}
              </div>
              
              {player.riot_id && (
                <div className="text-xl text-white/70">{player.riot_id}</div>
              )}
              
              {player.team_name && (
                <div className="text-lg text-cyan-400">{player.team_name}</div>
              )}
            </div>
          </div>

          {/* Stats Grid */}
          <div className="p-8">
            <div className="grid grid-cols-2 gap-6">
              {/* Current Rank */}
              <div className="bg-black/30 rounded-xl p-6 text-center">
                <div className="flex items-center justify-center mb-3">
                  <Target className="w-6 h-6 text-cyan-400 mr-2" />
                  <span className="text-white/70">Current Rank</span>
                </div>
                <div className={`text-2xl font-bold ${getRankColor(player.current_rank)}`}>
                  {player.current_rank || 'Unranked'}
                </div>
                {player.rank_points && (
                  <div className="text-sm text-white/50 mt-1">
                    {player.rank_points} RR
                  </div>
                )}
              </div>

              {/* Peak Rank */}
              <div className="bg-black/30 rounded-xl p-6 text-center">
                <div className="flex items-center justify-center mb-3">
                  <Star className="w-6 h-6 text-yellow-400 mr-2" />
                  <span className="text-white/70">Peak Rank</span>
                </div>
                <div className={`text-2xl font-bold ${getRankColor(player.peak_rank)}`}>
                  {player.peak_rank || 'Unknown'}
                </div>
              </div>

              {/* Adaptive Weight */}
              <div className="bg-black/30 rounded-xl p-6 text-center">
                <div className="flex items-center justify-center mb-3">
                  <Trophy className="w-6 h-6 text-purple-400 mr-2" />
                  <span className="text-white/70">Tournament Weight</span>
                </div>
                <div className="text-2xl font-bold text-purple-400">
                  {player.adaptive_weight || player.weight_rating || 150}
                </div>
                <div className="text-sm text-white/50 mt-1">AWR</div>
              </div>

              {/* Experience */}
              <div className="bg-black/30 rounded-xl p-6 text-center">
                <div className="flex items-center justify-center mb-3">
                  <Trophy className="w-6 h-6 text-green-400 mr-2" />
                  <span className="text-white/70">Experience</span>
                </div>
                <div className="text-2xl font-bold text-green-400">
                  {player.total_matches}
                </div>
                <div className="text-sm text-white/50 mt-1">
                  Tournaments • {player.tournaments_won} Won
                </div>
              </div>
            </div>

            {/* Performance Indicator */}
            <div className="mt-8 text-center">
              <div className="bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-xl p-4 border border-white/10">
                <div className="text-white/70 text-sm mb-1">Player Rating</div>
                <div className="text-2xl font-bold text-white">
                  {player.adaptive_weight && player.adaptive_weight > 200 
                    ? 'Elite' 
                    : player.adaptive_weight && player.adaptive_weight > 175 
                      ? 'Advanced' 
                      : player.adaptive_weight && player.adaptive_weight > 150 
                        ? 'Intermediate' 
                        : 'Developing'
                  }
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}