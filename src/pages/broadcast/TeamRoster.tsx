import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Team } from "@/types/tournamentDetail";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useBroadcastSettings } from "@/hooks/useBroadcastSettings";

interface TeamRosterProps {
  animate?: boolean;
}

export default function TeamRoster({ animate = true }: TeamRosterProps) {
  const { id, teamId } = useParams<{ id: string; teamId?: string }>();
  const [teams, setTeams] = useState<Team[]>([]);
  const [currentTeam, setCurrentTeam] = useState<Team | null>(null);
  const [loading, setLoading] = useState(true);
  const [animationPhase, setAnimationPhase] = useState<'intro' | 'roster' | 'complete'>('intro');
  const { settings } = useBroadcastSettings();

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
    if (!id) return;

    const fetchTeamData = async () => {
      const { data: teamsData, error } = await supabase
        .from('teams')
        .select(`
          *,
          team_members (
            user_id,
            is_captain,
            users (
              discord_username,
              discord_avatar_url,
              current_rank,
              riot_id,
              rank_points,
              weight_rating,
              peak_rank,
              tournaments_won
            )
          )
        `)
        .eq('tournament_id', id)
        .order('seed', { ascending: true });

      if (error || !teamsData) {
        setLoading(false);
        return;
      }

      const { data: adaptiveWeights } = await supabase
        .from('tournament_adaptive_weights')
        .select('*')
        .eq('tournament_id', id);

      const enhancedTeams = teamsData.map(team => ({
        ...team,
        team_members: team.team_members.map(member => {
          const adaptiveWeight = adaptiveWeights?.find(w => w.user_id === member.user_id);
          return {
            ...member,
            users: {
              ...member.users,
              adaptive_weight: adaptiveWeight?.calculated_adaptive_weight,
              peak_rank_points: adaptiveWeight?.peak_rank_points,
            }
          };
        })
      }));

      setTeams(enhancedTeams);

      if (teamId) {
        const team = enhancedTeams.find(t => t.id === teamId);
        setCurrentTeam(team || enhancedTeams[0]);
      } else {
        setCurrentTeam(enhancedTeams[0]);
      }

      setLoading(false);

      if (animate) {
        setTimeout(() => setAnimationPhase('roster'), settings.loadingTime / 2);
        setTimeout(() => setAnimationPhase('complete'), settings.loadingTime);
      } else {
        setAnimationPhase('complete');
      }
    };

    fetchTeamData();
  }, [id, teamId, animate, settings.loadingTime]);

  if (loading || !currentTeam) {
    return (
      <div className="w-screen h-screen bg-transparent flex items-center justify-center">
        <div className="text-white text-2xl">Loading...</div>
      </div>
    );
  }

  const sceneSettings = settings.sceneSettings.teamRoster;
  const containerStyle = {
    backgroundColor: settings.backgroundColor === 'transparent' ? 'transparent' : settings.backgroundColor,
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
          animationPhase === 'intro' ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
        }`}
      >
        <div className="text-center">
          <div className="text-6xl font-bold mb-4 animate-fade-in" style={{ color: settings.headerTextColor }}>
            {currentTeam.name}
          </div>
          <div className="text-2xl" style={{ color: settings.textColor + '80' }}>
            Team Roster
          </div>
        </div>
      </div>

      {/* Team Roster */}
      <div 
        className={`absolute inset-0 flex flex-col items-center justify-center transition-all duration-1000 ${
          animationPhase === 'roster' || animationPhase === 'complete' ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
        }`}
      >
        <div className="text-4xl font-bold mb-8 text-center" style={{ color: settings.headerTextColor }}>
          {currentTeam.name}
        </div>
        
        <div className="grid grid-cols-1 gap-6 max-w-2xl">
          {currentTeam.team_members
            .sort((a, b) => (b.is_captain ? 1 : 0) - (a.is_captain ? 1 : 0))
            .map((member, index) => (
            <div
              key={member.user_id}
              className={`flex items-center space-x-6 bg-black/40 backdrop-blur-md rounded-2xl p-5 border border-white/10 shadow-lg transition-all duration-500 ${
                animationPhase === 'complete' ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-8'
              }`}
              style={{ transitionDelay: `${index * 200}ms` }}
            >
              <Avatar className="w-16 h-16 border-2 border-white/20 shadow-md">
                <AvatarImage 
                  src={member.users?.discord_avatar_url || undefined} 
                  alt={member.users?.discord_username}
                />
                <AvatarFallback className="bg-slate-700 text-white text-lg">
                  {member.users?.discord_username?.slice(0, 2).toUpperCase() || '??'}
                </AvatarFallback>
              </Avatar>
              
              <div className="flex-1">
                {/* Username + Captain */}
                <div className="flex items-center space-x-3 mb-1">
                  <span className="text-xl font-bold tracking-wide" style={{ color: settings.textColor }}>
                    {member.users?.discord_username || 'Unknown Player'}
                  </span>
                  {member.is_captain && (
                    <Badge variant="outline" className="border-yellow-400 text-yellow-400 text-sm">
                      CAPTAIN
                    </Badge>
                  )}
                </div>

                {/* Game Info Row */}
                <div className="flex flex-wrap items-center gap-3 text-sm mt-1">
                  {sceneSettings.showRiotId && member.users?.riot_id && (
                    <span className="opacity-70">{member.users.riot_id}</span>
                  )}
                  {sceneSettings.showCurrentRank && member.users?.current_rank && renderRank(member.users.current_rank)}
                  {sceneSettings.showPeakRank && member.users?.peak_rank && (
                    <span className="opacity-70">{renderRank(member.users.peak_rank).emoji} Peak: {member.users.peak_rank}</span>
                  )}
                  {sceneSettings.showAdaptiveWeight && (member.users as any)?.adaptive_weight && (
                    <span className="text-cyan-400">{(member.users as any).adaptive_weight} AWR</span>
                  )}
                  {sceneSettings.showTournamentWins && (member.users as any)?.tournaments_won && (
                    <span className="text-green-400">{(member.users as any).tournaments_won}W</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Team Stats */}
        <div className={`mt-8 bg-black/50 backdrop-blur-md rounded-2xl px-10 py-6 border border-white/10 shadow-xl flex justify-center gap-16 transition-all duration-700 ${
          animationPhase === 'complete' ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
        }`}>
          <div className="text-center">
            <div className="text-3xl font-extrabold" style={{ color: settings.headerTextColor }}>
              {currentTeam.total_rank_points || 0}
            </div>
            <div className="text-sm uppercase tracking-wider" style={{ color: settings.textColor + '80' }}>Total Weight</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-extrabold" style={{ color: settings.headerTextColor }}>
              #{currentTeam.seed || 'TBD'}
            </div>
            <div className="text-sm uppercase tracking-wider" style={{ color: settings.textColor + '80' }}>Seed</div>
          </div>
        </div>
      </div>
    </div>
  );
}
