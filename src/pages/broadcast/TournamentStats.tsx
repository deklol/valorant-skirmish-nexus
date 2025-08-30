import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Tournament } from "@/types/tournament";
import { Users, Trophy, Clock, Target } from "lucide-react";

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
    return (
      <div className="w-screen h-screen bg-transparent flex items-center justify-center">
        <div className="text-white text-2xl">Loading stats...</div>
      </div>
    );
  }

  const getRankColor = (rank: string) => {
    const rankLower = rank.toLowerCase();
    if (rankLower.includes('radiant')) return 'text-yellow-400';
    if (rankLower.includes('immortal')) return 'text-purple-400';
    if (rankLower.includes('ascendant')) return 'text-green-400';
    if (rankLower.includes('diamond')) return 'text-blue-400';
    if (rankLower.includes('platinum')) return 'text-cyan-400';
    return 'text-slate-400';
  };

  return (
    <div className="w-screen h-screen bg-transparent flex items-center justify-center p-8">
      <div className="max-w-4xl w-full">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-white mb-4">{tournament.name}</h1>
          <div className="text-xl text-white/70">Tournament Statistics</div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-8 mb-12">
          {/* Participants */}
          <div className="bg-black/40 backdrop-blur-sm rounded-2xl p-8 border border-white/20 text-center">
            <div className="flex items-center justify-center mb-4">
              <Users className="w-12 h-12 text-blue-400" />
            </div>
            <div className="text-4xl font-bold text-white mb-2">{stats.totalPlayers}</div>
            <div className="text-white/70 text-lg">Players</div>
            <div className="text-cyan-400 text-sm mt-2">{stats.totalTeams} Teams</div>
          </div>

          {/* Matches */}
          <div className="bg-black/40 backdrop-blur-sm rounded-2xl p-8 border border-white/20 text-center">
            <div className="flex items-center justify-center mb-4">
              <Trophy className="w-12 h-12 text-yellow-400" />
            </div>
            <div className="text-4xl font-bold text-white mb-2">
              {stats.completedMatches}/{stats.totalMatches}
            </div>
            <div className="text-white/70 text-lg">Matches</div>
            <div className="text-green-400 text-sm mt-2">
              {Math.round(stats.tournamentProgress)}% Complete
            </div>
          </div>

          {/* Average Weight */}
          <div className="bg-black/40 backdrop-blur-sm rounded-2xl p-8 border border-white/20 text-center">
            <div className="flex items-center justify-center mb-4">
              <Target className="w-12 h-12 text-purple-400" />
            </div>
            <div className="text-4xl font-bold text-purple-400 mb-2">{stats.averageWeight}</div>
            <div className="text-white/70 text-lg">Avg Weight</div>
            <div className="text-white/50 text-sm mt-2">Tournament Rating</div>
          </div>

          {/* Top Rank */}
          <div className="bg-black/40 backdrop-blur-sm rounded-2xl p-8 border border-white/20 text-center">
            <div className="flex items-center justify-center mb-4">
              <Clock className="w-12 h-12 text-green-400" />
            </div>
            <div className={`text-4xl font-bold mb-2 ${getRankColor(stats.topRank)}`}>
              {stats.topRank}
            </div>
            <div className="text-white/70 text-lg">Highest Rank</div>
            <div className="text-white/50 text-sm mt-2">In Tournament</div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="bg-black/40 backdrop-blur-sm rounded-2xl p-8 border border-white/20">
          <div className="text-center mb-6">
            <div className="text-2xl font-bold text-white mb-2">Tournament Progress</div>
            <div className="text-white/70">{stats.completedMatches} of {stats.totalMatches} matches completed</div>
          </div>
          
          <div className="relative">
            <div className="w-full bg-black/30 rounded-full h-6 border border-white/10">
              <div 
                className="bg-gradient-to-r from-green-500 to-blue-500 h-6 rounded-full flex items-center justify-center transition-all duration-1000"
                style={{ width: `${stats.tournamentProgress}%` }}
              >
                <span className="text-white text-sm font-bold">
                  {Math.round(stats.tournamentProgress)}%
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Tournament Status */}
        <div className="mt-8 text-center">
          <div 
            className={`inline-block px-6 py-3 rounded-full font-bold text-lg ${
              tournament.status === 'live' 
                ? 'bg-red-500/20 text-red-400 border border-red-500/30' 
                : tournament.status === 'completed' 
                  ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                  : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
            }`}
          >
            {tournament.status === 'live' && '🔴 LIVE'}
            {tournament.status === 'completed' && '✅ COMPLETED'}
            {tournament.status === 'open' && '📝 REGISTRATION OPEN'}
            {tournament.status === 'balancing' && '✋ TEAM BALANCING'}
            {tournament.status === 'draft' && '📋 DRAFT'}
          </div>
        </div>
      </div>
    </div>
  );
}