import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Tournament } from "@/types/tournament";
import { useBroadcastSettings } from "@/hooks/useBroadcastSettings";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Users, Trophy, Crown } from "lucide-react";

interface Team {
  id: string;
  name: string;
  status?: 'active' | 'eliminated';
  eliminated_round?: number;
  team_members: Array<{
    user_id: string;
    is_captain: boolean;
    users: {
      discord_username: string;
      discord_avatar_url?: string;
      current_rank?: string;
      display_weight?: number;
      atlas_weight?: number;
      adaptive_weight?: number;
    };
  }>;
}

export default function TeamsOverview() {
  const { id } = useParams<{ id: string }>();
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const { settings } = useBroadcastSettings();

  useEffect(() => {
    if (!id) return;

    const fetchTeamsData = async () => {
      // Fetch tournament
      const { data: tournamentData, error: tournamentError } = await supabase
        .from('tournaments')
        .select('*')
        .eq('id', id)
        .single();

      if (tournamentError) {
        setLoading(false);
        return;
      }

      setTournament(tournamentData as Tournament);

      // Fetch teams with members
      const { data: teamsData, error: teamsError } = await supabase
        .from('teams')
        .select(`
          id,
          name,
          team_members (
            user_id,
            is_captain,
            users (
              discord_username,
              discord_avatar_url,
              current_rank
            )
          )
        `)
        .eq('tournament_id', id);

      // Fetch matches to determine eliminated teams
      const { data: matchesData } = await supabase
        .from('matches')
        .select(`
          *,
          winner:teams!matches_winner_id_fkey (id, name)
        `)
        .eq('tournament_id', id)
        .eq('status', 'completed');

      if (!teamsError && teamsData) {
        // Determine which teams are eliminated
        const teamsWithStatus = teamsData.map(team => {
          // Find if team lost any matches
          const lostMatch = matchesData?.find(match => 
            (match.team1_id === team.id || match.team2_id === team.id) && 
            match.winner?.id !== team.id
          );

          return {
            ...team,
            status: lostMatch ? 'eliminated' as const : 'active' as const,
            eliminated_round: lostMatch?.round_number
          };
        });

        setTeams(teamsWithStatus);
      }

      setLoading(false);
    };

    fetchTeamsData();
  }, [id]);

  if (loading || !tournament) {
    return (
      <div className="w-screen h-screen bg-transparent flex items-center justify-center">
        <div className="text-white text-2xl">Loading teams...</div>
      </div>
    );
  }

  const sceneSettings = settings.sceneSettings.teamsOverview;
  const containerStyle = {
    backgroundColor: sceneSettings.backgroundColor || settings.backgroundColor,
    backgroundImage: sceneSettings.backgroundImage || settings.backgroundImage ? `url(${sceneSettings.backgroundImage || settings.backgroundImage})` : undefined,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    fontFamily: sceneSettings.fontFamily || settings.fontFamily || 'inherit',
  };

  const activeTeams = teams.filter(team => team.status === 'active');
  const eliminatedTeams = teams.filter(team => team.status === 'eliminated');

  const getDisplayWeight = (member: Team['team_members'][0]) => {
    return member.users.display_weight || member.users.atlas_weight || member.users.adaptive_weight || 150;
  };

  const getTeamAverageWeight = (team: Team) => {
    const weights = team.team_members.map(member => getDisplayWeight(member));
    return Math.round(weights.reduce((a, b) => a + b, 0) / weights.length);
  };

  const getRankColor = (rank?: string) => {
    if (!rank) return '#9CA3AF';
    const rankLower = rank.toLowerCase();
    if (rankLower.includes('radiant')) return '#FFF176';
    if (rankLower.includes('immortal')) return '#A52834';
    if (rankLower.includes('ascendant')) return '#84FF6F';
    if (rankLower.includes('diamond')) return '#8d64e2';
    if (rankLower.includes('platinum')) return '#5CA3E4';
    if (rankLower.includes('gold')) return '#FFD700';
    return '#9CA3AF';
  };

  const TeamCard = ({ team, isEliminated = false }: { team: Team; isEliminated?: boolean }) => (
    <div 
      className={`backdrop-blur-sm rounded-xl border overflow-hidden transition-all duration-300 ${
        isEliminated ? 'opacity-50 grayscale' : 'opacity-100'
      }`}
      style={{ 
        backgroundColor: 'rgba(0, 0, 0, 0.4)',
        borderColor: sceneSettings.borderColor || '#ffffff20',
        borderRadius: sceneSettings.borderRadius || 12,
        borderWidth: sceneSettings.borderWidth || 1,
      }}
    >
      {/* Team Header */}
      <div className="p-4 border-b border-white/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div 
              className="text-xl font-bold"
              style={{ 
                color: sceneSettings.headerTextColor || settings.headerTextColor,
                fontFamily: sceneSettings.fontFamily || 'inherit'
              }}
            >
              {team.name}
            </div>
            {isEliminated && (
              <Badge variant="outline" className="text-xs">
                Eliminated R{team.eliminated_round}
              </Badge>
            )}
          </div>
          <div className="flex items-center space-x-2">
            <Users className="w-4 h-4" style={{ color: sceneSettings.textColor || settings.textColor }} />
            <span 
              className="text-sm"
              style={{ 
                color: sceneSettings.textColor || settings.textColor,
                fontFamily: sceneSettings.fontFamily || 'inherit'
              }}
            >
              {team.team_members.length}
            </span>
          </div>
        </div>
        <div 
          className="text-sm mt-1"
          style={{ 
            color: (sceneSettings.textColor || settings.textColor) + '70',
            fontFamily: sceneSettings.fontFamily || 'inherit'
          }}
        >
          Avg Weight: {getTeamAverageWeight(team)}
        </div>
      </div>

      {/* Team Members */}
      <div className="p-4 space-y-3">
        {team.team_members.map((member) => (
          <div key={member.user_id} className="flex items-center space-x-3">
            <Avatar className="w-8 h-8">
              <AvatarImage 
                src={member.users.discord_avatar_url || undefined} 
                alt={member.users.discord_username}
              />
              <AvatarFallback className="bg-slate-700 text-white text-xs">
                {member.users.discord_username?.slice(0, 2).toUpperCase() || '??'}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2">
                <span 
                  className="text-sm font-medium truncate"
                  style={{ 
                    color: sceneSettings.textColor || settings.textColor,
                    fontFamily: sceneSettings.fontFamily || 'inherit'
                  }}
                >
                  {member.users.discord_username}
                </span>
                {member.is_captain && (
                  <Crown className="w-3 h-3" style={{ color: sceneSettings.headerTextColor || settings.headerTextColor }} />
                )}
              </div>
              
              <div className="flex items-center space-x-2 mt-1">
                {sceneSettings.showCurrentRank && member.users.current_rank && (
                  <Badge 
                    variant="outline" 
                    className="text-xs px-2 py-0"
                    style={{ 
                      borderColor: getRankColor(member.users.current_rank) + '50',
                      color: getRankColor(member.users.current_rank)
                    }}
                  >
                    {member.users.current_rank}
                  </Badge>
                )}
                
                {sceneSettings.showAdaptiveWeight && (
                  <span 
                    className="text-xs"
                    style={{ 
                      color: (sceneSettings.textColor || settings.textColor) + '70',
                      fontFamily: sceneSettings.fontFamily || 'inherit'
                    }}
                  >
                    {getDisplayWeight(member)}
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="w-screen h-screen bg-transparent overflow-y-auto p-8" style={containerStyle}>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 
            className="text-4xl font-bold mb-2"
            style={{ 
              color: sceneSettings.headerTextColor || settings.headerTextColor,
              fontFamily: sceneSettings.fontFamily || 'inherit',
              fontSize: sceneSettings.headerFontSize || 36
            }}
          >
            {tournament.name}
          </h1>
          <div 
            className="text-xl"
            style={{ 
              color: (sceneSettings.textColor || settings.textColor) + '70',
              fontFamily: sceneSettings.fontFamily || 'inherit'
            }}
          >
            Teams Overview
          </div>
        </div>

        {/* Active Teams */}
        {activeTeams.length > 0 && (
          <div className="mb-8">
            <div 
              className="text-2xl font-bold mb-4 flex items-center space-x-2"
              style={{ 
                color: sceneSettings.headerTextColor || settings.headerTextColor,
                fontFamily: sceneSettings.fontFamily || 'inherit'
              }}
            >
              <Trophy className="w-6 h-6" style={{ color: '#10B981' }} />
              <span>Active Teams ({activeTeams.length})</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {activeTeams.map((team) => (
                <TeamCard key={team.id} team={team} />
              ))}
            </div>
          </div>
        )}

        {/* Eliminated Teams */}
        {eliminatedTeams.length > 0 && (
          <div>
            <div 
              className="text-2xl font-bold mb-4 flex items-center space-x-2"
              style={{ 
                color: sceneSettings.headerTextColor || settings.headerTextColor,
                fontFamily: sceneSettings.fontFamily || 'inherit'
              }}
            >
              <Users className="w-6 h-6" style={{ color: '#6B7280' }} />
              <span>Eliminated Teams ({eliminatedTeams.length})</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {eliminatedTeams.map((team) => (
                <TeamCard key={team.id} team={team} isEliminated />
              ))}
            </div>
          </div>
        )}

        {/* Tournament Status */}
        <div className="mt-8 text-center">
          <div 
            className={`inline-block px-6 py-3 rounded-full font-bold text-lg ${
              tournament.status === 'live' 
                ? 'bg-red-500/20 text-red-400 border border-red-500/30' 
                : tournament.status === 'completed' 
                  ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                  : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
            }`}
          >
            {tournament.status === 'live' && '🔴 LIVE'}
            {tournament.status === 'completed' && '✅ COMPLETED'}
            {tournament.status === 'open' && '📝 REGISTRATION OPEN'}
            {tournament.status === 'balancing' && '✋ TEAM BALANCING'}
            {tournament.status === 'draft' && '📋 DRAFT'}
          </div>
        </div>
      </div>
    </div>
  );
}