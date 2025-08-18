import React, { useState, useEffect } from "react";
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
import { HomePageSkeleton } from "@/components/ui/loading-skeleton";
import ErrorBoundary from "@/components/ErrorBoundary";

const Index = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalTournaments: 0,
    activePlayers: 0,
    liveMatches: 0,
    completedMatches: 0
  });
  const [loading, setLoading] = useState(true);

  // Enhanced SEO for homepage with 2025 best practices  
  useEffect(() => {
    // Set optimized title and meta description for competitive Valorant tournaments
    document.title = "Competitive Valorant Tournaments 2025 | TLR Skirmish Hub - Valorant Tournaments Discord";
    const setMetaDescription = () => {
      const metaDesc = document.querySelector('meta[name="description"]');
      if (metaDesc) {
        metaDesc.setAttribute("content", "Join competitive Valorant tournaments at TLR Skirmish Hub. Our Valorant tournaments Discord offers live brackets, fair balancing, and exciting prizes. Play competitive Valorant tournaments with top players in 2025.");
      } else {
        const m = document.createElement("meta");
        m.name = "description";
        m.content = "Join competitive Valorant tournaments at TLR Skirmish Hub. Our Valorant tournaments Discord offers live brackets, fair balancing, and exciting prizes. Play competitive Valorant tournaments with top players in 2025.";
        document.head.appendChild(m);
      }
    };
    // Ensure meta tags are set after render (client-side React fix)
    setTimeout(setMetaDescription, 0);

    // Open Graph and Twitter meta for social sharing
    const ogTitle = document.createElement("meta");
    ogTitle.setAttribute("property", "og:title");
    ogTitle.content = "Competitive Valorant Tournaments at TLR Skirmish Hub";
    document.head.appendChild(ogTitle);
    const ogDesc = document.createElement("meta");
    ogDesc.setAttribute("property", "og:description");
    ogDesc.content = "Join competitive Valorant tournaments at TLR Skirmish Hub. Our Valorant tournaments Discord community offers live brackets, fair balancing, and exciting prizes for competitive Valorant tournaments in 2025.";
    document.head.appendChild(ogDesc);
    const ogImage = document.createElement("meta");
    ogImage.setAttribute("property", "og:image");
    ogImage.content = "https://lovable.dev/opengraph-image-p98pqg.png";
    document.head.appendChild(ogImage);
    const ogUrl = document.createElement("meta");
    ogUrl.setAttribute("property", "og:url");
    ogUrl.content = window.location.origin;
    document.head.appendChild(ogUrl);
    const twitterCard = document.createElement("meta");
    twitterCard.name = "twitter:card";
    twitterCard.content = "summary_large_image";
    document.head.appendChild(twitterCard);
    const twitterSite = document.createElement("meta");
    twitterSite.name = "twitter:site";
    twitterSite.content = "@digitalm1nd";
    document.head.appendChild(twitterSite);

    const canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (canonical) canonical.href = window.location.origin + "/";
    else {
      const l = document.createElement("link");
      l.rel = "canonical";
      l.href = window.location.origin + "/";
      document.head.appendChild(l);
    }

    // Expanded Structured data with SportsEvent and FAQ for rich snippets
    const ld = document.createElement("script");
    ld.type = "application/ld+json";
    ld.text = JSON.stringify([
      {
        "@context": "https://schema.org",
        "@type": "WebSite",
        "name": "The Last Resort - Skirmish Hub",
        "url": window.location.origin + "/",
        "author": {
          "@type": "Person",
          "name": "@digitalm1nd",
          "description": "Esports organizer for competitive Valorant tournaments"
        },
        "potentialAction": {
          "@type": "SearchAction",
          "target": window.location.origin + "/players?search={query}",
          "query-input": "required name=query"
        }
      },
      {
        "@context": "https://schema.org",
        "@type": "SportsEvent",
        "name": "TLR Skirmish Hub Valorant Tournament Series 2025",
        "startDate": "2025-08-18",
        "endDate": "2025-12-31",
        "eventAttendanceMode": "https://schema.org/OnlineEventAttendanceMode",
        "eventStatus": "https://schema.org/EventScheduled",
        "location": {
          "@type": "VirtualLocation",
          "url": window.location.origin
        },
        "image": "https://lovable.dev/opengraph-image-p98pqg.png",
        "description": "Join competitive Valorant tournaments at TLR Skirmish Hub with live brackets, stats tracking, fair ATLAS balancing, and our Valorant tournaments Discord for scrims, prizes, and community. Play competitive Valorant tournaments in 2025.",
        "offers": {
          "@type": "Offer",
          "price": "0",
          "priceCurrency": "USD",
          "availability": "https://schema.org/InStock",
          "url": window.location.origin
        },
        "organizer": {
          "@type": "Organization",
          "name": "TLR Skirmish Hub",
          "url": window.location.origin
        },
        "competitor": {
          "@type": "SportsTeam",
          "name": "Valorant Players and Teams"
        }
      },
      {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "mainEntity": [
          {
            "@type": "Question",
            "name": "How to join Valorant tournaments in 2025?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Sign up at TLR Skirmish Hub for solo or team-based competitive Valorant tournaments. Register via our platform and join our Valorant tournament Discord for schedules and scrims."
            }
          },
            {
              "@type": "Question",
              "name": "What is the best Valorant tournaments Discord?",
              "acceptedAnswer": {
                "@type": "Answer",
                "text": "TLR Skirmish Hub's Valorant tournaments Discord is the top choice for competitive Valorant tournaments, offering live brackets, scrims, and prize updates. Join our Valorant tournaments Discord community for competitive Valorant tournaments in 2025."
              }
            },
          {
            "@type": "Question",
            "name": "Does TLR Skirmish Hub offer free Valorant tournaments?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Yes, TLR Skirmish Hub offers free-to-enter competitive Valorant tournaments with prizes, fair ATLAS balancing, and Valorant tournaments Discord integration for seamless competitive Valorant tournaments experience."
            }
          }
        ]
      }
    ]);
    document.head.appendChild(ld);

    // Gray-hat: Subtle bot meta for crawlers (low risk)
    const isBot = /googlebot/i.test(navigator.userAgent);
    if (isBot) {
      const botMeta = document.createElement("meta");
      botMeta.name = "bot-keywords";
      botMeta.content = "competitive valorant tournaments, valorant tournaments discord, valorant scrim hub, community esports events, play valorant online tournaments 2025";
      document.head.appendChild(botMeta);
    }

    return () => {
      document.head.removeChild(ld);
      document.head.removeChild(ogTitle);
      document.head.removeChild(ogDesc);
      document.head.removeChild(ogImage);
      document.head.removeChild(ogUrl);
      document.head.removeChild(twitterCard);
      document.head.removeChild(twitterSite);
    };
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
        console.error('Index: Error fetching homepage stats:', error);
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

  if (loading) {
    return <HomePageSkeleton />;
  }

  return (
    <ErrorBoundary componentName="Homepage">
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
        <section className="container mx-auto px-4 pb-8" aria-label="Competitive Valorant Tournaments and Valorant Tournaments Discord Stats 2025">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="bg-gradient-to-br from-red-900/20 to-red-800/10 border-red-700/30">
              <CardContent className="p-4 text-center">
                <Trophy className="w-8 h-8 text-red-400 mx-auto mb-2" aria-label="Trophy for Competitive Valorant Tournaments 2025" />
                <div className="text-2xl font-bold text-white">{loading ? '...' : stats.totalTournaments}</div>
                <div className="text-red-300 text-sm">Completed Tournaments with Prizes</div>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-blue-900/20 to-blue-800/10 border-blue-700/30">
              <CardContent className="p-4 text-center">
                <Users className="w-8 h-8 text-blue-400 mx-auto mb-2" aria-label="Active Players in Valorant Tournament Discord 2025" />
                <div className="text-2xl font-bold text-white">{loading ? '...' : stats.activePlayers}</div>
                <div className="text-blue-300 text-sm">Active Players in our Valorant Tournaments</div>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-green-900/20 to-green-800/10 border-green-700/30">
              <CardContent className="p-4 text-center">
                <Activity className="w-8 h-8 text-green-400 mx-auto mb-2" aria-label="Live Matches in Competitive Valorant Tournaments 2025" />
                <div className="text-2xl font-bold text-white">{loading ? '...' : stats.liveMatches}</div>
                <div className="text-green-300 text-sm">Live Competitive Tournament Matches</div>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-purple-900/20 to-purple-800/10 border-purple-700/30">
              <CardContent className="p-4 text-center">
                <Award className="w-8 h-8 text-purple-400 mx-auto mb-2" aria-label="Completed Matches in Valorant Tournament Discord 2025" />
                <div className="text-2xl font-bold text-white">{loading ? '...' : stats.completedMatches}</div>
                <div className="text-purple-300 text-sm">Completed Matches</div>
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
        <section className="container mx-auto px-4 py-16" aria-label="Features for Competitive Valorant Tournaments and Valorant Tournaments Discord 2025">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-white mb-4">
              Everything for Competitive Valorant Tournament Success in 2025!
            </h2>
            <p className="text-xl text-slate-400 max-w-3xl mx-auto">
              From bracket generation to our bespoke ATLAS balancing algorithms, our platform handles every aspect of competitive Valorant tournaments and Valorant tournaments Discord integration.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <Card className="bg-gradient-to-br from-red-900/20 to-red-800/10 border-red-700/30 hover:border-red-500 transition-colors group">
              <CardHeader>
                <div className="w-12 h-12 bg-red-500/20 rounded-lg flex items-center justify-center mb-4 group-hover:bg-red-500/30 transition-colors">
                  <Trophy className="h-6 w-6 text-red-400" aria-label="Automated Brackets for Competitive Valorant Tournaments 2025" />
                </div>
                <CardTitle className="text-white">Automated Brackets for Competitive Tournaments</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-400">
                  Generate competitive Valorant tournament brackets automatically with fair balancing,
                  elimination progression, and real-time notification updates via our Valorant tournaments Discord.
                </p>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-blue-900/20 to-blue-800/10 border-blue-700/30 hover:border-blue-500 transition-colors group">
              <CardHeader>
                <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center mb-4 group-hover:bg-blue-500/30 transition-colors">
                  <Shield className="h-6 w-6 text-blue-400" aria-label="Team Balancing in Valorant Tournament Discord 2025" />
                </div>
                <CardTitle className="text-white">Team Balancing for Fair Competitions</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-400">
                  Smart team balancing algorithms ensure fair competition by
                  distributing skill levels evenly across all teams in our community esports events.
                </p>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-green-900/20 to-green-800/10 border-green-700/30 hover:border-green-500 transition-colors group">
              <CardHeader>
                <div className="w-12 h-12 bg-green-500/20 rounded-lg flex items-center justify-center mb-4 group-hover:bg-green-500/30 transition-colors">
                  <Target className="h-6 w-6 text-green-400" aria-label="Map Veto System for Competitive Valorant Tournaments 2025" />
                </div>
                <CardTitle className="text-white">Map Veto System for Strategic Matches</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-400">
                  Interactive map veto process with real-time captain controls
                  for strategic map selection in competitive Valorant tournament matches.
                </p>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-purple-900/20 to-purple-800/10 border-purple-700/30 hover:border-purple-500 transition-colors group">
              <CardHeader>
                <div className="w-12 h-12 bg-purple-500/20 rounded-lg flex items-center justify-center mb-4 group-hover:bg-purple-500/30 transition-colors">
                  <Zap className="h-6 w-6 text-purple-400" aria-label="History Tracking in Valorant Tournament Discord 2025" />
                </div>
                <CardTitle className="text-white">History Tracking for Tournament Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-400">
                  Track your competitive Valorant tournament history with our tracking features,
                  view recent ranked history of any player on their public profiles via our Valorant tournaments Discord.
                </p>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-yellow-900/20 to-yellow-800/10 border-yellow-700/30 hover:border-yellow-500 transition-colors group">
              <CardHeader>
                <div className="w-12 h-12 bg-yellow-500/20 rounded-lg flex items-center justify-center mb-4 group-hover:bg-yellow-500/30 transition-colors">
                  <Users className="h-6 w-6 text-yellow-400" aria-label="Player Management for Competitive Valorant Tournaments 2025" />
                </div>
                <CardTitle className="text-white">Player Management with Analytics</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-400">
                  Complete player profiles with rank tracking, statistics,
                  and performance analytics across all competitive Valorant tournaments.
                </p>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-purple-900/20 to-purple-800/10 border-purple-700/30 hover:border-purple-500 transition-colors group">
              <CardHeader>
                <div className="w-12 h-12 bg-purple-500/20 rounded-lg flex items-center justify-center mb-4 group-hover:bg-purple-500/30 transition-colors">
                  <ShoppingBag className="h-6 w-6 text-purple-400" aria-label="Shop & Rewards in Valorant Tournament Discord 2025" />
                </div>
                <CardTitle className="text-white">Shop & Rewards for Tournament Wins</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-400">
                  Play competitive Valorant tournaments, earn achievement points, and purchase cool
                  name effects and exclusive items to customize your profile via our Valorant scrim hub.
                </p>
              </CardContent>
            </Card>
          </div>
        </section>
        {/* FAQ Section for Long-Tail and Voice Search */}
        <section className="container mx-auto px-4 py-16" aria-label="FAQ for Competitive Valorant Tournaments and Discord 2025">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-white mb-4">
              Frequently Asked Questions About Valorant Tournaments
            </h2>
            <p className="text-xl text-slate-400 max-w-3xl mx-auto">
              Get answers to common questions about joining our competitive Valorant tournaments and Valorant tournament Discord community.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-8">
            <Card className="bg-gradient-to-br from-indigo-900/20 to-indigo-800/10 border-indigo-700/30">
              <CardHeader>
                <CardTitle className="text-white">How to join Valorant tournaments in 2025?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-400">
                  Sign up at <Link to="/tournaments" className="text-purple-400 hover:underline">TLR Skirmish Hub</Link> for solo or team-based competitive Valorant tournaments. Register via our platform and join our <a href="https://discord.gg/TLR" className="text-purple-400 hover:underline" rel="noopener noreferrer">Valorant tournament Discord</a> for schedules and scrims.
                </p>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-indigo-900/20 to-indigo-800/10 border-indigo-700/30">
              <CardHeader>
                <CardTitle className="text-white">What is the best Valorant tournament Discord?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-400">
                  TLR Skirmish Hub's Discord is the top choice for competitive Valorant players, offering live brackets, scrims, and prize updates. Join at <a href="https://discord.gg/TLR" className="text-purple-400 hover:underline" rel="noopener noreferrer">discord.gg/TLR</a>
                </p>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-indigo-900/20 to-indigo-800/10 border-indigo-700/30">
              <CardHeader>
                <CardTitle className="text-white">Does TLR Skirmish Hub offer free Valorant tournaments?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-400">
                  Yes, TLR Skirmish Hub offers free-to-enter competitive Valorant tournaments with prizes, fair ATLAS balancing, and Discord integration for seamless play. Check our <Link to="/tournaments" className="text-purple-400 hover:underline">tournaments page</Link> for details.
                </p>
              </CardContent>
            </Card>
          </div>
        </section>
        {/* Black-hat: Hidden keywords (uncomment at HIGH RISK of penalty - Google detects hidden text in 2025) */}
        {/* <div style={{ display: 'none' }} aria-hidden="true">Competitive Valorant tournament Discord 2025, Valorant esports scrims prizes, community esports events, play Valorant online tournaments</div> */}
      </div>
    </ErrorBoundary>
  );
};

export default Index;