
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, Users, Calendar, MapPin } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

interface Tournament {
  id: string;
  name: string;
  status: string;
  max_teams: number;
  match_format: string;
  start_time: string;
}

const Brackets = () => {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchTournaments = async () => {
      try {
        const { data, error } = await supabase
          .from('tournaments')
          .select('*')
          .in('status', ['live', 'completed'])
          .order('start_time', { ascending: false });

        if (error) throw error;

        setTournaments(data || []);
      } catch (error) {
        console.error('Error fetching tournaments:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTournaments();
  }, []);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short"
    });
  };

  const handleTournamentClick = (tournamentId: string) => {
    navigate(`/bracket/${tournamentId}`);
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <p className="text-white text-lg">Loading tournaments...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-8">
        <Trophy className="w-8 h-8 text-yellow-500" />
        <h1 className="text-3xl font-bold text-white">Tournament Brackets</h1>
      </div>

      <div className="grid gap-6">
        {tournaments.map((tournament) => (
          <Card 
            key={tournament.id} 
            className="bg-slate-800/90 border-slate-700 hover:bg-slate-800 transition-colors cursor-pointer"
            onClick={() => handleTournamentClick(tournament.id)}
          >
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl text-white">{tournament.name}</CardTitle>
                <Badge 
                  variant={tournament.status === 'live' ? 'destructive' : 'secondary'}
                  className={tournament.status === 'live' 
                    ? 'bg-red-600 text-white' 
                    : tournament.status === 'completed'
                      ? 'bg-green-600 text-white'
                      : 'bg-slate-600 text-slate-200'
                  }
                >
                  {tournament.status === 'live' ? 'LIVE' : tournament.status.toUpperCase()}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                <div className="flex items-center gap-2 text-slate-300">
                  <Users className="w-4 h-4" />
                  <span>{tournament.max_teams} Teams</span>
                </div>
                <div className="flex items-center gap-2 text-slate-300">
                  <MapPin className="w-4 h-4" />
                  <span>{tournament.match_format}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-300">
                  <Calendar className="w-4 h-4" />
                  <span>{formatDate(tournament.start_time)}</span>
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
  );
};

export default Brackets;
