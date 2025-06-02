
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Search, Plus, Filter } from "lucide-react";
import Header from "@/components/Header";
import TournamentCard from "@/components/TournamentCard";

const Tournaments = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [formatFilter, setFormatFilter] = useState("all");

  // Mock data - will be replaced with API calls
  const tournaments = [
    {
      id: 1,
      name: "TGH Weekly Skirmish #53",
      maxTeams: 8,
      currentSignups: 24,
      maxPlayers: 40,
      prizePool: "£50 prize pool",
      startTime: new Date("2025-06-07T19:00:00"),
      status: "open" as const,
      format: "BO1" as const
    },
    {
      id: 2,
      name: "TGH Championship Finals",
      maxTeams: 16,
      currentSignups: 67,
      maxPlayers: 80,
      prizePool: "£200 + Riot Points",
      startTime: new Date("2025-06-14T20:00:00"),
      status: "balancing" as const,
      format: "BO3" as const
    },
    {
      id: 3,
      name: "TGH Weekly Skirmish #52",
      maxTeams: 8,
      currentSignups: 40,
      maxPlayers: 40,
      prizePool: "£50 prize pool",
      startTime: new Date("2025-05-31T19:00:00"),
      status: "completed" as const,
      format: "BO1" as const
    },
    {
      id: 4,
      name: "TGH Summer Cup Qualifiers",
      maxTeams: 12,
      currentSignups: 45,
      maxPlayers: 60,
      prizePool: "£100 + Qualification",
      startTime: new Date("2025-06-21T18:00:00"),
      status: "live" as const,
      format: "BO3" as const
    }
  ];

  const filteredTournaments = tournaments.filter(tournament => {
    const matchesSearch = tournament.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || tournament.status === statusFilter;
    const matchesFormat = formatFilter === "all" || tournament.format === formatFilter;
    
    return matchesSearch && matchesStatus && matchesFormat;
  });

  // Mock admin check - will be replaced with actual Discord role checking
  const isAdmin = true;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <Header />
      
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
