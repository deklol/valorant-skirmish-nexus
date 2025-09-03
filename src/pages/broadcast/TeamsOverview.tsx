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
  
  // Check for animate=false in URL
  const searchParams = new URLSearchParams(window.location.search);
  const shouldSkipAnimations = searchParams.get('animate') === 'false';

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

  // Skip loading state entirely if animate=false
  if (!shouldSkipAnimations && (loading || !tournament)) {
    return <BroadcastLoading message="Loading teams overview..." />;
  }

  // If animate=false and we don't have data yet, show empty state instantly
  if (shouldSkipAnimations && (!tournament || !broadcastTeams.length)) {
    return (
      <div className="w-screen h-screen bg-transparent flex items-center justify-center">
        <div 
          className="text-4xl font-black text-white"
          style={{ 
            fontFamily: BROADCAST_DEFAULTS.fontFamily,
            textShadow: '2px 2px 0px #000000'
          }}
        >
          No Data Available
        </div>
      </div>
    );
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
      <div className="space-y-3">
        {/* Team Header Block */}
        <div className="flex items-center gap-0">
          {/* Team Color Block */}
          <div 
            className="w-16 h-16 border-2 border-white"
            style={{ 
              backgroundColor: isEliminated ? BROADCAST_DEFAULTS.errorColor : sceneSettings.teamAccentColor || BROADCAST_DEFAULTS.primaryColor 
            }}
          />
          
          {/* Team Info Block */}
          <div 
            className="flex-1 bg-black border-2 border-white border-l-0 p-3 flex items-center justify-between"
            style={{ minHeight: '64px' }}
          >
            <div className="flex items-center gap-4">
              <div 
                className="text-2xl font-black text-white"
                style={{ fontFamily: BROADCAST_DEFAULTS.fontFamily }}
              >
                {team.name}
              </div>
              {isEliminated && (
                <div 
                  className="px-2 py-1 border border-white text-xs font-bold"
                  style={{
                    backgroundColor: BROADCAST_DEFAULTS.errorColor,
                    color: '#000000',
                    fontFamily: BROADCAST_DEFAULTS.fontFamily
                  }}
                >
                  ELIMINATED
                </div>
              )}
            </div>
            
            <div className="flex items-center gap-4">
              <div 
                className="text-white font-bold text-lg"
                style={{ fontFamily: BROADCAST_DEFAULTS.fontFamily }}
              >
                SEED #{(team as any).calculatedSeed || 'TBD'}
              </div>
            </div>
          </div>
        </div>

        {/* Player Cards */}
        <div className="space-y-1">
          {team.team_members.slice(0, 5).map((member, index) => (
            <div key={member.user_id} className="flex items-center gap-0">
              {/* Player Color Block */}
              <div 
                className="w-16 h-14 border-2 border-white"
                style={{ 
                  backgroundColor: sceneSettings.playerAccentColor || BROADCAST_DEFAULTS.primaryColor 
                }}
              />
              
              {/* Player Info Block */}
              <div 
                className="flex-1 bg-black border-2 border-white border-l-0 p-2 flex items-center gap-3"
                style={{ minHeight: '56px' }}
              >
                {/* Avatar */}
                <div className="w-10 h-10 bg-gray-600 border border-white flex-shrink-0">
                  <img
                    src={member.users.discord_avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${member.users.discord_username}`}
                    alt={member.users.discord_username}
                    className="w-full h-full object-cover"
                  />
                </div>

                {/* Username */}
                <div className="flex-1 min-w-0">
                  <div 
                    className="text-white font-bold text-base truncate"
                    style={{ fontFamily: BROADCAST_DEFAULTS.fontFamily }}
                  >
                    {member.users.discord_username}
                  </div>
                  {member.users.riot_id && (
                    <div 
                      className="text-gray-400 text-xs truncate"
                      style={{ fontFamily: BROADCAST_DEFAULTS.fontFamily }}
                    >
                      {member.users.riot_id}
                    </div>
                  )}
                </div>

                {/* Badges */}
                <div className="flex items-center gap-2">
                  {/* Captain Badge */}
                  {member.is_captain && (
                    <div 
                      className="px-2 py-1 border border-white text-xs font-bold"
                      style={{
                        backgroundColor: BROADCAST_DEFAULTS.warningColor,
                        color: '#000000',
                        fontFamily: BROADCAST_DEFAULTS.fontFamily
                      }}
                    >
                      CAPTAIN
                    </div>
                  )}

                  {/* Rank Badge */}
                  {member.users.current_rank && (
                    <div 
                      className="px-2 py-1 border border-white text-xs font-bold"
                      style={{ 
                        backgroundColor: getRankColor(member.users.current_rank),
                        color: '#000000',
                        fontFamily: BROADCAST_DEFAULTS.fontFamily
                      }}
                    >
                      {member.users.current_rank.split(' ')[0].toUpperCase()}
                    </div>
                  )}

                  {/* Weight */}
                  <div 
                    className="px-3 py-1 border border-white text-sm font-bold text-center min-w-[60px]"
                    style={{ 
                      backgroundColor: sceneSettings.weightBlockColor || '#333333',
                      color: '#ffffff',
                      fontFamily: BROADCAST_DEFAULTS.fontFamily 
                    }}
                  >
                    {getDisplayWeight(member)}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Team Stats Footer */}
        <div className="flex gap-2">
          <div 
            className="bg-black border-2 border-white p-3 text-center flex-1"
          >
            <div 
              className="text-2xl font-black"
              style={{ 
                color: sceneSettings.teamAccentColor || BROADCAST_DEFAULTS.primaryColor,
                fontFamily: BROADCAST_DEFAULTS.fontFamily 
              }}
            >
              {getTeamAverageWeight(team)}
            </div>
            <div 
              className="text-white text-sm font-bold"
              style={{ fontFamily: BROADCAST_DEFAULTS.fontFamily }}
            >
              TOTAL WEIGHT
            </div>
          </div>
          
          <div 
            className="bg-black border-2 border-white p-3 text-center flex-1"
          >
            <div 
              className="text-2xl font-black"
              style={{ 
                color: sceneSettings.teamAccentColor || BROADCAST_DEFAULTS.primaryColor,
                fontFamily: BROADCAST_DEFAULTS.fontFamily 
              }}
            >
              #{(team as any).calculatedSeed || 'TBD'}
            </div>
            <div 
              className="text-white text-sm font-bold"
              style={{ fontFamily: BROADCAST_DEFAULTS.fontFamily }}
            >
              SEED
            </div>
          </div>
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
