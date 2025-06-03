
import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Trophy, Users, Clock, Eye, Settings } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import Header from "@/components/Header";
import MapVetoDialog from "@/components/MapVetoDialog";

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
  match_format: string;
}

const BracketView = () => {
  const { id } = useParams<{ id: string }>();
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMatch, setSelectedMatch] = useState<string | null>(null);
  const [mapVetoOpen, setMapVetoOpen] = useState(false);
  const { user, isAdmin } = useAuth();

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

  const getRoundName = (roundNumber: number, maxRounds: number) => {
    if (roundNumber === maxRounds) return "Final";
    if (roundNumber === maxRounds - 1) return "Semi-Final";
    if (roundNumber === maxRounds - 2) return "Quarter-Final";
    if (roundNumber === 1) return "Round 1";
    return `Round ${roundNumber}`;
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

  const handleMapVeto = (matchId: string) => {
    setSelectedMatch(matchId);
    setMapVetoOpen(true);
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
            <div className="flex items-center gap-4 mt-2">
              <Badge variant="outline" className="border-slate-600 text-slate-300">
                {tournament.bracket_type.replace('_', ' ')}
              </Badge>
              <Badge variant="outline" className="border-slate-600 text-slate-300">
                {tournament.match_format}
              </Badge>
            </div>
          </div>
          
          {isAdmin && (
            <Button className="bg-red-600 hover:bg-red-700 text-white">
              <Settings className="w-4 h-4 mr-2" />
              Manage Bracket
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
            {/* Bracket Grid */}
            <div className="overflow-x-auto pb-4">
              <div className="flex gap-8 min-w-max">
                {Array.from({ length: maxRounds }, (_, roundIndex) => {
                  const roundNumber = roundIndex + 1;
                  const roundMatches = getMatchesByRound(roundNumber);
                  
                  return (
                    <div key={roundNumber} className="flex flex-col space-y-6 min-w-[320px]">
                      <h3 className="text-xl font-bold text-white text-center py-2 bg-slate-800 rounded-lg">
                        {getRoundName(roundNumber, maxRounds)}
                      </h3>
                      
                      <div className="space-y-4">
                        {roundMatches.map((match) => (
                          <Card key={match.id} className="bg-slate-800 border-slate-700 hover:border-slate-600 transition-colors">
                            <CardHeader className="pb-3">
                              <div className="flex items-center justify-between">
                                <div className="text-sm text-slate-400">Match {match.match_number}</div>
                                <div className="flex items-center gap-2">
                                  {getStatusBadge(match.status)}
                                  {match.status === "live" && tournament.match_format !== "BO1" && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="border-blue-600 text-blue-400 hover:bg-blue-600 hover:text-white"
                                      onClick={() => handleMapVeto(match.id)}
                                    >
                                      <Eye className="w-3 h-3 mr-1" />
                                      Maps
                                    </Button>
                                  )}
                                </div>
                              </div>
                            </CardHeader>
                            <CardContent className="space-y-3">
                              {/* Team 1 */}
                              <div className={`flex items-center justify-between p-3 rounded-lg transition-colors ${
                                match.winner_id === match.team1_id 
                                  ? 'bg-green-500/20 border border-green-500/30' 
                                  : match.status === 'completed' 
                                    ? 'bg-slate-700/50' 
                                    : 'bg-slate-700'
                              }`}>
                                <div className="flex items-center gap-2">
                                  <Users className="w-4 h-4 text-slate-400" />
                                  <span className="text-white font-medium">
                                    {match.team1?.name || "TBD"}
                                  </span>
                                  {match.winner_id === match.team1_id && (
                                    <Trophy className="w-4 h-4 text-yellow-500" />
                                  )}
                                </div>
                                <span className="text-white font-bold text-lg">
                                  {match.score_team1}
                                </span>
                              </div>
                              
                              {/* VS Divider */}
                              <div className="text-center">
                                <span className="text-slate-400 font-medium">VS</span>
                              </div>
                              
                              {/* Team 2 */}
                              <div className={`flex items-center justify-between p-3 rounded-lg transition-colors ${
                                match.winner_id === match.team2_id 
                                  ? 'bg-green-500/20 border border-green-500/30' 
                                  : match.status === 'completed' 
                                    ? 'bg-slate-700/50' 
                                    : 'bg-slate-700'
                              }`}>
                                <div className="flex items-center gap-2">
                                  <Users className="w-4 h-4 text-slate-400" />
                                  <span className="text-white font-medium">
                                    {match.team2?.name || "TBD"}
                                  </span>
                                  {match.winner_id === match.team2_id && (
                                    <Trophy className="w-4 h-4 text-yellow-500" />
                                  )}
                                </div>
                                <span className="text-white font-bold text-lg">
                                  {match.score_team2}
                                </span>
                              </div>
                              
                              {/* Match Info */}
                              <div className="flex items-center justify-between text-sm text-slate-400 pt-2 border-t border-slate-600">
                                <div className="flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  <span>{formatTime(match.scheduled_time)}</span>
                                </div>
                                {match.status === "live" && (
                                  <div className="flex items-center gap-1">
                                    <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                                    <span className="text-red-400">LIVE</span>
                                  </div>
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Champion */}
            {tournament.status === "completed" && (
              <Card className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border-yellow-500/30">
                <CardHeader>
                  <CardTitle className="text-center text-white flex items-center justify-center gap-2">
                    <Trophy className="w-6 h-6 text-yellow-500" />
                    Tournament Champion
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-center">
                  <div className="text-2xl font-bold text-yellow-500 mb-2">
                    {matches.find(m => m.round_number === maxRounds)?.winner?.name || "TBD"}
                  </div>
                  <p className="text-slate-300">Congratulations on winning {tournament.name}!</p>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>

      {/* Map Veto Dialog */}
      {selectedMatch && (
        <MapVetoDialog
          open={mapVetoOpen}
          onOpenChange={setMapVetoOpen}
          matchId={selectedMatch}
          team1Name={matches.find(m => m.id === selectedMatch)?.team1?.name || "Team 1"}
          team2Name={matches.find(m => m.id === selectedMatch)?.team2?.name || "Team 2"}
          currentTeamTurn={matches.find(m => m.id === selectedMatch)?.team1_id || ""}
          userTeamId={user?.id || null}
        />
      )}
    </div>
  );
};

export default BracketView;
