import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trophy, Users, Calendar, Clock, ArrowRight, TrendingUp, Award } from "lucide-react";
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
  const [liveMatches, setLiveMatches] = useState<any[]>([]);
  const [topPlayers, setTopPlayers] = useState<any[]>([]);

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

        // Get live matches
        const { data: liveMatchData } = await supabase
          .from('matches')
          .select(`
            *,
            team1:teams!matches_team1_id_fkey (name),
            team2:teams!matches_team2_id_fkey (name),
            tournaments (name)
          `)
          .eq('status', 'live')
          .limit(3);

        if (liveMatchData) {
          setLiveMatches(liveMatchData);
        }

        // Get top players by tournament wins
        const { data: topPlayersData } = await supabase
          .from('users')
          .select('discord_username, tournaments_won, tournaments_played, current_rank')
          .gt('tournaments_played', 0)
          .order('tournaments_won', { ascending: false })
          .limit(5);

        if (topPlayersData) {
          setTopPlayers(topPlayersData);
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

        {/* Live Matches & Stats Dashboard */}
        <div className="container mx-auto px-4 mb-16">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Live Matches */}
            <Card className="bg-slate-800/90 border-slate-700">
              <CardHeader>
                <CardTitle className="text-xl text-white flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-red-500" />
                  Live Matches
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {liveMatches.map((match) => (
                    <div key={match.id} className="bg-slate-700/50 p-3 rounded">
                      <div className="text-sm text-slate-400 mb-1">{match.tournaments?.name}</div>
                      <div className="flex items-center justify-between">
                        <div className="text-white text-sm">{match.team1?.name}</div>
                        <div className="text-red-400 font-bold">{match.score_team1} - {match.score_team2}</div>
                        <div className="text-white text-sm">{match.team2?.name}</div>
                      </div>
                      <div className="text-xs text-slate-500 mt-1">
                        Round {match.round_number} • Match {match.match_number}
                      </div>
                    </div>
                  ))}
                  {liveMatches.length === 0 && (
                    <p className="text-slate-400 text-center py-4">No live matches currently.</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Top Players */}
            <Card className="bg-slate-800/90 border-slate-700">
              <CardHeader>
                <CardTitle className="text-xl text-white flex items-center gap-2">
                  <Award className="w-5 h-5 text-yellow-500" />
                  Top Players
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {topPlayers.map((player, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-slate-700/50 rounded">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 bg-yellow-500 text-black rounded-full flex items-center justify-center text-xs font-bold">
                          {index + 1}
                        </div>
                        <div>
                          <div className="text-white text-sm font-medium">{player.discord_username}</div>
                          <div className="text-slate-400 text-xs">{player.current_rank}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-yellow-400 font-bold">{player.tournaments_won}</div>
                        <div className="text-slate-400 text-xs">{player.tournaments_played} played</div>
                      </div>
                    </div>
                  ))}
                  {topPlayers.length === 0 && (
                    <p className="text-slate-400 text-center py-4">No player data available.</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Quick Stats */}
            <Card className="bg-slate-800/90 border-slate-700">
              <CardHeader>
                <CardTitle className="text-xl text-white">Tournament Stats</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="text-center p-4 bg-slate-700/50 rounded">
                    <div className="text-2xl font-bold text-green-400">{upcomingTournaments.length}</div>
                    <div className="text-slate-300 text-sm">Active Tournaments</div>
                  </div>
                  <div className="text-center p-4 bg-slate-700/50 rounded">
                    <div className="text-2xl font-bold text-red-400">{liveMatches.length}</div>
                    <div className="text-slate-300 text-sm">Live Matches</div>
                  </div>
                  <div className="text-center p-4 bg-slate-700/50 rounded">
                    <div className="text-2xl font-bold text-blue-400">{recentWinners.length}</div>
                    <div className="text-slate-300 text-sm">Recent Completions</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

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
