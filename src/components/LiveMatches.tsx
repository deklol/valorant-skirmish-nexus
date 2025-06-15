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

const LiveMatches = () => {
  const [liveMatches, setLiveMatches] = useState<LiveMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchLiveMatches();
    
    // Set up real-time subscription for match updates
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
      setLoading(false);
    }
  };

  const formatTime = (dateString?: string) => {
    if (!dateString) return 'TBD';
    return new Date(dateString).toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <Card className="bg-slate-800 border-slate-700">
        <CardContent className="py-8 text-center">
          <p className="text-slate-400">Loading live matches...</p>
        </CardContent>
      </Card>
    );
  }

  if (liveMatches.length === 0) {
    return (
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Trophy className="w-5 h-5" />
            Live Matches
          </CardTitle>
        </CardHeader>
        <CardContent className="py-2">
          <p className="text-slate-400 text-center">No live matches at the moment</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-slate-800 border-slate-700">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <Trophy className="w-5 h-5" />
          Live Matches ({liveMatches.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {liveMatches.map((match) => (
            <div key={match.id} className="bg-slate-700 p-4 rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Badge className="bg-red-500/20 text-red-400">
                    🔴 LIVE
                  </Badge>
                  <span className="text-slate-300 text-sm">
                    {match.tournament?.name} - Round {match.round_number}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-slate-400" />
                  <span className="text-slate-400 text-sm">
                    {formatTime(match.scheduled_time)}
                  </span>
                </div>
              </div>
              
              <div className="flex items-center justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center justify-between bg-slate-600 p-3 rounded">
                    <span className="text-white font-medium">
                      {match.team1?.name || 'TBD'}
                    </span>
                    <span className="text-white font-bold text-lg">
                      {match.score_team1}
                    </span>
                  </div>
                  <div className="text-center text-slate-400 text-sm py-1">VS</div>
                  <div className="flex items-center justify-between bg-slate-600 p-3 rounded">
                    <span className="text-white font-medium">
                      {match.team2?.name || 'TBD'}
                    </span>
                    <span className="text-white font-bold text-lg">
                      {match.score_team2}
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="flex justify-between items-center">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate(`/tournament/${match.tournament?.id}`)}
                  className="border-slate-600 text-slate-300 hover:bg-slate-600"
                >
                  <Users className="w-3 h-3 mr-1" />
                  Tournament
                </Button>
                <Button
                  size="sm"
                  onClick={() => navigate(`/match/${match.id}`)}
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  <ExternalLink className="w-3 h-3 mr-1" />
                  Watch Live
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default LiveMatches;
