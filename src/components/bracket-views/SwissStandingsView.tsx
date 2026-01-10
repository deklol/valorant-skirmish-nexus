/**
 * Swiss Standings View Component
 * Displays Swiss tournament standings with points, tiebreakers, and round progress
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Trophy, Users, RefreshCw, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

interface SwissStandingsViewProps {
  tournamentId: string;
  tournamentName?: string;
}

interface SwissStanding {
  teamId: string;
  teamName: string;
  wins: number;
  losses: number;
  points: number;
  buchholz: number;
  opponentsPlayed: string[];
}

interface SwissMatch {
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

const SwissStandingsView = ({ tournamentId, tournamentName }: SwissStandingsViewProps) => {
  const [standings, setStandings] = useState<SwissStanding[]>([]);
  const [matches, setMatches] = useState<SwissMatch[]>([]);
  const [currentRound, setCurrentRound] = useState(1);
  const [totalRounds, setTotalRounds] = useState(5);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchSwissData();
    
    // Real-time updates
    const channel = supabase
      .channel(`swiss:${tournamentId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'matches',
        filter: `tournament_id=eq.${tournamentId}`,
      }, () => {
        fetchSwissData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tournamentId]);

  const fetchSwissData = async () => {
    try {
      setLoading(true);

      // Fetch tournament config
      const { data: tournament } = await supabase
        .from('tournaments')
        .select('swiss_rounds')
        .eq('id', tournamentId)
        .single();

      if (tournament?.swiss_rounds) {
        setTotalRounds(tournament.swiss_rounds);
      }

      // Fetch all matches
      const { data: matchesData } = await supabase
        .from('matches')
        .select(`
          *,
          team1:teams!matches_team1_id_fkey (name, id),
          team2:teams!matches_team2_id_fkey (name, id)
        `)
        .eq('tournament_id', tournamentId)
        .order('round_number', { ascending: true })
        .order('match_number', { ascending: true });

      // Fetch teams
      const { data: teams } = await supabase
        .from('teams')
        .select('id, name')
        .eq('tournament_id', tournamentId);

      if (matchesData && teams) {
        const processedMatches = matchesData.map((match: any) => ({
          ...match,
          team1: match.team1 && typeof match.team1 === 'object' ? match.team1 : null,
          team2: match.team2 && typeof match.team2 === 'object' ? match.team2 : null,
        }));
        
        setMatches(processedMatches);

        // Calculate standings
        const standingsMap = new Map<string, SwissStanding>();
        
        teams.forEach(team => {
          standingsMap.set(team.id, {
            teamId: team.id,
            teamName: team.name,
            wins: 0,
            losses: 0,
            points: 0,
            buchholz: 0,
            opponentsPlayed: []
          });
        });

        // Count wins/losses from completed matches
        const completedMatches = processedMatches.filter(m => m.status === 'completed');
        
        completedMatches.forEach(match => {
          if (match.team1_id && match.team2_id) {
            const team1 = standingsMap.get(match.team1_id);
            const team2 = standingsMap.get(match.team2_id);

            if (team1 && team2) {
              team1.opponentsPlayed.push(match.team2_id);
              team2.opponentsPlayed.push(match.team1_id);

              if (match.winner_id === match.team1_id) {
                team1.wins++;
                team1.points += 3;
                team2.losses++;
              } else if (match.winner_id === match.team2_id) {
                team2.wins++;
                team2.points += 3;
                team1.losses++;
              }
            }
          }
        });

        // Calculate Buchholz
        standingsMap.forEach(standing => {
          standing.buchholz = standing.opponentsPlayed.reduce((sum, oppId) => {
            const opp = standingsMap.get(oppId);
            return sum + (opp?.points || 0);
          }, 0);
        });

        // Sort by points, then Buchholz
        const sortedStandings = Array.from(standingsMap.values())
          .sort((a, b) => {
            if (b.points !== a.points) return b.points - a.points;
            return b.buchholz - a.buchholz;
          });

        setStandings(sortedStandings);

        // Determine current round
        const maxRound = Math.max(...processedMatches.map(m => m.round_number), 1);
        setCurrentRound(maxRound);
      }
    } catch (error) {
      console.error('Error fetching Swiss data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRoundMatches = (round: number) => {
    return matches.filter(m => m.round_number === round);
  };

  const getPositionBadge = (position: number) => {
    if (position === 1) return <Badge className="bg-yellow-500/20 text-yellow-400">🥇 1st</Badge>;
    if (position === 2) return <Badge className="bg-gray-400/20 text-gray-300">🥈 2nd</Badge>;
    if (position === 3) return <Badge className="bg-orange-500/20 text-orange-400">🥉 3rd</Badge>;
    return <Badge variant="outline" className="border-slate-600">{position}</Badge>;
  };

  if (loading) {
    return (
      <Card className="bg-slate-800 border-slate-700">
        <CardContent className="py-8 text-center">
          <div className="flex items-center justify-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin" />
            <p className="text-slate-400">Loading Swiss standings...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-yellow-500" />
              {tournamentName || 'Swiss Tournament'} - Standings
            </div>
            <Badge className="bg-blue-500/20 text-blue-400">
              Round {currentRound} of {totalRounds}
            </Badge>
          </CardTitle>
        </CardHeader>
      </Card>

      {/* Standings Table */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white text-lg flex items-center gap-2">
            <Users className="w-5 h-5" />
            Current Standings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="border-slate-700">
                <TableHead className="text-slate-400">Pos</TableHead>
                <TableHead className="text-slate-400">Team</TableHead>
                <TableHead className="text-slate-400 text-center">W</TableHead>
                <TableHead className="text-slate-400 text-center">L</TableHead>
                <TableHead className="text-slate-400 text-center">Pts</TableHead>
                <TableHead className="text-slate-400 text-center">Buchholz</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {standings.map((standing, index) => (
                <TableRow 
                  key={standing.teamId} 
                  className="border-slate-700 hover:bg-slate-700/50 cursor-pointer"
                  onClick={() => navigate(`/team/${standing.teamId}`)}
                >
                  <TableCell>{getPositionBadge(index + 1)}</TableCell>
                  <TableCell className="text-white font-medium">{standing.teamName}</TableCell>
                  <TableCell className="text-center text-green-400">{standing.wins}</TableCell>
                  <TableCell className="text-center text-red-400">{standing.losses}</TableCell>
                  <TableCell className="text-center text-white font-bold">{standing.points}</TableCell>
                  <TableCell className="text-center text-slate-400">{standing.buchholz}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Round Matches */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white text-lg">Round Matches</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
            {Array.from({ length: totalRounds }, (_, i) => i + 1).map(round => (
              <Button
                key={round}
                size="sm"
                variant={currentRound === round ? "default" : "outline"}
                className={currentRound === round ? "bg-red-600" : "border-slate-600"}
                onClick={() => setCurrentRound(round)}
              >
                Round {round}
              </Button>
            ))}
          </div>

          <div className="grid gap-3">
            {getRoundMatches(currentRound).map(match => (
              <div
                key={match.id}
                className="p-3 bg-slate-700/50 rounded-lg flex items-center justify-between cursor-pointer hover:bg-slate-700"
                onClick={() => navigate(`/match/${match.id}`)}
              >
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className={`text-sm ${match.winner_id === match.team1_id ? 'text-green-400 font-bold' : 'text-slate-300'}`}>
                      {match.team1?.name || 'TBD'}
                    </span>
                    <span className="text-white font-mono">{match.score_team1}</span>
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <span className={`text-sm ${match.winner_id === match.team2_id ? 'text-green-400 font-bold' : 'text-slate-300'}`}>
                      {match.team2?.name || 'TBD'}
                    </span>
                    <span className="text-white font-mono">{match.score_team2}</span>
                  </div>
                </div>
                <div className="ml-4 flex items-center gap-2">
                  <Badge className={
                    match.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                    match.status === 'live' ? 'bg-red-500/20 text-red-400' :
                    'bg-gray-500/20 text-gray-400'
                  }>
                    {match.status}
                  </Badge>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </div>
              </div>
            ))}
            {getRoundMatches(currentRound).length === 0 && (
              <p className="text-slate-400 text-center py-4">No matches in this round yet</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SwissStandingsView;
