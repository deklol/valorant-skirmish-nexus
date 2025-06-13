import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Shuffle, Users, Trophy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import TeamBalancingTool from "./TeamBalancingTool";

interface Tournament {
  id: string;
  name: string;
  status: string;
  max_teams: number;
  signups_count: number;
  teams_count: number;
}

interface TeamBalancingInterfaceProps {
  tournamentId?: string;
}

const TeamBalancingInterface = ({ tournamentId }: TeamBalancingInterfaceProps) => {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [selectedTournament, setSelectedTournament] = useState<string>(tournamentId || '');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (tournamentId) {
      // If a specific tournament ID is provided, fetch only that tournament
      fetchSpecificTournament(tournamentId);
    } else {
      // Otherwise fetch all tournaments for selection
      fetchTournaments();
    }
  }, [tournamentId]);

  const fetchSpecificTournament = async (id: string) => {
    try {
      const { data: tournamentData, error } = await supabase
        .from('tournaments')
        .select(`
          id,
          name,
          status,
          max_teams,
          tournament_signups(count),
          teams(count)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;

      const processedTournament = {
        id: tournamentData.id,
        name: tournamentData.name,
        status: tournamentData.status,
        max_teams: tournamentData.max_teams,
        signups_count: tournamentData.tournament_signups?.[0]?.count || 0,
        teams_count: tournamentData.teams?.[0]?.count || 0
      };

      setTournaments([processedTournament]);
      setSelectedTournament(id);
    } catch (error) {
      console.error('Error fetching tournament:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTournaments = async () => {
    try {
      const { data: tournamentsData, error } = await supabase
        .from('tournaments')
        .select(`
          id,
          name,
          status,
          max_teams,
          tournament_signups(count),
          teams(count)
        `)
        .in('status', ['open', 'balancing', 'live'])
        .order('created_at', { ascending: false });

      if (error) throw error;

      const processedTournaments = tournamentsData?.map(tournament => ({
        id: tournament.id,
        name: tournament.name,
        status: tournament.status,
        max_teams: tournament.max_teams,
        signups_count: tournament.tournament_signups?.[0]?.count || 0,
        teams_count: tournament.teams?.[0]?.count || 0
      })) || [];

      setTournaments(processedTournaments);
    } catch (error) {
      console.error('Error fetching tournaments:', error);
    } finally {
      setLoading(false);
    }
  };

  const selectedTournamentData = tournaments.find(t => t.id === selectedTournament);

  if (loading) {
    return (
      <Card className="bg-slate-800 border-slate-700">
        <CardContent className="py-12 text-center">
          <p className="text-slate-400">Loading tournaments...</p>
        </CardContent>
      </Card>
    );
  }

  // If a specific tournament ID was provided, don't show the selection dropdown
  if (tournamentId) {
    if (!selectedTournamentData) {
      return (
        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="py-12 text-center">
            <p className="text-slate-400">Tournament not found</p>
          </CardContent>
        </Card>
      );
    }

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-slate-700 rounded-lg">
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 text-slate-300">
              <Users className="w-4 h-4" />
              <span className="text-sm">Signups</span>
            </div>
            <div className="text-2xl font-bold text-white">
              {selectedTournamentData.signups_count}
            </div>
            <div className="text-xs text-slate-400">
              Max: {selectedTournamentData.max_teams * 5}
            </div>
          </div>
          
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 text-slate-300">
              <Trophy className="w-4 h-4" />
              <span className="text-sm">Teams</span>
            </div>
            <div className="text-2xl font-bold text-white">
              {selectedTournamentData.teams_count}
            </div>
            <div className="text-xs text-slate-400">
              Max: {selectedTournamentData.max_teams}
            </div>
          </div>

          <div className="text-center">
            <div className="flex items-center justify-center gap-2 text-slate-300">
              <Shuffle className="w-4 h-4" />
              <span className="text-sm">Status</span>
            </div>
            <Badge className="text-lg mt-1" variant={
              selectedTournamentData.status === 'live' ? 'destructive' : 'secondary'
            }>
              {selectedTournamentData.status}
            </Badge>
          </div>
        </div>

        <TeamBalancingTool 
          tournamentId={selectedTournament}
          maxTeams={selectedTournamentData.max_teams || 8}
          onTeamsBalanced={() => fetchSpecificTournament(selectedTournament)}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Shuffle className="w-5 h-5" />
            Team Balancing System
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-300">Select Tournament</label>
            <Select value={selectedTournament} onValueChange={setSelectedTournament}>
              <SelectTrigger className="bg-slate-700 border-slate-600">
                <SelectValue placeholder="Choose a tournament to balance" />
              </SelectTrigger>
              <SelectContent>
                {tournaments.map((tournament) => (
                  <SelectItem key={tournament.id} value={tournament.id}>
                    <div className="flex items-center justify-between w-full">
                      <span>{tournament.name}</span>
                      <div className="flex items-center gap-2 ml-4">
                        <Badge variant={tournament.status === 'live' ? 'destructive' : 'secondary'}>
                          {tournament.status}
                        </Badge>
                        <Badge variant="outline">
                          {tournament.signups_count} players
                        </Badge>
                      </div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedTournamentData && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-slate-700 rounded-lg">
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 text-slate-300">
                  <Users className="w-4 h-4" />
                  <span className="text-sm">Signups</span>
                </div>
                <div className="text-2xl font-bold text-white">
                  {selectedTournamentData.signups_count}
                </div>
                <div className="text-xs text-slate-400">
                  Max: {selectedTournamentData.max_teams * 5}
                </div>
              </div>
              
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 text-slate-300">
                  <Trophy className="w-4 h-4" />
                  <span className="text-sm">Teams</span>
                </div>
                <div className="text-2xl font-bold text-white">
                  {selectedTournamentData.teams_count}
                </div>
                <div className="text-xs text-slate-400">
                  Max: {selectedTournamentData.max_teams}
                </div>
              </div>

              <div className="text-center">
                <div className="flex items-center justify-center gap-2 text-slate-300">
                  <Shuffle className="w-4 h-4" />
                  <span className="text-sm">Status</span>
                </div>
                <Badge className="text-lg mt-1" variant={
                  selectedTournamentData.status === 'live' ? 'destructive' : 'secondary'
                }>
                  {selectedTournamentData.status}
                </Badge>
              </div>
            </div>
          )}

          {selectedTournament && (
            <div className="flex justify-center pt-4">
              <TeamBalancingTool 
                tournamentId={selectedTournament}
                maxTeams={selectedTournamentData?.max_teams || 8}
                onTeamsBalanced={fetchTournaments}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {tournaments.length === 0 && (
        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="py-12 text-center">
            <Shuffle className="w-12 h-12 text-slate-500 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">No Active Tournaments</h3>
            <p className="text-slate-400">Create a tournament to start balancing teams.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default TeamBalancingInterface;
