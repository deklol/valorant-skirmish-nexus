import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useBroadcastData } from "@/hooks/useBroadcastData";
import type { Tournament } from "@/types/tournament";
import type { Team as BroadcastTeam } from "@/types/tournamentDetail";
import { useBroadcastSettings } from "@/hooks/useBroadcastSettings";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Users, Trophy, Crown } from "lucide-react";
import { formatSeedDisplay } from "@/utils/broadcastSeedingUtils";
import { BroadcastLoading } from "@/components/broadcast/BroadcastLoading";
import { 
  getBroadcastContainerStyle, 
  getBroadcastHeaderStyle, 
  getBroadcastTextStyle,
  getBroadcastCardStyle,
  getBroadcastCardClasses,
  BROADCAST_CONTAINER_CLASSES,
  getRankColor,
  BROADCAST_DEFAULTS
} from "@/utils/broadcastLayoutUtils";

interface Team extends BroadcastTeam {
  status?: 'active' | 'eliminated';
  eliminated_round?: number;
  calculatedSeed?: number;
}

export default function TeamsOverview() {
  const { id } = useParams<{ id: string }>();
  const [teams, setTeams] = useState<Team[]>([]);
  const { settings } = useBroadcastSettings();
  
  // Use broadcast data hook with proper ATLAS weights
  const { tournament, teams: broadcastTeams, loading } = useBroadcastData(id);

  useEffect(() => {
    if (!broadcastTeams.length) return;

    const fetchMatchData = async () => {
      // Fetch matches to determine eliminated teams
      const { data: matchesData } = await supabase
        .from('matches')
        .select(`
          *,
          winner:teams!matches_winner_id_fkey (id, name)
        `)
        .eq('tournament_id', id)
        .eq('status', 'completed');

      // Determine which teams are eliminated using broadcast teams data
      const teamsWithStatus = broadcastTeams.map(team => {
        const lostMatch = matchesData?.find(match => 
          (match.team1_id === team.id || match.team2_id === team.id) && 
          match.winner?.id !== team.id
        );

        return {
          ...team,
          status: lostMatch ? 'eliminated' as const : 'active' as const,
          eliminated_round: lostMatch?.round_number
        } as Team;
      });

      setTeams(teamsWithStatus);
    };

    fetchMatchData();
  }, [broadcastTeams, id]);

  if (loading || !tournament) {
    return <BroadcastLoading message="Loading teams overview..." />;
  }

  const sceneSettings = settings.sceneSettings.teamsOverview;
  const containerStyle = getBroadcastContainerStyle(sceneSettings, settings);
  const cardStyle = getBroadcastCardStyle(sceneSettings, settings);
  const cardClasses = getBroadcastCardClasses(sceneSettings.broadcastFriendlyMode);

  const activeTeams = teams.filter(team => team.status === 'active');
  const eliminatedTeams = teams.filter(team => team.status === 'eliminated');

  const getDisplayWeight = (member: Team['team_members'][0]) => {
    // Use enhanced user data from broadcast hook
    const enhancedUser = member.users as any;
    return enhancedUser?.display_weight || enhancedUser?.atlas_weight || enhancedUser?.adaptive_weight || 150;
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
      className={`${cardClasses} ${sceneSettings.broadcastFriendlyMode ? '' : 'rounded-xl'} overflow-hidden transition-all duration-300 ${
        isEliminated ? 'opacity-50 grayscale' : 'opacity-100'
      }`}
      style={{ 
        ...cardStyle,
        backgroundColor: isEliminated && !sceneSettings.broadcastFriendlyMode 
          ? 'rgba(239, 68, 68, 0.1)' 
          : isEliminated 
            ? '#dc2626'
            : cardStyle.backgroundColor,
      }}
    >
      {/* Team Header */}
      <div className="p-4 border-b border-white/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div 
              className="text-2xl font-bold"
              style={{ 
                color: sceneSettings.headerTextColor || settings.headerTextColor,
                fontFamily: sceneSettings.fontFamily || 'inherit',
                fontSize: '28px'
              }}
            >
              {team.name}
            </div>
            {isEliminated && sceneSettings.showTeamStatusBadges && (
              <Badge variant="outline" className="text-xs">
                Eliminated R{team.eliminated_round}
              </Badge>
            )}
          </div>
            {sceneSettings.showMemberCount && (
              <div className="flex items-center space-x-2">
                <Users className="w-4 h-4" style={{ color: sceneSettings.textColor || settings.textColor }} />
                <span 
                  className="text-lg font-medium"
                  style={{ 
                    color: sceneSettings.textColor || settings.textColor,
                    fontFamily: sceneSettings.fontFamily || 'inherit',
                    fontSize: '18px'
                  }}
                >
                  {team.team_members.length}
                </span>
              </div>
            )}
        </div>
        <div 
          className="text-lg mt-2 font-medium"
          style={{ 
            color: (sceneSettings.textColor || settings.textColor) + '90',
            fontFamily: sceneSettings.fontFamily || 'inherit',
            fontSize: '16px'
          }}
        >
          {formatSeedDisplay((team as any).calculatedSeed || 1)} • Avg Weight: {getTeamAverageWeight(team)}
        </div>
      </div>

      {/* Team Members */}
      <div className="p-6 space-y-4">
        {team.team_members.map((member) => (
          <div key={member.user_id} className="flex items-center space-x-4">
            <Avatar className={`w-12 h-12 ${sceneSettings.broadcastFriendlyMode ? 'rounded-none' : ''}`}>
              <AvatarImage 
                src={member.users.discord_avatar_url || undefined} 
                alt={member.users.discord_username}
                className={sceneSettings.broadcastFriendlyMode ? 'rounded-none' : ''}
              />
              <AvatarFallback className={`bg-slate-700 text-white text-sm ${sceneSettings.broadcastFriendlyMode ? 'rounded-none' : ''}`}>
                {member.users.discord_username?.slice(0, 2).toUpperCase() || '??'}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-3">
                <span 
                  className="text-lg font-semibold truncate"
                  style={{ 
                    color: sceneSettings.textColor || settings.textColor,
                    fontFamily: sceneSettings.fontFamily || 'inherit',
                    fontSize: '18px'
                  }}
                >
                  {member.users.discord_username}
                </span>
                {member.is_captain && (
                  <Crown className="w-5 h-5" style={{ color: sceneSettings.headerTextColor || settings.headerTextColor }} />
                )}
              </div>
              
              <div className="flex items-center space-x-3 mt-2">
                {sceneSettings.showCurrentRank && member.users.current_rank && (
                  <Badge 
                    variant="outline" 
                    className={`text-sm px-3 py-1 ${sceneSettings.broadcastFriendlyMode ? 'rounded-none border-2' : ''}`}
                    style={{ 
                      borderColor: getRankColor(member.users.current_rank) + (sceneSettings.broadcastFriendlyMode ? '' : '50'),
                      color: getRankColor(member.users.current_rank),
                      fontSize: '14px',
                      backgroundColor: sceneSettings.broadcastFriendlyMode ? getRankColor(member.users.current_rank) + '20' : 'transparent'
                    }}
                  >
                    {member.users.current_rank}
                  </Badge>
                )}
                
                {sceneSettings.showAdaptiveWeight && (
                  <span 
                    className="text-sm font-medium"
                    style={{ 
                      color: (sceneSettings.textColor || settings.textColor) + '90',
                      fontFamily: sceneSettings.fontFamily || 'inherit',
                      fontSize: '14px'
                    }}
                  >
                    {getDisplayWeight(member)} pts
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
    <div className={BROADCAST_CONTAINER_CLASSES + " overflow-y-auto p-8"} style={containerStyle}>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 
            className="font-bold mb-4"
            style={getBroadcastHeaderStyle(sceneSettings, settings, 'xl')}
          >
            {tournament.name}
          </h1>
          <div 
            className="text-3xl font-medium"
            style={getBroadcastTextStyle(sceneSettings, settings, '80')}
          >
            Teams Overview
          </div>
        </div>

        {/* Active Teams */}
        {sceneSettings.showActiveEliminated && activeTeams.length > 0 && (
          <div className="mb-8">
            <div 
              className="text-4xl font-bold mb-6 flex items-center space-x-3"
              style={{ 
                color: sceneSettings.headerTextColor || settings.headerTextColor,
                fontFamily: sceneSettings.fontFamily || 'inherit',
                fontSize: '36px'
              }}
            >
              <Trophy className="w-8 h-8" style={{ color: '#10B981' }} />
              <span>Active Teams ({activeTeams.length})</span>
            </div>
            <div 
              className={`grid grid-cols-${sceneSettings.gridColumns || 2} gap-6`}
            >
              {activeTeams.map((team) => (
                <TeamCard key={team.id} team={team} />
              ))}
            </div>
          </div>
        )}

        {/* Eliminated Teams */}
        {sceneSettings.showActiveEliminated && eliminatedTeams.length > 0 && (
          <div>
            <div 
              className="text-4xl font-bold mb-6 flex items-center space-x-3"
              style={{ 
                color: sceneSettings.headerTextColor || settings.headerTextColor,
                fontFamily: sceneSettings.fontFamily || 'inherit',
                fontSize: '36px'
              }}
            >
              <Users className="w-8 h-8" style={{ color: '#6B7280' }} />
              <span>Eliminated Teams ({eliminatedTeams.length})</span>
            </div>
            <div 
              className={`grid grid-cols-${sceneSettings.gridColumns || 2} gap-6`}
            >
              {eliminatedTeams.map((team) => (
                <TeamCard key={team.id} team={team} isEliminated />
              ))}
            </div>
          </div>
        )}

        {/* Tournament Status */}
        {sceneSettings.showTournamentStatus && (
          <div className="mt-8 text-center">
          <div 
            className={`inline-block px-6 py-3 ${sceneSettings.broadcastFriendlyMode ? 'rounded-none border-4' : 'rounded-full border'} font-bold text-lg ${
              tournament.status === 'live' 
                ? 'bg-red-500/20 text-red-400 border-red-500/30' 
                : tournament.status === 'completed' 
                  ? 'bg-green-500/20 text-green-400 border-green-500/30'
                  : 'bg-blue-500/20 text-blue-400 border-blue-500/30'
            }`}
          >
            {tournament.status === 'live' && '🔴 LIVE'}
            {tournament.status === 'completed' && '✅ COMPLETED'}
            {tournament.status === 'open' && '📝 REGISTRATION OPEN'}
            {tournament.status === 'balancing' && '✋ TEAM BALANCING'}
            {tournament.status === 'draft' && '📋 DRAFT'}
          </div>
          </div>
        )}
      </div>
    </div>
  );
}