import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trophy, Users, Calendar, Zap, Target, Shield, Activity, Clock, Award, TrendingUp, Play, ChevronRight, ChevronLeft, ShoppingBag } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import LiveMatches from "@/components/LiveMatches";
import PointsSpendingReminder from "@/components/PointsSpendingReminder";
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

const HomePageSeo = () => {
  useEffect(() => {
    document.title = "Competitive Valorant Tournaments 2025 | Live Brackets & Prizes | TLR Hub";

    const newMetaDesc = "Join TLR Hub for the ultimate competitive Valorant tournaments in 2025. Find live brackets, fair team balancing, free entry, and big prizes on our active Discord.";
    let metaDesc = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    if (!metaDesc) {
      metaDesc = document.createElement('meta');
      metaDesc.name = "description";
      document.head.appendChild(metaDesc);
    }
    metaDesc.setAttribute("content", newMetaDesc);
    
    document.querySelectorAll('link[rel="canonical"]').forEach(el => el.remove());
    const canonical = document.createElement('link');
    canonical.rel = 'canonical';
    canonical.href = window.location.origin + '/';
    document.head.appendChild(canonical);
    
    const metaTags = {
      'og:title': 'TLR Hub | Competitive Valorant Tournaments & Community',
      'og:description': newMetaDesc,
      'og:image': 'https://lovable.dev/opengraph-image-p98pqg.png',
      'og:url': window.location.origin,
      'twitter:card': 'summary_large_image',
      'twitter:site': '@digitalm1nd',
    };

    Object.entries(metaTags).forEach(([property, content]) => {
      let el = document.querySelector<HTMLMetaElement>(`meta[property="${property}"]`) || document.querySelector<HTMLMetaElement>(`meta[name="${property}"]`);
      if (!el) {
        el = document.createElement('meta');
        if (property.startsWith('og:')) {
          el.setAttribute('property', property);
        } else {
          el.name = property;
        }
        document.head.appendChild(el);
      }
      el.content = content;
    });

    const existingLdJson = document.getElementById('ld-json-data');
    if (existingLdJson) {
      existingLdJson.remove();
    }
    const ldJsonScript = document.createElement('script');
    ldJsonScript.type = 'application/ld+json';
    ldJsonScript.id = 'ld-json-data';
    ldJsonScript.text = JSON.stringify([
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
    document.head.appendChild(ldJsonScript);

    // Cleanup function to remove tags when the component unmounts
    return () => {
      if (document.head.contains(ldJsonScript)) {
        document.head.removeChild(ldJsonScript);
      }
      if (document.head.contains(canonical)) {
        document.head.removeChild(canonical);
      }
    };
  }, []);

  return null; // This component does not render anything to the DOM
};

const Index = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalTournaments: 0,
    activePlayers: 0,
    liveMatches: 0,
    completedMatches: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const { count: tournamentCount } = await supabase.from('tournaments').select('*', { count: 'exact' });
        const { count: playerCount } = await supabase.from('users').select('*', { count: 'exact' }).eq('is_phantom', false);
        const { count: liveMatchCount } = await supabase.from('matches').select('*', { count: 'exact' }).eq('status', 'live');
        const { count: completedMatchCount } = await supabase.from('matches').select('*', { count: 'exact' }).eq('status', 'completed');
        
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
      <HomePageSeo /> 
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-900">
        
        {/* Hero/Main Headline */}
        <section className="container mx-auto px-4 pt-8 pb-6">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold text-white mb-6 bg-gradient-to-r from-red-400 via-yellow-400 to-red-400 bg-clip-text text-transparent">
              TLR Hub: Premier Valorant Tournaments
            </h1>
            <p className="text-xl text-slate-300 mb-8 max-w-3xl mx-auto">
              Join the #1 Valorant tournaments Discord community for free-to-enter competitive events with prizes, live brackets, and fair team balancing in 2025.
            </p>
          </div>
          <HomeHero />
        </section>
        
        {/* Announcement Full Width */}
        <section className="container mx-auto px-4 pb-4">
          <HomePageAnnouncement />
        </section>
        
        {/* Live Platform Statistics */}
        <section className="container mx-auto px-4 pb-8" aria-labelledby="platform-stats-heading">
          {/* --- H2 Heading Added for Structure --- */}
          <h2 id="platform-stats-heading" className="text-3xl font-bold text-white text-center mb-8">
            Live Platform Statistics
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="bg-gradient-to-br from-red-900/20 to-red-800/10 border-red-700/30">
              <CardContent className="p-4 text-center">
                <Trophy className="w-8 h-8 text-red-400 mx-auto mb-2" aria-label="Trophy for Completed Tournaments" />
                <div className="text-2xl font-bold text-white">{stats.totalTournaments}</div>
                <div className="text-red-300 text-sm">Tournaments</div>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-blue-900/20 to-blue-800/10 border-blue-700/30">
              <CardContent className="p-4 text-center">
                <Users className="w-8 h-8 text-blue-400 mx-auto mb-2" aria-label="Active Players" />
                <div className="text-2xl font-bold text-white">{stats.activePlayers}</div>
                <div className="text-blue-300 text-sm">Active Players</div>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-green-900/20 to-green-800/10 border-green-700/30">
              <CardContent className="p-4 text-center">
                <Activity className="w-8 h-8 text-green-400 mx-auto mb-2" aria-label="Live Matches" />
                <div className="text-2xl font-bold text-white">{stats.liveMatches}</div>
                <div className="text-green-300 text-sm">Live Matches</div>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-purple-900/20 to-purple-800/10 border-purple-700/30">
              <CardContent className="p-4 text-center">
                <Award className="w-8 h-8 text-purple-400 mx-auto mb-2" aria-label="Completed Matches" />
                <div className="text-2xl font-bold text-white">{stats.completedMatches}</div>
                <div className="text-purple-300 text-sm">Completed Matches</div>
              </CardContent>
            </Card>
          </div>
        </section>
        
        {/* Twitch embed full width */}
        <section className="container mx-auto px-4 pb-8">
          <TwitchEmbed />
        </section>
        
        {/* Live Matches and Points Reminder Section */}
        <section className="container mx-auto px-4 pt-4 pb-8 space-y-8">
          <LiveMatches />
          <PointsSpendingReminder />
        </section>
        
        {/* Community Spotlight Grid */}
        <section className="container mx-auto px-4 pb-8" aria-labelledby="community-spotlight-heading">
          {/* --- Screen-reader only H2 for structure --- */}
          <h2 id="community-spotlight-heading" className="sr-only">Community Spotlight: Top Players, Tournaments, and Recent Winners</h2>
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
        <section className="container mx-auto px-4 py-16" aria-labelledby="features-heading">
          <div className="text-center mb-12">
            <h2 id="features-heading" className="text-3xl font-bold text-white mb-4">
              Premium Features for Competitive Play
            </h2>
            <p className="text-xl text-slate-400 max-w-3xl mx-auto">
              From automated brackets to our bespoke ATLAS balancing algorithm, our platform handles every aspect of your competitive Valorant tournament experience.
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
                  Generate tournament brackets automatically with fair seeding, elimination progression, and real-time Discord notifications.
                </p>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-blue-900/20 to-blue-800/10 border-blue-700/30 hover:border-blue-500 transition-colors group">
              <CardHeader>
                <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center mb-4 group-hover:bg-blue-500/30 transition-colors">
                  <Shield className="h-6 w-6 text-blue-400" />
                </div>
                <CardTitle className="text-white">ATLAS Team Balancing</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-400">
                  Our smart balancing algorithm analyzes player skill to ensure fair competition by distributing talent evenly across all teams.
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
                  Utilize our interactive map veto process with real-time controls for captains, adding a strategic layer to every match.
                </p>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-purple-900/20 to-purple-800/10 border-purple-700/30 hover:border-purple-500 transition-colors group">
              <CardHeader>
                <div className="w-12 h-12 bg-purple-500/20 rounded-lg flex items-center justify-center mb-4 group-hover:bg-purple-500/30 transition-colors">
                  <Zap className="h-6 w-6 text-purple-400" />
                </div>
                <CardTitle className="text-white">Player Stat Tracking</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-400">
                  Track your tournament history and performance. View detailed stats and recent ranked history on public player profiles.
                </p>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-yellow-900/20 to-yellow-800/10 border-yellow-700/30 hover:border-yellow-500 transition-colors group">
              <CardHeader>
                <div className="w-12 h-12 bg-yellow-500/20 rounded-lg flex items-center justify-center mb-4 group-hover:bg-yellow-500/30 transition-colors">
                  <Users className="h-6 w-6 text-yellow-400" />
                </div>
                <CardTitle className="text-white">Player Profiles</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-400">
                  Maintain a complete player profile with rank tracking, performance analytics, and match history across all tournaments.
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
                  Earn achievement points from playing, and spend them on cool name effects and exclusive profile customizations.
                </p>
              </CardContent>
            </Card>
          </div>
        </section>
        
        {/* How It Works Section */}
        <section className="container mx-auto px-4 py-16" aria-labelledby="how-it-works-heading">
          <div className="text-center mb-12">
            <h2 id="how-it-works-heading" className="text-3xl font-bold text-white mb-4">
              How Our Tournament System Works
            </h2>
            <p className="text-xl text-slate-400 max-w-3xl mx-auto">
              From registration to championship matches, our streamlined process makes competing simple and fair for all skill levels.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <Card className="bg-gradient-to-br from-green-900/20 to-green-800/10 border-green-700/30">
              <CardHeader><CardTitle className="text-white text-center">1. Register</CardTitle></CardHeader>
              <CardContent><p className="text-slate-400 text-center">Create your account, set your Riot ID, and join our Discord. Registration is free for all tournaments.</p></CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-blue-900/20 to-blue-800/10 border-blue-700/30">
              <CardHeader><CardTitle className="text-white text-center">2. Join Tournaments</CardTitle></CardHeader>
              <CardContent><p className="text-slate-400 text-center">Browse active tournaments and register individually or with a team. Our ATLAS system ensures fair matchmaking.</p></CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-purple-900/20 to-purple-800/10 border-purple-700/30">
              <CardHeader><CardTitle className="text-white text-center">3. Compete</CardTitle></CardHeader>
              <CardContent><p className="text-slate-400 text-center">Play matches using our integrated map veto system, submit scores, and track your progress on live brackets.</p></CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-yellow-900/20 to-yellow-800/10 border-yellow-700/30">
              <CardHeader><CardTitle className="text-white text-center">4. Win Prizes</CardTitle></CardHeader>
              <CardContent><p className="text-slate-400 text-center">Earn achievement points, unlock exclusive items, and compete for prizes while building your legacy.</p></CardContent>
            </Card>
          </div>
        </section>

        {/* Tournament Formats Section */}
        <section className="container mx-auto px-4 py-16" aria-labelledby="formats-heading">
          <div className="text-center mb-12">
            <h2 id="formats-heading" className="text-3xl font-bold text-white mb-4">
              Multiple Tournament Formats
            </h2>
            <p className="text-xl text-slate-400 max-w-3xl mx-auto">
              Whether you prefer solo queue or organized team battles, we offer diverse formats to match your competitive goals.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <Card className="bg-gradient-to-br from-red-900/20 to-red-800/10 border-red-700/30">
              <CardHeader><CardTitle className="text-white">Solo Queue Tournaments</CardTitle></CardHeader>
              <CardContent>
                <p className="text-slate-400 mb-4">Perfect for individual players. Our ATLAS system creates fair teams automatically based on rank and performance.</p>
                <ul className="text-slate-400 space-y-2 list-disc list-inside">
                  <li>Automatic team balancing</li>
                  <li>Fair skill distribution</li>
                  <li>Individual performance tracking</li>
                  <li>Regular weekly tournaments</li>
                </ul>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-blue-900/20 to-blue-800/10 border-blue-700/30">
              <CardHeader><CardTitle className="text-white">Team-Based Competitions</CardTitle></CardHeader>
              <CardContent>
                <p className="text-slate-400 mb-4">Bring your pre-made team or find one through our community. Compete against other organized squads in structured brackets.</p>
                <ul className="text-slate-400 space-y-2 list-disc list-inside">
                  <li>Pre-made team registration</li>
                  <li>Team finder for LFT players</li>
                  <li>Captain-based map veto system</li>
                  <li>Team statistics tracking</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="container mx-auto px-4 py-16" aria-labelledby="faq-heading">
          <div className="text-center mb-12">
            <h2 id="faq-heading" className="text-3xl font-bold text-white mb-4">
              Frequently Asked Questions
            </h2>
            <p className="text-xl text-slate-400 max-w-3xl mx-auto">
              Get answers to common questions about joining our competitive Valorant tournaments and Discord community.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <Card className="bg-gradient-to-br from-indigo-900/20 to-indigo-800/10 border-indigo-700/30">
              <CardHeader><CardTitle className="text-white">How do I join Valorant tournaments?</CardTitle></CardHeader>
              <CardContent>
                <p className="text-slate-400">
                  Sign up at <Link to="/tournaments" className="text-purple-400 hover:underline">TLR Hub</Link> and join our <a href="https://discord.gg/TLR" className="text-purple-400 hover:underline" rel="noopener noreferrer" target="_blank">Valorant tournament Discord</a> for schedules and scrims.
                </p>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-indigo-900/20 to-indigo-800/10 border-indigo-700/30">
              <CardHeader><CardTitle className="text-white">What is the best Valorant tournament Discord?</CardTitle></CardHeader>
              <CardContent>
                <p className="text-slate-400">
                  TLR Hub's Discord is a top choice for competitive players, offering live brackets, scrims, and prize updates. Join at <a href="https://discord.gg/TLR" className="text-purple-400 hover:underline" rel="noopener noreferrer" target="_blank">discord.gg/TLR</a>.
                </p>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-indigo-900/20 to-indigo-800/10 border-indigo-700/30">
              <CardHeader><CardTitle className="text-white">Are the tournaments free to enter?</CardTitle></CardHeader>
              <CardContent>
                <p className="text-slate-400">
                  Yes, all our standard tournaments are free-to-enter and include prizes, fair ATLAS balancing, and full Discord integration. Check the <Link to="/tournaments" className="text-purple-400 hover:underline">tournaments page</Link> for events.
                </p>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-indigo-900/20 to-indigo-800/10 border-indigo-700/30">
              <CardHeader><CardTitle className="text-white">What ranks can participate?</CardTitle></CardHeader>
              <CardContent>
                <p className="text-slate-400">
                  All ranks from Iron to Radiant are welcome. Our ATLAS system ensures balanced matches regardless of individual skill level, creating a fair environment for everyone.
                </p>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-indigo-900/20 to-indigo-800/10 border-indigo-700/30">
              <CardHeader><CardTitle className="text-white">How does ATLAS balancing work?</CardTitle></CardHeader>
              <CardContent>
                <p className="text-slate-400">
                  ATLAS analyzes player ranks, recent performance, and historical data to create balanced teams, ensuring exciting and competitive matches for all participants.
                </p>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-indigo-900/20 to-indigo-800/10 border-indigo-700/30">
              <CardHeader><CardTitle className="text-white">Can I track my tournament statistics?</CardTitle></CardHeader>
              <CardContent>
                <p className="text-slate-400">
                  Absolutely! Your player profile provides comprehensive stats tracking, including wins, losses, placements, and detailed match history across all competitive events.
                </p>
              </CardContent>
            </Card>
          </div>
        </section>

      </div>
    </ErrorBoundary>
  );
};

export default Index;
