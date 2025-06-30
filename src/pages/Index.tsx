import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trophy, Users, Calendar, Zap, Target, Shield } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import LiveMatches from "@/components/LiveMatches";
import HomePageAnnouncement from "@/components/HomePageAnnouncement";
import TournamentTabs from "@/components/TournamentTabs";
import TopPlayersDisplay from "@/components/TopPlayersDisplay";
import TwitchEmbed from "@/components/TwitchEmbed";
import RecentWinners from "@/components/RecentWinners";

const Index = () => {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Hero/Main Headline */}
      <section className="container mx-auto px-4 pt-8 pb-6">
        <div className="text-center space-y-4">
          <h1 className="text-5xl md:text-7xl font-bold text-white">
            Tournament
            <span className="text-red-500"> Management</span>
          </h1>
          <p className="text-xl text-slate-300 max-w-2xl mx-auto">
            TLRHub- The Skirmish Hub,
            Easy to use, built specifically for our events. Track tournament progress, statistics, history all in one place!
          </p>
        </div>
      </section>

      {/* Announcement Full Width */}
      <section className="container mx-auto px-4 pb-4">
        <HomePageAnnouncement />
      </section>

      {/* Twitch embed full width (if enabled) */}
      <section className="container mx-auto px-4 pb-8">
        <TwitchEmbed />
      </section>

      {/* Live Matches Section (moved here, right after Twitch) */}
      <section className="container mx-auto px-4 pt-4 pb-8">
        <LiveMatches />
      </section>

      {/* Main 3-col grid: L=Top Players | M=Tournaments | R=Recent Winner */}
      <section className="container mx-auto px-4 pb-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <TopPlayersDisplay />
          </div>
          <div>
            <TournamentTabs />
          </div>
          <div>
            <RecentWinners />
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-4 py-16">
        <h2 className="text-3xl font-bold text-white text-center mb-12">
          Everything You Need for Tournament Success
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <Card className="bg-slate-800 border-slate-700 hover:border-red-500 transition-colors">
            <CardHeader>
              <div className="w-12 h-12 bg-red-500/20 rounded-lg flex items-center justify-center mb-4">
                <Trophy className="h-6 w-6 text-red-400" />
              </div>
              <CardTitle className="text-white">Automated Brackets</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-400">
                Generate professional tournament brackets automatically with seeding, 
                eliminations, and real-time updates.
              </p>
            </CardContent>
          </Card>

          <Card className="bg-slate-800 border-slate-700 hover:border-red-500 transition-colors">
            <CardHeader>
              <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center mb-4">
                <Shield className="h-6 w-6 text-blue-400" />
              </div>
              <CardTitle className="text-white">Team Balancing</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-400">
                Smart team balancing algorithms ensure fair competition by 
                distributing skill levels evenly across all teams.
              </p>
            </CardContent>
          </Card>

          <Card className="bg-slate-800 border-slate-700 hover:border-red-500 transition-colors">
            <CardHeader>
              <div className="w-12 h-12 bg-green-500/20 rounded-lg flex items-center justify-center mb-4">
                <Target className="h-6 w-6 text-green-400" />
              </div>
              <CardTitle className="text-white">Map Veto System</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-400">
                Interactive map veto process with real-time captain controls 
                for strategic map selection in competitive matches.
              </p>
            </CardContent>
          </Card>

          <Card className="bg-slate-800 border-slate-700 hover:border-red-500 transition-colors">
            <CardHeader>
              <div className="w-12 h-12 bg-purple-500/20 rounded-lg flex items-center justify-center mb-4">
                <Zap className="h-6 w-6 text-purple-400" />
              </div>
              <CardTitle className="text-white">Live Tracking</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-400">
                Monitor matches in real-time with live scores, status updates, 
                and instant notifications for all participants.
              </p>
            </CardContent>
          </Card>

          <Card className="bg-slate-800 border-slate-700 hover:border-red-500 transition-colors">
            <CardHeader>
              <div className="w-12 h-12 bg-yellow-500/20 rounded-lg flex items-center justify-center mb-4">
                <Users className="h-6 w-6 text-yellow-400" />
              </div>
              <CardTitle className="text-white">Player Management</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-400">
                Complete player profiles with rank tracking, statistics, 
                and performance analytics across all tournaments.
              </p>
            </CardContent>
          </Card>

          <Card className="bg-slate-800 border-slate-700 hover:border-red-500 transition-colors">
            <CardHeader>
              <div className="w-12 h-12 bg-orange-500/20 rounded-lg flex items-center justify-center mb-4">
                <Calendar className="h-6 w-6 text-orange-400" />
              </div>
              <CardTitle className="text-white">Smart Scheduling</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-400">
                Automated scheduling with check-in systems, timezone support, 
                and flexible tournament timing management.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Stats Section */}
      <section className="container mx-auto px-4 py-16">
        <div className="bg-slate-800 rounded-2xl p-8 border border-slate-700">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-3xl font-bold text-red-500 mb-2">500+</div>
              <div className="text-slate-400">Tournaments Hosted</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-blue-500 mb-2">10,000+</div>
              <div className="text-slate-400">Active Players</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-green-500 mb-2">50,000+</div>
              <div className="text-slate-400">Matches Played</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-purple-500 mb-2">99.9%</div>
              <div className="text-slate-400">Uptime</div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-16">
        <div className="text-center space-y-6">
          <h2 className="text-4xl font-bold text-white">
            Ready to Host Your Tournament?
          </h2>
          <p className="text-xl text-slate-300 max-w-2xl mx-auto">
            Join thousands of tournament organizers who trust our platform 
            for their competitive gaming events.
          </p>
          {user ? (
            <Link to="/tournaments">
              <Button size="lg" className="bg-red-600 hover:bg-red-700 text-white px-8 py-4 text-lg">
                Create Tournament
              </Button>
            </Link>
          ) : (
            <Link to="/login">
              <Button size="lg" className="bg-red-600 hover:bg-red-700 text-white px-8 py-4 text-lg">
                Get Started Today
              </Button>
            </Link>
          )}
        </div>
      </section>
    </div>
  );
};

export default Index;
