
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trophy, Users, Calendar, Clock, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Header from '@/components/Header';

interface Tournament {
  id: string;
  name: string;
  description: string | null;
  prize_pool: string | null;
  start_time: string;
  registration_closes_at: string | null;
  max_teams: number | null;
  max_players: number;
  status: string;
  signups?: number;
}

const Index = () => {
  const [featuredTournament, setFeaturedTournament] = useState<Tournament | null>(null);
  const [upcomingTournaments, setUpcomingTournaments] = useState<Tournament[]>([]);
  const [recentWinners, setRecentWinners] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Get featured tournament (next open tournament)
        const { data: featuredData } = await supabase
          .from('tournaments')
          .select('*')
          .eq('status', 'open')
          .order('start_time', { ascending: true })
          .limit(1)
          .maybeSingle();

        if (featuredData) {
          const { count } = await supabase
            .from('tournament_signups')
            .select('*', { count: 'exact' })
            .eq('tournament_id', featuredData.id);

          setFeaturedTournament({
            ...featuredData,
            signups: count || 0
          });
        }

        // Get upcoming tournaments
        const { data: upcomingData } = await supabase
          .from('tournaments')
          .select('*')
          .in('status', ['open', 'balancing'])
          .order('start_time', { ascending: true })
          .limit(5);

        if (upcomingData) {
          const tournamentsWithSignups = await Promise.all(
            upcomingData.map(async (tournament) => {
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
          setUpcomingTournaments(tournamentsWithSignups);
        }

        // Get recent winners (completed tournaments with teams)
        const { data: completedTournaments } = await supabase
          .from('tournaments')
          .select(`
            id,
            name,
            end_time,
            matches!inner(
              winner_id,
              teams!matches_winner_id_fkey(name)
            )
          `)
          .eq('status', 'completed')
          .not('matches.winner_id', 'is', null)
          .order('end_time', { ascending: false })
          .limit(3);

        if (completedTournaments) {
          const winners = completedTournaments.map(tournament => ({
            tournament: tournament.name,
            winner: tournament.matches[0]?.teams?.name || 'Unknown',
            date: tournament.end_time
          }));
          setRecentWinners(winners);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };

    fetchData();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-900">
      <Header />
      
      {/* Hero Section */}
      <section className="container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h1 className="text-5xl md:text-6xl font-bold text-white mb-4">
            TGH <span className="text-red-500">Skirmish</span>
          </h1>
          <p className="text-xl text-slate-300 mb-8 max-w-2xl mx-auto">
            Competitive Valorant tournaments for players of all skill levels. 
            Join the action and compete for prizes!
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/tournaments">
              <Button size="lg" className="bg-red-600 hover:bg-red-700 text-white px-8">
                <Trophy className="w-5 h-5 mr-2" />
                View Tournaments
              </Button>
            </Link>
            <Link to="/leaderboard">
              <Button size="lg" variant="outline" className="border-slate-600 text-white hover:bg-slate-800 px-8">
                <Users className="w-5 h-5 mr-2" />
                Leaderboard
              </Button>
            </Link>
          </div>
        </div>

        {/* Featured Tournament */}
        {featuredTournament && (
          <Card className="bg-slate-800/90 border-slate-700 max-w-4xl mx-auto mb-16">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-2xl text-white">{featuredTournament.name}</CardTitle>
                <Badge className="bg-green-600 text-white">
                  {featuredTournament.status.toUpperCase()}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-slate-300 mb-6">{featuredTournament.description || "Join this exciting tournament!"}</p>
              
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="flex items-center gap-2 text-slate-300">
                  <Calendar className="w-4 h-4" />
                  <div>
                    <div className="font-semibold">Starts</div>
                    <div className="text-sm">{new Date(featuredTournament.start_time).toLocaleDateString()}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-slate-300">
                  <Clock className="w-4 h-4" />
                  <div>
                    <div className="font-semibold">Registration Ends</div>
                    <div className="text-sm">
                      {featuredTournament.registration_closes_at 
                        ? new Date(featuredTournament.registration_closes_at).toLocaleDateString()
                        : 'TBD'
                      }
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-slate-300">
                  <Users className="w-4 h-4" />
                  <div>
                    <div className="font-semibold">Players</div>
                    <div className="text-sm">{featuredTournament.signups}/{featuredTournament.max_players}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-slate-300">
                  <Trophy className="w-4 h-4" />
                  <div>
                    <div className="font-semibold">Prize Pool</div>
                    <div className="text-sm text-yellow-400">{featuredTournament.prize_pool || 'TBD'}</div>
                  </div>
                </div>
              </div>

              <Link to="/tournaments">
                <Button className="bg-red-600 hover:bg-red-700 text-white">
                  Register Now
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}

        {/* Upcoming Tournaments & Recent Winners */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Upcoming Tournaments */}
          <Card className="bg-slate-800/90 border-slate-700">
            <CardHeader>
              <CardTitle className="text-xl text-white">Upcoming Tournaments</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {upcomingTournaments.map((tournament) => (
                  <div key={tournament.id} className="flex items-center justify-between p-3 bg-slate-700/50 rounded">
                    <div>
                      <div className="font-semibold text-white">{tournament.name}</div>
                      <div className="text-sm text-slate-400">{new Date(tournament.start_time).toLocaleDateString()}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-slate-300">{tournament.max_teams} teams max</div>
                      <div className="text-sm text-yellow-400">{tournament.prize_pool || 'TBD'}</div>
                    </div>
                  </div>
                ))}
                {upcomingTournaments.length === 0 && (
                  <p className="text-slate-400 text-center py-4">No upcoming tournaments scheduled.</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Recent Winners */}
          <Card className="bg-slate-800/90 border-slate-700">
            <CardHeader>
              <CardTitle className="text-xl text-white">Recent Winners</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentWinners.map((winner, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-slate-700/50 rounded">
                    <div>
                      <div className="font-semibold text-white">{winner.winner}</div>
                      <div className="text-sm text-slate-400">{winner.tournament}</div>
                    </div>
                    <div className="text-sm text-slate-300">
                      {winner.date ? new Date(winner.date).toLocaleDateString() : 'Recent'}
                    </div>
                  </div>
                ))}
                {recentWinners.length === 0 && (
                  <p className="text-slate-400 text-center py-4">No recent tournaments completed.</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
};

export default Index;
