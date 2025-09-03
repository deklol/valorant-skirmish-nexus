import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Team } from "@/types/tournamentDetail";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

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

  const getHighestRank = (members: any[]) => {
    const ranks = ['radiant', 'immortal', 'ascendant', 'diamond', 'platinum', 'gold', 'silver', 'bronze', 'iron'];
    let highestRank = 'Iron';
    let highestRankIndex = ranks.length;
    
    members.forEach(member => {
      const rank = member.users?.current_rank?.toLowerCase();
      if (rank) {
        const rankIndex = ranks.findIndex(r => rank.includes(r));
        if (rankIndex !== -1 && rankIndex < highestRankIndex) {
          highestRankIndex = rankIndex;
          highestRank = rank.charAt(0).toUpperCase() + rank.slice(1);
        }
      }
    });
    
    return highestRank;
  };

  const sceneSettings = settings.sceneSettings.matchupPreview;

  const TaleOfTapeStats = () => {
    const team1Stats = {
      avgWeight: Math.round(team1.team_members.reduce((sum, m) => sum + ((m.users as any)?.display_weight || (m.users as any)?.atlas_weight || (m.users as any)?.adaptive_weight || m.users?.weight_rating || 150), 0) / team1.team_members.length),
      highestRank: getHighestRank(team1.team_members),
      avgTournamentWins: Math.round(team1.team_members.reduce((sum, m) => sum + ((m.users as any)?.tournaments_won || 0), 0) / team1.team_members.length * 10) / 10,
    };

    const team2Stats = {
      avgWeight: Math.round(team2.team_members.reduce((sum, m) => sum + ((m.users as any)?.display_weight || (m.users as any)?.atlas_weight || (m.users as any)?.adaptive_weight || m.users?.weight_rating || 150), 0) / team2.team_members.length),
      highestRank: getHighestRank(team2.team_members),
      avgTournamentWins: Math.round(team2.team_members.reduce((sum, m) => sum + ((m.users as any)?.tournaments_won || 0), 0) / team2.team_members.length * 10) / 10,
    };

    // Use blocky design ONLY when transparentBackground is true
    if (sceneSettings.transparentBackground) {
      const StatRow = ({ label, value1, value2 }: { label: string; value1: string | number; value2: string | number }) => (
        <div className="grid grid-cols-3 gap-0 py-2">
          <div className="bg-black text-center font-bold text-white text-lg p-2">
            {value1}
          </div>
          <div className="bg-black text-center text-white uppercase tracking-wider text-sm font-bold p-2">
            {label}
          </div>
          <div className="bg-black text-center font-bold text-white text-lg p-2">
            {value2}
          </div>
        </div>
      );

      return (
        <div className="w-80">
          {/* Header - Black instead of grey */}
          <div className="bg-black text-center p-3">
            <h3 className="text-xl font-black uppercase tracking-wider text-white">
              UPCOMING MATCH
            </h3>
          </div>
          
          {/* Stats */}
          <div className="space-y-0">
            <StatRow 
              label="AVG WEIGHT" 
              value1={team1Stats.avgWeight} 
              value2={team2Stats.avgWeight} 
            />
            
            <div className="grid grid-cols-3 gap-0 py-2">
              <div className="bg-black text-center font-bold text-white text-lg p-2">
                {team1Stats.highestRank}
              </div>
              <div className="bg-[#FF6B35] text-center text-white uppercase tracking-wider text-sm font-bold p-2">
                HIGHEST RANK
              </div>
              <div className="bg-black text-center font-bold text-white text-lg p-2">
                {team2Stats.highestRank}
              </div>
            </div>
            
            <StatRow 
              label="SEED" 
              value1={`#${team1.seed || '4'}`} 
              value2={`#${team2.seed || '3'}`} 
            />
          </div>
          
          {/* Footer - Keep green as requested */}
          <div className="bg-green-600 text-center p-2">
            <div className="text-black font-black text-sm">
              VERY BALANCED
            </div>
          </div>
        </div>
      );
    } else {
      // Original design when transparentBackground is false
      const StatRow = ({ label, value1, value2 }: { label: string; value1: string | number; value2: string | number }) => (
        <div className="grid grid-cols-3 gap-4 py-1">
          <div className="text-right font-medium text-white text-sm">
            {value1}
          </div>
          <div className="text-center text-white/60 uppercase tracking-wide text-xs font-medium">
            {label}
          </div>
          <div className="text-left font-medium text-white text-sm">
            {value2}
          </div>
        </div>
      );

      return (
        <div 
          className="backdrop-blur-sm rounded-lg border border-white/20 p-4 w-64"
          style={{
            backgroundColor: 'rgba(0, 0, 0, 0.6)',
          }}
        >
          <div className="text-center mb-3">
            <h3 className="text-lg font-bold uppercase tracking-wider text-white">
              Tale of the Tape
            </h3>
          </div>
          
          <div className="space-y-1">
            <StatRow 
              label="Avg Weight" 
              value1={team1Stats.avgWeight} 
              value2={team2Stats.avgWeight} 
            />
            
            <StatRow 
              label="Highest Rank" 
              value1={team1Stats.highestRank} 
              value2={team2Stats.highestRank} 
            />
            
            <StatRow 
              label="Avg Wins" 
              value1={team1Stats.avgTournamentWins} 
              value2={team2Stats.avgTournamentWins} 
            />
            
            <StatRow 
              label="Seed" 
              value1={`#${team1.seed || '4'}`} 
              value2={`#${team2.seed || '3'}`} 
            />
          </div>
          
          <div className="mt-3 text-center">
            <div className="text-green-400 font-bold text-xs">
              VERY BALANCED
            </div>
          </div>
        </div>
      );
    }
  };

  const PlayerLineup = ({ team, side }: { team: Team; side: 'left' | 'right' }) => (
    <div className="space-y-0">
      {sceneSettings.transparentBackground ? (
        // Blocky design for transparent background
        <>
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
              <div className="bg-white px-3 py-1">
                <span className="text-black text-sm font-bold">
                  SEED #{team.seed || 'TBD'}
                </span>
              </div>
            </div>
          </div>
        </>
      ) : (
        // Original design for non-transparent background
        <div className="mb-6">
          <div className="text-2xl font-bold mb-2 uppercase tracking-wide text-white">
            {team.name}
          </div>
          <div className="flex items-center space-x-2" style={{ justifyContent: side === 'right' ? 'flex-end' : 'flex-start' }}>
            <div className="text-cyan-400 text-sm font-bold">
              AVG: {side === 'left' ? team1Avg : team2Avg}
            </div>
            <div className="text-white/50 text-xs">
              SEED #{team.seed || 'TBD'}
            </div>
          </div>
        </div>
      )}
      
      {/* Players List */}
      <div className={sceneSettings.transparentBackground ? "space-y-0" : "space-y-1"}>
        {team.team_members
          .sort((a, b) => (b.is_captain ? 1 : 0) - (a.is_captain ? 1 : 0))
          .map((member, index) => {
            const user = member.users;
            if (!user) return null;

            const displayWeight = (user as any).display_weight || (user as any).atlas_weight || (user as any).adaptive_weight || 150;
            const { emoji, color } = formatRank(user.current_rank);

            if (sceneSettings.transparentBackground) {
              // Blocky player cards for transparent background
              return (
                <div key={member.user_id}>
                  {/* Player Name Block */}
                  <div 
                    className="px-4 py-3 text-white flex items-center justify-between"
                    style={{ 
                      backgroundColor: '#FF6B35'
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

                  {/* Player Info Horizontal Cards - No gaps, all black */}
                  <div className="grid grid-cols-4">
                    {/* Avatar Card */}
                    <div className="bg-black p-3 flex flex-col items-center">
                      <div className="w-12 h-12 bg-gray-600 mb-1">
                        <img
                          src={user.discord_avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.discord_username}`}
                          alt={user.discord_username}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      
                    </div>

                    {/* Rank Card */}
                    <div className="bg-black p-3 flex flex-col items-center">
                      <div 
                        className="w-12 h-12 flex items-center justify-center text-lg mb-1"
                        style={{ backgroundColor: getRankColor(user.current_rank) }}
                      >
                        {emoji}
                      </div>
                      <div className="text-white text-xs text-center truncate w-full">
                        {user.current_rank || 'Unranked'}
                      </div>
                    </div>

                    {/* Weight Card */}
                    <div className="bg-black p-3 flex flex-col items-center">
                      <div className="w-12 h-12 bg-blue-600 flex items-center justify-center text-sm font-bold text-white mb-1">
                        {displayWeight}
                      </div>
                      <div className="text-white text-xs text-center">Weight</div>
                    </div>

                    {/* Riot ID Card */}
                    <div className="bg-black p-3 flex flex-col items-center">
                      <div className="w-12 h-12 bg-red-600 flex items-center justify-center text-white mb-1 text-xs text-center font-bold">
                        RIOT
                      </div>
                      <div className="text-white text-xs text-center truncate w-full">
                        {user.riot_id || 'N/A'}
                      </div>
                    </div>
                  </div>
                </div>
              );
            } else {
              // Original player cards for non-transparent background
              return (
                <div 
                  key={member.user_id} 
                  className={`flex items-center space-x-2 backdrop-blur-sm rounded px-3 py-2 border border-white/10 ${
                    side === 'right' ? 'flex-row-reverse space-x-reverse' : ''
                  }`}
                  style={{
                    backgroundColor: 'rgba(0, 0, 0, 0.2)',
                  }}
                >
                  <div className="text-sm font-medium text-white/40 w-4 text-center">
                    {index + 1}
                  </div>
                  
                  {member.is_captain && sceneSettings.showCaptainBadges && (
                    <Badge variant="outline" className="border-yellow-400 text-yellow-400 text-xs px-1 py-0">
                      C
                    </Badge>
                  )}
                  
                  <Avatar className="w-6 h-6">
                    <AvatarImage src={user.discord_avatar_url || undefined} />
                    <AvatarFallback className="bg-slate-700 text-white text-xs">
                      {user.discord_username?.slice(0, 2).toUpperCase() || '??'}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className={`flex-1 min-w-0 ${side === 'right' ? 'text-right' : 'text-left'}`}>
                    <div className="text-white font-medium text-xs truncate">
                      {user.discord_username || 'Unknown'}
                    </div>
                    {sceneSettings.showCurrentRank && (
                      <div className={`text-xs ${getRankColor(user.current_rank)} truncate`}>
                        {user.current_rank}
                      </div>
                    )}
                  </div>
                  
                  {/* Weight display for original design */}
                  <div className="text-xs text-cyan-400 font-bold">
                    {displayWeight}
                  </div>
                </div>
              );
            }
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
            {sceneSettings.transparentBackground ? (
              // Blocky design for transparent background
              <>
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
                
                <div className="bg-black inline-block px-6 py-2">
                  <div className="text-lg text-white uppercase tracking-wider font-bold">
                    UPCOMING MATCH
                  </div>
                </div>
              </>
            ) : (
              // Original design for non-transparent background
              <>
                  <div className="flex items-center justify-center space-x-6 mb-3">
                    <div className="text-4xl font-black uppercase tracking-wider text-white">
                      {team1.name}
                    </div>
                    <div className="flex flex-col items-center">
                      <div className="text-white/70 text-xs uppercase tracking-wide font-bold">
                        VS
                      </div>
                    </div>
                    <div className="text-4xl font-black uppercase tracking-wider text-white">
                      {team2.name}
                    </div>
                  </div>
                <div className="text-sm text-white/80 uppercase tracking-wider font-bold">
                  Upcoming Match
                </div>
              </>
            )}
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