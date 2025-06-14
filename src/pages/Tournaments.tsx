
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Search, Plus, Filter } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import TournamentCard from "@/components/TournamentCard";

interface Tournament {
  id: string;
  name: string;
  currentSignups: number;
  maxPlayers: number;
  prizePool: string;
  startTime: Date;
  status: "open" | "balancing" | "live" | "completed";
  format: "BO1" | "BO3";
}

const Tournaments = () => {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [formatFilter, setFormatFilter] = useState("all");
  const { isAdmin } = useAuth();

  useEffect(() => {
    const fetchTournaments = async () => {
      console.log('Fetching tournaments...');
      try {
        setLoading(true);
        
        const { data: tournamentsData, error } = await supabase
          .from('tournaments')
          .select('*')
          .order('start_time', { ascending: true });

        if (error) {
          throw error;
        }

        console.log('Raw tournaments data:', tournamentsData);

        // Get signup counts for each tournament
        const tournamentsWithSignups = await Promise.all(
          (tournamentsData || []).map(async (tournament) => {
            const { count } = await supabase
              .from('tournament_signups')
              .select('*', { count: 'exact' })
              .eq('tournament_id', tournament.id);

            return {
              id: tournament.id,
              name: tournament.name,
              currentSignups: count || 0,
              maxPlayers: tournament.max_players,
              prizePool: tournament.prize_pool || 'TBD',
              startTime: new Date(tournament.start_time),
              status: tournament.status as "open" | "balancing" | "live" | "completed",
              format: (tournament.match_format === 'BO5' ? 'BO3' : tournament.match_format) as "BO1" | "BO3"
            };
          })
        );

        console.log('Processed tournaments:', tournamentsWithSignups);
        setTournaments(tournamentsWithSignups);
      } catch (error) {
        console.error('Error fetching tournaments:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTournaments();
  }, []);

  const filteredTournaments = tournaments.filter(tournament => {
    const matchesSearch = tournament.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || tournament.status === statusFilter;
    const matchesFormat = formatFilter === "all" || tournament.format === formatFilter;
    
    return matchesSearch && matchesStatus && matchesFormat;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <p className="text-white text-lg">Loading tournaments...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="container mx-auto px-4 py-8">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Tournaments</h1>
            <p className="text-slate-400">Browse and join upcoming Valorant tournaments</p>
          </div>
          
          {isAdmin && (
            <Button className="bg-red-600 hover:bg-red-700 text-white">
              <Plus className="w-4 h-4 mr-2" />
              Create Tournament
            </Button>
          )}
        </div>

        {/* Filters */}
        <Card className="bg-slate-800 border-slate-700 mb-8">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Filter className="w-5 h-5" />
              Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search tournaments..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-slate-700 border-slate-600 text-white placeholder:text-slate-400"
                />
              </div>
              
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent className="bg-slate-700 border-slate-600">
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="balancing">Balancing</SelectItem>
                  <SelectItem value="live">Live</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={formatFilter} onValueChange={setFormatFilter}>
                <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                  <SelectValue placeholder="Filter by format" />
                </SelectTrigger>
                <SelectContent className="bg-slate-700 border-slate-600">
                  <SelectItem value="all">All Formats</SelectItem>
                  <SelectItem value="BO1">Best of 1</SelectItem>
                  <SelectItem value="BO3">Best of 3</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Tournament Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTournaments.map((tournament) => (
            <TournamentCard key={tournament.id} tournament={tournament} />
          ))}
        </div>

        {filteredTournaments.length === 0 && (
          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="text-center py-12">
              <p className="text-slate-400 text-lg">No tournaments found matching your criteria.</p>
              <p className="text-slate-500 mt-2">Try adjusting your filters or check back later for new tournaments.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Tournaments;
