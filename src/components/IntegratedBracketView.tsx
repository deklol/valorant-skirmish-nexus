
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Trophy, Users, Clock, ExternalLink, RefreshCw } from "lucide-react";
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
  scheduled_time: string | null;
  team1?: { name: string; id: string } | null;
  team2?: { name: string; id: string } | null;
}

interface Tournament {
  max_teams: number;
  bracket_type: string;
  match_format: string;
  status: string;
  name: string;
}

const IntegratedBracketView = ({ tournamentId }: IntegratedBracketViewProps) => {
  const [matches, setMatches] = useState<MatchData[]>([]);
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchBracketData();
  }, [tournamentId]);

  const fetchBracketData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('Fetching bracket data for tournament:', tournamentId);
      
      // Fetch tournament details
      const { data: tournamentData, error: tournamentError } = await supabase
        .from('tournaments')
        .select('max_teams, bracket_type, match_format, status, name')
        .eq('id', tournamentId)
        .single();

      if (tournamentError) {
        console.error('Tournament error:', tournamentError);
        throw new Error(`Failed to fetch tournament: ${tournamentError.message}`);
      }

      if (!tournamentData) {
        throw new Error('Tournament not found');
      }

      console.log('Tournament data:', tournamentData);
      setTournament(tournamentData);

      // Fetch matches with proper team joins - using the same approach as BracketView
      const { data: matchesData, error: matchesError } = await supabase
        .from('matches')
        .select(`
          *,
          team1:teams!matches_team1_id_fkey (name, id),
          team2:teams!matches_team2_id_fkey (name, id)
        `)
        .eq('tournament_id', tournamentId)
        .order('round_number', { ascending: true })
        .order('match_number', { ascending: true });

      if (matchesError) {
        console.error('Matches error:', matchesError);
        // Don't throw error, just log and continue with empty matches
        console.warn('Could not fetch matches, continuing with empty bracket');
        setMatches([]);
        return;
      }

      console.log('Raw matches data:', matchesData);
      
      // Process the matches data to ensure proper structure
      const processedMatches = (matchesData || []).map(match => ({
        ...match,
        team1: match.team1 && typeof match.team1 === 'object' && 'name' in match.team1 ? match.team1 : null,
        team2: match.team2 && typeof match.team2 === 'object' && 'name' in match.team2 ? match.team2 : null
      }));

      console.log('Processed matches:', processedMatches);
      setMatches(processedMatches);

    } catch (error: any) {
      console.error('Error fetching bracket:', error);
      setError(error.message || 'Failed to load bracket data');
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

  const formatTime = (timeString: string | null) => {
    if (!timeString) return "TBD";
    return new Date(timeString).toLocaleDateString("en-GB", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  const generateBracketStructure = (maxTeams: number) => {
    const rounds = Math.ceil(Math.log2(maxTeams));
    const structure = [];
    
    for (let round = 1; round <= rounds; round++) {
      const matchesInRound = Math.ceil(maxTeams / Math.pow(2, round));
      structure.push({
        round,
        matchCount: matchesInRound,
        name: getRoundName(round, rounds)
      });
    }
    
    return structure;
  };

  const getRoundName = (roundNumber: number, maxRounds: number) => {
    if (roundNumber === maxRounds) return "Final";
    if (roundNumber === maxRounds - 1) return "Semi-Final";
    if (roundNumber === maxRounds - 2) return "Quarter-Final";
    if (roundNumber === 1) return "Round 1";
    return `Round ${roundNumber}`;
  };

  const getMatchesByRound = (roundNumber: number) => {
    return matches.filter(match => match.round_number === roundNumber);
  };

  if (loading) {
    return (
      <Card className="bg-slate-800 border-slate-700">
        <CardContent className="py-8 text-center">
          <div className="flex items-center justify-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin" />
            <p className="text-slate-400">Loading bracket...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Trophy className="w-5 h-5" />
            Tournament Bracket
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-red-400 mb-4">Error: {error}</p>
            <Button 
              onClick={fetchBracketData} 
              variant="outline" 
              className="border-slate-600 text-slate-300 hover:bg-slate-700"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!tournament) {
    return (
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Trophy className="w-5 h-5" />
            Tournament Bracket
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-slate-400 text-center py-8">Tournament not found.</p>
        </CardContent>
      </Card>
    );
  }

  // Only show "no bracket" message if tournament is NOT live/completed AND no matches exist
  if (matches.length === 0 && !['live', 'completed'].includes(tournament.status)) {
    return (
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Trophy className="w-5 h-5" />
            Tournament Bracket - {tournament.name}
          </CardTitle>
          <div className="flex items-center gap-4 mt-2">
            <Badge variant="outline" className="border-slate-600 text-slate-300">
              {tournament.bracket_type.replace('_', ' ')}
            </Badge>
            <Badge variant="outline" className="border-slate-600 text-slate-300">
              {tournament.match_format}
            </Badge>
            <Badge variant="outline" className="border-slate-600 text-slate-300">
              Status: {tournament.status}
            </Badge>
            <Button
              size="sm"
              variant="outline"
              onClick={() => navigate(`/bracket/${tournamentId}`)}
              className="ml-auto border-slate-600 text-slate-300 hover:bg-slate-700"
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Full Bracket View
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Trophy className="w-16 h-16 mx-auto text-slate-400 mb-4" />
            <p className="text-slate-400 text-lg mb-2">No bracket generated yet</p>
            <p className="text-slate-500">
              The tournament bracket will appear here once teams are balanced and matches are scheduled.
            </p>
            <Button 
              onClick={fetchBracketData} 
              variant="outline" 
              className="mt-4 border-slate-600 text-slate-300 hover:bg-slate-700"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // If we reach here, we either have matches OR the tournament is live/completed, so show the bracket
  const bracketStructure = generateBracketStructure(tournament.max_teams || 8);

  return (
    <Card className="bg-slate-800 border-slate-700">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <Trophy className="w-5 h-5" />
          Tournament Bracket - {tournament.name}
        </CardTitle>
        <div className="flex items-center gap-4 mt-2">
          <Badge variant="outline" className="border-slate-600 text-slate-300">
            {tournament.bracket_type.replace('_', ' ')}
          </Badge>
          <Badge variant="outline" className="border-slate-600 text-slate-300">
            {tournament.match_format}
          </Badge>
          <Badge variant="outline" className="border-slate-600 text-slate-300">
            Status: {tournament.status}
          </Badge>
          <Badge variant="outline" className="border-slate-600 text-slate-300">
            {matches.length} matches
          </Badge>
          <div className="ml-auto flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={fetchBracketData}
              className="border-slate-600 text-slate-300 hover:bg-slate-700"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => navigate(`/bracket/${tournamentId}`)}
              className="border-slate-600 text-slate-300 hover:bg-slate-700"
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Full View
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto pb-4">
          <div className="flex gap-6 min-w-max">
            {bracketStructure.map((roundInfo) => {
              const roundMatches = getMatchesByRound(roundInfo.round);
              
              return (
                <div key={roundInfo.round} className="flex flex-col space-y-4 min-w-[280px]">
                  <h3 className="text-lg font-bold text-white text-center py-2 bg-slate-700 rounded-lg">
                    {roundInfo.name}
                  </h3>
                  
                  <div className="space-y-3">
                    {Array.from({ length: roundInfo.matchCount }, (_, matchIndex) => {
                      const existingMatch = roundMatches.find(m => m.match_number === matchIndex + 1);
                      
                      return (
                        <div key={`${roundInfo.round}-${matchIndex}`} className="bg-slate-700 p-3 rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-slate-300 text-sm">Match {matchIndex + 1}</span>
                            <div className="flex items-center gap-2">
                              {existingMatch ? getStatusBadge(existingMatch.status) : (
                                <Badge className="bg-gray-500/20 text-gray-400">Pending</Badge>
                              )}
                            </div>
                          </div>
                          
                          <div className="space-y-2">
                            <div className={`p-2 rounded flex items-center justify-between ${
                              existingMatch?.winner_id === existingMatch?.team1_id 
                                ? 'bg-green-600/20 border border-green-600/50' 
                                : 'bg-slate-600'
                            }`}>
                              <div className="flex items-center gap-2">
                                <Users className="w-3 h-3 text-slate-400" />
                                <span className="text-white text-sm">
                                  {existingMatch?.team1?.name || "TBD"}
                                </span>
                                {existingMatch?.winner_id === existingMatch?.team1_id && (
                                  <Trophy className="w-3 h-3 text-yellow-500" />
                                )}
                              </div>
                              <span className="text-white font-bold">
                                {existingMatch?.score_team1 || 0}
                              </span>
                            </div>
                            
                            <div className={`p-2 rounded flex items-center justify-between ${
                              existingMatch?.winner_id === existingMatch?.team2_id 
                                ? 'bg-green-600/20 border border-green-600/50' 
                                : 'bg-slate-600'
                            }`}>
                              <div className="flex items-center gap-2">
                                <Users className="w-3 h-3 text-slate-400" />
                                <span className="text-white text-sm">
                                  {existingMatch?.team2?.name || "TBD"}
                                </span>
                                {existingMatch?.winner_id === existingMatch?.team2_id && (
                                  <Trophy className="w-3 h-3 text-yellow-500" />
                                )}
                              </div>
                              <span className="text-white font-bold">
                                {existingMatch?.score_team2 || 0}
                              </span>
                            </div>
                          </div>
                          
                          <div className="flex items-center justify-between text-xs text-slate-400 pt-2 mt-2 border-t border-slate-600">
                            <div className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              <span>{existingMatch ? formatTime(existingMatch.scheduled_time) : "TBD"}</span>
                            </div>
                            {existingMatch?.status === "live" && (
                              <div className="flex items-center gap-1">
                                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                                <span className="text-red-400">LIVE</span>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default IntegratedBracketView;
