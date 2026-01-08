import { Link } from "react-router-dom";
import { Trophy, Users, BarChart3, Calendar, ArrowRight, Sparkles } from "lucide-react";
import { GradientBackground, GlassCard, StatCard, BetaButton, BetaBadge } from "@/components-beta/ui-beta";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface Stats {
  totalTournaments: number;
  activePlayers: number;
  matchesPlayed: number;
  upcomingEvents: number;
}

const BetaIndex = () => {
  const [stats, setStats] = useState<Stats>({
    totalTournaments: 0,
    activePlayers: 0,
    matchesPlayed: 0,
    upcomingEvents: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [tournamentsRes, usersRes, matchesRes, upcomingRes] = await Promise.all([
          supabase.from("tournaments").select("id", { count: "exact", head: true }),
          supabase.from("users").select("id", { count: "exact", head: true }),
          supabase.from("matches").select("id", { count: "exact", head: true }).eq("status", "completed"),
          supabase.from("tournaments").select("id", { count: "exact", head: true }).eq("status", "open"),
        ]);

        setStats({
          totalTournaments: tournamentsRes.count || 0,
          activePlayers: usersRes.count || 0,
          matchesPlayed: matchesRes.count || 0,
          upcomingEvents: upcomingRes.count || 0,
        });
      } catch (error) {
        console.error("Failed to fetch stats:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  return (
    <GradientBackground>
      <div className="container mx-auto px-4 py-8 md:py-12">
        {/* Hero Section */}
        <section className="mb-12 md:mb-16">
          <div className="max-w-3xl">
            <div className="mb-4 flex items-center gap-2">
              <BetaBadge variant="accent">
                <Sparkles className="mr-1 h-3 w-3" />
                Beta Design
              </BetaBadge>
            </div>
            
            <h1 className="mb-4 text-4xl font-bold text-[hsl(var(--beta-text-primary))] md:text-5xl lg:text-6xl">
              Welcome to{" "}
              <span className="beta-gradient-text">TLR Skirmish Hub</span>
            </h1>
            
            <p className="mb-8 text-lg text-[hsl(var(--beta-text-secondary))] md:text-xl">
              Join the ultimate competitive gaming community. Compete in tournaments,
              climb the leaderboard, and prove your skills.
            </p>

            <div className="flex flex-wrap gap-4">
              <Link to="/beta/tournaments">
                <BetaButton size="lg">
                  <Trophy className="mr-2 h-5 w-5" />
                  Browse Tournaments
                </BetaButton>
              </Link>
              <Link to="/beta/leaderboard">
                <BetaButton variant="outline" size="lg">
                  View Leaderboard
                  <ArrowRight className="ml-2 h-5 w-5" />
                </BetaButton>
              </Link>
            </div>
          </div>
        </section>

        {/* Stats Grid */}
        <section className="mb-12 md:mb-16">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="Total Tournaments"
              value={loading ? "..." : stats.totalTournaments}
              icon={Trophy}
            />
            <StatCard
              label="Active Players"
              value={loading ? "..." : stats.activePlayers}
              icon={Users}
            />
            <StatCard
              label="Matches Played"
              value={loading ? "..." : stats.matchesPlayed}
              icon={BarChart3}
            />
            <StatCard
              label="Open Signups"
              value={loading ? "..." : stats.upcomingEvents}
              icon={Calendar}
            />
          </div>
        </section>

        {/* Quick Actions */}
        <section className="mb-12 md:mb-16">
          <h2 className="mb-6 text-2xl font-semibold text-[hsl(var(--beta-text-primary))]">
            Quick Actions
          </h2>
          
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Link to="/beta/tournaments">
              <GlassCard hover className="p-6 group">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="mb-2 text-lg font-semibold text-[hsl(var(--beta-text-primary))] group-hover:text-[hsl(var(--beta-accent))] transition-colors">
                      Find Tournaments
                    </h3>
                    <p className="text-sm text-[hsl(var(--beta-text-muted))]">
                      Browse and register for upcoming events
                    </p>
                  </div>
                  <Trophy className="h-8 w-8 text-[hsl(var(--beta-accent))]" />
                </div>
              </GlassCard>
            </Link>

            <Link to="/beta/leaderboard">
              <GlassCard hover className="p-6 group">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="mb-2 text-lg font-semibold text-[hsl(var(--beta-text-primary))] group-hover:text-[hsl(var(--beta-accent))] transition-colors">
                      Leaderboard
                    </h3>
                    <p className="text-sm text-[hsl(var(--beta-text-muted))]">
                      Check rankings and top players
                    </p>
                  </div>
                  <BarChart3 className="h-8 w-8 text-[hsl(var(--beta-accent))]" />
                </div>
              </GlassCard>
            </Link>

            <Link to="/beta/players">
              <GlassCard hover className="p-6 group">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="mb-2 text-lg font-semibold text-[hsl(var(--beta-text-primary))] group-hover:text-[hsl(var(--beta-accent))] transition-colors">
                      Find Players
                    </h3>
                    <p className="text-sm text-[hsl(var(--beta-text-muted))]">
                      Connect with other competitors
                    </p>
                  </div>
                  <Users className="h-8 w-8 text-[hsl(var(--beta-accent))]" />
                </div>
              </GlassCard>
            </Link>
          </div>
        </section>

        {/* Placeholder for upcoming tournaments */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-semibold text-[hsl(var(--beta-text-primary))]">
              Upcoming Tournaments
            </h2>
            <Link
              to="/beta/tournaments"
              className="text-sm text-[hsl(var(--beta-accent))] hover:underline"
            >
              View all →
            </Link>
          </div>

          <GlassCard className="p-8 text-center">
            <Trophy className="mx-auto mb-4 h-12 w-12 text-[hsl(var(--beta-text-muted))]" />
            <p className="text-[hsl(var(--beta-text-secondary))]">
              Tournament cards will be displayed here in the next phase
            </p>
          </GlassCard>
        </section>
      </div>
    </GradientBackground>
  );
};

export default BetaIndex;
