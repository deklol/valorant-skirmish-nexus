import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useBroadcastData } from "@/hooks/useBroadcastData";
import type { Tournament } from "@/types/tournament";
import type { Team as BroadcastTeam } from "@/types/tournamentDetail";
import { useBroadcastSettings } from "@/hooks/useBroadcastSettings";
import { Badge } from "@/components/ui/badge";
import { Users, Trophy, Crown, Star } from "lucide-react";
import { BroadcastLoading } from "@/components/broadcast/BroadcastLoading";
import { 
  getBroadcastContainerStyle, 
  getBroadcastHeaderStyle, 
  getBroadcastTextStyle,
  getBroadcastTeamStripStyle,
  getBroadcastBadgeStyle,
  BROADCAST_CONTAINER_CLASSES,
  BROADCAST_DEFAULTS,
  getRankColor
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
  
  const { tournament, teams: broadcastTeams, loading } = useBroadcastData(id);

  useEffect(() => {
    if (!broadcastTeams.length) return;

    const fetchMatchData = async () => {
      const { data: matchesData } = await supabase
        .from('matches')
        .select(`
          *,
          winner:teams!matches_winner_id_fkey (id, name)
        `)
        .eq('tournament_id', id)
        .eq('status', 'completed');

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
  const isBroadcastMode = sceneSettings.broadcastFriendlyMode || sceneSettings.transparentBackground;

  const activeTeams = teams.filter(team => team.status === 'active');
  const eliminatedTeams = teams.filter(team => team.status === 'eliminated');

  const getDisplayWeight = (member: Team['team_members'][0]) => {
    const enhancedUser = member.users as any;
    return enhancedUser?.display_weight || enhancedUser?.atlas_weight || enhancedUser?.adaptive_weight || 150;
  };

  const getTeamAverageWeight = (team: Team) => {
    const weights = team.team_members.map(member => getDisplayWeight(member));
    return Math.round(weights.reduce((a, b) => a + b, 0) / weights.length);
  };

  const TeamBlock = ({ team, isEliminated = false }: { team: Team; isEliminated?: boolean }) => {
    if (!isBroadcastMode) {
      // Legacy mode - keep existing design
      return (
        <div className="backdrop-blur-sm rounded-xl border border-white/20 overflow-hidden bg-black/40 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <h3 className="text-2xl font-bold text-white">{team.name}</h3>
              {isEliminated && (
                <Badge variant="destructive" className="text-xs">
                  Eliminated R{team.eliminated_round}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-4 text-sm text-gray-300">
              <div className="flex items-center gap-1">
                <Trophy className="w-4 h-4" />
                <span>Seed #{(team as any).calculatedSeed || 'TBD'}</span>
              </div>
              <div className="flex items-center gap-1">
                <Users className="w-4 h-4" />
                <span>Avg: {getTeamAverageWeight(team)}</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-5 gap-3">
            {team.team_members.slice(0, 5).map((member) => (
              <div
                key={member.user_id}
                className="bg-white/5 rounded-lg p-3 flex flex-col items-center text-center border border-white/10"
              >
                <div className="w-12 h-12 rounded-full overflow-hidden mb-2 border-2 border-white/20">
                  <img
                    src={member.users.discord_avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${member.users.discord_username}`}
                    alt={member.users.discord_username}
                    className="w-full h-full object-cover"
                  />
                </div>

                <div className="text-white font-medium text-sm mb-1 truncate w-full">
                  {member.users.discord_username}
                </div>

                {member.is_captain && (
                  <div className="flex items-center mb-1">
                    <Crown className="w-4 h-4 text-yellow-400" />
                  </div>
                )}

                {member.users.current_rank && (
                  <Badge 
                    className="text-xs mb-1" 
                    style={{ 
                      backgroundColor: getRankColor(member.users.current_rank),
                      color: '#000000'
                    }}
                  >
                    {member.users.current_rank.replace(/\s+/g, ' ').toUpperCase()}
                  </Badge>
                )}

                <div className="text-gray-300 text-xs">
                  {getDisplayWeight(member)}
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    }

    // New broadcast-optimized design
    return (
      <div className="space-y-2">
        {/* Team Header Strip */}
        <div 
          style={getBroadcastTeamStripStyle(
            isEliminated ? BROADCAST_DEFAULTS.errorColor : BROADCAST_DEFAULTS.accentColor
          )}
        >
          <div className="flex-1 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div 
                className="text-3xl font-black text-white"
                style={{ fontFamily: BROADCAST_DEFAULTS.fontFamily }}
              >
                {team.name}
              </div>
              {isEliminated && (
                <div style={getBroadcastBadgeStyle(BROADCAST_DEFAULTS.errorColor)}>
                  ELIMINATED R{team.eliminated_round}
                </div>
              )}
            </div>
            
            <div className="flex items-center gap-4">
              <div 
                className="text-white font-bold text-xl"
                style={{ fontFamily: BROADCAST_DEFAULTS.fontFamily }}
              >
                SEED #{(team as any).calculatedSeed || 'TBD'}
              </div>
              <div 
                className="text-white font-bold text-xl"
                style={{ fontFamily: BROADCAST_DEFAULTS.fontFamily }}
              >
                AVG: {getTeamAverageWeight(team)}
              </div>
            </div>
          </div>
        </div>

        {/* Player Grid */}
        <div className="grid grid-cols-5 gap-2">
          {team.team_members.slice(0, 5).map((member) => (
            <div
              key={member.user_id}
              className="bg-black border-2 border-white p-3 flex flex-col items-center text-center"
              style={{ minHeight: '120px' }}
            >
              {/* Avatar */}
              <div className="w-12 h-12 bg-gray-600 border-2 border-white mb-2">
                <img
                  src={member.users.discord_avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${member.users.discord_username}`}
                  alt={member.users.discord_username}
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Username */}
              <div 
                className="text-white font-bold text-sm mb-1 truncate w-full"
                style={{ fontFamily: BROADCAST_DEFAULTS.fontFamily }}
              >
                {member.users.discord_username}
              </div>

              {/* Captain Badge */}
              {member.is_captain && (
                <div className="flex items-center mb-1">
                  <Crown className="w-4 h-4 text-yellow-400" />
                </div>
              )}

              {/* Rank */}
              {member.users.current_rank && (
                <div 
                  className="text-xs font-bold px-2 py-1 border border-white"
                  style={{ 
                    backgroundColor: getRankColor(member.users.current_rank),
                    color: '#000000'
                  }}
                >
                  {member.users.current_rank.replace(/\s+/g, ' ').toUpperCase()}
                </div>
              )}

              {/* Weight */}
              <div 
                className="text-white font-bold text-xs mt-1"
                style={{ fontFamily: BROADCAST_DEFAULTS.fontFamily }}
              >
                {getDisplayWeight(member)}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className={BROADCAST_CONTAINER_CLASSES} style={containerStyle}>
      <div className="max-w-full h-full flex flex-col p-8">
        {/* Tournament Header */}
        <div className="text-center mb-8">
          <div 
            className="text-6xl font-black text-white mb-4"
            style={{ 
              fontFamily: BROADCAST_DEFAULTS.fontFamily,
              textShadow: '2px 2px 0px #000000'
            }}
          >
            {tournament.name}
          </div>
          <div 
            className="text-3xl font-bold"
            style={{ 
              color: BROADCAST_DEFAULTS.accentColor,
              fontFamily: BROADCAST_DEFAULTS.fontFamily,
              textShadow: '1px 1px 0px #000000'
            }}
          >
            TEAMS OVERVIEW
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* Active Teams */}
          {activeTeams.length > 0 && (
            <div className="mb-8">
              <div 
                className="flex items-center gap-4 mb-6"
                style={getBroadcastTeamStripStyle(BROADCAST_DEFAULTS.successColor)}
              >
                <Trophy className="w-8 h-8 text-black" />
                <div 
                  className="text-2xl font-black text-black"
                  style={{ fontFamily: BROADCAST_DEFAULTS.fontFamily }}
                >
                  ACTIVE TEAMS ({activeTeams.length})
                </div>
              </div>
              
              <div className="space-y-4">
                {activeTeams.map((team) => (
                  <TeamBlock key={team.id} team={team} />
                ))}
              </div>
            </div>
          )}

          {/* Eliminated Teams */}
          {eliminatedTeams.length > 0 && (
            <div>
              <div 
                className="flex items-center gap-4 mb-6"
                style={getBroadcastTeamStripStyle(BROADCAST_DEFAULTS.errorColor)}
              >
                <Users className="w-8 h-8 text-black" />
                <div 
                  className="text-2xl font-black text-black"
                  style={{ fontFamily: BROADCAST_DEFAULTS.fontFamily }}
                >
                  ELIMINATED TEAMS ({eliminatedTeams.length})
                </div>
              </div>
              
              <div className="space-y-4">
                {eliminatedTeams.map((team) => (
                  <TeamBlock key={team.id} team={team} isEliminated />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Tournament Status Footer */}
        <div className="text-center pt-4">
          <div 
            className="inline-flex items-center px-8 py-4 border-4 border-white font-black text-2xl"
            style={{
              backgroundColor: tournament.status === 'live' 
                ? BROADCAST_DEFAULTS.errorColor
                : tournament.status === 'completed' 
                  ? BROADCAST_DEFAULTS.successColor
                  : BROADCAST_DEFAULTS.accentColor,
              color: '#000000',
              fontFamily: BROADCAST_DEFAULTS.fontFamily
            }}
          >
            {tournament.status === 'live' && '🔴 LIVE TOURNAMENT'}
            {tournament.status === 'completed' && '✅ TOURNAMENT COMPLETE'}
            {tournament.status === 'open' && '📝 REGISTRATION OPEN'}
            {tournament.status === 'balancing' && '⚖️ TEAM BALANCING'}
            {tournament.status === 'draft' && '📋 DRAFT MODE'}
          </div>
        </div>
      </div>
    </div>
  );
}
