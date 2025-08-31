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

      // Get adaptive weights
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

      // Animation sequence
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

  const sceneSettings = settings.sceneSettings.teamRoster;

  const containerStyle = {
    backgroundColor: settings.backgroundColor === 'transparent' ? 'transparent' : settings.backgroundColor,
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
              className={`flex items-center space-x-6 bg-black/30 backdrop-blur-sm rounded-xl p-6 border border-white/10 transition-all duration-500 ${
                animationPhase === 'complete' ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-8'
              }`}
              style={{ 
                transitionDelay: `${index * 200}ms`,
                animationDelay: `${index * 200}ms`
              }}
            >
              <Avatar className="w-16 h-16 border-2 border-white/20">
                <AvatarImage 
                  src={member.users?.discord_avatar_url || undefined} 
                  alt={member.users?.discord_username}
                />
                <AvatarFallback className="bg-slate-700 text-white text-lg">
                  {member.users?.discord_username?.slice(0, 2).toUpperCase() || '??'}
                </AvatarFallback>
              </Avatar>
              
              <div className="flex-1">
                <div className="flex items-center space-x-3 mb-2">
                  <span className="text-2xl font-semibold" style={{ color: settings.textColor }}>
                    {member.users?.discord_username || 'Unknown Player'}
                  </span>
                  {member.is_captain && (
                    <Badge variant="outline" className="border-yellow-400 text-yellow-400 text-sm">
                      CAPTAIN
                    </Badge>
                  )}
                </div>
                
                <div className="flex items-center space-x-4 text-sm">
                  {sceneSettings.showRiotId && member.users?.riot_id && (
                    <span style={{ color: settings.textColor + '80' }}>
                      {member.users.riot_id}
                    </span>
                  )}
                  
                  {sceneSettings.showCurrentRank && member.users?.current_rank && (
                    <span className={`font-medium ${getRankColor(member.users.current_rank)}`}>
                      {member.users.current_rank}
                    </span>
                  )}
                  
                  {sceneSettings.showPeakRank && member.users?.peak_rank && (
                    <span className={`font-medium ${getRankColor(member.users.peak_rank)}`} style={{ opacity: 0.7 }}>
                      Peak: {member.users.peak_rank}
                    </span>
                  )}
                  
                  {sceneSettings.showAdaptiveWeight && (member.users as any)?.adaptive_weight && (
                    <span className="text-cyan-400">
                      {(member.users as any).adaptive_weight} AWR
                    </span>
                  )}
                  
                  {sceneSettings.showTournamentWins && (member.users as any)?.tournaments_won && (
                    <span className="text-green-400">
                      {(member.users as any).tournaments_won}W
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Team Stats */}
        <div className={`mt-8 bg-black/40 backdrop-blur-sm rounded-xl p-6 border border-white/20 transition-all duration-700 ${
          animationPhase === 'complete' ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
        }`}>
          <div className="flex justify-between items-center" style={{ color: settings.textColor }}>
            <div className="text-center">
              <div className="text-2xl font-bold">{currentTeam.total_rank_points || 0}</div>
              <div className="text-sm" style={{ color: settings.textColor + '80' }}>Total Weight</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">#{currentTeam.seed || 'TBD'}</div>
              <div className="text-sm" style={{ color: settings.textColor + '80' }}>Seed</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}