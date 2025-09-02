import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Team } from "@/types/tournamentDetail";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Swords } from "lucide-react";
import { useBroadcastSettings } from "@/hooks/useBroadcastSettings";
import { extractATLASWeightsFromBalanceAnalysis } from "@/utils/broadcastWeightUtils";

interface Match {
  id: string;
  team1_id: string;
  team2_id: string;
  tournament_id: string;
  status: string;
}

export default function MatchupPreviewByMatch() {
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
      avgWeight: team1Avg,
      totalWins: team1.team_members.reduce((sum, m) => sum + ((m.users as any)?.tournaments_won || 0), 0),
      avgRankPoints: Math.round(team1.team_members.reduce((sum, m) => sum + (m.users?.rank_points || 150), 0) / team1.team_members.length),
      immortalPlayers: team1.team_members.filter(m => m.users?.current_rank?.toLowerCase().includes('immortal')).length,
      radiantPlayers: team1.team_members.filter(m => m.users?.current_rank?.toLowerCase().includes('radiant')).length,
    };

    const team2Stats = {
      avgWeight: team2Avg,
      totalWins: team2.team_members.reduce((sum, m) => sum + ((m.users as any)?.tournaments_won || 0), 0),
      avgRankPoints: Math.round(team2.team_members.reduce((sum, m) => sum + (m.users?.rank_points || 150), 0) / team2.team_members.length),
      immortalPlayers: team2.team_members.filter(m => m.users?.current_rank?.toLowerCase().includes('immortal')).length,
      radiantPlayers: team2.team_members.filter(m => m.users?.current_rank?.toLowerCase().includes('radiant')).length,
    };

    const StatRow = ({ label, value1, value2, highlight = false }: { label: string; value1: string | number; value2: string | number; highlight?: boolean }) => (
      <div className={`grid grid-cols-3 gap-4 py-3 border-b border-white/10 ${highlight ? 'bg-red-500/10' : ''}`}>
        <div className="text-right font-medium" style={{ color: settings.textColor, fontSize: sceneSettings.fontSize }}>
          {value1}
        </div>
        <div className="text-center text-white/70 uppercase tracking-wide text-sm font-bold">
          {label}
        </div>
        <div className="text-left font-medium" style={{ color: settings.textColor, fontSize: sceneSettings.fontSize }}>
          {value2}
        </div>
      </div>
    );

    return (
      <div className="bg-black/40 backdrop-blur-sm rounded-xl border border-white/20 p-6 max-w-md mx-auto">
        <div className="text-center mb-6">
          <h3 className="text-2xl font-bold uppercase tracking-wider" style={{ color: settings.headerTextColor }}>
            Tale of the Tape
          </h3>
        </div>
        
        <div className="space-y-0">
          {sceneSettings.showAdaptiveWeight && (
            <StatRow 
              label="Avg Weight" 
              value1={team1Stats.avgWeight} 
              value2={team2Stats.avgWeight}
              highlight={Math.abs(team1Stats.avgWeight - team2Stats.avgWeight) > 25}
            />
          )}
          
          <StatRow 
            label="Avg Rank Points" 
            value1={team1Stats.avgRankPoints} 
            value2={team2Stats.avgRankPoints} 
          />
          
          {sceneSettings.showTournamentWins && (
            <StatRow 
              label="Total Wins" 
              value1={team1Stats.totalWins} 
              value2={team2Stats.totalWins} 
            />
          )}
          
          <StatRow 
            label="Radiant Players" 
            value1={team1Stats.radiantPlayers} 
            value2={team2Stats.radiantPlayers}
            highlight={team1Stats.radiantPlayers > 0 || team2Stats.radiantPlayers > 0}
          />
          
          <StatRow 
            label="Immortal Players" 
            value1={team1Stats.immortalPlayers} 
            value2={team2Stats.immortalPlayers} 
          />
          
          <StatRow 
            label="Seed" 
            value1={`#${team1.seed || 'TBD'}`} 
            value2={`#${team2.seed || 'TBD'}`} 
          />
        </div>
        
        <div className="mt-6 text-center">
          <div className={`text-lg font-bold ${weightDiff < 10 ? 'text-green-400' : weightDiff < 25 ? 'text-yellow-400' : 'text-red-400'}`}>
            {weightDiff < 10 ? 'VERY BALANCED' : weightDiff < 25 ? 'BALANCED' : 'FAVORED MATCH'}
          </div>
          <div className="text-white/50 text-sm mt-1">
            Weight Difference: {weightDiff} points
          </div>
        </div>
      </div>
    );
  };

  const PlayerLineup = ({ team, side }: { team: Team; side: 'left' | 'right' }) => (
    <div className={`space-y-4 ${side === 'right' ? 'text-right' : 'text-left'}`}>
      <div className="mb-8">
        <div 
          className="text-4xl font-bold mb-2 uppercase tracking-wide" 
          style={{ color: settings.headerTextColor, fontSize: sceneSettings.headerFontSize }}
        >
          {team.name}
        </div>
        <div className="flex items-center space-x-4" style={{ justifyContent: side === 'right' ? 'flex-end' : 'flex-start' }}>
          <div className="text-cyan-400 text-xl font-bold">
            AVG: {side === 'left' ? team1Avg : team2Avg}
          </div>
          <div className="text-white/50">
            SEED #{team.seed || 'TBD'}
          </div>
        </div>
      </div>
      
      <div className="space-y-3">
        {team.team_members
          .sort((a, b) => (b.is_captain ? 1 : 0) - (a.is_captain ? 1 : 0))
          .map((member, index) => (
            <div 
              key={member.user_id} 
              className={`flex items-center space-x-4 bg-black/20 backdrop-blur-sm rounded-lg p-4 border border-white/10 ${
                side === 'right' ? 'flex-row-reverse space-x-reverse' : ''
              }`}
            >
              <div className="flex items-center space-x-3">
                <div className="text-2xl font-bold text-white/30">
                  {index + 1}
                </div>
                <Avatar className="w-12 h-12">
                  <AvatarImage src={member.users?.discord_avatar_url || undefined} />
                  <AvatarFallback className="bg-slate-700 text-white">
                    {member.users?.discord_username?.slice(0, 2).toUpperCase() || '??'}
                  </AvatarFallback>
                </Avatar>
              </div>
              
              <div className={`flex-1 ${side === 'right' ? 'text-right' : 'text-left'}`}>
                <div className="flex items-center space-x-2" style={{ justifyContent: side === 'right' ? 'flex-end' : 'flex-start' }}>
                  {member.is_captain && (
                    <Badge variant="outline" className="border-yellow-400 text-yellow-400 text-xs">
                      C
                    </Badge>
                  )}
                  <span className="text-white font-bold text-lg" style={{ color: settings.textColor }}>
                    {member.users?.discord_username || 'Unknown'}
                  </span>
                </div>
                
                <div className={`flex items-center space-x-3 text-sm mt-1 ${side === 'right' ? 'flex-row-reverse space-x-reverse' : ''}`}>
                  {sceneSettings.showCurrentRank && member.users?.current_rank && (
                    <span className={`font-medium ${getRankColor(member.users.current_rank)}`}>
                      {member.users.current_rank}
                    </span>
                  )}
                  {sceneSettings.showAdaptiveWeight && (member.users as any)?.display_weight && (
                    <span className="text-cyan-400 font-bold">
                      {(member.users as any).display_weight}
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
    </div>
  );

  const containerStyle = {
    backgroundColor: settings.backgroundColor === 'transparent' ? 'transparent' : settings.backgroundColor,
    color: settings.textColor,
  };

  return (
    <div 
      className="w-screen h-screen flex items-center justify-center p-8 relative overflow-hidden" 
      style={{
        ...containerStyle,
        backgroundImage: sceneSettings.backgroundImage ? `url(${sceneSettings.backgroundImage})` : undefined,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      {/* Background overlay for better text readability */}
      <div className="absolute inset-0 bg-black/40" />
      
      <div className="relative z-10 max-w-7xl w-full">
        {/* Main Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center space-x-6 mb-6">
            <div 
              className="text-6xl font-black uppercase tracking-wider" 
              style={{ color: settings.headerTextColor, fontFamily: sceneSettings.fontFamily }}
            >
              {team1.name}
            </div>
            <div className="flex flex-col items-center">
              <Swords className="w-16 h-16 text-red-500 mb-2" />
              <div className="text-white/70 text-lg uppercase tracking-wide font-bold">
                VS
              </div>
            </div>
            <div 
              className="text-6xl font-black uppercase tracking-wider" 
              style={{ color: settings.headerTextColor, fontFamily: sceneSettings.fontFamily }}
            >
              {team2.name}
            </div>
          </div>
          <div className="text-2xl text-white/80 uppercase tracking-wider font-bold">
            Upcoming Match
          </div>
        </div>

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