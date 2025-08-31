import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Team } from "@/types/tournamentDetail";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Swords } from "lucide-react";
import { useBroadcastSettings } from "@/hooks/useBroadcastSettings";

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

      // Get adaptive weights and tournament transparency data
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
              weight_source: adaptiveWeight?.weight_source || 'current_rank',
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
      .map(m => (m.users as any)?.adaptive_weight || m.users?.weight_rating || 150)
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

  const PlayerCard = ({ member, teamName }: { member: any; teamName: string }) => (
    <div className="flex items-center space-x-4 bg-black/20 backdrop-blur-sm rounded-lg p-4 border border-white/10">
      <Avatar className="w-12 h-12">
        <AvatarImage src={member.users?.discord_avatar_url || undefined} />
        <AvatarFallback className="bg-slate-700 text-white">
          {member.users?.discord_username?.slice(0, 2).toUpperCase() || '??'}
        </AvatarFallback>
      </Avatar>
      
      <div className="flex-1">
        <div className="flex items-center space-x-2">
          <span className="text-white font-medium" style={{ color: settings.textColor }}>
            {member.users?.discord_username || 'Unknown'}
          </span>
          {member.is_captain && (
            <Badge variant="outline" className="border-yellow-400 text-yellow-400 text-xs">
              C
            </Badge>
          )}
        </div>
        
        <div className="flex items-center space-x-3 text-sm">
          {sceneSettings.showRiotId && member.users?.riot_id && (
            <span className="text-white/70">
              {member.users.riot_id}
            </span>
          )}
          {sceneSettings.showCurrentRank && member.users?.current_rank && (
            <span className={getRankColor(member.users.current_rank)}>
              {member.users.current_rank}
            </span>
          )}
          {sceneSettings.showPeakRank && member.users?.peak_rank && (
            <span className={`text-white/60 ${getRankColor(member.users.peak_rank)}`}>
              Peak: {member.users.peak_rank}
            </span>
          )}
          {sceneSettings.showAdaptiveWeight && (member.users as any)?.adaptive_weight && (
            <span className="text-cyan-400">
              {(member.users as any).adaptive_weight} AWR
            </span>
          )}
          {sceneSettings.showTournamentWins && member.users?.tournaments_won && (
            <span className="text-green-400">
              {member.users.tournaments_won}W
            </span>
          )}
        </div>
      </div>
    </div>
  );

  const containerStyle = {
    backgroundColor: settings.backgroundColor === 'transparent' ? 'transparent' : settings.backgroundColor,
    color: settings.textColor,
  };

  return (
    <div className="w-screen h-screen bg-transparent flex items-center justify-center p-8" style={containerStyle}>
      <div className="max-w-7xl w-full">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="text-5xl font-bold mb-4 flex items-center justify-center space-x-4" style={{ color: settings.headerTextColor }}>
            <span>{team1.name}</span>
            <Swords className="w-12 h-12 text-red-500" />
            <span>{team2.name}</span>
          </div>
          <div className="text-xl text-white/70" style={{ color: settings.textColor + '80' }}>Upcoming Match</div>
        </div>

        <div className="grid grid-cols-2 gap-16">
          {/* Team 1 */}
          <div className="space-y-6">
            <div className="text-center">
              <div className="text-3xl font-bold mb-2" style={{ color: settings.headerTextColor }}>{team1.name}</div>
              <div className="text-cyan-400 text-lg">Avg Weight: {team1Avg}</div>
              <div className="text-sm text-white/50">Seed: #{team1.seed || 'TBD'}</div>
            </div>
            
            <div className="space-y-4">
              {team1.team_members
                .sort((a, b) => (b.is_captain ? 1 : 0) - (a.is_captain ? 1 : 0))
                .map((member) => (
                  <PlayerCard key={member.user_id} member={member} teamName={team1.name} />
                ))}
            </div>
          </div>

          {/* Team 2 */}
          <div className="space-y-6">
            <div className="text-center">
              <div className="text-3xl font-bold mb-2" style={{ color: settings.headerTextColor }}>{team2.name}</div>
              <div className="text-cyan-400 text-lg">Avg Weight: {team2Avg}</div>
              <div className="text-sm text-white/50">Seed: #{team2.seed || 'TBD'}</div>
            </div>
            
            <div className="space-y-4">
              {team2.team_members
                .sort((a, b) => (b.is_captain ? 1 : 0) - (a.is_captain ? 1 : 0))
                .map((member) => (
                  <PlayerCard key={member.user_id} member={member} teamName={team2.name} />
                ))}
            </div>
          </div>
        </div>

        {/* Stats Comparison */}
        <div className="mt-12 text-center">
          <div className="bg-black/30 backdrop-blur-sm rounded-xl p-6 border border-white/10 inline-block">
            <div className="text-white/70 mb-2" style={{ color: settings.textColor + '80' }}>Weight Difference</div>
            <div className={`text-2xl font-bold ${weightDiff < 10 ? 'text-green-400' : weightDiff < 25 ? 'text-yellow-400' : 'text-red-400'}`}>
              {weightDiff} points
            </div>
            <div className="text-sm text-white/50 mt-1" style={{ color: settings.textColor + '60' }}>
              {weightDiff < 10 ? 'Very Balanced' : weightDiff < 25 ? 'Balanced' : 'Favored Match'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}