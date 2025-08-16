import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Trophy, Users, ExternalLink, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';

interface LiveMatch {
  id: string;
  round_number: number;
  match_number: number;
  status: string;
  team1?: { name: string; id: string } | null;
  team2?: { name: string; id: string } | null;
  tournament?: { name: string; id: string } | null;
  scheduled_time?: string;
  score_team1: number;
  score_team2: number;
}

interface ValorantMatch {
  id: string;
  teams: { name: string; country: string; score: string }[];
  status: string;
  event: string;
  tournament: string;
  img?: string;
  in?: string;
}

const LiveMatches = () => {
  const [liveMatches, setLiveMatches] = useState<LiveMatch[]>([]);
  const [recentResults, setRecentResults] = useState<ValorantMatch[]>([]);
  const [loadingLive, setLoadingLive] = useState(true);
  const [loadingResults, setLoadingResults] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchLiveMatches();
    fetchRecentResults();

    // Real-time subscription for match updates
    const channel = supabase
      .channel('live-matches')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'matches',
          filter: 'status=eq.live'
        },
        () => {
          fetchLiveMatches();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchLiveMatches = async () => {
    try {
      const { data, error } = await supabase
        .from('matches')
        .select(`
          *,
          team1:teams!matches_team1_id_fkey (name, id),
          team2:teams!matches_team2_id_fkey (name, id),
          tournament:tournaments (name, id)
        `)
        .eq('status', 'live')
        .order('scheduled_time', { ascending: true });

      if (error) throw error;
      setLiveMatches(data || []);
    } catch (error) {
      console.error('Error fetching live matches:', error);
    } finally {
      setLoadingLive(false);
    }
  };

  const fetchRecentResults = async () => {
    try {
      const res = await fetch('https://vlr.orlandomm.net/api/v1/matches');
      const json = await res.json();
      if (json?.data) {
        const finishedOrScored = json.data
          .filter((m: ValorantMatch) => {
            // keep matches that are live OR have a score for both teams
            const hasScores =
              m.teams &&
              m.teams.length === 2 &&
              m.teams.every(t => t.score !== null && t.score !== '');
            return m.status.toLowerCase() === 'live' || hasScores;
          })
          .slice(0, 3);
  
        setRecentResults(finishedOrScored);
      }
    } catch (error) {
      console.error('Error fetching Valorant results:', error);
    } finally {
      setLoadingResults(false);
    }
  };


  const formatTime = (dateString?: string) => {
    if (!dateString) return null;
    return new Date(dateString).toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Live Matches */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Trophy className="w-5 h-5" />
            Live Matches ({loadingLive ? '...' : liveMatches.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loadingLive ? (
            <p className="text-slate-400">Loading live matches...</p>
          ) : liveMatches.length === 0 ? (
            <p className="text-slate-400 text-center">
              No live matches at the moment
            </p>
          ) : (
            <div
              className={`grid gap-4 ${
                liveMatches.length === 1
                  ? 'grid-cols-1'
                  : liveMatches.length === 2
                  ? 'grid-cols-1 md:grid-cols-2'
                  : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
              }`}
            >
              {liveMatches.slice(0, 3).map((match) => {
                const formattedTime = formatTime(match.scheduled_time);
                return (
                  <div
                    key={match.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => navigate(`/match/${match.id}`)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ')
                        navigate(`/match/${match.id}`);
                    }}
                    className="bg-slate-700 p-4 rounded-lg relative group transition hover:shadow-lg hover:scale-[1.015] cursor-pointer"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Badge className="bg-red-500/20 text-red-400">
                          🔴 LIVE
                        </Badge>
                        <span className="text-slate-300 text-sm">
                          {match.tournament?.name || ''}{' '}
                          {match.tournament?.name
                            ? `- Round ${match.round_number}`
                            : ''}
                        </span>
                      </div>
                      {formattedTime && (
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-slate-400" />
                          <span className="text-slate-400 text-sm">
                            {formattedTime}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="flex-1">
                      <div className="flex items-center justify-between bg-slate-600 p-3 rounded">
                        <span className="text-white font-medium">
                          {match.team1?.name || ''}
                        </span>
                        <span className="text-white font-bold text-lg">
                          {match.score_team1}
                        </span>
                      </div>
                      <div className="text-center text-slate-400 text-sm py-1">
                        VS
                      </div>
                      <div className="flex items-center justify-between bg-slate-600 p-3 rounded">
                        <span className="text-white font-medium">
                          {match.team2?.name || ''}
                        </span>
                        <span className="text-white font-bold text-lg">
                          {match.score_team2}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Valorant Results */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Trophy className="w-5 h-5" />
            Recent Valorant Results
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loadingResults ? (
            <p className="text-slate-400">Loading results...</p>
          ) : recentResults.length === 0 ? (
            <p className="text-slate-400 text-center">
              No recent results found
            </p>
          ) : (
            <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
              {recentResults.map((match) => (
                <div
                  key={match.id}
                  onClick={() =>
                    window.open(`https://www.vlr.gg/${match.id}`, '_blank')
                  }
                  className="bg-slate-700 p-4 rounded-lg hover:shadow-lg hover:scale-[1.015] transition cursor-pointer"
                >
                  <div className="flex items-center justify-between mb-3">
                    <Badge className="bg-green-500/20 text-green-400">
                      Finished
                    </Badge>
                    {match.in && (
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-slate-400" />
                        <span className="text-slate-400 text-sm">
                          {match.in}
                        </span>
                      </div>
                    )}
                  </div>
                  <p className="text-slate-300 text-sm truncate mb-2">
                    {match.tournament || match.event}
                  </p>
                  {match.teams.map((team, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between bg-slate-600 p-3 rounded mb-1"
                    >
                      <span className="text-white font-medium">
                        {team.name}
                      </span>
                      <span className="text-white font-bold text-lg">
                        {team.score || '-'}
                      </span>
                    </div>
                  ))}
                  <div className="flex justify-end mt-2">
                    <Button
                      size="sm"
                      className="bg-red-600 hover:bg-red-700 text-white"
                    >
                      <ExternalLink className="w-3 h-3 mr-1" />
                      View
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default LiveMatches;
