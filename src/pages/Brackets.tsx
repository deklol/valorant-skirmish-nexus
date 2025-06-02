
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, Users, Calendar, MapPin } from "lucide-react";
import Header from '@/components/Header';

const Brackets = () => {
  // Mock tournament data - will be replaced with real data
  const tournaments = [
    {
      id: 1,
      name: "Weekly Skirmish #1",
      status: "live",
      teams: 8,
      format: "BO1",
      date: "Today",
    },
    {
      id: 2,
      name: "Monthly Championship",
      status: "upcoming",
      teams: 16,
      format: "BO3",
      date: "Next Week",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-900">
      <Header />
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-8">
          <Trophy className="w-8 h-8 text-yellow-500" />
          <h1 className="text-3xl font-bold text-white">Tournament Brackets</h1>
        </div>

        <div className="grid gap-6">
          {tournaments.map((tournament) => (
            <Card key={tournament.id} className="bg-slate-800/90 border-slate-700 hover:bg-slate-800 transition-colors cursor-pointer">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xl text-white">{tournament.name}</CardTitle>
                  <Badge 
                    variant={tournament.status === 'live' ? 'destructive' : 'secondary'}
                    className={tournament.status === 'live' 
                      ? 'bg-red-600 text-white' 
                      : 'bg-slate-600 text-slate-200'
                    }
                  >
                    {tournament.status === 'live' ? 'LIVE' : 'UPCOMING'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                  <div className="flex items-center gap-2 text-slate-300">
                    <Users className="w-4 h-4" />
                    <span>{tournament.teams} Teams</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-300">
                    <MapPin className="w-4 h-4" />
                    <span>{tournament.format}</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-300">
                    <Calendar className="w-4 h-4" />
                    <span>{tournament.date}</span>
                  </div>
                  <div className="text-indigo-400 hover:text-indigo-300 transition-colors">
                    View Bracket →
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {tournaments.length === 0 && (
          <Card className="bg-slate-800/90 border-slate-700">
            <CardContent className="text-center py-12">
              <Trophy className="w-12 h-12 text-slate-500 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">No Active Tournaments</h3>
              <p className="text-slate-400">Check back later for upcoming tournaments and brackets.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Brackets;
