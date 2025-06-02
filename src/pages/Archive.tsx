
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Archive as ArchiveIcon, Calendar, Trophy, Users } from "lucide-react";
import Header from '@/components/Header';

const Archive = () => {
  // Mock archived tournament data - will be replaced with real data
  const archivedTournaments = [
    {
      id: 1,
      name: "Weekly Skirmish #0",
      date: "2024-01-15",
      teams: 8,
      winner: "Team Alpha",
      format: "BO1",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-900">
      <Header />
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-8">
          <ArchiveIcon className="w-8 h-8 text-slate-400" />
          <h1 className="text-3xl font-bold text-white">Tournament Archive</h1>
        </div>

        <div className="grid gap-6">
          {archivedTournaments.map((tournament) => (
            <Card key={tournament.id} className="bg-slate-800/90 border-slate-700 hover:bg-slate-800 transition-colors cursor-pointer">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xl text-white">{tournament.name}</CardTitle>
                  <Badge variant="secondary" className="bg-slate-600 text-slate-200">
                    COMPLETED
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4 text-sm">
                  <div className="flex items-center gap-2 text-slate-300">
                    <Calendar className="w-4 h-4" />
                    <span>{new Date(tournament.date).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-300">
                    <Users className="w-4 h-4" />
                    <span>{tournament.teams} Teams</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-300">
                    <Trophy className="w-4 h-4" />
                    <span>{tournament.format}</span>
                  </div>
                  <div className="flex items-center gap-2 text-yellow-400">
                    <Trophy className="w-4 h-4" />
                    <span>Winner: {tournament.winner}</span>
                  </div>
                  <div className="text-indigo-400 hover:text-indigo-300 transition-colors">
                    View Details →
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {archivedTournaments.length === 0 && (
          <Card className="bg-slate-800/90 border-slate-700">
            <CardContent className="text-center py-12">
              <ArchiveIcon className="w-12 h-12 text-slate-500 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">No Archived Tournaments</h3>
              <p className="text-slate-400">Completed tournaments will appear here.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Archive;
