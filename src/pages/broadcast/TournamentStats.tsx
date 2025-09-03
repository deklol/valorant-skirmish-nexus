import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Tournament } from "@/types/tournament";
import { useBroadcastSettings } from "@/hooks/useBroadcastSettings";
import { Users, Trophy, Target, TrendingUp } from "lucide-react";
import { 
  getBroadcastContainerStyle,
  getBroadcastBlockStyle,
  getBroadcastBadgeStyle,
  BROADCAST_CONTAINER_CLASSES,
  BROADCAST_DEFAULTS,
  getRankColor
} from "@/utils/broadcastLayoutUtils";

interface StatsData {
  totalPlayers: number;
  totalTeams: number;
  completedMatches: number;
  totalMatches: number;
  averageWeight: number;
  topRank: string;
}

export default function TournamentStats() {
  const { id } = useParams<{ id: string }>();
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const { settings } = useBroadcastSettings();

  // Check for animate=false in URL
  const searchParams = new URLSearchParams(window.location.search);
  const shouldSkipAnimations = searchParams.get('animate') === 'false';

  useEffect(() => {
    if (!id) return;

    const fetchTournamentStats = async () => {
      try {
        // Fetch tournament info
        const { data: tournamentData } = await supabase
          .from('tournaments')
          .select('*')
          .eq('id', id)
          .single();

        if (!tournamentData) return;
        setTournament(tournamentData as Tournament);

        // Fetch teams and players
        const { data: teamsData } = await supabase
          .from('teams')
          .select(`
            *,
            team_members (
              *,
              users (*)
            )
          `)
          .eq('tournament_id', id);

        // Fetch matches
        const { data: matchesData } = await supabase
          .from('matches')
          .select('*')
          .eq('tournament_id', id);

        // Calculate stats
        const totalTeams = teamsData?.length || 0;
        const allPlayers = teamsData?.flatMap(team => team.team_members) || [];
        const totalPlayers = allPlayers.length;
        
        const completedMatches = matchesData?.filter(match => match.status === 'completed').length || 0;
        const totalMatches = matchesData?.length || 0;

        // Calculate average weight using default weights
        const averageWeight = 150; // Default tournament average

        // Find top rank
        const ranks = allPlayers
          .map(member => member.users?.peak_rank || member.users?.current_rank)
          .filter(Boolean);
        
        const rankHierarchy = ['Radiant', 'Immortal', 'Ascendant', 'Diamond', 'Platinum', 'Gold', 'Silver', 'Bronze', 'Iron'];
        let topRank = 'Unranked';
        
        for (const rank of rankHierarchy) {
          if (ranks.some(r => r.toLowerCase().includes(rank.toLowerCase()))) {
            topRank = rank;
            break;
          }
        }

        setStats({
          totalPlayers,
          totalTeams,
          completedMatches,
          totalMatches,
          averageWeight,
          topRank
        });

      } catch (error) {
        console.error('Error fetching tournament stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTournamentStats();
  }, [id]);

  // Skip loading state entirely if animate=false
  if (!shouldSkipAnimations && (loading || !tournament || !stats)) {
    return (
      <div className="w-screen h-screen bg-transparent flex items-center justify-center">
        <div 
          className="text-4xl font-black text-white"
          style={{ 
            fontFamily: BROADCAST_DEFAULTS.fontFamily,
            textShadow: '2px 2px 0px #000000'
          }}
        >
          Loading Tournament Stats...
        </div>
      </div>
    );
  }

  // If animate=false and we don't have data yet, show empty state instantly
  if (shouldSkipAnimations && (!tournament || !stats)) {
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

  const sceneSettings = settings.sceneSettings.tournamentStats;
  const containerStyle = getBroadcastContainerStyle(sceneSettings, settings);
  const isBroadcastMode = sceneSettings.broadcastFriendlyMode || sceneSettings.transparentBackground;

  const progress = stats.totalMatches > 0 ? (stats.completedMatches / stats.totalMatches) * 100 : 0;

  const StatBlock = ({ 
    icon: Icon, 
    title, 
    value, 
    subtitle, 
    color = BROADCAST_DEFAULTS.accentColor 
  }: { 
    icon: any, 
    title: string, 
    value: string | number, 
    subtitle?: string,
    color?: string 
  }) => {
    if (!isBroadcastMode) {
      // Legacy mode
      return (
        <div className="backdrop-blur-sm rounded-2xl p-8 border border-white/20 bg-black/40 text-center">
          <div className="flex items-center justify-center mb-4">
            <Icon className="w-12 h-12" style={{ color }} />
          </div>
          <div className="text-4xl font-bold text-white mb-2">
            {value}
          </div>
          <div className="text-lg text-gray-300">
            {title}
          </div>
          {subtitle && (
            <div className="text-sm text-gray-400 mt-2">
              {subtitle}
            </div>
          )}
        </div>
      );
    }

    // New broadcast-optimized design
    return (
      <div 
        className="border-4 border-white bg-black text-center p-6"
        style={{ minHeight: '200px' }}
      >
        <div className="flex items-center justify-center mb-4">
          <Icon className="w-16 h-16" style={{ color }} />
        </div>
        <div 
          className="text-5xl font-black text-white mb-2"
          style={{ 
            fontFamily: BROADCAST_DEFAULTS.fontFamily,
            color
          }}
        >
          {value}
        </div>
        <div 
          className="text-2xl font-bold text-white"
          style={{ fontFamily: BROADCAST_DEFAULTS.fontFamily }}
        >
          {title}
        </div>
        {subtitle && (
          <div 
            className="text-lg text-gray-300 mt-2 font-semibold"
            style={{ fontFamily: BROADCAST_DEFAULTS.fontFamily }}
          >
            {subtitle}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={BROADCAST_CONTAINER_CLASSES} style={containerStyle}>
      <div className="max-w-full h-full flex flex-col p-8">
        {/* Tournament Header */}
        <div className="text-center mb-12">
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
            className="text-4xl font-bold"
            style={{ 
              color: BROADCAST_DEFAULTS.accentColor,
              fontFamily: BROADCAST_DEFAULTS.fontFamily,
              textShadow: '1px 1px 0px #000000'
            }}
          >
            TOURNAMENT STATISTICS
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatBlock
            icon={Users}
            title="PLAYERS"
            value={stats.totalPlayers}
            subtitle={`${stats.totalTeams} Teams`}
            color={BROADCAST_DEFAULTS.accentColor}
          />
          
          <StatBlock
            icon={Trophy}
            title="MATCHES"
            value={`${stats.completedMatches}/${stats.totalMatches}`}
            subtitle="Completed"
            color={BROADCAST_DEFAULTS.successColor}
          />
          
          <StatBlock
            icon={Target}
            title="AVG WEIGHT"
            value={stats.averageWeight}
            subtitle="Points"
            color={BROADCAST_DEFAULTS.primaryColor}
          />
          
          <StatBlock
            icon={TrendingUp}
            title="TOP RANK"
            value={stats.topRank}
            color={getRankColor(stats.topRank)}
          />
        </div>

        {/* Progress Bar */}
        {isBroadcastMode && (
          <div className="bg-black border-4 border-white p-6 mb-8">
            <div 
              className="text-2xl font-black text-white mb-4 text-center"
              style={{ fontFamily: BROADCAST_DEFAULTS.fontFamily }}
            >
              TOURNAMENT PROGRESS
            </div>
            
            <div className="bg-gray-800 border-2 border-white h-12 relative">
              <div 
                className="h-full transition-all duration-1000 flex items-center justify-center"
                style={{ 
                  width: `${progress}%`,
                  backgroundColor: progress === 100 ? BROADCAST_DEFAULTS.successColor : BROADCAST_DEFAULTS.accentColor
                }}
              >
                <div 
                  className="text-black font-black text-lg"
                  style={{ fontFamily: BROADCAST_DEFAULTS.fontFamily }}
                >
                  {Math.round(progress)}%
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tournament Status Footer */}
        <div className="text-center mt-auto">
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