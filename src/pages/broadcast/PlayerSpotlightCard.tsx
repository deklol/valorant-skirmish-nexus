import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useBroadcastSettings } from "@/hooks/useBroadcastSettings";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Trophy, Target, TrendingUp, Star, Crown, Users } from "lucide-react";
import { 
  getBroadcastContainerStyle,
  getBroadcastBlockStyle,
  getBroadcastBadgeStyle,
  BROADCAST_CONTAINER_CLASSES,
  BROADCAST_DEFAULTS,
  getRankColor
} from "@/utils/broadcastLayoutUtils";

// Helper function to format rank emojis
const formatRankEmoji = (rank?: string) => {
  if (!rank) return "❓";
  const rankLower = rank.toLowerCase();
  if (rankLower.includes('radiant')) return "✨";
  if (rankLower.includes('immortal')) return "🟥";
  if (rankLower.includes('ascendant')) return "🟩";
  if (rankLower.includes('diamond')) return "🟪";
  if (rankLower.includes('platinum')) return "🟦";
  if (rankLower.includes('gold')) return "🟨";
  if (rankLower.includes('silver')) return "⬜";
  if (rankLower.includes('bronze')) return "🟫";
  if (rankLower.includes('iron')) return "⬛";
  return "❓";
};

interface PlayerData {
  id: string;
  discord_username: string;
  discord_avatar_url?: string;
  current_rank?: string;
  peak_rank?: string;
  riot_id?: string;
  display_weight?: number;
  atlas_weight?: number;
  adaptive_weight?: number;
  tournament_wins?: number;
}

