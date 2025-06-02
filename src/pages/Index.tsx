
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, Users, Calendar, Zap } from "lucide-react";
import { Link } from "react-router-dom";
import Header from "@/components/Header";
import TournamentCard from "@/components/TournamentCard";

const Index = () => {
  const [activeTournaments] = useState([
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
    }
  ]);

  const stats = {
    totalTournaments: 53,
    activePlayers: 247,
    prizePoolDistributed: "£2,500+"
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <Header />
      
      {/* Hero Section */}
      <section className="relative py-20 px-4 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-red-500/10 to-orange-500/10"></div>
        <div className="container mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 bg-red-500/20 text-red-300 px-4 py-2 rounded-full text-sm font-medium mb-6 animate-fade-in">
            <Zap className="w-4 h-4" />
            UK's Premier Grassroots Valorant Tournament Series
          </div>
          
          <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 animate-fade-in">
            TGH Valorant
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-orange-500"> Skirmish</span>
          </h1>
          
          <p className="text-xl text-slate-300 mb-8 max-w-2xl mx-auto animate-fade-in">
            Join The Goose House community in competitive Valorant tournaments. 
            Balanced teams, skilled competition, and epic prizes await.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center animate-fade-in">
            <Button size="lg" className="bg-red-600 hover:bg-red-700 text-white px-8 py-6 text-lg">
              Join Tournament
            </Button>
            <Button size="lg" variant="outline" className="border-slate-600 text-white hover:bg-slate-800 px-8 py-6 text-lg">
              View Brackets
            </Button>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-12 px-4 border-t border-slate-700">
        <div className="container mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-white mb-2">{stats.totalTournaments}</div>
              <div className="text-slate-400">Tournaments Hosted</div>
            </div>
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-white mb-2">{stats.activePlayers}</div>
              <div className="text-slate-400">Active Players</div>
            </div>
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-white mb-2">{stats.prizePoolDistributed}</div>
              <div className="text-slate-400">Prize Pool Distributed</div>
            </div>
          </div>
        </div>
      </section>

      {/* Active Tournaments */}
      <section className="py-16 px-4">
        <div className="container mx-auto">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-3xl font-bold text-white">Active Tournaments</h2>
            <Link to="/tournaments">
              <Button variant="outline" className="border-slate-600 text-white hover:bg-slate-800">
                View All
              </Button>
            </Link>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {activeTournaments.map((tournament) => (
              <TournamentCard key={tournament.id} tournament={tournament} />
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16 px-4 bg-slate-800/50">
        <div className="container mx-auto">
          <h2 className="text-3xl font-bold text-white text-center mb-12">How It Works</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <Users className="w-12 h-12 text-red-500 mb-4" />
                <CardTitle className="text-white">Sign Up</CardTitle>
                <CardDescription className="text-slate-400">
                  Connect with Discord and provide your Riot ID. Our system automatically scrapes your current Valorant rank.
                </CardDescription>
              </CardHeader>
            </Card>
            
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <Trophy className="w-12 h-12 text-orange-500 mb-4" />
                <CardTitle className="text-white">Balanced Teams</CardTitle>
                <CardDescription className="text-slate-400">
                  Our algorithm creates balanced teams based on rank weights, ensuring fair and competitive matches.
                </CardDescription>
              </CardHeader>
            </Card>
            
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <Calendar className="w-12 h-12 text-yellow-500 mb-4" />
                <CardTitle className="text-white">Compete & Win</CardTitle>
                <CardDescription className="text-slate-400">
                  Play in structured brackets with map pick/ban system. Win prizes and climb the leaderboards.
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Index;
