import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Trophy, Users, Swords, ExternalLink, Play, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { GlassCard, BetaButton, BetaBadge } from './ui-beta';

interface BetaBracketPreviewProps {
  tournamentId: string;
  tournamentName?: string;
}

interface MatchData {
  id: string;
  round_number: number;
  match_number: number;
  status: string;
  score_team1: number | null;
  score_team2: number | null;
  team1?: { id: string; name: string } | null;
  team2?: { id: string; name: string } | null;
  winner_id: string | null;
}

export const BetaBracketPreview = ({ tournamentId, tournamentName }: BetaBracketPreviewProps) => {
  const [matches, setMatches] = useState<MatchData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMatches();

    // Real-time updates
    const channel = supabase
      .channel(`bracket-preview:${tournamentId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'matches',
          filter: `tournament_id=eq.${tournamentId}`,
        },
        () => fetchMatches()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tournamentId]);

  const fetchMatches = async () => {
    try {
      const { data } = await supabase
        .from('matches')
        .select(`
          id, round_number, match_number, status, score_team1, score_team2, winner_id,
          team1:teams!matches_team1_id_fkey (id, name),
          team2:teams!matches_team2_id_fkey (id, name)
        `)
        .eq('tournament_id', tournamentId)
        .order('round_number', { ascending: true })
        .order('match_number', { ascending: true });

      setMatches(data || []);
    } catch (error) {
      console.error('Error fetching matches:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <GlassCard variant="strong" className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <Trophy className="w-6 h-6 text-[hsl(var(--beta-accent))] animate-pulse" />
          <h3 className="text-xl font-bold text-[hsl(var(--beta-text-primary))]">Loading Bracket...</h3>
        </div>
      </GlassCard>
    );
  }

  if (matches.length === 0) {
    return null;
  }

  // Group matches by round
  const rounds = [...new Set(matches.map(m => m.round_number))].sort((a, b) => a - b);
  const maxRound = Math.max(...rounds);
  const liveMatches = matches.filter(m => m.status === 'live');
  const pendingMatches = matches.filter(m => m.status === 'pending');
  const completedMatches = matches.filter(m => m.status === 'completed');

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'success';
      case 'live': return 'accent';
      default: return 'default';
    }
  };

  const getRoundName = (round: number) => {
    const roundsFromEnd = maxRound - round;
    if (roundsFromEnd === 0) return 'Finals';
    if (roundsFromEnd === 1) return 'Semi-Finals';
    if (roundsFromEnd === 2) return 'Quarter-Finals';
    return `Round ${round}`;
  };

  return (
    <GlassCard variant="strong" className="p-6 overflow-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-[hsl(var(--beta-accent)/0.2)]">
            <Trophy className="w-6 h-6 text-[hsl(var(--beta-accent))]" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-[hsl(var(--beta-text-primary))]">
              Live Bracket
            </h3>
            <p className="text-sm text-[hsl(var(--beta-text-muted))]">
              {completedMatches.length}/{matches.length} matches completed
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {liveMatches.length > 0 && (
            <BetaBadge variant="accent" size="md" className="animate-pulse">
              <Play className="w-3 h-3 mr-1" />
              {liveMatches.length} Live
            </BetaBadge>
          )}
          <Link to={`/bracket/${tournamentId}`}>
            <BetaButton variant="outline" size="sm">
              <ExternalLink className="w-4 h-4 mr-2" />
              Full Bracket
            </BetaButton>
          </Link>
        </div>
      </div>

      {/* Bracket Visual */}
      <div className="overflow-x-auto pb-2">
        <div className="flex gap-4 min-w-max">
          {rounds.map(round => (
            <div key={round} className="flex flex-col gap-3 min-w-[240px]">
              <div className="text-center text-sm font-semibold text-[hsl(var(--beta-text-secondary))] pb-2 border-b border-[hsl(var(--beta-border))]">
                {getRoundName(round)}
              </div>
              <div className="flex flex-col gap-3 justify-around flex-1">
                {matches
                  .filter(m => m.round_number === round)
                  .map(match => (
                    <Link key={match.id} to={`/beta/match/${match.id}`}>
                      <div className={`
                        p-3 rounded-lg border transition-all cursor-pointer
                        ${match.status === 'live' 
                          ? 'bg-[hsl(var(--beta-accent)/0.1)] border-[hsl(var(--beta-accent)/0.5)] ring-1 ring-[hsl(var(--beta-accent)/0.3)]' 
                          : 'bg-[hsl(var(--beta-surface-3))] border-[hsl(var(--beta-border))] hover:border-[hsl(var(--beta-accent)/0.5)]'
                        }
                      `}>
                        {/* Match Header */}
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs text-[hsl(var(--beta-text-muted))]">
                            Match {match.match_number}
                          </span>
                          <BetaBadge variant={getStatusColor(match.status)} size="sm">
                            {match.status === 'live' && <span className="w-1.5 h-1.5 rounded-full bg-current mr-1 animate-pulse" />}
                            {match.status}
                          </BetaBadge>
                        </div>
                        
                        {/* Teams */}
                        <div className="space-y-1.5">
                          <div className={`flex items-center justify-between p-1.5 rounded ${
                            match.winner_id === match.team1?.id 
                              ? 'bg-[hsl(var(--beta-success)/0.15)]' 
                              : ''
                          }`}>
                            <span className={`text-sm truncate max-w-[140px] ${
                              match.winner_id === match.team1?.id 
                                ? 'text-[hsl(var(--beta-success))] font-semibold' 
                                : 'text-[hsl(var(--beta-text-primary))]'
                            }`}>
                              {match.team1?.name || 'TBD'}
                            </span>
                            <span className={`text-sm font-bold ${
                              match.winner_id === match.team1?.id 
                                ? 'text-[hsl(var(--beta-success))]' 
                                : 'text-[hsl(var(--beta-text-secondary))]'
                            }`}>
                              {match.score_team1 ?? '-'}
                            </span>
                          </div>
                          <div className={`flex items-center justify-between p-1.5 rounded ${
                            match.winner_id === match.team2?.id 
                              ? 'bg-[hsl(var(--beta-success)/0.15)]' 
                              : ''
                          }`}>
                            <span className={`text-sm truncate max-w-[140px] ${
                              match.winner_id === match.team2?.id 
                                ? 'text-[hsl(var(--beta-success))] font-semibold' 
                                : 'text-[hsl(var(--beta-text-primary))]'
                            }`}>
                              {match.team2?.name || 'TBD'}
                            </span>
                            <span className={`text-sm font-bold ${
                              match.winner_id === match.team2?.id 
                                ? 'text-[hsl(var(--beta-success))]' 
                                : 'text-[hsl(var(--beta-text-secondary))]'
                            }`}>
                              {match.score_team2 ?? '-'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Stats */}
      <div className="mt-4 pt-4 border-t border-[hsl(var(--beta-border))] flex flex-wrap gap-4 text-sm">
        <div className="flex items-center gap-2 text-[hsl(var(--beta-text-muted))]">
          <Swords className="w-4 h-4" />
          <span>{matches.length} total matches</span>
        </div>
        {liveMatches.length > 0 && (
          <div className="flex items-center gap-2 text-[hsl(var(--beta-accent))]">
            <Play className="w-4 h-4" />
            <span>{liveMatches.length} in progress</span>
          </div>
        )}
        {pendingMatches.length > 0 && (
          <div className="flex items-center gap-2 text-[hsl(var(--beta-text-muted))]">
            <Clock className="w-4 h-4" />
            <span>{pendingMatches.length} pending</span>
          </div>
        )}
      </div>
    </GlassCard>
  );
};

export default BetaBracketPreview;
