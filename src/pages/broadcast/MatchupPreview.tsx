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
  
  // Check URL parameters for OBS mode and animation overrides
  const urlParams = new URLSearchParams(window.location.search);
  const forceObsMode = urlParams.get('obs') === 'true' || urlParams.get('transparent') === 'true';
  const forceNormalMode = urlParams.get('obs') === 'false' || urlParams.get('transparent') === 'false';
  const animateDisabled = urlParams.get('animate') === 'false';

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

  // Skip loading screen when animate=false
  if (loading || !match || !team1 || !team2) {
    if (animateDisabled) {
      return null; // Don't show loading when animations are disabled
    }
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
  
  // Create modified scene settings with URL parameter overrides
  const effectiveSceneSettings = {
    ...sceneSettings,
    transparentBackground: forceObsMode ? true : forceNormalMode ? false : sceneSettings.transparentBackground
  };

  console.log('🎯 OBS Mode Check:', {
    urlParams: Object.fromEntries(urlParams.entries()),
    forceObsMode,
    forceNormalMode,
    originalTransparentBackground: sceneSettings.transparentBackground,
    effectiveTransparentBackground: effectiveSceneSettings.transparentBackground
  });

  const PlayerSpotlight = () => {
    // Find player with highest unified weight
    const allPlayers = [...team1.team_members, ...team2.team_members];
    const highestWeightPlayer = allPlayers.reduce((highest, current) => {
      const currentWeight = (current.users as any)?.display_weight || (current.users as any)?.atlas_weight || (current.users as any)?.adaptive_weight || current.users?.weight_rating || 150;
      const highestWeight = (highest.users as any)?.display_weight || (highest.users as any)?.atlas_weight || (highest.users as any)?.adaptive_weight || highest.users?.weight_rating || 150;
      return currentWeight > highestWeight ? current : highest;
    });

    const playerTeam = team1.team_members.includes(highestWeightPlayer) ? team1 : team2;
    const playerWeight = (highestWeightPlayer.users as any)?.display_weight || (highestWeightPlayer.users as any)?.atlas_weight || (highestWeightPlayer.users as any)?.adaptive_weight || highestWeightPlayer.users?.weight_rating || 150;
    
    return (
      <div className="w-80">
        {effectiveSceneSettings.transparentBackground ? (
          // Blocky design for transparent background with OBS colors
          <div 
            className="border-4"
            style={{
              backgroundColor: effectiveSceneSettings.obsBackgroundColor || '#000000',
              borderColor: effectiveSceneSettings.obsAccentColor || '#FF6B35'
            }}
          >
            {/* Header */}
            <div 
              className="text-center p-3"
              style={{
                backgroundColor: effectiveSceneSettings.obsAccentColor || '#FF6B35'
              }}
            >
              <h3 
                className="text-xl font-black uppercase tracking-wider"
                style={{
                  color: effectiveSceneSettings.obsHeaderColor || '#FFFFFF'
                }}
              >
                PLAYER SPOTLIGHT
              </h3>
            </div>
            
            {/* Player Info */}
            <div className="p-6 text-center">
              <div className="mb-4">
                <Avatar 
                  className="w-20 h-20 mx-auto border-4"
                  style={{
                    borderColor: effectiveSceneSettings.obsAccentColor || '#FF6B35'
                  }}
                >
                  <AvatarImage 
                    src={highestWeightPlayer.users?.discord_avatar_url || ''} 
                    alt={highestWeightPlayer.users?.discord_username || 'Player'}
                  />
                  <AvatarFallback 
                    className="text-xl font-bold"
                    style={{
                      backgroundColor: '#6B7280',
                      color: effectiveSceneSettings.obsTextColor || '#FFFFFF'
                    }}
                  >
                    {(highestWeightPlayer.users?.discord_username || 'P').charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </div>
              
              <div className="space-y-2">
                <div 
                  className="font-bold text-xl"
                 style={{
                    color: effectiveSceneSettings.obsTextColor || '#FFFFFF'
                  }}
                >
                  {highestWeightPlayer.users?.discord_username || 'Unknown Player'}
                </div>
                
                <div 
                  className="text-sm"
                 style={{
                    color: effectiveSceneSettings.obsTextColor || '#D1D5DB'
                  }}
                >
                  {playerTeam.name}
                </div>
                
                <div 
                  className="px-3 py-1 inline-block"
                 style={{
                    backgroundColor: effectiveSceneSettings.obsAccentColor || '#FF6B35'
                  }}
                >
                  <span 
                    className="font-bold text-lg"
                   style={{
                      color: effectiveSceneSettings.obsHeaderColor || '#FFFFFF'
                    }}
                  >
                    {playerWeight} Weight
                  </span>
                </div>
                
                <div className="space-y-1 pt-2">
                  <div 
                    className="text-sm"
                   style={{
                      color: effectiveSceneSettings.obsTextColor || '#FFFFFF'
                    }}
                  >
                    <span className="opacity-70">Current:</span> <span style={{ color: getRankColor(highestWeightPlayer.users?.current_rank) }}>{highestWeightPlayer.users?.current_rank || 'Unranked'}</span>
                  </div>
                  <div 
                    className="text-sm"
                   style={{
                      color: effectiveSceneSettings.obsTextColor || '#FFFFFF'
                    }}
                  >
                    <span className="opacity-70">Peak:</span> <span style={{ color: getRankColor(highestWeightPlayer.users?.peak_rank) }}>{highestWeightPlayer.users?.peak_rank || highestWeightPlayer.users?.current_rank || 'Unranked'}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          // Original design for non-transparent background
          <div 
            className="backdrop-blur-sm rounded-lg border border-white/20 p-6 w-80"
            style={{
              backgroundColor: 'rgba(0, 0, 0, 0.7)',
            }}
          >
            <div className="text-center">
              <h3 className="text-lg font-bold uppercase tracking-wider text-white mb-4">
                Player Spotlight
              </h3>
              
              <div className="mb-4">
                <Avatar className="w-16 h-16 mx-auto">
                  <AvatarImage 
                    src={highestWeightPlayer.users?.discord_avatar_url || ''} 
                    alt={highestWeightPlayer.users?.discord_username || 'Player'}
                  />
                  <AvatarFallback className="bg-gray-600 text-white font-bold">
                    {(highestWeightPlayer.users?.discord_username || 'P').charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </div>
              
              <div className="space-y-2">
                <div className="text-white font-bold text-lg">
                  {highestWeightPlayer.users?.discord_username || 'Unknown Player'}
                </div>
                
                <div className="text-gray-300 text-sm">
                  {playerTeam.name}
                </div>
                
                <Badge variant="secondary" className="text-sm font-bold">
                  {playerWeight} Weight
                </Badge>
                
                <div className="space-y-1 pt-2">
                  <div className="text-white text-sm">
                    <span className="text-gray-400">Current:</span> <span className={getRankColor(highestWeightPlayer.users?.current_rank)}>{highestWeightPlayer.users?.current_rank || 'Unranked'}</span>
                  </div>
                  <div className="text-white text-sm">
                    <span className="text-gray-400">Peak:</span> <span className={getRankColor(highestWeightPlayer.users?.peak_rank)}>{highestWeightPlayer.users?.peak_rank || highestWeightPlayer.users?.current_rank || 'Unranked'}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const PlayerLineup = ({ team, side }: { team: Team; side: 'left' | 'right' }) => (
    <div className="space-y-0">
      {effectiveSceneSettings.transparentBackground ? (
        // Blocky design for transparent background
        <>
           {/* Team Header Block */}
           <div 
             className="px-6 py-4 mb-0"
             style={{ 
                backgroundColor: effectiveSceneSettings.obsAccentColor || '#FF6B35' 
              }}
           >
             <div 
               className="text-2xl font-bold uppercase tracking-wide"
                style={{
                  color: effectiveSceneSettings.obsHeaderColor || '#FFFFFF'
                }}
             >
               {team.name}
             </div>
           </div>
           
            {/* Team Stats Block */}
            {effectiveSceneSettings.showTeamStats !== false && (
            <div 
              className="px-6 py-3 mb-0"
               style={{
                 backgroundColor: effectiveSceneSettings.obsBackgroundColor || '#000000'
               }}
            >
              <div className="flex items-center justify-between">
                <div 
                  className="px-3 py-1"
                   style={{
                     backgroundColor: effectiveSceneSettings.obsAccentColor || '#00BFFF'
                   }}
                >
                  <span 
                    className="text-sm font-bold"
                     style={{
                       color: effectiveSceneSettings.obsHeaderColor || '#000000'
                     }}
                  >
                    AVG: {side === 'left' ? team1Avg : team2Avg}
                  </span>
                </div>
                <div 
                  className="px-3 py-1"
                  style={{
                    backgroundColor: '#FFFFFF',
                    color: '#000000'
                  }}
                >
                  <span className="text-sm font-bold">
                    SEED #{team.seed || 'TBD'}
                  </span>
                </div>
              </div>
            </div>
            )}
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
      <div className={effectiveSceneSettings.transparentBackground ? "space-y-0" : "space-y-1"}>
        {team.team_members
          .sort((a, b) => (b.is_captain ? 1 : 0) - (a.is_captain ? 1 : 0))
          .map((member, index) => {
            const user = member.users;
            if (!user) return null;

            const displayWeight = (user as any).display_weight || (user as any).atlas_weight || (user as any).adaptive_weight || 150;
            const { emoji, color } = formatRank(user.current_rank);

            if (effectiveSceneSettings.transparentBackground) {
              // Blocky player cards for transparent background
              return (
                <div key={member.user_id}>
                   {/* Player Name Block */}
                   <div 
                     className="px-4 py-3 flex items-center justify-between"
                     style={{ 
                       backgroundColor: sceneSettings.obsAccentColor || '#FF6B35',
                       color: sceneSettings.obsHeaderColor || '#FFFFFF'
                     }}
                   >
                     <div className="flex items-center gap-3">
                       <span className="text-lg font-bold">
                         {user.discord_username || 'Unknown Player'}
                       </span>
                       {member.is_captain && effectiveSceneSettings.showCaptainBadges && (
                         <div 
                           className="px-2 py-1 text-xs font-bold"
                           style={{
                             backgroundColor: '#FFD700',
                             color: '#000000'
                           }}
                         >
                           CAPTAIN
                         </div>
                       )}
                     </div>
                   </div>

                    {/* Player Info Horizontal Cards - No gaps, using OBS colors */}
                    <div className={`grid ${effectiveSceneSettings.showCurrentRank ? 'grid-cols-4' : 'grid-cols-3'}`}>
                     {/* Avatar Card */}
                     <div 
                       className="p-3 flex flex-col items-center"
                       style={{
                         backgroundColor: sceneSettings.obsBackgroundColor || '#000000'
                       }}
                     >
                       <div className="w-12 h-12 bg-gray-600 mb-1">
                         <img
                           src={user.discord_avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.discord_username}`}
                           alt={user.discord_username}
                           className="w-full h-full object-cover"
                         />
                       </div>
                       
                     </div>

                      {/* Rank Card */}
                      {effectiveSceneSettings.showCurrentRank && (
                        <div 
                          className="p-3 flex flex-col items-center"
                          style={{
                            backgroundColor: sceneSettings.obsBackgroundColor || '#000000'
                          }}
                        >
                          <div 
                            className="w-12 h-12 flex items-center justify-center text-lg mb-1"
                            style={{ backgroundColor: color }}
                          >
                            {emoji}
                          </div>
                          <div 
                            className="text-xs text-center truncate w-full"
                            style={{
                              color: sceneSettings.obsTextColor || '#FFFFFF'
                            }}
                          >{user.current_rank || 'Unranked'}</div>
                        </div>
                      )}

                     {/* Weight Card */}
                     <div 
                       className="p-3 flex flex-col items-center"
                       style={{
                         backgroundColor: sceneSettings.obsBackgroundColor || '#000000'
                       }}
                     >
                        <div 
                          className="w-12 h-12 flex items-center justify-center text-sm font-bold mb-1"
                          style={{
                            backgroundColor: sceneSettings.obsAccentColor || '#FF6B35',
                            color: sceneSettings.obsHeaderColor || '#FFFFFF'
                          }}
                        >
                         {displayWeight}
                       </div>
                       <div 
                         className="text-xs text-center"
                        style={{
                          color: effectiveSceneSettings.obsTextColor || '#FFFFFF'
                        }}
                       >Weight</div>
                     </div>

                     {/* Riot ID Card */}
                     <div 
                       className="p-3 flex flex-col items-center"
                        style={{
                          backgroundColor: effectiveSceneSettings.obsBackgroundColor || '#000000'
                        }}
                     >
                       <div 
                         className="w-12 h-12 flex items-center justify-center mb-1 text-xs text-center font-bold"
                          style={{
                            backgroundColor: '#DC2626',
                            color: effectiveSceneSettings.obsHeaderColor || '#FFFFFF'
                          }}
                       >
                         RIOT
                       </div>
                       <div 
                         className="text-xs text-center truncate w-full"
                          style={{
                            color: effectiveSceneSettings.obsTextColor || '#FFFFFF'
                          }}
                       >{user.riot_id || 'N/A'}</div>
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
                  
                  {member.is_captain && effectiveSceneSettings.showCaptainBadges && (
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
                    {effectiveSceneSettings.showCurrentRank && (
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
                
                <div className="flex items-center justify-center gap-4">
                  <div className="bg-black inline-block px-6 py-2">
                    <div className="text-lg text-white uppercase tracking-wider font-bold">
                      UPCOMING MATCH
                    </div>
                  </div>
                  
                  {/* Weight Difference Indicator */}
                  {effectiveSceneSettings.showWeightDifference && weightDiff > 0 && (
                    <div 
                      className="px-4 py-2"
                      style={{ 
                        backgroundColor: effectiveSceneSettings.obsAccentColor || '#FF6B35',
                        color: effectiveSceneSettings.obsHeaderColor || '#FFFFFF'
                      }}
                    >
                      <div className="text-sm font-bold uppercase tracking-wide">
                        ±{weightDiff} Weight Diff
                      </div>
                    </div>
                  )}
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
                <div className="flex items-center justify-center gap-4">
                  <div className="text-sm text-white/80 uppercase tracking-wider font-bold">
                    Upcoming Match
                  </div>
                  
                  {/* Weight Difference Indicator */}
                  {effectiveSceneSettings.showWeightDifference && weightDiff > 0 && (
                    <Badge variant="secondary" className="text-xs font-bold bg-orange-500/20 text-orange-300 border-orange-400/30">
                      ±{weightDiff} Weight Diff
                    </Badge>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {effectiveSceneSettings.matchupLayout === 'stacked' ? (
          // Stacked Layout
          <div className="space-y-8">
            {/* Player Spotlight at top center */}
            {effectiveSceneSettings.showPlayerSpotlight !== false && (
              <div className="flex justify-center">
                <PlayerSpotlight />
              </div>
            )}
            
            {/* Teams stacked vertically */}
            <div className="grid grid-cols-2 gap-8">
              <PlayerLineup team={team1} side="left" />
              <PlayerLineup team={team2} side="right" />
            </div>
          </div>
        ) : (
          // Side-by-side Layout (default)
          <div className="grid grid-cols-3 gap-8 items-start">
            {/* Team 1 Lineup */}
            <PlayerLineup team={team1} side="left" />
            
            {/* Center - Player Spotlight */}
            {effectiveSceneSettings.showPlayerSpotlight !== false && (
            <div className="flex justify-center">
              <PlayerSpotlight />
            </div>
            )}
            
            {/* Team 2 Lineup */}
            <PlayerLineup team={team2} side="right" />
          </div>
        )}
      </div>
    </div>
  );
}