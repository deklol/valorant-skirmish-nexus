import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Trophy, Users, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

interface IntegratedBracketViewProps {
  tournamentId: string;
}

interface MatchData {
  id: string;
  round_number: number;
  match_number: number;
  team1_id: string | null;
  team2_id: string | null;
  winner_id: string | null;
  status: string;
  score_team1: number;
  score_team2: number;
  team1?: { name: string; id: string } | null;
  team2?: { name: string; id: string } | null;
}

const IntegratedBracketView = ({ tournamentId }: IntegratedBracketViewProps) => {
  const [matches, setMatches] = useState<MatchData[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchBracketData();
  }, [tournamentId]);

  const fetchBracketData = async () => {
    try {
      const { data, error } = await supabase
        .from('matches')
        .select(`
          *,
          team1:teams!matches_team1_id_fkey (name, id),
          team2:teams!matches_team2_id_fkey (name, id)
        `)
        .eq('tournament_id', tournamentId)
        .order('round_number', { ascending: true })
        .order('match_number', { ascending: true });

      if (error) throw error;
      setMatches(data || []);
    } catch (error) {
      console.error('Error fetching bracket:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      pending: "bg-gray-500/20 text-gray-400",
      live: "bg-red-500/20 text-red-400",
      completed: "bg-green-500/20 text-green-400"
    };

    return (
      <Badge className={variants[status] || variants.pending}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  if (loading) {
    return (
      <Card className="bg-slate-800 border-slate-700">
        <CardContent className="py-8 text-center">
          <p className="text-slate-400">Loading bracket...</p>
        </CardContent>
      </Card>
    );
  }

  // Group matches by round
  const rounds = matches.reduce((acc, match) => {
    if (!acc[match.round_number]) {
      acc[match.round_number] = [];
    }
    acc[match.round_number].push(match);
    return acc;
  }, {} as Record<number, MatchData[]>);

  return (
    <Card className="bg-slate-800 border-slate-700">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <Trophy className="w-5 h-5" />
          Tournament Bracket
        </CardTitle>
      </CardHeader>
      <CardContent>
        {Object.keys(rounds).length === 0 ? (
          <p className="text-slate-400 text-center py-8">No bracket generated yet.</p>
        ) : (
          <div className="space-y-6">
            {Object.entries(rounds).map(([roundNum, roundMatches]) => (
              <div key={roundNum} className="space-y-2">
                <h3 className="text-white font-semibold text-lg">
                  Round {roundNum}
                  {roundNum === '1' && ' (First Round)'}
                  {Object.keys(rounds).length === parseInt(roundNum) && ' (Final)'}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {roundMatches.map((match) => (
                    <div key={match.id} className="bg-slate-700 p-4 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-slate-300 text-sm">Match {match.match_number}</span>
                        <div className="flex items-center gap-2">
                          {getStatusBadge(match.status)}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => navigate(`/match/${match.id}`)}
                            className="h-6 w-6 p-0 text-slate-400 hover:text-white"
                          >
                            <ExternalLink className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <div className={`p-2 rounded ${match.winner_id === match.team1_id ? 'bg-green-600/20 border border-green-600/50' : 'bg-slate-600'}`}>
                          <div className="flex items-center justify-between">
                            <span className="text-white">{match.team1?.name || 'TBD'}</span>
                            <span className="text-white font-bold">{match.score_team1}</span>
                          </div>
                        </div>
                        
                        <div className={`p-2 rounded ${match.winner_id === match.team2_id ? 'bg-green-600/20 border border-green-600/50' : 'bg-slate-600'}`}>
                          <div className="flex items-center justify-between">
                            <span className="text-white">{match.team2?.name || 'TBD'}</span>
                            <span className="text-white font-bold">{match.score_team2}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default IntegratedBracketView;
