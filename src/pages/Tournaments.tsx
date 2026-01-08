import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Search, Plus, Filter } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import TournamentCard from "@/components/TournamentCard";
import CreateTournamentDialog from "@/components/CreateTournamentDialog";
import { Tournament } from "@/types/tournament";

// Extend the Tournament type for display purposes
interface DisplayTournament extends Omit<Tournament, 'map_pool'> {
  currentSignups: number;
  startTime: Date;
  format: "BO1" | "BO3";
  maxPlayers: number; // Map from max_players
  prizePool: string; // Map from prize_pool
  map_pool?: string[] | null; // Override with correct type
}

const Tournaments = () => {
  const [tournaments, setTournaments] = useState<DisplayTournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [formatFilter, setFormatFilter] = useState("all");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const { isAdmin } = useAuth();

  const fetchTournaments = async () => {
    try {
      setLoading(true);
      
      const { data: tournamentsData, error } = await supabase
        .from('tournaments')
        .select('*')
        .order('start_time', { ascending: true });

      if (error) {
        throw error;
      }

      // Get signup counts for each tournament based on registration type
      const tournamentsWithSignups = await Promise.all(
        (tournamentsData || []).map(async (tournament) => {
          let signupCount = 0;
          
          if (tournament.registration_type === 'team') {
            // Get team registration count
            const { count } = await supabase
              .from('team_tournament_registrations')
              .select('*', { count: 'exact' })
              .eq('tournament_id', tournament.id)
              .eq('status', 'registered');
            signupCount = count || 0;
          } else {
            // Get individual player signup count
            const { count } = await supabase
              .from('tournament_signups')
              .select('*', { count: 'exact' })
              .eq('tournament_id', tournament.id);
            signupCount = count || 0;
          }

          return {
            ...tournament,
            currentSignups: signupCount,
            startTime: new Date(tournament.start_time || Date.now()),
            format: (tournament.match_format === 'BO5' ? 'BO3' : tournament.match_format) as "BO1" | "BO3",
            maxPlayers: tournament.max_players,
            prizePool: tournament.prize_pool || 'TBD',
            registration_type: tournament.registration_type as "solo" | "team",
            max_teams: tournament.max_teams || 0,
            map_pool: Array.isArray(tournament.map_pool) 
              ? tournament.map_pool.filter((item): item is string => typeof item === 'string')
              : null
          } as DisplayTournament;
        })
      );

      setTournaments(tournamentsWithSignups);
    } catch (error) {
      console.error('Error fetching tournaments:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTournaments();
  }, []);

  const handleTournamentCreated = () => {
    setCreateDialogOpen(false);
    fetchTournaments();
  };

  const filteredTournaments = tournaments
    .filter(tournament => {
      const matchesSearch = tournament.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === "all" || tournament.status === statusFilter;
      const matchesFormat = formatFilter === "all" || tournament.format === formatFilter;
      
      // Hide archived tournaments unless specifically selected in filter
      const isArchived = tournament.status === "archived";
      const showArchived = statusFilter === "archived";
      const shouldShow = !isArchived || showArchived;
      
      return matchesSearch && matchesStatus && matchesFormat && shouldShow;
    })
    .sort((a, b) => {
      // Priority order: open and live tournaments first, then others by date
      const priorityStatuses = ['open', 'live', 'balancing'];
      
      const aPriority = priorityStatuses.includes(a.status);
      const bPriority = priorityStatuses.includes(b.status);
      
      // If both have priority, sort by ascending date (soonest first)
      if (aPriority && bPriority) {
        return new Date(a.startTime).getTime() - new Date(b.startTime).getTime();
      }
      
      // If neither has priority (completed/archived), sort by descending date (most recent first)
      if (!aPriority && !bPriority) {
        return new Date(b.startTime).getTime() - new Date(a.startTime).getTime();
      }
      
      // Priority tournaments come first
      return aPriority ? -1 : 1;
    });

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-900">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <p className="text-white text-lg">Loading tournaments...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-900">
      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-8">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 sm:mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">Tournaments</h1>
            <p className="text-slate-400 text-sm sm:text-base">Browse and join upcoming Valorant tournaments</p>
          </div>
          
          {isAdmin && (
            <Button 
              onClick={() => setCreateDialogOpen(true)}
              className="bg-red-600 hover:bg-red-700 text-white w-full sm:w-auto"
              size="sm"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Tournament
            </Button>
          )}
        </div>

        {/* Filters */}
        <Card className="bg-slate-800/90 backdrop-blur-sm border-slate-700 mb-6 sm:mb-8">
          <CardHeader className="pb-3 sm:pb-6">
            <CardTitle className="text-white flex items-center gap-2 text-lg sm:text-xl">
              <Filter className="w-4 h-4 sm:w-5 sm:h-5" />
              Filters
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
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
                  <SelectItem value="archived">Archived</SelectItem>
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {filteredTournaments.map((tournament) => (
            <TournamentCard key={tournament.id} tournament={tournament} />
          ))}
        </div>

        {filteredTournaments.length === 0 && (
          <Card className="bg-slate-800/90 backdrop-blur-sm border-slate-700">
            <CardContent className="text-center py-8 sm:py-12">
              <p className="text-slate-400 text-base sm:text-lg">No tournaments found matching your criteria.</p>
              <p className="text-slate-500 mt-2 text-sm sm:text-base">Try adjusting your filters or check back later for new tournaments.</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Create Tournament Dialog */}
      <CreateTournamentDialog 
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onTournamentCreated={handleTournamentCreated}
      />
    </div>
  );
};

export default Tournaments;
