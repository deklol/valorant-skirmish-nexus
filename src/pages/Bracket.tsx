
import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Trophy, Users, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import Header from "@/components/Header";

interface Match {
  id: string;
  round_number: number;
  match_number: number;
  team1_id: string | null;
  team2_id: string | null;
  winner_id: string | null;
  status: "pending" | "live" | "completed";
  score_team1: number;
  score_team2: number;
  scheduled_time: string | null;
  team1?: { name: string; id: string } | null;
  team2?: { name: string; id: string } | null;
  winner?: { name: string; id: string } | null;
}

interface Tournament {
  id: string;
  name: string;
  status: string;
  bracket_type: string;
}

const Bracket = () => {
  const { id } = useParams<{ id: string }>();
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const { isAdmin } = useAuth();

  useEffect(() => {
    const fetchBracketData = async () => {
      if (!id) return;

      try {
        setLoading(true);
        
        const { data: tournamentData, error: tournamentError } = await supabase
          .from('tournaments')
          .select('*')
          .eq('id', id)
          .single();

        if (tournamentError) throw tournamentError;

        const { data: matchesData, error: matchesError } = await supabase
          .from('matches')
          .select(`
            *,
            team1:teams!matches_team1_id_fkey (name, id),
            team2:teams!matches_team2_id_fkey (name, id),
            winner:teams!matches_winner_id_fkey (name, id)
          `)
          .eq('tournament_id', id)
          .order('round_number', { ascending: true })
          .order('match_number', { ascending: true });

        if (matchesError) throw matchesError;

        setTournament(tournamentData);
        setMatches(matchesData || []);
      } catch (error) {
        console.error('Error fetching bracket:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchBracketData();
  }, [id]);

  const getMatchesByRound = (roundNumber: number) => {
    return matches.filter(match => match.round_number === roundNumber);
  };

  const getMaxRounds = () => {
    return Math.max(...matches.map(match => match.round_number), 0);
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

  const formatTime = (timeString: string | null) => {
    if (!timeString) return "TBD";
    return new Date(timeString).toLocaleDateString("en-GB", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <p className="text-white text-lg">Loading bracket...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!tournament) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <p className="text-white text-lg">Tournament not found</p>
          </div>
        </div>
      </div>
    );
  }

  const maxRounds = getMaxRounds();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <Header />
      
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">{tournament.name} - Bracket</h1>
            <p className="text-slate-400">Tournament bracket and match results</p>
          </div>
          
          {isAdmin && (
            <Button className="bg-red-600 hover:bg-red-700 text-white">
              Generate Bracket
            </Button>
          )}
        </div>

        {matches.length === 0 ? (
          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="text-center py-12">
              <Trophy className="w-16 h-16 mx-auto text-slate-400 mb-4" />
              <p className="text-slate-400 text-lg">No bracket generated yet</p>
              <p className="text-slate-500 mt-2">The tournament bracket will appear here once teams are balanced and matches are scheduled.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-8">
            {/* Bracket Visualization */}
            <div className="overflow-x-auto">
              <div className="flex gap-8 min-w-max">
                {Array.from({ length: maxRounds }, (_, roundIndex) => {
                  const roundNumber = roundIndex + 1;
                  const roundMatches = getMatchesByRound(roundNumber);
                  
                  return (
                    <div key={roundNumber} className="flex flex-col space-y-4 min-w-[300px]">
                      <h3 className="text-white font-semibold text-center">
                        {roundNumber === maxRounds ? "Final" : 
                         roundNumber === maxRounds - 1 ? "Semi-Final" :
                         roundNumber === maxRounds - 2 ? "Quarter-Final" :
                         `Round ${roundNumber}`}
                      </h3>
                      
                      {roundMatches.map((match) => (
                        <Card key={match.id} className="bg-slate-800 border-slate-700 hover:border-slate-600 transition-colors">
                          <CardHeader className="pb-2">
                            <div className="flex items-center justify-between">
                              <div className="text-sm text-slate-400">Match {match.match_number}</div>
                              {getStatusBadge(match.status)}
                            </div>
                          </CardHeader>
                          <CardContent className="space-y-3">
                            {/* Team 1 */}
                            <div className={`flex items-center justify-between p-2 rounded ${
                              match.winner_id === match.team1_id ? 'bg-green-500/20 border border-green-500/30' : 'bg-slate-700'
                            }`}>
                              <div className="flex items-center gap-2">
                                <Users className="w-4 h-4 text-slate-400" />
                                <span className="text-white">{match.team1?.name || "TBD"}</span>
                              </div>
                              <span className="text-white font-bold">{match.score_team1}</span>
                            </div>
                            
                            {/* VS */}
                            <div className="text-center text-slate-400 text-sm">vs</div>
                            
                            {/* Team 2 */}
                            <div className={`flex items-center justify-between p-2 rounded ${
                              match.winner_id === match.team2_id ? 'bg-green-500/20 border border-green-500/30' : 'bg-slate-700'
                            }`}>
                              <div className="flex items-center gap-2">
                                <Users className="w-4 h-4 text-slate-400" />
                                <span className="text-white">{match.team2?.name || "TBD"}</span>
                              </div>
                              <span className="text-white font-bold">{match.score_team2}</span>
                            </div>
                            
                            {/* Match Info */}
                            <div className="flex items-center justify-between text-sm text-slate-400 pt-2 border-t border-slate-600">
                              <div className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                <span>{formatTime(match.scheduled_time)}</span>
                              </div>
                              {match.winner && (
                                <div className="flex items-center gap-1">
                                  <Trophy className="w-3 h-3 text-yellow-500" />
                                  <span className="text-yellow-500">Winner</span>
                                </div>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Match Results Summary */}
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white">Match Results</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {matches.filter(match => match.status === 'completed').map((match) => (
                    <div key={match.id} className="bg-slate-700 p-3 rounded-lg">
                      <div className="text-white font-medium mb-2">
                        {match.team1?.name || "TBD"} vs {match.team2?.name || "TBD"}
                      </div>
                      <div className="text-slate-400 text-sm mb-2">
                        Round {match.round_number}, Match {match.match_number}
                      </div>
                      <div className="text-white">
                        {match.score_team1} - {match.score_team2}
                      </div>
                      <div className="text-yellow-500 text-sm mt-1">
                        Winner: {match.winner?.name || "TBD"}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

export default Bracket;
