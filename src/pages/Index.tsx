import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trophy, Users, Calendar, Zap, Target, Shield, Activity, Clock, Award, TrendingUp, Play, ChevronRight, ChevronLeft, ShoppingBag } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import LiveMatches from "@/components/LiveMatches";
import HomePageAnnouncement from "@/components/HomePageAnnouncement";
import TournamentTabs from "@/components/TournamentTabs";
import TopPlayersDisplay from "@/components/TopPlayersDisplay";
import TwitchEmbed from "@/components/TwitchEmbed";
import RecentWinners from "@/components/RecentWinners";
import MemberHighlights from "@/components/MemberHighlights";
import SponsorDisplay from "@/components/SponsorDisplay";
import HomeHero from "@/components/home/HomeHero";

const Index = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalTournaments: 0,
    activePlayers: 0,
    liveMatches: 0,
    completedMatches: 0
  });
  const [loading, setLoading] = useState(true);

  // Basic SEO for homepage
  useEffect(() => {
    document.title = "TLRHub.pro - The Last Resort Skirmish Hub";
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) metaDesc.setAttribute("content", "Join, and watch solo-signup Valorant tournaments with live brackets, VODs, and fair ATLAS player weighting.");
    else {
      const m = document.createElement("meta");
      m.name = "description";
      m.content = "Join, and watch solo-signup Valorant tournaments with live brackets, VODs, and fair ATLAS player weighting.";
      document.head.appendChild(m);
    }
    const canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (canonical) canonical.href = window.location.origin + "/";
    else {
      const l = document.createElement("link");
      l.rel = "canonical";
      l.href = window.location.origin + "/";
      document.head.appendChild(l);
    }

    // Structured data
    const ld = document.createElement("script");
    ld.type = "application/ld+json";
    ld.text = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "WebSite",
      "name": "The Last Resort - Skirmish Hub",
      "url": window.location.origin + "/",
      "potentialAction": {
        "@type": "SearchAction",
        "target": window.location.origin + "/players?search={query}",
        "query-input": "required name=query"
      }
    });
    document.head.appendChild(ld);
    return () => { document.head.removeChild(ld); };
  }, []);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // Get tournament count
        const { count: tournamentCount } = await supabase
          .from('tournaments')
          .select('*', { count: 'exact' });

        // Get total registered players
        const { count: playerCount } = await supabase
          .from('users')
          .select('*', { count: 'exact' })
          .eq('is_phantom', false);

        // Get live matches
        const { count: liveMatchCount } = await supabase
          .from('matches')
          .select('*', { count: 'exact' })
          .eq('status', 'live');

        // Get completed matches
        const { count: completedMatchCount } = await supabase
          .from('matches')
          .select('*', { count: 'exact' })
          .eq('status', 'completed');

        setStats({
          totalTournaments: tournamentCount || 0,
          activePlayers: playerCount || 0,
          liveMatches: liveMatchCount || 0,
          completedMatches: completedMatchCount || 0
        });
      } catch (error) {
        console.error('Error fetching stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-900">
      {/* Hero/Main Headline */}
      <section className="container mx-auto px-4 pt-8 pb-6">
        <HomeHero />
      </section>

      {/* Announcement Full Width */}
      <section className="container mx-auto px-4 pb-4">
        <HomePageAnnouncement />
      </section>

      {/* Live Platform Statistics */}
      <section className="container mx-auto px-4 pb-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-red-900/20 to-red-800/10 border-red-700/30">
            <CardContent className="p-4 text-center">
              <Trophy className="w-8 h-8 text-red-400 mx-auto mb-2" />
              <div className="text-2xl font-bold text-white">{loading ? '...' : stats.totalTournaments}</div>
              <div className="text-red-300 text-sm">Total Tournaments</div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-blue-900/20 to-blue-800/10 border-blue-700/30">
            <CardContent className="p-4 text-center">
              <Users className="w-8 h-8 text-blue-400 mx-auto mb-2" />
              <div className="text-2xl font-bold text-white">{loading ? '...' : stats.activePlayers}</div>
              <div className="text-blue-300 text-sm">Active Players</div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-green-900/20 to-green-800/10 border-green-700/30">
            <CardContent className="p-4 text-center">
              <Activity className="w-8 h-8 text-green-400 mx-auto mb-2" />
              <div className="text-2xl font-bold text-white">{loading ? '...' : stats.liveMatches}</div>
              <div className="text-green-300 text-sm">Live Matches</div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-purple-900/20 to-purple-800/10 border-purple-700/30">
            <CardContent className="p-4 text-center">
              <Award className="w-8 h-8 text-purple-400 mx-auto mb-2" />
              <div className="text-2xl font-bold text-white">{loading ? '...' : stats.completedMatches}</div>
              <div className="text-purple-300 text-sm">Matches Played</div>
            </CardContent>
          </Card>
        </div>
      </section>


      {/* Twitch embed full width (if enabled) */}
      <section className="container mx-auto px-4 pb-8">
        <TwitchEmbed />
      </section>

      {/* Live Matches Section */}
      <section className="container mx-auto px-4 pt-4 pb-8">
        <LiveMatches />
      </section>

      {/* Enhanced 3-col grid: L=Top Players | M=Tournaments | R=Recent Winner */}
      <section className="container mx-auto px-4 pb-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="space-y-6">
            <MemberHighlights />
          </div>
          <div>
            <TournamentTabs />
          </div>
          <div>
            <RecentWinners />
          </div>
        </div>
      </section>

      {/* Enhanced Features Section */}
      <section className="container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-white mb-4">
            Everything You Need for Tournament Success
          </h2>
          <p className="text-xl text-slate-400 max-w-3xl mx-auto">
            From bracket generation to live tracking, our platform handles every aspect of competitive gaming tournaments
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <Card className="bg-gradient-to-br from-red-900/20 to-red-800/10 border-red-700/30 hover:border-red-500 transition-colors group">
            <CardHeader>
              <div className="w-12 h-12 bg-red-500/20 rounded-lg flex items-center justify-center mb-4 group-hover:bg-red-500/30 transition-colors">
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

          <Card className="bg-gradient-to-br from-blue-900/20 to-blue-800/10 border-blue-700/30 hover:border-blue-500 transition-colors group">
            <CardHeader>
              <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center mb-4 group-hover:bg-blue-500/30 transition-colors">
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

          <Card className="bg-gradient-to-br from-green-900/20 to-green-800/10 border-green-700/30 hover:border-green-500 transition-colors group">
            <CardHeader>
              <div className="w-12 h-12 bg-green-500/20 rounded-lg flex items-center justify-center mb-4 group-hover:bg-green-500/30 transition-colors">
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

          <Card className="bg-gradient-to-br from-purple-900/20 to-purple-800/10 border-purple-700/30 hover:border-purple-500 transition-colors group">
            <CardHeader>
              <div className="w-12 h-12 bg-purple-500/20 rounded-lg flex items-center justify-center mb-4 group-hover:bg-purple-500/30 transition-colors">
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

          <Card className="bg-gradient-to-br from-yellow-900/20 to-yellow-800/10 border-yellow-700/30 hover:border-yellow-500 transition-colors group">
            <CardHeader>
              <div className="w-12 h-12 bg-yellow-500/20 rounded-lg flex items-center justify-center mb-4 group-hover:bg-yellow-500/30 transition-colors">
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

          <Card className="bg-gradient-to-br from-purple-900/20 to-purple-800/10 border-purple-700/30 hover:border-purple-500 transition-colors group">
            <CardHeader>
              <div className="w-12 h-12 bg-purple-500/20 rounded-lg flex items-center justify-center mb-4 group-hover:bg-purple-500/30 transition-colors">
                <ShoppingBag className="h-6 w-6 text-purple-400" />
              </div>
              <CardTitle className="text-white">Shop & Rewards</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-400">
                Play tournaments, earn achievement points, and purchase cool 
                name effects and exclusive items to customize your profile.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

    </div>
  );
};

export default Index;
