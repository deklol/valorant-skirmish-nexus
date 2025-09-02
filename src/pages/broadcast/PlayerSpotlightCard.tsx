import { useBroadcastData } from "@/hooks/useBroadcastData";
import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Crown } from "lucide-react";
import { useBroadcastSettings } from "@/hooks/useBroadcastSettings";

interface PlayerData {
  discord_username?: string;
  discord_avatar_url?: string;
  current_rank?: string;
  peak_rank?: string;
  riot_id?: string;
  display_weight?: number;
  atlas_weight?: number;
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
  const [shouldAnimate, setShouldAnimate] = useState(true);
  const { settings } = useBroadcastSettings();
  
  // Use broadcast data hook with ATLAS weights
  const { teams } = useBroadcastData(id);

  useEffect(() => {
    if (!teams.length || !playerId) return;

    // Find player in teams data
    let playerData: PlayerData | null = null;
    let teamName = '';
    let isCaptain = false;

    for (const team of teams) {
      const member = team.team_members.find(m => m.user_id === playerId);
      if (member && member.users) {
        playerData = {
          ...member.users,
          display_weight: (member.users as any).display_weight,
          atlas_weight: (member.users as any).atlas_weight,
          adaptive_weight: (member.users as any).adaptive_weight,
          team_name: team.name,
          is_captain: member.is_captain,
          tournaments_won: 0, // Would need additional query for this
          total_matches: 0 // Would need additional query for this
        };
        teamName = team.name;
        isCaptain = member.is_captain;
        break;
      }
    }

    setPlayer(playerData);
    setLoading(false);

    // Check animation settings
    const urlParams = new URLSearchParams(window.location.search);
    const animateParam = urlParams.get('animate');
    const animationEnabled = animateParam === 'false' ? false : settings.animationEnabled;
    setShouldAnimate(animationEnabled);
  }, [teams, playerId, settings.animationEnabled]);

  const getRankColor = (rank?: string) => {
    if (!rank) return 'text-slate-400';
    const rankLower = rank.toLowerCase();
    if (rankLower.includes('radiant')) return '#FFF176';
    if (rankLower.includes('immortal')) return '#A52834';
    if (rankLower.includes('ascendant')) return '#84FF6F';
    if (rankLower.includes('diamond')) return '#8d64e2';
    if (rankLower.includes('platinum')) return '#5CA3E4';
    if (rankLower.includes('gold')) return '#FFD700';
    return '#9CA3AF';
  };

  if (loading || !player) {
    return (
      <div className="w-screen h-screen bg-transparent flex items-center justify-center">
        <div className="text-white text-2xl">Loading...</div>
      </div>
    );
  }

  const sceneSettings = settings.sceneSettings.playerSpotlight;
  const containerStyle = {
    backgroundColor: sceneSettings.backgroundColor || settings.backgroundColor,
    backgroundImage: sceneSettings.backgroundImage || settings.backgroundImage ? `url(${sceneSettings.backgroundImage || settings.backgroundImage})` : undefined,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    fontFamily: sceneSettings.fontFamily || settings.fontFamily || 'inherit',
  };

  const displayWeight = player.display_weight || player.atlas_weight || player.adaptive_weight || 150;

