
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Users, Calendar, Trophy, Settings, Eye, BarChart3 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import CreateTournamentDialog from "./CreateTournamentDialog";

interface Tournament {
  id: string;
  name: string;
  status: 'draft' | 'open' | 'balancing' | 'live' | 'completed';
  match_format: 'BO1' | 'BO3';
  max_players: number;
  max_teams: number;
  prize_pool: string;
  start_time: string;
  created_at: string;
  signups?: number;
}

const TournamentManagement = () => {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchTournaments = async () => {
    try {
      // First get tournaments
      const { data: tournamentsData, error: tournamentsError } = await supabase
        .from('tournaments')
        .select('*')
        .order('created_at', { ascending: false });

      if (tournamentsError) {
        throw tournamentsError;
      }

      // Then get signup counts for each tournament
      const tournamentsWithSignups = await Promise.all(
        (tournamentsData || []).map(async (tournament) => {
          const { count } = await supabase
            .from('tournament_signups')
            .select('*', { count: 'exact' })
            .eq('tournament_id', tournament.id);

          return {
            ...tournament,
            signups: count || 0
          };
        })
      );

      setTournaments(tournamentsWithSignups);
    } catch (error: any) {
      console.error('Error fetching tournaments:', error);
      toast({
        title: "Error",
        description: "Failed to load tournaments",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTournaments();
  }, []);

  const updateTournamentStatus = async (tournamentId: string, newStatus: Tournament['status']) => {
    try {
      const { error } = await supabase
        .from('tournaments')
        .update({ status: newStatus })
        .eq('id', tournamentId);

      if (error) {
        throw error;
      }

      toast({
        title: "Status Updated",
        description: `Tournament status changed to ${newStatus}`,
      });

      fetchTournaments();
    } catch (error: any) {
      console.error('Error updating status:', error);
      toast({
        title: "Error",
        description: "Failed to update tournament status",
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: Tournament['status']) => {
    const variants = {
      draft: "bg-gray-500/20 text-gray-400",
      open: "bg-green-500/20 text-green-400", 
      balancing: "bg-yellow-500/20 text-yellow-400",
      live: "bg-red-500/20 text-red-400",
      completed: "bg-blue-500/20 text-blue-400"
    };

    return (
      <Badge className={variants[status]}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  if (loading) {
    return (
      <Card className="bg-slate-800 border-slate-700">
        <CardContent className="p-8 text-center">
          <p className="text-white">Loading tournaments...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-white flex items-center gap-2">
              <Trophy className="w-5 h-5 text-yellow-500" />
              Tournament Management
            </CardTitle>
            <CreateTournamentDialog onTournamentCreated={fetchTournaments} />
          </div>
        </CardHeader>
        <CardContent>
          {tournaments.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-slate-400 mb-4">No tournaments created yet.</p>
              <CreateTournamentDialog onTournamentCreated={fetchTournaments} />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-slate-300">Tournament</TableHead>
                    <TableHead className="text-slate-300">Status</TableHead>
                    <TableHead className="text-slate-300">Format</TableHead>
                    <TableHead className="text-slate-300">Signups</TableHead>
                    <TableHead className="text-slate-300">Start Time</TableHead>
                    <TableHead className="text-slate-300">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tournaments.map((tournament) => (
                    <TableRow key={tournament.id}>
                      <TableCell>
                        <div>
                          <p className="text-white font-medium">{tournament.name}</p>
                          <p className="text-slate-400 text-sm">{tournament.prize_pool}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Select
                          value={tournament.status}
                          onValueChange={(value: Tournament['status']) => 
                            updateTournamentStatus(tournament.id, value)
                          }
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue>
                              {getStatusBadge(tournament.status)}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="draft">Draft</SelectItem>
                            <SelectItem value="open">Open</SelectItem>
                            <SelectItem value="balancing">Balancing</SelectItem>
                            <SelectItem value="live">Live</SelectItem>
                            <SelectItem value="completed">Completed</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="border-slate-600 text-slate-300">
                          {tournament.match_format}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-slate-300">
                          <Users className="w-4 h-4" />
                          <span>{tournament.signups}/{tournament.max_players}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-slate-300">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4" />
                          <span>{formatDate(tournament.start_time)}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button size="sm" variant="outline" className="border-slate-600 text-white">
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button size="sm" variant="outline" className="border-slate-600 text-white">
                            <BarChart3 className="w-4 h-4" />
                          </Button>
                          <Button size="sm" variant="outline" className="border-slate-600 text-white">
                            <Settings className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default TournamentManagement;
