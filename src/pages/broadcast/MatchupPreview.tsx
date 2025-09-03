import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Team } from "@/types/tournamentDetail";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Swords } from "lucide-react";
import { useBroadcastSettings } from "@/hooks/useBroadcastSettings";
import { extractATLASWeightsFromBalanceAnalysis } from "@/utils/broadcastWeightUtils";
import { getBroadcastContainerStyle } from "@/utils/broadcastLayoutUtils";

interface Match {
  id: string;
  team1_id: string;
  team2_id: string;
  tournament_id: string;
  status: string;
}

export default function MatchupPreview() {
  const { id, matchId } = useParams<{ id: string; matchId: string }>();
  const [match, setMatch] = useState<Match | null>(null);
  const [team1, setTeam1] = useState<Team | null>(null);
  const [team2, setTeam2] = useState<Team | null>(null);
  const [loading, setLoading] = useState(true);
  const { settings } = useBroadcastSettings();

  useEffect(() => {
    if (!id || !matchId) return;

    const fetchMatchupData = async () => {
      // First get the match
      const { data: matchData, error: matchError } = await supabase
        .from('matches')
        .select('*')
        .eq('id', matchId)
        .single();

      if (matchError || !matchData) {
        setLoading(false);
        return;
      }

      setMatch(matchData);

      // Then get the teams
      const { data: teamsData, error: teamsError } = await supabase
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
        .in('id', [matchData.team1_id, matchData.team2_id]);

      if (teamsError || !teamsData) {
        setLoading(false);
        return;
      }

      // Get adaptive weights and tournament balance analysis data
      const { data: adaptiveWeights } = await supabase
        .from('tournament_adaptive_weights')
        .select('*')
        .eq('tournament_id', id);

      // Get tournament with balance analysis for ATLAS weights
      const { data: tournamentData } = await supabase
        .from('tournaments')
        .select('balance_analysis')
        .eq('id', id)
        .single();

      // Extract ATLAS weights from balance analysis
      const atlasWeights = extractATLASWeightsFromBalanceAnalysis(tournamentData?.balance_analysis as any);
      const atlasWeightMap = new Map(
        atlasWeights.map(weight => [weight.userId, weight.points])
      );

      console.log('🎯 MATCHUP: ATLAS weights extracted:', {
        totalWeights: atlasWeights.length,
        weights: atlasWeights,
        atlasWeightMap: Object.fromEntries(atlasWeightMap)
      });

      // Get user statistics for additional data
      const { data: userStats } = await supabase
        .from('users')
        .select('id, tournaments_won, tournaments_played')
        .in('id', teamsData.flatMap(t => t.team_members.map(m => m.user_id)));

      const enhancedTeams = teamsData.map(team => ({
        ...team,
        team_members: team.team_members.map(member => {
          const adaptiveWeight = adaptiveWeights?.find(w => w.user_id === member.user_id);
          const atlasWeight = atlasWeightMap.get(member.user_id);
          const userStat = userStats?.find(s => s.id === member.user_id);
          
          // Prioritize ATLAS weight > adaptive weight > fallback weight (150)
          const displayWeight = atlasWeight || adaptiveWeight?.calculated_adaptive_weight || member.users?.weight_rating || 150;

          console.log(`🎯 PLAYER ${member.user_id}:`, {
            username: member.users?.discord_username,
            atlasWeight,
            adaptiveWeight: adaptiveWeight?.calculated_adaptive_weight,
            fallbackWeight: member.users?.weight_rating,
            finalDisplayWeight: displayWeight
          });

          return {
            ...member,
            users: {
              ...member.users,
              adaptive_weight: adaptiveWeight?.calculated_adaptive_weight,
              atlas_weight: atlasWeight, // ATLAS weight from stored calculations
              display_weight: displayWeight, // Primary weight to display
              peak_rank_points: adaptiveWeight?.peak_rank_points,
              adaptive_factor: adaptiveWeight?.adaptive_factor,
              weight_source: adaptiveWeight?.weight_source || 'current_rank',
              tournaments_won: userStat?.tournaments_won || member.users?.tournaments_won || 0,
              tournaments_played: userStat?.tournaments_played || 0
            }
          };
        })
      }));

      setTeam1(enhancedTeams.find(t => t.id === matchData.team1_id) || null);
      setTeam2(enhancedTeams.find(t => t.id === matchData.team2_id) || null);
      setLoading(false);
    };

    fetchMatchupData();
  }, [id, matchId]);

  if (loading || !match || !team1 || !team2) {
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

  const TaleOfTapeStats = () => {
    const team1Stats = {
      avgRankPoints: Math.round(team1.team_members.reduce((sum, m) => sum + (m.users?.rank_points || 150), 0) / team1.team_members.length),
      immortalPlayers: team1.team_members.filter(m => m.users?.current_rank?.toLowerCase().includes('immortal')).length,
      radiantPlayers: team1.team_members.filter(m => m.users?.current_rank?.toLowerCase().includes('radiant')).length,
    };

    const team2Stats = {
      avgRankPoints: Math.round(team2.team_members.reduce((sum, m) => sum + (m.users?.rank_points || 150), 0) / team2.team_members.length),
      immortalPlayers: team2.team_members.filter(m => m.users?.current_rank?.toLowerCase().includes('immortal')).length,
      radiantPlayers: team2.team_members.filter(m => m.users?.current_rank?.toLowerCase().includes('radiant')).length,
    };

    const StatRow = ({ label, value1, value2 }: { label: string; value1: string | number; value2: string | number }) => (
      <div className="grid grid-cols-3 gap-0 py-2">
        <div className="bg-black text-center font-bold text-white text-lg p-2">
          {value1}
        </div>
        <div className="bg-gray-800 text-center text-white uppercase tracking-wider text-sm font-bold p-2">
          {label}
        </div>
        <div className="bg-black text-center font-bold text-white text-lg p-2">
          {value2}
        </div>
      </div>
    );

    return (
      <div className="w-80">
        {/* Header */}
        <div className="bg-gray-700 text-center p-3">
          <h3 className="text-xl font-black uppercase tracking-wider text-white">
            TALE OF THE TAPE
          </h3>
        </div>
        
        {/* Stats */}
        <div className="space-y-0">
          <StatRow 
            label="AVG POINTS" 
            value1={team1Stats.avgRankPoints} 
            value2={team2Stats.avgRankPoints} 
          />
          
          <StatRow 
            label="IMMORTAL" 
            value1={team1Stats.immortalPlayers} 
            value2={team2Stats.immortalPlayers} 
          />
          
          <StatRow 
            label="SEED" 
            value1={`#${team1.seed || '4'}`} 
            value2={`#${team2.seed || '3'}`} 
          />
        </div>
        
        {/* Footer */}
        <div className="bg-green-600 text-center p-2">
          <div className="text-black font-black text-sm">
            VERY BALANCED
          </div>
        </div>
      </div>
    );
  };

  const PlayerLineup = ({ team, side }: { team: Team; side: 'left' | 'right' }) => (
    <div className="space-y-0">
      {/* Team Header Block */}
      <div 
        className="px-6 py-4 mb-0"
        style={{ backgroundColor: '#FF6B35' }}
      >
        <div className="text-2xl font-bold uppercase tracking-wide text-white">
          {team.name}
        </div>
      </div>
      
      {/* Team Stats Block */}
      <div className="bg-black px-6 py-3 mb-0">
        <div className="flex items-center justify-between">
          <div className="bg-cyan-600 px-3 py-1">
            <span className="text-black text-sm font-bold">
              AVG: {side === 'left' ? team1Avg : team2Avg}
            </span>
          </div>
          <div className="bg-gray-600 px-3 py-1">
            <span className="text-white text-sm font-bold">
              SEED #{team.seed || 'TBD'}
            </span>
          </div>
        </div>
      </div>
      
      <div className="space-y-0">
        {team.team_members
          .sort((a, b) => (b.is_captain ? 1 : 0) - (a.is_captain ? 1 : 0))
          .map((member, index) => {
            const user = member.users;
            if (!user) return null;

            const displayWeight = (user as any).display_weight || (user as any).atlas_weight || (user as any).adaptive_weight || 150;
            const { emoji, color } = formatRank(user.current_rank);

            return (
              <div key={member.user_id}>
                {/* Player Name Block */}
                <div 
                  className="px-4 py-3 text-white flex items-center justify-between"
                  style={{ 
                    backgroundColor: sceneSettings.teamAccentColor || '#FF6B35'
                  }}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-lg font-bold">
                      {user.discord_username || 'Unknown Player'}
                    </span>
                    {member.is_captain && sceneSettings.showCaptainBadges && (
                      <div className="bg-yellow-400 text-black px-2 py-1 text-xs font-bold">
                        CAPTAIN
                      </div>
                    )}
                  </div>
                </div>

                {/* Player Info Horizontal Cards */}
                <div className="grid grid-cols-4">
                  {/* Avatar Card */}
                  <div className="bg-black/90 p-3 flex flex-col items-center">
                    <div className="w-12 h-12 bg-gray-600 mb-1">
                      <img
                        src={user.discord_avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.discord_username}`}
                        alt={user.discord_username}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="text-white text-xs text-center">Avatar</div>
                  </div>

                  {/* Rank Card */}
                  {sceneSettings.showCurrentRank && user.current_rank && (
                    <div className="bg-black/90 p-3 flex flex-col items-center">
                      <div 
                        className="w-12 h-12 flex items-center justify-center text-lg mb-1"
                        style={{ backgroundColor: getRankColor(user.current_rank) }}
                      >
                        {emoji}
                      </div>
                      <div className="text-white text-xs text-center truncate w-full">
                        {user.current_rank}
                      </div>
                    </div>
                  )}

                  {/* Weight Card */}
                  {sceneSettings.showAdaptiveWeight && (
                    <div className="bg-black/90 p-3 flex flex-col items-center">
                      <div className="w-12 h-12 bg-blue-600 flex items-center justify-center text-sm font-bold text-white mb-1">
                        {displayWeight}
                      </div>
                      <div className="text-white text-xs text-center">Weight</div>
                    </div>
                  )}

                  {/* Riot ID Card */}
                  {sceneSettings.showRiotId && user.riot_id && (
                    <div className="bg-black/90 p-3 flex flex-col items-center">
                      <div className="w-12 h-12 bg-red-600 flex items-center justify-center text-white mb-1 text-xs text-center font-bold">
                        RIOT
                      </div>
                      <div className="text-white text-xs text-center truncate w-full">
                        {user.riot_id}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
      </div>
    </div>
  );

  const formatRank = (rank?: string) => {
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

    if (!rank) return rankStyles.unranked;
    const rankLower = rank.toLowerCase();
    for (const key in rankStyles) {
      if (rankLower.includes(key)) return rankStyles[key];
    }
    return rankStyles.unranked;
  };

  const containerStyle = getBroadcastContainerStyle(sceneSettings, settings);

  return (
    <div 
      className="w-screen h-screen flex items-center justify-center p-8 relative overflow-hidden" 
      style={containerStyle}
    >
      {/* Background overlay for better text readability when not transparent */}
      {!sceneSettings.transparentBackground && (
        <div className="absolute inset-0 bg-black/40" />
      )}
      
      <div className="relative z-10 max-w-7xl w-full">
        {/* Main Header */}
        {sceneSettings.showVsHeader && (
          <div className="text-center mb-8">
            <div className="flex items-center justify-center space-x-8 mb-4">
              {/* Team 1 Header Block */}
              <div 
                className="bg-black px-8 py-4"
                style={{ backgroundColor: '#FF6B35' }}
              >
                <div className="text-4xl font-black uppercase tracking-wider text-white">
                  {team1.name}
                </div>
              </div>
              
              {/* VS Section */}
              <div className="flex flex-col items-center">
                <Swords className="w-12 h-12 text-red-500 mb-2" />
                <div className="text-white text-lg uppercase tracking-wide font-bold">
                  VS
                </div>
              </div>
              
              {/* Team 2 Header Block */}
              <div 
                className="bg-black px-8 py-4"
                style={{ backgroundColor: '#FF6B35' }}
              >
                <div className="text-4xl font-black uppercase tracking-wider text-white">
                  {team2.name}
                </div>
              </div>
            </div>
            
            <div className="bg-gray-700 inline-block px-6 py-2">
              <div className="text-lg text-white uppercase tracking-wider font-bold">
                UPCOMING MATCH
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-3 gap-8 items-start">
          {/* Team 1 Lineup */}
          <PlayerLineup team={team1} side="left" />
          
          {/* Center - Tale of the Tape */}
          <div className="flex justify-center">
            <TaleOfTapeStats />
          </div>
          
          {/* Team 2 Lineup */}
          <PlayerLineup team={team2} side="right" />
        </div>
      </div>
    </div>
  );
}