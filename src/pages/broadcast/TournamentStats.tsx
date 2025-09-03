import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Tournament } from "@/types/tournament";
import { Users, Trophy, Clock, Target } from "lucide-react";
import { useBroadcastSettings } from "@/hooks/useBroadcastSettings";
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

interface StatsData {
  totalPlayers: number;
  totalTeams: number;
  completedMatches: number;
  totalMatches: number;
  averageWeight: number;
  topRank: string;
  tournamentProgress: number;
}

export default function TournamentStats() {
  const { id } = useParams<{ id: string }>();
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const { settings } = useBroadcastSettings();

  useEffect(() => {
    if (!id) return;

    const fetchTournamentStats = async () => {
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

      // Fetch teams and players
      const { data: teamsData } = await supabase
        .from('teams')
        .select(`
          id,
          team_members (
            user_id,
            users (
              current_rank,
              weight_rating
            )
          )
        `)
        .eq('tournament_id', id);

      // Fetch matches
      const { data: matchesData } = await supabase
        .from('matches')
        .select('id, status')
        .eq('tournament_id', id);

      // Fetch adaptive weights
      const { data: adaptiveWeights } = await supabase
        .from('tournament_adaptive_weights')
        .select('calculated_adaptive_weight, current_rank')
        .eq('tournament_id', id);

      if (teamsData && matchesData) {
        const totalTeams = teamsData.length;
        const totalPlayers = teamsData.reduce((sum, team) => sum + team.team_members.length, 0);
        const completedMatches = matchesData.filter(m => m.status === 'completed').length;
        const totalMatches = matchesData.length;
        
        // Calculate average weight
        const weights = adaptiveWeights?.map(w => w.calculated_adaptive_weight).filter(Boolean) || [];
        const averageWeight = weights.length > 0 
          ? Math.round(weights.reduce((a, b) => a + b, 0) / weights.length)
          : 150;

        // Find top rank
        const ranks = adaptiveWeights?.map(w => w.current_rank).filter(Boolean) || [];
        const rankPriority = {
          'radiant': 9,
          'immortal': 8,
          'ascendant': 7,
          'diamond': 6,
          'platinum': 5,
          'gold': 4,
          'silver': 3,
          'bronze': 2,
          'iron': 1
        };
        
        const topRank = ranks.reduce((highest, current) => {
          if (!current) return highest;
          const currentPriority = Object.entries(rankPriority).find(([rank]) => 
            current.toLowerCase().includes(rank)
          )?.[1] || 0;
          const highestPriority = Object.entries(rankPriority).find(([rank]) => 
            highest.toLowerCase().includes(rank)
          )?.[1] || 0;
          
          return currentPriority > highestPriority ? current : highest;
        }, 'Iron');

        const tournamentProgress = totalMatches > 0 ? (completedMatches / totalMatches) * 100 : 0;

        setStats({
          totalPlayers,
          totalTeams,
          completedMatches,
          totalMatches,
          averageWeight,
          topRank,
          tournamentProgress,
        });
      }

      setLoading(false);
    };

    fetchTournamentStats();
  }, [id]);

  if (loading || !tournament || !stats) {
    return <BroadcastLoading message="Loading tournament stats..." />;
  }

  const sceneSettings = settings.sceneSettings.tournamentStats;
  const containerStyle = getBroadcastContainerStyle(sceneSettings, settings);
  const cardStyle = getBroadcastCardStyle(sceneSettings, settings);
  const cardClasses = getBroadcastCardClasses(sceneSettings.broadcastFriendlyMode);

  const getRankColor = (rank: string) => {
    const rankLower = rank.toLowerCase();
    if (rankLower.includes('radiant')) return '#FFF176';
    if (rankLower.includes('immortal')) return '#A52834';
    if (rankLower.includes('ascendant')) return '#84FF6F';
    if (rankLower.includes('diamond')) return '#8d64e2';
    if (rankLower.includes('platinum')) return '#5CA3E4';
    return '#9CA3AF';
  };

  return (
    <div className="w-screen h-screen bg-transparent flex items-center justify-center p-8" style={containerStyle}>
      <div className="max-w-4xl w-full">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 
            className="text-5xl font-bold mb-4"
            style={{ 
              color: sceneSettings.headerTextColor || settings.headerTextColor,
              fontFamily: sceneSettings.fontFamily || 'inherit',
              fontSize: sceneSettings.headerFontSize || 48
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
            Tournament Statistics
          </div>
        </div>

        {/* Stats Grid - Complete remaining cards */}
        {sceneSettings.showIndividualStatCards && (
          <div className="grid grid-cols-2 gap-8 mb-12">
          {/* Participants */}
          <div 
            className={`${cardClasses} ${sceneSettings.broadcastFriendlyMode ? 'p-8 text-center' : 'backdrop-blur-sm rounded-2xl p-8 border text-center'}`}
            style={cardStyle}
          >
            <div className="flex items-center justify-center mb-4">
              <Users className="w-12 h-12" style={{ color: sceneSettings.textColor || settings.textColor }} />
            </div>
            <div 
              className="text-4xl font-bold mb-2"
              style={{ 
                color: sceneSettings.headerTextColor || settings.headerTextColor,
                fontFamily: sceneSettings.fontFamily || 'inherit'
              }}
            >
              {stats.totalPlayers}
            </div>
            <div 
              className="text-lg"
              style={{ 
                color: (sceneSettings.textColor || settings.textColor) + '70',
                fontFamily: sceneSettings.fontFamily || 'inherit'
              }}
            >
              Players
            </div>
            <div 
              className="text-sm mt-2"
              style={{ 
                color: sceneSettings.textColor || settings.textColor,
                fontFamily: sceneSettings.fontFamily || 'inherit'
              }}
            >
              {stats.totalTeams} Teams
            </div>
          </div>

          {/* Matches */}
          <div 
            className={`${cardClasses} ${sceneSettings.broadcastFriendlyMode ? 'p-8 text-center' : 'backdrop-blur-sm rounded-2xl p-8 border text-center'}`}
            style={cardStyle}
          >
            <div className="flex items-center justify-center mb-4">
              <Trophy className="w-12 h-12" style={{ color: sceneSettings.textColor || settings.textColor }} />
            </div>
            <div 
              className="text-4xl font-bold mb-2"
              style={{ 
                color: sceneSettings.headerTextColor || settings.headerTextColor,
                fontFamily: sceneSettings.fontFamily || 'inherit'
              }}
            >
              {stats.completedMatches}/{stats.totalMatches}
            </div>
            <div 
              className="text-lg"
              style={{ 
                color: (sceneSettings.textColor || settings.textColor) + '70',
                fontFamily: sceneSettings.fontFamily || 'inherit'
              }}
            >
              Matches
            </div>
            <div 
              className="text-sm mt-2"
              style={{ 
                color: sceneSettings.textColor || settings.textColor,
                fontFamily: sceneSettings.fontFamily || 'inherit'
              }}
            >
              {Math.round(stats.tournamentProgress)}% Complete
            </div>
          </div>

          {/* Average Weight */}
          <div 
            className={`${cardClasses} ${sceneSettings.broadcastFriendlyMode ? 'p-8 text-center' : 'backdrop-blur-sm rounded-2xl p-8 border text-center'}`}
            style={cardStyle}
          >
            <div className="flex items-center justify-center mb-4">
              <Target className="w-12 h-12" style={{ color: sceneSettings.textColor || settings.textColor }} />
            </div>
            <div 
              className="text-4xl font-bold mb-2"
              style={{ 
                color: sceneSettings.textColor || settings.textColor,
                fontFamily: sceneSettings.fontFamily || 'inherit'
              }}
            >
              {stats.averageWeight}
            </div>
            <div 
              className="text-lg"
              style={{ 
                color: (sceneSettings.textColor || settings.textColor) + '70',
                fontFamily: sceneSettings.fontFamily || 'inherit'
              }}
            >
              Avg Weight
            </div>
            <div 
              className="text-sm mt-2"
              style={{ 
                color: (sceneSettings.textColor || settings.textColor) + '50',
                fontFamily: sceneSettings.fontFamily || 'inherit'
              }}
            >
              Tournament Rating
            </div>
          </div>

          {/* Top Rank */}
          <div 
            className={`${cardClasses} ${sceneSettings.broadcastFriendlyMode ? 'p-8 text-center' : 'backdrop-blur-sm rounded-2xl p-8 border text-center'}`}
            style={cardStyle}
          >
            <div className="flex items-center justify-center mb-4">
              <Clock className="w-12 h-12" style={{ color: sceneSettings.textColor || settings.textColor }} />
            </div>
            <div 
              className="text-4xl font-bold mb-2"
              style={{ 
                color: getRankColor(stats.topRank),
                fontFamily: sceneSettings.fontFamily || 'inherit'
              }}
            >
              {stats.topRank}
            </div>
            <div 
              className="text-lg"
              style={{ 
                color: (sceneSettings.textColor || settings.textColor) + '70',
                fontFamily: sceneSettings.fontFamily || 'inherit'
              }}
            >
              Highest Rank
            </div>
            <div 
              className="text-sm mt-2"
              style={{ 
                color: (sceneSettings.textColor || settings.textColor) + '50',
                fontFamily: sceneSettings.fontFamily || 'inherit'
              }}
            >
              In Tournament
            </div>
          </div>
          </div>
        )}

        {/* Progress Bar */}
        {sceneSettings.showProgressBar && (
          <div
            className={`${cardClasses} ${sceneSettings.broadcastFriendlyMode ? 'p-8' : 'backdrop-blur-sm rounded-2xl p-8 border'}`}
            style={cardStyle}
          >
            <div className="text-center mb-6">
              <div 
                className="text-2xl font-bold mb-2"
                style={{ 
                  color: sceneSettings.headerTextColor || settings.headerTextColor,
                  fontFamily: sceneSettings.fontFamily || 'inherit'
                }}
              >
                Tournament Progress
              </div>
              <div 
                style={{ 
                  color: (sceneSettings.textColor || settings.textColor) + '70',
                  fontFamily: sceneSettings.fontFamily || 'inherit'
                }}
              >
                {stats.completedMatches} of {stats.totalMatches} matches completed
              </div>
            </div>
            
            <div className="relative">
              <div 
                className="w-full rounded-full h-6 border"
                style={{ 
                  backgroundColor: 'rgba(0, 0, 0, 0.3)',
                  borderColor: sceneSettings.borderColor || '#ffffff10'
                }}
              >
                <div 
                  className="bg-gradient-to-r from-green-500 to-blue-500 h-6 rounded-full flex items-center justify-center transition-all duration-1000"
                  style={{ width: `${stats.tournamentProgress}%` }}
                >
                  <span 
                    className="text-sm font-bold"
                    style={{ 
                      color: sceneSettings.headerTextColor || settings.headerTextColor,
                      fontFamily: sceneSettings.fontFamily || 'inherit'
                    }}
                  >
                    {Math.round(stats.tournamentProgress)}%
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tournament Status */}
        {sceneSettings.showTournamentStatusHeader && (
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