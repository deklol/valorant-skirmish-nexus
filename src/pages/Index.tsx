import React, { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Trophy, Users, Activity, Award } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import LiveMatches from "@/components/LiveMatches";
import PointsSpendingReminder from "@/components/PointsSpendingReminder";
import { useLiveMatches } from "@/hooks/useLiveMatches";
import { useTwitchEmbed } from "@/hooks/useTwitchEmbed";
import HomePageAnnouncement from "@/components/HomePageAnnouncement";
import TournamentTabs from "@/components/TournamentTabs";
import TwitchEmbed from "@/components/TwitchEmbed";
import RecentWinners from "@/components/RecentWinners";
import MemberHighlights from "@/components/MemberHighlights";
import RecentlyOnline from "@/components/RecentlyOnline";
import QuickActions from "@/components/QuickActions";
import SponsorDisplay from "@/components/SponsorDisplay";
import HomeHero from "@/components/home/HomeHero";
import OrgAboutSection from "@/components/home/OrgAboutSection";
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
            "description": "Join competitive Valorant tournaments at TLR Skirmish Hub with live brackets, stats tracking, fair ATLAS balancing, and our Valorant tournaments Discord for scrims, prizes, and community.",
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
                    "name": "Are TLR tournaments free to enter?",
                    "acceptedAnswer": {
                        "@type": "Answer",
                        "text": "Yes, all standard tournaments are free-to-enter with prizes, fair ATLAS balancing, and Discord integration."
                    }
                }
            ]
        }
    ]);
    document.head.appendChild(ldJsonScript);

    return () => {
      if (document.head.contains(ldJsonScript)) {
        document.head.removeChild(ldJsonScript);
      }
      if (document.head.contains(canonical)) {
        document.head.removeChild(canonical);
      }
    };
  }, []);

  return null;
};

const Index = () => {
  const { user } = useAuth();
  const { hasLiveMatches } = useLiveMatches();
  const { shouldShowTwitch } = useTwitchEmbed();
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
        const { count: playerCount } = await supabase.from('public_user_profiles').select('*', { count: 'exact' }).eq('is_phantom', false);
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

  if (loading) {
    return <HomePageSkeleton />;
  }

  return (
    <ErrorBoundary componentName="Homepage">
      <HomePageSeo /> 
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-900">
        
        {/* Hero Banner */}
        <section className="container mx-auto px-4 pt-8 pb-6">
          <HomeHero />
        </section>
        
        {/* Announcement */}
        <section className="container mx-auto px-4 pb-4">
          <HomePageAnnouncement />
        </section>
        
        {/* Live Platform Statistics */}
        <section className="container mx-auto px-4 pb-6" aria-labelledby="platform-stats-heading">
          <h2 id="platform-stats-heading" className="sr-only">Platform Statistics</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="bg-gradient-to-br from-red-900/20 to-red-800/10 border-red-700/30">
              <CardContent className="p-4 text-center">
                <Trophy className="w-8 h-8 text-red-400 mx-auto mb-2" />
                <div className="text-2xl font-bold text-white">{stats.totalTournaments}</div>
                <div className="text-red-300 text-sm">Tournaments</div>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-blue-900/20 to-blue-800/10 border-blue-700/30">
              <CardContent className="p-4 text-center">
                <Users className="w-8 h-8 text-blue-400 mx-auto mb-2" />
                <div className="text-2xl font-bold text-white">{stats.activePlayers}</div>
                <div className="text-blue-300 text-sm">Active Players</div>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-green-900/20 to-green-800/10 border-green-700/30">
              <CardContent className="p-4 text-center">
                <Activity className="w-8 h-8 text-green-400 mx-auto mb-2" />
                <div className="text-2xl font-bold text-white">{stats.liveMatches}</div>
                <div className="text-green-300 text-sm">Live Matches</div>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-purple-900/20 to-purple-800/10 border-purple-700/30">
              <CardContent className="p-4 text-center">
                <Award className="w-8 h-8 text-purple-400 mx-auto mb-2" />
                <div className="text-2xl font-bold text-white">{stats.completedMatches}</div>
                <div className="text-purple-300 text-sm">Matches Played</div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Quick Actions */}
        <section className="container mx-auto px-4 pb-6">
          <QuickActions />
        </section>
        
        {/* Twitch embed */}
        {shouldShowTwitch && (
          <section className="container mx-auto px-4 pb-6">
            <TwitchEmbed />
          </section>
        )}
        
        {/* Live Matches & Points Reminder */}
        {(hasLiveMatches || user) && (
          <section className="container mx-auto px-4 pb-6">
            {hasLiveMatches && <LiveMatches />}
            <PointsSpendingReminder />
          </section>
        )}
        
        {/* Community Spotlight — Main Content Grid */}
        <section className="container mx-auto px-4 pb-8" aria-labelledby="community-spotlight-heading">
          <h2 id="community-spotlight-heading" className="sr-only">Community Spotlight</h2>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left column — Tournaments */}
            <div>
              <TournamentTabs />
            </div>

            {/* Center column — Recent Champions */}
            <div>
              <RecentWinners />
            </div>

            {/* Right column — Member Highlights + Recently Online */}
            <div className="flex flex-col gap-6">
              <MemberHighlights />
              <RecentlyOnline />
            </div>
          </div>
        </section>

        {/* Organization About */}
        <OrgAboutSection />

        {/* Sponsors */}
        <SponsorDisplay />

      </div>
    </ErrorBoundary>
  );
};

export default Index;
