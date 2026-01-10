/**
 * Round Robin View Component
 * Displays round robin standings table and fixture grid
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Trophy, Users, RefreshCw, Grid3X3 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

interface RoundRobinViewProps {
  tournamentId: string;
  tournamentName?: string;
}

interface RRStanding {
  teamId: string;
  teamName: string;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
}

interface RRMatch {
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

const RoundRobinView = ({ tournamentId, tournamentName }: RoundRobinViewProps) => {
  const [standings, setStandings] = useState<RRStanding[]>([]);
  const [matches, setMatches] = useState<RRMatch[]>([]);
  const [teams, setTeams] = useState<{ id: string; name: string }[]>([]);
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchRoundRobinData();
    
    const channel = supabase
      .channel(`rr:${tournamentId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'matches',
        filter: `tournament_id=eq.${tournamentId}`,
      }, () => {
        fetchRoundRobinData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tournamentId]);

  const fetchRoundRobinData = async () => {
    try {
      setLoading(true);

      const [matchesRes, teamsRes] = await Promise.all([
        supabase
          .from('matches')
          .select(`
            *,
            team1:teams!matches_team1_id_fkey (name, id),
            team2:teams!matches_team2_id_fkey (name, id)
          `)
          .eq('tournament_id', tournamentId)
          .order('round_number')
          .order('match_number'),
        supabase
          .from('teams')
          .select('id, name')
          .eq('tournament_id', tournamentId)
      ]);

      if (matchesRes.data && teamsRes.data) {
        const processedMatches = matchesRes.data.map((match: any) => ({
          ...match,
          team1: match.team1 && typeof match.team1 === 'object' ? match.team1 : null,
          team2: match.team2 && typeof match.team2 === 'object' ? match.team2 : null,
        }));

        setMatches(processedMatches);
        setTeams(teamsRes.data);

        // Calculate standings
        const standingsMap = new Map<string, RRStanding>();
        
        teamsRes.data.forEach(team => {
          standingsMap.set(team.id, {
            teamId: team.id,
            teamName: team.name,
            played: 0,
            wins: 0,
            draws: 0,
            losses: 0,
            goalsFor: 0,
            goalsAgainst: 0,
            goalDifference: 0,
            points: 0
          });
        });

        processedMatches
          .filter(m => m.status === 'completed' && m.team1_id && m.team2_id)
          .forEach(match => {
            const team1 = standingsMap.get(match.team1_id!);
            const team2 = standingsMap.get(match.team2_id!);

            if (team1 && team2) {
              team1.played++;
              team2.played++;
              
              team1.goalsFor += match.score_team1 || 0;
              team1.goalsAgainst += match.score_team2 || 0;
              team2.goalsFor += match.score_team2 || 0;
              team2.goalsAgainst += match.score_team1 || 0;

              if (match.winner_id === match.team1_id) {
                team1.wins++;
                team1.points += 3;
                team2.losses++;
              } else if (match.winner_id === match.team2_id) {
                team2.wins++;
                team2.points += 3;
                team1.losses++;
              } else {
                // Draw
                team1.draws++;
                team2.draws++;
                team1.points += 1;
                team2.points += 1;
              }
            }
          });

        const sortedStandings = Array.from(standingsMap.values())
          .map(s => ({ ...s, goalDifference: s.goalsFor - s.goalsAgainst }))
          .sort((a, b) => {
            if (b.points !== a.points) return b.points - a.points;
            if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
            return b.goalsFor - a.goalsFor;
          });

        setStandings(sortedStandings);
      }
    } catch (error) {
      console.error('Error fetching round robin data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getHeadToHead = (team1Id: string, team2Id: string) => {
    const match = matches.find(m => 
      (m.team1_id === team1Id && m.team2_id === team2Id) ||
      (m.team1_id === team2Id && m.team2_id === team1Id)
    );
    
    if (!match) return { result: '-', match: null };
    
    if (match.status !== 'completed') {
      return { result: 'vs', match };
    }

    // Determine score from perspective of team1Id
    if (match.team1_id === team1Id) {
      return { result: `${match.score_team1}-${match.score_team2}`, match };
    } else {
      return { result: `${match.score_team2}-${match.score_team1}`, match };
    }
  };

  const getPositionBadge = (position: number) => {
    if (position === 1) return <Badge className="bg-yellow-500/20 text-yellow-400">🥇</Badge>;
    if (position === 2) return <Badge className="bg-gray-400/20 text-gray-300">🥈</Badge>;
    if (position === 3) return <Badge className="bg-orange-500/20 text-orange-400">🥉</Badge>;
    return <span className="text-slate-400">{position}</span>;
  };

  if (loading) {
    return (
      <Card className="bg-slate-800 border-slate-700">
        <CardContent className="py-8 text-center">
          <div className="flex items-center justify-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin" />
            <p className="text-slate-400">Loading standings...</p>
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
              {tournamentName || 'Round Robin'} - Standings
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant={viewMode === 'table' ? 'default' : 'outline'}
                onClick={() => setViewMode('table')}
                className={viewMode === 'table' ? 'bg-red-600' : 'border-slate-600'}
              >
                <Users className="w-4 h-4 mr-1" />
                Table
              </Button>
              <Button
                size="sm"
                variant={viewMode === 'grid' ? 'default' : 'outline'}
                onClick={() => setViewMode('grid')}
                className={viewMode === 'grid' ? 'bg-red-600' : 'border-slate-600'}
              >
                <Grid3X3 className="w-4 h-4 mr-1" />
                Grid
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
      </Card>

      {viewMode === 'table' ? (
        /* League Table View */
        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="pt-6">
            <Table>
              <TableHeader>
                <TableRow className="border-slate-700">
                  <TableHead className="text-slate-400 w-12">#</TableHead>
                  <TableHead className="text-slate-400">Team</TableHead>
                  <TableHead className="text-slate-400 text-center">P</TableHead>
                  <TableHead className="text-slate-400 text-center">W</TableHead>
                  <TableHead className="text-slate-400 text-center">D</TableHead>
                  <TableHead className="text-slate-400 text-center">L</TableHead>
                  <TableHead className="text-slate-400 text-center">GF</TableHead>
                  <TableHead className="text-slate-400 text-center">GA</TableHead>
                  <TableHead className="text-slate-400 text-center">GD</TableHead>
                  <TableHead className="text-slate-400 text-center font-bold">Pts</TableHead>
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
                    <TableCell className="text-center text-slate-400">{standing.played}</TableCell>
                    <TableCell className="text-center text-green-400">{standing.wins}</TableCell>
                    <TableCell className="text-center text-slate-400">{standing.draws}</TableCell>
                    <TableCell className="text-center text-red-400">{standing.losses}</TableCell>
                    <TableCell className="text-center text-slate-300">{standing.goalsFor}</TableCell>
                    <TableCell className="text-center text-slate-300">{standing.goalsAgainst}</TableCell>
                    <TableCell className={`text-center font-medium ${standing.goalDifference > 0 ? 'text-green-400' : standing.goalDifference < 0 ? 'text-red-400' : 'text-slate-400'}`}>
                      {standing.goalDifference > 0 ? '+' : ''}{standing.goalDifference}
                    </TableCell>
                    <TableCell className="text-center text-white font-bold text-lg">{standing.points}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : (
        /* Head-to-Head Grid View */
        <Card className="bg-slate-800 border-slate-700 overflow-x-auto">
          <CardContent className="pt-6">
            <div className="min-w-max">
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-700">
                    <TableHead className="text-slate-400 sticky left-0 bg-slate-800">Team</TableHead>
                    {teams.map(team => (
                      <TableHead key={team.id} className="text-slate-400 text-center min-w-[80px]">
                        {team.name.substring(0, 8)}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {teams.map(rowTeam => (
                    <TableRow key={rowTeam.id} className="border-slate-700">
                      <TableCell className="text-white font-medium sticky left-0 bg-slate-800">
                        {rowTeam.name}
                      </TableCell>
                      {teams.map(colTeam => {
                        if (rowTeam.id === colTeam.id) {
                          return (
                            <TableCell key={colTeam.id} className="text-center bg-slate-900">
                              -
                            </TableCell>
                          );
                        }
                        
                        const { result, match } = getHeadToHead(rowTeam.id, colTeam.id);
                        const isWin = match?.winner_id === rowTeam.id;
                        const isLoss = match?.winner_id === colTeam.id;
                        
                        return (
                          <TableCell 
                            key={colTeam.id} 
                            className={`text-center cursor-pointer hover:bg-slate-700 ${
                              isWin ? 'bg-green-900/30' : isLoss ? 'bg-red-900/30' : ''
                            }`}
                            onClick={() => match && navigate(`/match/${match.id}`)}
                          >
                            <span className={
                              isWin ? 'text-green-400 font-bold' : 
                              isLoss ? 'text-red-400' : 
                              'text-slate-400'
                            }>
                              {result}
                            </span>
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Completion Status */}
      <Card className="bg-slate-800 border-slate-700">
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Matches Completed:</span>
            <Badge className="bg-blue-500/20 text-blue-400">
              {matches.filter(m => m.status === 'completed').length} / {matches.length}
            </Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default RoundRobinView;
