import { useBroadcastData } from "@/hooks/useBroadcastData";
import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import type { Team } from "@/types/tournamentDetail";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Crown } from "lucide-react";
import { useBroadcastSettings } from "@/hooks/useBroadcastSettings";
import { formatSeedDisplay } from "@/utils/broadcastSeedingUtils";
import { BroadcastLoading } from "@/components/broadcast/BroadcastLoading";
import { 
  getBroadcastContainerStyle, 
  getBroadcastHeaderStyle, 
  getBroadcastTextStyle,
  getBroadcastCardStyle,
  BROADCAST_CONTAINER_CLASSES,
  BROADCAST_CONTENT_CLASSES,
  BROADCAST_PADDING_CLASSES,
  getRankColor,
  BROADCAST_DEFAULTS
} from "@/utils/broadcastLayoutUtils";

interface TeamRosterProps {
  animate?: boolean;
}

export default function TeamRoster({ animate = true }: TeamRosterProps) {
  const { id, teamId } = useParams<{ id: string; teamId?: string }>();
  const [currentTeam, setCurrentTeam] = useState<Team | null>(null);
  const [animationPhase, setAnimationPhase] = useState<'intro' | 'roster' | 'complete'>('intro');
  const [shouldAnimate, setShouldAnimate] = useState(true);
  const { settings } = useBroadcastSettings();
  
  // Use broadcast data hook with ATLAS weights
  const { tournament, teams, loading } = useBroadcastData(id);

  const rankStyles: Record<string, { emoji: string; color: string }> = {
    iron: { emoji: "⬛", color: "#4A4A4A" },
    bronze: { emoji: "🟫", color: "#A97142" },
    silver: { emoji: "⬜", color: "#C0C0C0" },
    gold: { emoji: "🟨", color: "#FFD700" },
    platinum: { emoji: "🟦", color: "#5CA3E4" },
    diamond: { emoji: "🟪", color: "#8d64e2" },
    ascendant: { emoji: "🟩", color: "#84FF6F" },
    immortal: { emoji: "🟥", color: "#A52834" },
    radiant: { emoji: "✨", color: "#FFF176" },
    unranked: { emoji: "❓", color: "#9CA3AF" }
  };

  const formatRank = (rank?: string) => {
    if (!rank) return rankStyles.unranked;
    const rankLower = rank.toLowerCase();
    for (const key in rankStyles) {
      if (rankLower.includes(key)) return rankStyles[key];
    }
    return rankStyles.unranked;
  };

  useEffect(() => {
    if (!teams.length) return;

    // Set current team immediately
    const selectedTeam = teamId ? teams.find(t => t.id === teamId) : teams[0];
    setCurrentTeam(selectedTeam || null);

    // Check animation settings - URL parameter overrides stored settings
    const urlParams = new URLSearchParams(window.location.search);
    const animateParam = urlParams.get('animate');
    const shouldAnimateFromUrl = animateParam !== null ? animateParam !== 'false' : null;
    const animationEnabled = shouldAnimateFromUrl !== null ? shouldAnimateFromUrl : (settings.animationEnabled && animate);
    setShouldAnimate(animationEnabled);

    if (animationEnabled) {
      setAnimationPhase('intro');
      setTimeout(() => setAnimationPhase('roster'), 2000);
      setTimeout(() => setAnimationPhase('complete'), 4000);
    } else {
      // Skip directly to complete phase when animations disabled
      setAnimationPhase('complete');
    }
  }, [teamId, teams, settings.animationEnabled, animate]);

  // Show loading only when actually loading data, not when team is temporarily null
  if (loading) {
    return <BroadcastLoading message="Loading team roster..." />;
  }

  // If no team found, show error instead of loading
  if (!currentTeam) {
    return (
      <div className={`${BROADCAST_CONTAINER_CLASSES} flex items-center justify-center`} style={getBroadcastContainerStyle(settings.sceneSettings.teamRoster, settings)}>
        <div className="text-center">
          <div className="text-2xl font-bold text-red-400 mb-2">Team Not Found</div>
          <div className="text-white/70">The requested team could not be loaded.</div>
        </div>
      </div>
    );
  }

  const sceneSettings = settings.sceneSettings.teamRoster;
  const containerStyle = getBroadcastContainerStyle(sceneSettings, settings);

  const renderRank = (rank?: string) => {
    const { emoji, color } = formatRank(rank);
    return (
      <span
        className="flex items-center space-x-1 px-2 py-1 rounded-lg font-medium"
        style={{ backgroundColor: color + "30", color }}
      >
        <span>{emoji}</span>
        <span>{rank}</span>
      </span>
    );
  };

  return (
    <div className={BROADCAST_CONTAINER_CLASSES} style={containerStyle}>
      {/* Team Name Intro */}
      <div 
        className={`absolute inset-0 flex items-center justify-center transition-all duration-1000 ${
          shouldAnimate && animationPhase === 'intro' ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
        }`}
        style={{ display: shouldAnimate && animationPhase === 'intro' ? 'flex' : 'none' }}
      >
        <div className="text-center">
          <div 
            className="font-bold mb-4 animate-fade-in" 
            style={getBroadcastHeaderStyle(sceneSettings, settings, 'xl')}
          >
            {currentTeam.name}
          </div>
          <div 
            className="text-2xl" 
            style={getBroadcastTextStyle(sceneSettings, settings, '80')}
          >
            Team Roster
          </div>
        </div>
      </div>

      {/* Team Roster */}
      <div 
        className={`absolute inset-0 flex flex-col items-center justify-center transition-all duration-1000 ${
          !shouldAnimate || animationPhase === 'roster' || animationPhase === 'complete' ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
        }`}
      >
        <div 
          className="text-4xl font-bold mb-8 text-center" 
          style={getBroadcastHeaderStyle(sceneSettings, settings, 'large')}
        >
          {currentTeam.name}
        </div>
        
        <div className="space-y-3">
          {currentTeam.team_members
            .sort((a, b) => (b.is_captain ? 1 : 0) - (a.is_captain ? 1 : 0))
            .map((member, index) => {
              const user = member.users;
              if (!user) return null;

              // Use stored ATLAS weight from broadcast data
              const displayWeight = (user as any).display_weight || (user as any).atlas_weight || (user as any).adaptive_weight || 150;

              return (
                <div key={member.user_id} className="space-y-3">
                  {/* Player Name Block */}
                  <div 
                    className="px-6 py-4 text-white flex items-center justify-between"
                    style={{ 
                      backgroundColor: sceneSettings.teamAccentColor || BROADCAST_DEFAULTS.primaryColor 
                    }}
                  >
                    <div className="flex items-center gap-4">
                      <span className="text-2xl font-bold">
                        {user.discord_username || 'Unknown Player'}
                      </span>
                      {member.is_captain && (
                        <div className="bg-yellow-400 text-black px-3 py-1 text-sm font-bold">
                          CAPTAIN
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Player Info Horizontal Cards */}
                  <div className="grid grid-cols-4 gap-3">
                    {/* Avatar Card */}
                    <div className="bg-black/60 p-4 flex flex-col items-center">
                      <div className="w-16 h-16 bg-gray-600 mb-2">
                        <img
                          src={user.discord_avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.discord_username}`}
                          alt={user.discord_username}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="text-white text-sm text-center">Avatar</div>
                    </div>

                    {/* Rank Card */}
                    {sceneSettings.showCurrentRank && user.current_rank && (
                      <div className="bg-black/60 p-4 flex flex-col items-center">
                        <div 
                          className="w-16 h-16 flex items-center justify-center text-2xl mb-2"
                          style={{ backgroundColor: getRankColor(user.current_rank) }}
                        >
                          {formatRank(user.current_rank).emoji}
                        </div>
                        <div className="text-white text-sm text-center">{user.current_rank}</div>
                      </div>
                    )}

                    {/* Weight Card */}
                    {sceneSettings.showAdaptiveWeight && (
                      <div className="bg-black/60 p-4 flex flex-col items-center">
                        <div className="w-16 h-16 bg-blue-600 flex items-center justify-center text-xl font-bold text-white mb-2">
                          {displayWeight}
                        </div>
                        <div className="text-white text-sm text-center">Weight</div>
                      </div>
                    )}

                    {/* Riot ID Card */}
                    {sceneSettings.showRiotId && user.riot_id && (
                      <div className="bg-black/60 p-4 flex flex-col items-center">
                        <div className="w-16 h-16 bg-red-600 flex items-center justify-center text-white mb-2 text-xs text-center font-bold">
                          RIOT
                        </div>
                        <div className="text-white text-sm text-center truncate w-full">{user.riot_id}</div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
        </div>

        {/* Team Stats Section - Toggleable */}
        {(sceneSettings.showTeamTotalWeight || sceneSettings.showTeamSeed) && (
          <div 
            className="mt-8 backdrop-blur-md border shadow-xl" 
            style={getBroadcastCardStyle(sceneSettings)}
          >
            <div className="flex justify-center gap-16">
              {sceneSettings.showTeamTotalWeight && (
                <div className="text-center">
                  <div 
                    className="text-3xl font-extrabold" 
                    style={getBroadcastHeaderStyle(sceneSettings, settings, 'medium')}
                  >
                      {currentTeam.team_members.reduce((total, member) => {
                        const weight = (member.users as any)?.display_weight || (member.users as any)?.atlas_weight || (member.users as any)?.adaptive_weight || 150;
                        return total + weight;
                      }, 0)}
                  </div>
                  <div 
                    className="text-sm uppercase tracking-wider" 
                    style={getBroadcastTextStyle(sceneSettings, settings, '80')}
                  >
                    Total Weight
                  </div>
                </div>
              )}
              {sceneSettings.showTeamSeed && (
                <div className="text-center">
                  <div 
                    className="text-3xl font-extrabold" 
                    style={getBroadcastHeaderStyle(sceneSettings, settings, 'medium')}
                  >
                     #{(currentTeam as any).calculatedSeed || currentTeam.seed || 'TBD'}
                  </div>
                  <div 
                    className="text-sm uppercase tracking-wider" 
                    style={getBroadcastTextStyle(sceneSettings, settings, '80')}
                  >
                    Seed
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}