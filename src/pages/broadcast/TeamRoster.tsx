import { useBroadcastData } from "@/hooks/useBroadcastData";
import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import type { Team } from "@/types/tournamentDetail";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useBroadcastSettings } from "@/hooks/useBroadcastSettings";

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

    // Set current team and handle animations
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
      setAnimationPhase('complete');
    }
  }, [teamId, teams, settings.animationEnabled, animate]);

  if (loading || !currentTeam) {
    return (
      <div className="w-screen h-screen bg-transparent flex items-center justify-center">
        <div className="text-white text-2xl">Loading...</div>
      </div>
    );
  }

  const sceneSettings = settings.sceneSettings.teamRoster;
  const containerStyle = {
    backgroundColor: sceneSettings.backgroundColor || settings.backgroundColor,
    backgroundImage: sceneSettings.backgroundImage || settings.backgroundImage ? `url(${sceneSettings.backgroundImage || settings.backgroundImage})` : undefined,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    fontFamily: sceneSettings.fontFamily || settings.fontFamily || 'inherit',
    fontSize: `${sceneSettings.fontSize || 16}px`,
  };

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
    <div className="w-screen h-screen bg-transparent overflow-hidden" style={containerStyle}>
      {/* Team Name Intro */}
      <div 
        className={`absolute inset-0 flex items-center justify-center transition-all duration-1000 ${
          shouldAnimate && animationPhase === 'intro' ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
        }`}
        style={{ display: shouldAnimate && animationPhase === 'intro' ? 'flex' : 'none' }}
      >
        <div className="text-center">
          <div className="text-6xl font-bold mb-4 animate-fade-in" style={{ 
            color: sceneSettings.headerTextColor || settings.headerTextColor,
            fontSize: `${(sceneSettings.headerFontSize || 48) * 1.25}px`,
            fontFamily: sceneSettings.fontFamily || 'inherit'
          }}>
            {currentTeam.name}
          </div>
          <div className="text-2xl" style={{ 
            color: (sceneSettings.textColor || settings.textColor) + '80',
            fontFamily: sceneSettings.fontFamily || 'inherit'
          }}>
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
        <div className="text-4xl font-bold mb-8 text-center" style={{ 
          color: sceneSettings.headerTextColor || settings.headerTextColor,
          fontSize: `${sceneSettings.headerFontSize || 36}px`,
          fontFamily: sceneSettings.fontFamily || settings.fontFamily || 'inherit'
        }}>
          {currentTeam.name}
        </div>
        
        <div className="grid grid-cols-1 gap-6 max-w-2xl">
          {currentTeam.team_members
            .sort((a, b) => (b.is_captain ? 1 : 0) - (a.is_captain ? 1 : 0))
            .map((member, index) => {
              const user = member.users;
              if (!user) return null;

              // Use stored ATLAS weight from broadcast data
              const displayWeight = (user as any).display_weight || (user as any).atlas_weight || (user as any).adaptive_weight || 150;

              return (
                <div
                  key={member.user_id}
                  className={`flex items-center space-x-6 bg-black/40 backdrop-blur-md rounded-2xl border border-white/10 shadow-lg transition-all duration-500 ${
                    !shouldAnimate || animationPhase === 'complete' ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-8'
                  }`}
                  style={{ 
                    transitionDelay: shouldAnimate ? `${index * 200}ms` : '0ms',
                    borderRadius: `${sceneSettings.borderRadius || 16}px`,
                    borderWidth: `${sceneSettings.borderWidth || 1}px`,
                    borderColor: sceneSettings.borderColor || '#ffffff10',
                    padding: `${sceneSettings.padding || 20}px`,
                    gap: `${sceneSettings.spacing || 24}px`,
                    fontFamily: sceneSettings.fontFamily || 'inherit',
                    boxShadow: `0 ${sceneSettings.shadowIntensity || 3}px ${(sceneSettings.shadowIntensity || 3) * 3}px rgba(0,0,0,0.3)`
                  }}
                >
                  <Avatar className="w-16 h-16 border-2 border-white/20 shadow-md">
                    <AvatarImage 
                      src={user.discord_avatar_url || undefined} 
                      alt={user.discord_username}
                    />
                    <AvatarFallback className="bg-slate-700 text-white text-lg">
                      {user.discord_username?.slice(0, 2).toUpperCase() || '??'}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1">
                    {/* Username + Captain */}
                    <div className="flex items-center space-x-3 mb-1">
                      <span className="text-xl font-bold tracking-wide" style={{ 
                        color: sceneSettings.textColor || settings.textColor,
                        fontSize: `${(sceneSettings.fontSize || 16) * 1.25}px`,
                        fontWeight: sceneSettings.fontWeight || 'bold',
                        fontFamily: sceneSettings.fontFamily || settings.fontFamily || 'inherit'
                      }}>
                        {user.discord_username || 'Unknown Player'}
                      </span>
                      {member.is_captain && (
                        <Badge variant="outline" className="border-yellow-400 text-yellow-400 text-sm">
                          CAPTAIN
                        </Badge>
                      )}
                    </div>

                    {/* Game Info Row */}
                    <div className="flex flex-wrap items-center gap-3 text-sm mt-1">
                      {sceneSettings.showRiotId && user.riot_id && (
                        <span className="opacity-70">{user.riot_id}</span>
                      )}
                      {sceneSettings.showCurrentRank && user.current_rank && renderRank(user.current_rank)}
                      {sceneSettings.showPeakRank && user.peak_rank && (
                        <span className="opacity-70">⭐ Peak: {user.peak_rank}</span>
                      )}
                      {sceneSettings.showAdaptiveWeight && (
                        <Badge variant="outline" className="text-white border-white/30">
                          {displayWeight} pts
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
        </div>

        {/* Team Stats Section - Toggleable */}
        {(sceneSettings.showTeamTotalWeight || sceneSettings.showTeamSeed) && (
          <div className="mt-8 bg-black/50 backdrop-blur-md rounded-2xl border border-white/10 shadow-xl" style={{
            borderRadius: `${sceneSettings.borderRadius || 16}px`,
            padding: `${(sceneSettings.padding || 16) * 1.5}px ${(sceneSettings.padding || 16) * 2.5}px`,
            boxShadow: `0 ${(sceneSettings.shadowIntensity || 3) * 2}px ${(sceneSettings.shadowIntensity || 3) * 6}px rgba(0,0,0,0.4)`
          }}>
            <div className="flex justify-center gap-16">
              {sceneSettings.showTeamTotalWeight && (
                <div className="text-center">
                  <div className="text-3xl font-extrabold" style={{ 
                    color: sceneSettings.headerTextColor || settings.headerTextColor,
                    fontSize: `${(sceneSettings.headerFontSize || 24) * 1.25}px`,
                    fontFamily: sceneSettings.fontFamily || 'inherit'
                  }}>
                      {currentTeam.team_members.reduce((total, member) => {
                        const weight = (member.users as any)?.display_weight || (member.users as any)?.atlas_weight || (member.users as any)?.adaptive_weight || 150;
                        return total + weight;
                      }, 0)}
                  </div>
                  <div className="text-sm uppercase tracking-wider" style={{ 
                    color: (sceneSettings.textColor || settings.textColor) + '80',
                    fontFamily: sceneSettings.fontFamily || 'inherit'
                  }}>Total Weight</div>
                </div>
              )}
              {sceneSettings.showTeamSeed && (
                <div className="text-center">
                  <div className="text-3xl font-extrabold" style={{ 
                    color: sceneSettings.headerTextColor || settings.headerTextColor,
                    fontSize: `${(sceneSettings.headerFontSize || 24) * 1.25}px`,
                    fontFamily: sceneSettings.fontFamily || 'inherit'
                  }}>
                    #{currentTeam.seed || 'TBD'}
                  </div>
                  <div className="text-sm uppercase tracking-wider" style={{ 
                    color: (sceneSettings.textColor || settings.textColor) + '80',
                    fontFamily: sceneSettings.fontFamily || 'inherit'
                  }}>Seed</div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}