import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Trophy, Users, Clock, ExternalLink, RefreshCw, Map, Play } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { SwissStandingsView, RoundRobinView, DoubleEliminationView } from "@/components/bracket-views";
import type { BracketType } from "@/utils/formatGenerators";

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
  map_veto_enabled: boolean;
  bracket_position?: string | null;
  team1?: { name: string; id: string } | null;
  team2?: { name: string; id: string } | null;
}

interface Tournament {
  max_teams: number;
  bracket_type: string;
  match_format: string;
  status: string;
  name: string;
  swiss_rounds?: number;
}

interface MapVetoSession {
  id: string;
  match_id: string;
  status: string;
  current_turn_team_id: string | null;
}

const IntegratedBracketView = ({ tournamentId }: IntegratedBracketViewProps) => {
  const [matches, setMatches] = useState<MatchData[]>([]);
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [vetoSessions, setVetoSessions] = useState<MapVetoSession[]>([]);
  const [userTeamId, setUserTeamId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    fetchBracketData();
    if (user?.id) {
      fetchUserTeam();
    }

    // Live updates: auto-refresh bracket when matches/tournament change
    const channel = supabase
      .channel(`bracket:${tournamentId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'matches',
          filter: `tournament_id=eq.${tournamentId}`,
        },
        () => {
          fetchBracketData();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'tournaments',
          filter: `id=eq.${tournamentId}`,
        },
        () => {
          fetchBracketData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tournamentId, user?.id]);

  const fetchUserTeam = async () => {
    if (!user?.id) return;

    try {
      const { data: teamMember } = await supabase
        .from('team_members')
        .select('team_id, teams!inner(tournament_id)')
        .eq('user_id', user.id)
        .eq('teams.tournament_id', tournamentId)
        .maybeSingle();

      if (teamMember) {
        setUserTeamId(teamMember.team_id);
      }
    } catch (error) {
      // User may not be part of any team - this is expected
    }
  };

  const fetchBracketData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch tournament details
      const { data: tournamentData, error: tournamentError } = await supabase
        .from('tournaments')
        .select('max_teams, bracket_type, match_format, status, name, swiss_rounds')
        .eq('id', tournamentId)
        .maybeSingle();

      if (tournamentError) {
        throw new Error(`Failed to fetch tournament: ${tournamentError.message}`);
      }

      if (!tournamentData) {
        throw new Error('Tournament not found');
      }

      setTournament(tournamentData);

      // Fetch matches with proper team joins
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
        throw new Error(`Failed to fetch matches: ${matchesError.message}`);
      }

      const processedMatches = (matchesData || []).map((match: any) => ({
        ...match,
        team1: match.team1 && typeof match.team1 === 'object' && 'name' in match.team1 ? match.team1 : null,
        team2: match.team2 && typeof match.team2 === 'object' && 'name' in match.team2 ? match.team2 : null,
      }));

      setMatches(processedMatches);

      // Fetch map veto sessions for matches with veto enabled
      const vetoEnabledMatches = processedMatches.filter((m: any) => m.map_veto_enabled);
      if (vetoEnabledMatches.length > 0) {
        const { data: vetoData, error: vetoError } = await supabase
          .from('map_veto_sessions')
          .select('*')
          .in('match_id', vetoEnabledMatches.map((m: any) => m.id));

        if (!vetoError && vetoData) {
          setVetoSessions(vetoData);
        }
      }

    } catch (error: any) {
      console.error('Error fetching bracket:', error);
      setError(error.message || 'Failed to load bracket data');
    } finally {
      setLoading(false);
    }
  };

  const getVetoSession = (matchId: string) => {
    return vetoSessions.find(session => session.match_id === matchId);
  };

  const canParticipateInVeto = (match: MatchData) => {
    return userTeamId && (userTeamId === match.team1_id || userTeamId === match.team2_id);
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

  const getFormatDisplayName = (bracketType: string) => {
    const names: Record<string, string> = {
      single_elimination: 'Single Elimination',
      double_elimination: 'Double Elimination',
      swiss: 'Swiss',
      round_robin: 'Round Robin'
    };
    return names[bracketType] || bracketType.replace('_', ' ');
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
              {getFormatDisplayName(tournament.bracket_type)}
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

  // ============================================================================
  // FORMAT-SPECIFIC VIEW ROUTING
  // ============================================================================
  
  const bracketType = tournament.bracket_type as BracketType;

  // Swiss Format - Use dedicated Swiss view
  if (bracketType === 'swiss') {
    return (
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Trophy className="w-5 h-5" />
            Swiss Tournament - {tournament.name}
          </CardTitle>
          <div className="flex items-center gap-4 mt-2">
            <Badge variant="outline" className="border-blue-600 text-blue-300">
              Swiss System
            </Badge>
            <Badge variant="outline" className="border-slate-600 text-slate-300">
              {tournament.swiss_rounds || 5} Rounds
            </Badge>
            <Badge variant="outline" className="border-slate-600 text-slate-300">
              {tournament.match_format}
            </Badge>
            <Badge variant="outline" className="border-slate-600 text-slate-300">
              Status: {tournament.status}
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
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <SwissStandingsView 
            tournamentId={tournamentId} 
            tournamentName={tournament.name}
          />
        </CardContent>
      </Card>
    );
  }

  // Round Robin Format - Use dedicated Round Robin view
  if (bracketType === 'round_robin') {
    return (
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Trophy className="w-5 h-5" />
            Round Robin - {tournament.name}
          </CardTitle>
          <div className="flex items-center gap-4 mt-2">
            <Badge variant="outline" className="border-purple-600 text-purple-300">
              Round Robin
            </Badge>
            <Badge variant="outline" className="border-slate-600 text-slate-300">
              {tournament.match_format}
            </Badge>
            <Badge variant="outline" className="border-slate-600 text-slate-300">
              Status: {tournament.status}
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
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <RoundRobinView tournamentId={tournamentId} />
        </CardContent>
      </Card>
    );
  }

  // Double Elimination Format - Use dedicated Double Elimination view
  if (bracketType === 'double_elimination') {
    return (
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Trophy className="w-5 h-5" />
            Double Elimination - {tournament.name}
          </CardTitle>
          <div className="flex items-center gap-4 mt-2">
            <Badge variant="outline" className="border-orange-600 text-orange-300">
              Double Elimination
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
          <DoubleEliminationView tournamentId={tournamentId} />
        </CardContent>
      </Card>
    );
  }

  // Group Stage + Knockout Format - Show knockout bracket (groups shown in separate tab)
  if (bracketType === 'group_stage_knockout') {
    // Filter to only show knockout matches
    const knockoutMatches = matches.filter(m => m.bracket_position === 'knockout');
    
    if (knockoutMatches.length === 0) {
      return (
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Trophy className="w-5 h-5" />
              Knockout Stage - {tournament.name}
            </CardTitle>
            <div className="flex items-center gap-4 mt-2">
              <Badge variant="outline" className="border-teal-600 text-teal-300">
                Group Stage + Knockout
              </Badge>
              <Badge variant="outline" className="border-slate-600 text-slate-300">
                {tournament.match_format}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <Trophy className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground text-lg mb-2">Knockout stage not yet generated</p>
              <p className="text-muted-foreground/70">
                Complete all group stage matches first, then generate the knockout bracket from the Groups tab.
              </p>
            </div>
          </CardContent>
        </Card>
      );
    }

    // Show knockout bracket
    const knockoutMaxTeams = Math.pow(2, Math.ceil(Math.log2(knockoutMatches.length + 1)));
    const knockoutStructure = generateBracketStructure(knockoutMaxTeams);
    const getKnockoutMatchesByRound = (roundNumber: number) => 
      knockoutMatches.filter(m => m.round_number === roundNumber);

    return (
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Trophy className="w-5 h-5" />
            Knockout Stage - {tournament.name}
          </CardTitle>
          <div className="flex items-center gap-4 mt-2">
            <Badge variant="outline" className="border-teal-600 text-teal-300">
              Group Stage + Knockout
            </Badge>
            <Badge variant="outline" className="border-slate-600 text-slate-300">
              {tournament.match_format}
            </Badge>
            <Badge variant="outline" className="border-slate-600 text-slate-300">
              {knockoutMatches.length} knockout matches
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
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto pb-4">
            <div className="flex gap-6 min-w-max">
              {knockoutStructure.map((roundInfo) => {
                const roundMatches = getKnockoutMatchesByRound(roundInfo.round);
                if (roundMatches.length === 0) return null;
                
                return (
                  <div key={roundInfo.round} className="flex flex-col space-y-4 min-w-[280px]">
                    <h3 className="text-lg font-bold text-white text-center py-2 bg-slate-700 rounded-lg">
                      {roundInfo.name}
                    </h3>
                    {roundMatches.map((match) => (
                      <div
                        key={match.id}
                        className={`p-4 rounded-lg border transition-colors ${
                          match.status === 'live'
                            ? 'bg-red-900/20 border-red-500/50 animate-pulse'
                            : match.status === 'completed'
                            ? 'bg-green-900/10 border-green-700/30'
                            : 'bg-slate-700/50 border-slate-600'
                        }`}
                      >
                        <div className="flex justify-between items-start mb-3">
                          <span className="text-xs text-muted-foreground">
                            Match {match.match_number}
                          </span>
                          {getStatusBadge(match.status)}
                        </div>
                        <div className="space-y-2">
                          <div className={`flex justify-between items-center p-2 rounded ${
                            match.winner_id === match.team1_id 
                              ? 'bg-green-900/30 border border-green-600/30' 
                              : 'bg-slate-600/30'
                          }`}>
                            <span className="text-sm text-foreground font-medium">
                              {match.team1?.name || 'TBD'}
                            </span>
                            <span className="text-lg font-bold text-foreground">
                              {match.score_team1}
                            </span>
                          </div>
                          <div className={`flex justify-between items-center p-2 rounded ${
                            match.winner_id === match.team2_id 
                              ? 'bg-green-900/30 border border-green-600/30' 
                              : 'bg-slate-600/30'
                          }`}>
                            <span className="text-sm text-foreground font-medium">
                              {match.team2?.name || 'TBD'}
                            </span>
                            <span className="text-lg font-bold text-foreground">
                              {match.score_team2}
                            </span>
                          </div>
                        </div>
                        {match.scheduled_time && (
                          <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                            <Clock className="w-3 h-3" />
                            {formatTime(match.scheduled_time)}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // ============================================================================
  // SINGLE ELIMINATION (DEFAULT) - Original bracket view
  // ============================================================================
  
  const bracketStructure = generateBracketStructure(tournament.max_teams || 8);

  return (
    <Card className="bg-slate-800 border-slate-700">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <Trophy className="w-5 h-5" />
          Tournament Bracket - {tournament.name}
        </CardTitle>
        <div className="flex items-center gap-4 mt-2">
          <Badge variant="outline" className="border-green-600 text-green-300">
            Single Elimination
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
                      const vetoSession = existingMatch ? getVetoSession(existingMatch.id) : null;
                      const canParticipate = existingMatch ? canParticipateInVeto(existingMatch) : false;
                      
                      return (
                        <div key={`${roundInfo.round}-${matchIndex}`} className="bg-slate-700 p-3 rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-slate-300 text-sm">Match {matchIndex + 1}</span>
                            <div className="flex items-center gap-2">
                              {existingMatch ? getStatusBadge(existingMatch.status) : (
                                <Badge className="bg-gray-500/20 text-gray-400">Pending</Badge>
                              )}
                              {existingMatch && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => navigate(`/match/${existingMatch.id}`)}
                                  className="border-blue-600 text-blue-400 hover:bg-blue-600 hover:text-white"
                                >
                                  View Match
                                </Button>
                              )}
                            </div>
                          </div>
                          
                          {/* Map Veto Alert for Participants */}
                          {existingMatch?.map_veto_enabled && vetoSession?.status === 'in_progress' && canParticipate && (
                            <div className="mb-3 p-2 bg-yellow-500/20 border border-yellow-500/50 rounded-lg">
                              <div className="flex items-center gap-2">
                                <Map className="w-4 h-4 text-yellow-400" />
                                <span className="text-yellow-400 text-sm font-medium">Map Veto Ready!</span>
                              </div>
                              <p className="text-yellow-300 text-xs mt-1">Click "View Match" to participate in map selection</p>
                            </div>
                          )}
                          
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
                          
                          {existingMatch?.scheduled_time && (
                            <div className="mt-2 text-xs text-slate-400 flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {formatTime(existingMatch.scheduled_time)}
                            </div>
                          )}
                          
                          {/* Map veto status */}
                          {existingMatch?.map_veto_enabled && vetoSession && (
                            <div className="mt-2 text-xs text-slate-400 flex items-center gap-1">
                              <Map className="w-3 h-3" />
                              {vetoSession.status === 'completed' ? 'Map Selected' : 
                               vetoSession.status === 'in_progress' ? 'Veto In Progress' : 
                               'Awaiting Veto'}
                            </div>
                          )}
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