  return (
    <div className="w-screen h-screen bg-transparent flex items-center justify-center p-8" style={containerStyle}>
      <div className="max-w-4xl w-full">
        {/* Player Spotlight Card */}
        <div className="bg-black/40 backdrop-blur-md rounded-3xl border border-white/10 shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-purple-600/20 to-blue-600/20 p-8 text-center">
            <div className="mb-4">
              <Avatar className="w-32 h-32 mx-auto border-4 border-white/20 shadow-xl">
                <AvatarImage 
                  src={player.discord_avatar_url || undefined} 
                  alt={player.discord_username}
                />
                <AvatarFallback className="bg-slate-700 text-white text-4xl">
                  {player.discord_username?.slice(0, 2).toUpperCase() || '??'}
                </AvatarFallback>
              </Avatar>
            </div>
            
            <div className="flex items-center justify-center space-x-3 mb-2">
              <div className="text-4xl font-bold" style={{ 
                color: sceneSettings.headerTextColor || settings.headerTextColor,
                fontFamily: sceneSettings.fontFamily || 'inherit' 
              }}>
                {player.discord_username || 'Unknown Player'}
              </div>
              {player.is_captain && (
                <Crown className="w-8 h-8 text-yellow-400" />
              )}
            </div>
            
            {player.team_name && (
              <div className="text-xl" style={{ 
                color: (sceneSettings.textColor || settings.textColor) + '80',
                fontFamily: sceneSettings.fontFamily || 'inherit'
              }}>
                {player.team_name}
                {player.is_captain && ' • Team Captain'}
              </div>
            )}
          </div>

          {/* Stats Grid */}
          <div className="p-8">
            <div className="grid grid-cols-2 gap-8">
              {/* Left Column - Ranks */}
              <div className="space-y-6">
                <div className="text-2xl font-bold mb-4" style={{ 
                  color: sceneSettings.headerTextColor || settings.headerTextColor,
                  fontFamily: sceneSettings.fontFamily || 'inherit'
                }}>
                  Ranks
                </div>
                
                {sceneSettings.showCurrentRank && player.current_rank && (
                  <div className="flex items-center justify-between p-4 bg-black/20 rounded-xl border border-white/10">
                    <span style={{ color: sceneSettings.textColor || settings.textColor }}>Current Rank</span>
                    <Badge 
                      variant="outline" 
                      className="text-lg px-4 py-2"
                      style={{ 
                        borderColor: getRankColor(player.current_rank) + '50',
                        color: getRankColor(player.current_rank)
                      }}
                    >
                      {player.current_rank}
                    </Badge>
                  </div>
                )}
                
                {sceneSettings.showPeakRank && player.peak_rank && (
                  <div className="flex items-center justify-between p-4 bg-black/20 rounded-xl border border-white/10">
                    <span style={{ color: sceneSettings.textColor || settings.textColor }}>Peak Rank</span>
                    <Badge 
                      variant="outline" 
                      className="text-lg px-4 py-2"
                      style={{ 
                        borderColor: getRankColor(player.peak_rank) + '50',
                        color: getRankColor(player.peak_rank)
                      }}
                    >
                      {player.peak_rank}
                    </Badge>
                  </div>
                )}

                {sceneSettings.showRiotId && player.riot_id && (
                  <div className="flex items-center justify-between p-4 bg-black/20 rounded-xl border border-white/10">
                    <span style={{ color: sceneSettings.textColor || settings.textColor }}>Riot ID</span>
                    <span className="text-cyan-400 font-mono">{player.riot_id}</span>
                  </div>
                )}
              </div>

              {/* Right Column - Performance */}
              <div className="space-y-6">
                <div className="text-2xl font-bold mb-4" style={{ 
                  color: sceneSettings.headerTextColor || settings.headerTextColor,
                  fontFamily: sceneSettings.fontFamily || 'inherit'
                }}>
                  Performance
                </div>
                
                {sceneSettings.showAdaptiveWeight && (
                  <div className="flex items-center justify-between p-4 bg-black/20 rounded-xl border border-white/10">
                    <span style={{ color: sceneSettings.textColor || settings.textColor }}>Tournament Weight</span>
                    <Badge variant="outline" className="text-lg px-4 py-2 text-cyan-400 border-cyan-400/50">
                      {displayWeight} pts
                    </Badge>
                  </div>
                )}

                {sceneSettings.showAdaptiveWeight && (
                  <>
                    <div className="flex items-center justify-between p-4 bg-black/20 rounded-xl border border-white/10">
                      <span style={{ color: sceneSettings.textColor || settings.textColor }}>Tournaments Won</span>
                      <span className="text-green-400 text-lg font-bold">{player.tournaments_won || 0}</span>
                    </div>
                    
                    <div className="flex items-center justify-between p-4 bg-black/20 rounded-xl border border-white/10">
                      <span style={{ color: sceneSettings.textColor || settings.textColor }}>Total Matches</span>
                      <span className="text-blue-400 text-lg font-bold">{player.total_matches || 0}</span>
                    </div>
                  </>
                )}

                {/* Performance Indicator */}
                <div className="p-4 bg-gradient-to-r from-purple-600/10 to-blue-600/10 rounded-xl border border-white/10">
                  <div className="text-center">
                    <div className="text-sm mb-2" style={{ color: (sceneSettings.textColor || settings.textColor) + '70' }}>
                      Performance Rating
                    </div>
                    <div className={`text-3xl font-bold ${
                      displayWeight >= 400 ? 'text-red-400' : 
                      displayWeight >= 300 ? 'text-purple-400' : 
                      displayWeight >= 200 ? 'text-blue-400' : 
                      'text-green-400'
                    }`}>
                      {displayWeight >= 400 ? 'Elite' : 
                       displayWeight >= 300 ? 'High' : 
                       displayWeight >= 200 ? 'Intermediate' : 
                       'Developing'}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}