export default function PlayerSpotlightCard() {
  const { id, playerId } = useParams<{ id: string; playerId: string }>();
  const [player, setPlayer] = useState<PlayerData | null>(null);
  const [loading, setLoading] = useState(true);
  const { settings } = useBroadcastSettings();

  // Inject transparent background CSS for vMix & OBS compatibility
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      body {
        margin: 0 !important;
        padding: 0 !important;
        background-color: rgba(0, 0, 0, 0) !important;
        overflow: hidden !important;
      }
    `;
    document.head.appendChild(style);
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  // Check for animate=false in URL
  const searchParams = new URLSearchParams(window.location.search);
  const shouldSkipAnimations = searchParams.get('animate') === 'false';

  useEffect(() => {
    if (!id || !playerId) return;

    const fetchPlayerData = async () => {
      try {
        // Fetch player data
        const { data: userData } = await supabase
          .from('users')
          .select('*')
          .eq('id', playerId)
          .single();

        if (!userData) return;

        // Use existing weight system from user data
        const enhancedPlayer: PlayerData = {
          id: userData.id,
          discord_username: userData.discord_username,
          discord_avatar_url: userData.discord_avatar_url,
          current_rank: userData.current_rank,
          peak_rank: userData.peak_rank,
          riot_id: userData.riot_id,
          display_weight: 150, // Default weight for broadcast
          atlas_weight: 150,
          adaptive_weight: 150,
          tournament_wins: userData.wins || 0
        };

        setPlayer(enhancedPlayer);
      } catch (error) {
        console.error('Error fetching player data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPlayerData();
  }, [id, playerId]);

  // Skip loading state entirely if animate=false
  if (!shouldSkipAnimations && (loading || !player)) {
    return (
      <div className="w-screen h-screen bg-transparent flex items-center justify-center">
        <div 
          className="text-4xl font-black text-white"
          style={{ 
            fontFamily: BROADCAST_DEFAULTS.fontFamily,
            textShadow: '2px 2px 0px #000000'
          }}
        >
          Loading Player Spotlight...
        </div>
      </div>
    );
  }

  // If animate=false and we don't have data yet, show empty state instantly
  if (shouldSkipAnimations && !player) {
    return (
      <div className="w-screen h-screen bg-transparent flex items-center justify-center">
        <div 
          className="text-4xl font-black text-white"
          style={{ 
            fontFamily: BROADCAST_DEFAULTS.fontFamily,
            textShadow: '2px 2px 0px #000000'
          }}
        >
          No Player Data
        </div>
      </div>
    );
  }

  const sceneSettings = settings.sceneSettings.playerSpotlight;
  const containerStyle = getBroadcastContainerStyle(sceneSettings, settings);
  const isBroadcastMode = sceneSettings.broadcastFriendlyMode || sceneSettings.transparentBackground;

  const displayWeight = player.display_weight || player.atlas_weight || player.adaptive_weight || 150;

  if (!isBroadcastMode) {
    // Legacy mode design
    return (
      <div className="w-screen h-screen flex items-center justify-center p-8" style={containerStyle}>
        <div className="max-w-4xl w-full">
          <div className="backdrop-blur-md rounded-3xl border border-white/10 shadow-2xl overflow-hidden bg-black/40">
            <div className="p-8 text-center border-b border-white/10">
              <div className="mb-4">
                <Avatar className="w-32 h-32 mx-auto border-4 border-white/20 shadow-xl">
                  <AvatarImage 
                    src={player.discord_avatar_url || undefined} 
                    alt={player.discord_username}
                  />
                  <AvatarFallback className="bg-slate-700 text-white">
                    {player.discord_username?.slice(0, 2).toUpperCase() || '??'}
                  </AvatarFallback>
                </Avatar>
              </div>

              <h1 className="text-4xl font-bold text-white mb-2">
                {player.discord_username}
              </h1>

              {player.riot_id && (
                <p className="text-xl text-gray-300 mb-4">
                  {player.riot_id}
                </p>
              )}

              <div className="flex items-center justify-center gap-4">
                {player.current_rank && (
                  <Badge 
                    className="px-4 py-2 text-lg font-semibold"
                    style={{ 
                      backgroundColor: getRankColor(player.current_rank),
                      color: '#000000'
                    }}
                  >
                    {player.current_rank}
                  </Badge>
                )}
                
                <Badge variant="outline" className="px-4 py-2 text-lg border-white/30 text-white">
                  {displayWeight} Points
                </Badge>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-6 p-8">
              <div className="text-center">
                <Target className="w-8 h-8 mx-auto mb-3 text-blue-400" />
                <div className="text-2xl font-bold text-white">
                  {displayWeight}
                </div>
                <div className="text-gray-300">Weight</div>
              </div>

              <div className="text-center">
                <Trophy className="w-8 h-8 mx-auto mb-3 text-yellow-400" />
                <div className="text-2xl font-bold text-white">
                  {player.tournament_wins || 0}
                </div>
                <div className="text-gray-300">Wins</div>
              </div>

              <div className="text-center">
                <TrendingUp className="w-8 h-8 mx-auto mb-3 text-green-400" />
                <div className="text-2xl font-bold text-white">
                  {player.peak_rank || 'N/A'}
                </div>
                <div className="text-gray-300">Peak</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Use blocky design ONLY when transparentBackground is enabled
  if (sceneSettings.transparentBackground) {
    return (
    <div className={BROADCAST_CONTAINER_CLASSES} style={containerStyle}>
      <div className="max-w-full h-full flex items-center justify-center p-8">
        <div className="max-w-4xl w-full">
          {/* Player Name Block */}
          <div 
            className="px-6 py-4 text-white flex items-center justify-between mb-0"
            style={{ 
              backgroundColor: sceneSettings.obsAccentColor || '#FF6B35'
            }}
          >
            <div className="flex items-center gap-4">
              <span className="text-3xl font-bold">
                {player.discord_username}
              </span>
            </div>
          </div>

          {/* Player Info Horizontal Cards */}
          <div className="grid grid-cols-4 mb-8">
            {/* Avatar Card */}
            <div className="bg-black p-6 flex flex-col items-center">
              {sceneSettings.showLargeAvatar ? (
                <div className="w-32 h-32 bg-gray-600 mb-3">
                  <img
                    src={player.discord_avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${player.discord_username}`}
                    alt={player.discord_username}
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <div className="w-20 h-20 bg-gray-600 mb-3">
                  <img
                    src={player.discord_avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${player.discord_username}`}
                    alt={player.discord_username}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              <div 
                className="text-white text-sm text-center"
                style={{ color: sceneSettings.obsTextColor || '#FFFFFF' }}
              >
                Avatar
              </div>
            </div>

            {/* Rank Card */}
            {player.current_rank && (
              <div className="bg-black p-6 flex flex-col items-center">
                <div 
                  className="w-20 h-20 flex items-center justify-center text-2xl mb-3"
                  style={{ backgroundColor: getRankColor(player.current_rank) }}
                >
                  {formatRankEmoji(player.current_rank)}
                </div>
                <div className="text-white text-sm text-center">{player.current_rank}</div>
              </div>
            )}

            {/* Weight Card */}
            <div className="bg-black p-6 flex flex-col items-center">
              <div className="w-20 h-20 bg-blue-600 flex items-center justify-center text-xl font-bold text-white mb-3">
                {displayWeight}
              </div>
              <div className="text-white text-sm text-center">Weight</div>
            </div>

            {/* Riot ID Card */}
            {player.riot_id && (
              <div className="bg-black p-6 flex flex-col items-center">
                <div className="w-20 h-20 bg-red-600 flex items-center justify-center text-white mb-3 text-sm text-center font-bold">
                  RIOT
                </div>
                <div className="text-white text-sm text-center truncate w-full">{player.riot_id}</div>
              </div>
            )}
          </div>

          {/* Stats Blocks */}
          <div className={`grid gap-4 ${sceneSettings.statsLayout === 'stacked' ? 'grid-cols-1' : 'grid-cols-3'}`}>
            <div 
              className="bg-black p-6 text-center"
              style={{ backgroundColor: sceneSettings.obsBackgroundColor || '#000000' }}
            >
              <div 
                className="text-4xl font-black mb-2"
                style={{ 
                  color: '#3B82F6',
                  fontFamily: BROADCAST_DEFAULTS.fontFamily 
                }}
              >
                {displayWeight}
              </div>
              <div 
                className="text-xl font-bold"
                style={{ 
                  fontFamily: BROADCAST_DEFAULTS.fontFamily,
                  color: sceneSettings.obsTextColor || '#FFFFFF'
                }}
              >
                CURRENT WEIGHT
              </div>
            </div>

            <div 
              className="bg-black p-6 text-center"
              style={{ backgroundColor: sceneSettings.obsBackgroundColor || '#000000' }}
            >
              <div 
                className="text-4xl font-black mb-2"
                style={{ 
                  color: '#F59E0B',
                  fontFamily: BROADCAST_DEFAULTS.fontFamily 
                }}
              >
                {player.tournament_wins || 0}
              </div>
              <div 
                className="text-xl font-bold"
                style={{ 
                  fontFamily: BROADCAST_DEFAULTS.fontFamily,
                  color: sceneSettings.obsTextColor || '#FFFFFF'
                }}
              >
                TOURNAMENT WINS
              </div>
            </div>

            <div 
              className="bg-black p-6 text-center"
              style={{ backgroundColor: sceneSettings.obsBackgroundColor || '#000000' }}
            >
              <div 
                className="text-2xl font-black mb-2"
                style={{ 
                  color: getRankColor(player.peak_rank),
                  fontFamily: BROADCAST_DEFAULTS.fontFamily 
                }}
              >
                {player.peak_rank || 'UNRANKED'}
              </div>
              <div 
                className="text-xl font-bold"
                style={{ 
                  fontFamily: BROADCAST_DEFAULTS.fontFamily,
                  color: sceneSettings.obsTextColor || '#FFFFFF'
                }}
              >
                PEAK RANK
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
  } else {
    // Original broadcast design when transparent background is disabled
    return (
      <div className={BROADCAST_CONTAINER_CLASSES} style={containerStyle}>
        <div className="max-w-full h-full flex items-center justify-center p-8">
          <div className="max-w-6xl w-full">
            {/* Player Header Block */}
            <div 
              className="bg-black border-4 border-white p-8 mb-6"
              style={{ borderColor: BROADCAST_DEFAULTS.accentColor }}
            >
              <div className="flex items-center gap-8">
                {/* Avatar */}
                <div className="bg-gray-600 border-4 border-white w-48 h-48">
                  <img
                    src={player.discord_avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${player.discord_username}`}
                    alt={player.discord_username}
                    className="w-full h-full object-cover"
                  />
                </div>

                {/* Player Info */}
                <div className="flex-1">
                  <div 
                    className="text-6xl font-black text-white mb-4"
                    style={{ 
                      fontFamily: BROADCAST_DEFAULTS.fontFamily,
                      color: BROADCAST_DEFAULTS.accentColor,
                      textShadow: '2px 2px 0px #000000'
                    }}
                  >
                    {player.discord_username}
                  </div>

                  {player.riot_id && (
                    <div 
                      className="text-3xl text-white mb-6"
                      style={{ fontFamily: BROADCAST_DEFAULTS.fontFamily }}
                    >
                      {player.riot_id}
                    </div>
                  )}

                  {/* Rank and Weight Badges */}
                  <div className="flex items-center gap-4">
                    {player.current_rank && (
                      <div 
                        className="px-6 py-3 border-4 border-white font-black text-2xl"
                        style={{
                          backgroundColor: getRankColor(player.current_rank),
                          color: '#000000',
                          fontFamily: BROADCAST_DEFAULTS.fontFamily
                        }}
                      >
                        {player.current_rank}
                      </div>
                    )}
                    
                    <div 
                      className="px-6 py-3 border-4 border-white font-black text-2xl"
                      style={{
                        backgroundColor: BROADCAST_DEFAULTS.accentColor,
                        color: '#000000',
                        fontFamily: BROADCAST_DEFAULTS.fontFamily
                      }}
                    >
                      {displayWeight} POINTS
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-3 gap-6">
              <div className="bg-black border-4 border-white p-8 text-center">
                <Target 
                  className="w-16 h-16 mx-auto mb-4" 
                  style={{ color: BROADCAST_DEFAULTS.primaryColor }} 
                />
                <div 
                  className="text-5xl font-black mb-2"
                  style={{ 
                    color: BROADCAST_DEFAULTS.primaryColor,
                    fontFamily: BROADCAST_DEFAULTS.fontFamily 
                  }}
                >
                  {displayWeight}
                </div>
                <div 
                  className="text-2xl font-bold text-white"
                  style={{ fontFamily: BROADCAST_DEFAULTS.fontFamily }}
                >
                  CURRENT WEIGHT
                </div>
              </div>

              <div className="bg-black border-4 border-white p-8 text-center">
                <Trophy 
                  className="w-16 h-16 mx-auto mb-4" 
                  style={{ color: BROADCAST_DEFAULTS.warningColor }} 
                />
                <div 
                  className="text-5xl font-black mb-2"
                  style={{ 
                    color: BROADCAST_DEFAULTS.warningColor,
                    fontFamily: BROADCAST_DEFAULTS.fontFamily 
                  }}
                >
                  {player.tournament_wins || 0}
                </div>
                <div 
                  className="text-2xl font-bold text-white"
                  style={{ fontFamily: BROADCAST_DEFAULTS.fontFamily }}
                >
                  TOURNAMENT WINS
                </div>
              </div>

              <div className="bg-black border-4 border-white p-8 text-center">
                <TrendingUp 
                  className="w-16 h-16 mx-auto mb-4" 
                  style={{ color: getRankColor(player.peak_rank) }} 
                />
                <div 
                  className="text-3xl font-black mb-2 text-white"
                  style={{ 
                    color: getRankColor(player.peak_rank),
                    fontFamily: BROADCAST_DEFAULTS.fontFamily 
                  }}
                >
                  {player.peak_rank || 'UNRANKED'}
                </div>
                <div 
                  className="text-2xl font-bold text-white"
                  style={{ fontFamily: BROADCAST_DEFAULTS.fontFamily }}
                >
                  PEAK RANK
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  function formatRankEmoji(rank?: string) {
    if (!rank) return "❓";
    const rankLower = rank.toLowerCase();
    if (rankLower.includes('radiant')) return "✨";
    if (rankLower.includes('immortal')) return "🟥";
    if (rankLower.includes('ascendant')) return "🟩";
    if (rankLower.includes('diamond')) return "🟪";
    if (rankLower.includes('platinum')) return "🟦";
    if (rankLower.includes('gold')) return "🟨";
    if (rankLower.includes('silver')) return "⬜";
    if (rankLower.includes('bronze')) return "🟫";
    if (rankLower.includes('iron')) return "⬛";
    return "❓";
  }
}