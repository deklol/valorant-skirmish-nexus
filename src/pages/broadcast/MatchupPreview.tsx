import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Team } from "@/types/tournamentDetail";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Swords } from "lucide-react";
import { useBroadcastSettings } from "@/hooks/useBroadcastSettings";

export default function MatchupPreview() {
  const { id, team1Id, team2Id } = useParams<{ id: string; team1Id: string; team2Id: string }>();
  const [team1, setTeam1] = useState<Team | null>(null);
  const [team2, setTeam2] = useState<Team | null>(null);
  const [loading, setLoading] = useState(true);
  const { settings } = useBroadcastSettings();

  useEffect(() => {
    if (!id || !team1Id || !team2Id) return;

    const fetchMatchupData = async () => {
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
              peak_rank
            )
          )
        `)
        .in('id', [team1Id, team2Id]);

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
          // PRIORITY FIX: Use ATLAS adaptive weight when available
          const displayWeight = adaptiveWeight?.calculated_adaptive_weight || member.users?.weight_rating || 150;
          return {
            ...member,
            users: {
              ...member.users,
              adaptive_weight: displayWeight,
              atlas_weight: adaptiveWeight?.calculated_adaptive_weight,
              weight_source: adaptiveWeight?.weight_source || 'standard',
              display_weight: displayWeight
            }
          };
        })
      }));

      setTeam1(enhancedTeams.find(t => t.id === team1Id) || null);
      setTeam2(enhancedTeams.find(t => t.id === team2Id) || null);
      setLoading(false);
    };

    fetchMatchupData();
  }, [id, team1Id, team2Id]);

  if (loading || !team1 || !team2) {
    return (
      <div className="w-screen h-screen bg-transparent flex items-center justify-center">
        <div className="text-white text-2xl">Loading matchup...</div>
      </div>
    );
  }

  const getTeamAverageWeight = (team: Team) => {
    const weights = team.team_members
      .map(m => (m.users as any)?.display_weight || (m.users as any)?.adaptive_weight || m.users?.weight_rating || 150)
      .filter(Boolean);
    return weights.length > 0 ? Math.round(weights.reduce((a, b) => a + b, 0) / weights.length) : 150;
  };

  const team1Avg = getTeamAverageWeight(team1);
  const team2Avg = getTeamAverageWeight(team2);
  const weightDiff = Math.abs(team1Avg - team2Avg);

  const getRankColor = (rank?: string) => {
    if (!rank) return 'text-slate-400';
    const rankLower = rank.toLowerCase();
    if (rankLower.includes('radiant')) return 'text-yellow-400';
    if (rankLower.includes('immortal')) return 'text-purple-400';
    if (rankLower.includes('ascendant')) return 'text-green-400';
    if (rankLower.includes('diamond')) return 'text-blue-400';
    return 'text-slate-400';
  };

  const sceneSettings = settings.sceneSettings.matchupPreview;

  const containerStyle = {
    backgroundColor: sceneSettings.backgroundColor || settings.backgroundColor,
    backgroundImage: sceneSettings.backgroundImage || settings.backgroundImage ? `url(${sceneSettings.backgroundImage || settings.backgroundImage})` : undefined,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    fontFamily: sceneSettings.fontFamily || settings.fontFamily || 'inherit',
  };

  return (
    <div className="w-screen h-screen bg-transparent flex items-center justify-center p-8" style={containerStyle}>
      <div className="max-w-7xl w-full">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="text-5xl font-bold mb-4 flex items-center justify-center space-x-4" style={{ 
            color: sceneSettings.headerTextColor || settings.headerTextColor,
            fontFamily: sceneSettings.fontFamily || settings.fontFamily || 'inherit'
          }}>
            <span>{team1.name}</span>
            <Swords className="w-12 h-12 text-red-500" />
            <span>{team2.name}</span>
          </div>
          <div className="text-xl" style={{ 
            color: (sceneSettings.textColor || settings.textColor) + '70',
            fontFamily: sceneSettings.fontFamily || settings.fontFamily || 'inherit'
          }}>Upcoming Match</div>
        </div>

        <div className="grid grid-cols-2 gap-16">
          {/* Team 1 */}
            <div className="space-y-6">
            <div className="text-center">
              <div className="text-3xl font-bold mb-2" style={{ color: settings.textColor }}>{team1.name}</div>
              {sceneSettings.showAdaptiveWeight && (
                <div className="text-cyan-400 text-lg">Avg Weight: {team1Avg}</div>
              )}
            </div>
            
            <div className="space-y-4">
              {team1.team_members
                .sort((a, b) => (b.is_captain ? 1 : 0) - (a.is_captain ? 1 : 0))
                .map((member) => (
                <div key={member.user_id} className="flex items-center space-x-4 bg-black/20 backdrop-blur-sm rounded-lg p-4 border border-white/10">
                  <Avatar className="w-12 h-12">
                    <AvatarImage src={member.users?.discord_avatar_url || undefined} />
                    <AvatarFallback className="bg-slate-700 text-white">
                      {member.users?.discord_username?.slice(0, 2).toUpperCase() || '??'}
                    </AvatarFallback>
                  </Avatar>
                  
                   <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-medium" style={{ color: settings.textColor }}>
                        {member.users?.discord_username || 'Unknown'}
                      </span>
                      {member.is_captain && (
                        <Badge variant="outline" className="border-yellow-400 text-yellow-400 text-xs">
                          C
                        </Badge>
                      )}
                    </div>
                    
                    <div className="flex items-center space-x-3 text-sm">
                      {sceneSettings.showCurrentRank && member.users?.current_rank && (
                        <span className={getRankColor(member.users.current_rank)}>
                          {member.users.current_rank}
                        </span>
                      )}
                      {sceneSettings.showAdaptiveWeight && ((member.users as any)?.display_weight || (member.users as any)?.adaptive_weight) && (
                        <span className="text-cyan-400">
                          {(member.users as any)?.display_weight || (member.users as any)?.adaptive_weight}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Team 2 */}
          <div className="space-y-6">
            <div className="text-center">
              <div className="text-3xl font-bold mb-2" style={{ color: settings.textColor }}>{team2.name}</div>
              {sceneSettings.showAdaptiveWeight && (
                <div className="text-cyan-400 text-lg">Avg Weight: {team2Avg}</div>
              )}
            </div>
            
            <div className="space-y-4">
              {team2.team_members
                .sort((a, b) => (b.is_captain ? 1 : 0) - (a.is_captain ? 1 : 0))
                .map((member) => (
                <div key={member.user_id} className="flex items-center space-x-4 bg-black/20 backdrop-blur-sm rounded-lg p-4 border border-white/10">
                  <Avatar className="w-12 h-12">
                    <AvatarImage src={member.users?.discord_avatar_url || undefined} />
                    <AvatarFallback className="bg-slate-700 text-white">
                      {member.users?.discord_username?.slice(0, 2).toUpperCase() || '??'}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-medium" style={{ color: settings.textColor }}>
                        {member.users?.discord_username || 'Unknown'}
                      </span>
                      {member.is_captain && (
                        <Badge variant="outline" className="border-yellow-400 text-yellow-400 text-xs">
                          C
                        </Badge>
                      )}
                    </div>
                    
                    <div className="flex items-center space-x-3 text-sm">
                      {sceneSettings.showCurrentRank && member.users?.current_rank && (
                        <span className={getRankColor(member.users.current_rank)}>
                          {member.users.current_rank}
                        </span>
                      )}
                      {sceneSettings.showAdaptiveWeight && ((member.users as any)?.display_weight || (member.users as any)?.adaptive_weight) && (
                        <span className="text-cyan-400">
                          {(member.users as any)?.display_weight || (member.users as any)?.adaptive_weight}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Stats Comparison */}
        {sceneSettings.showAdaptiveWeight && (
          <div className="mt-12 text-center">
            <div className="bg-black/30 backdrop-blur-sm rounded-xl p-6 border border-white/10 inline-block">
              <div className="mb-2" style={{ color: settings.textColor + '70' }}>Weight Difference</div>
              <div className={`text-2xl font-bold ${weightDiff < 10 ? 'text-green-400' : weightDiff < 25 ? 'text-yellow-400' : 'text-red-400'}`}>
                {weightDiff} points
              </div>
              <div className="text-sm mt-1" style={{ color: settings.textColor + '50' }}>
                {weightDiff < 10 ? 'Very Balanced' : weightDiff < 25 ? 'Balanced' : 'Favored Match'}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}