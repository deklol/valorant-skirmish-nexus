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
      <div className="w-full px-4 lg:px-8 py-8 lg:py-12 max-w-7xl mx-auto space-y-12">
        {/* Hero Section */}
        <section className="space-y-6">
          <div className="space-y-4 max-w-2xl">
            <h1 className="text-4xl lg:text-5xl font-bold tracking-tight text-[hsl(var(--beta-text-primary))]">
              Welcome to{" "}
              <span className="beta-gradient-text">TLR Skirmish Hub</span>
            </h1>
            <p className="text-lg text-[hsl(var(--beta-text-secondary))] leading-relaxed">
              Join the ultimate competitive gaming community. Compete in tournaments, 
              climb the leaderboard, and prove your skills.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link to="/beta/tournaments">
              <BetaButton variant="primary" size="lg">
                <Trophy className="h-4 w-4 mr-2" />
                Browse Tournaments
              </BetaButton>
            </Link>
            <Link to="/beta/leaderboard">
              <BetaButton variant="outline" size="lg">
                View Leaderboard
                <ArrowRight className="h-4 w-4 ml-2" />
              </BetaButton>
            </Link>
          </div>
        </section>

        {/* Stats Grid */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Tournaments" value={loading ? "—" : stats.totalTournaments} icon={<Trophy />} />
          <StatCard label="Active Players" value={loading ? "—" : stats.activePlayers} icon={<Users />} />
          <StatCard label="Matches Played" value={loading ? "—" : stats.matchesPlayed} icon={<BarChart3 />} />
          <StatCard label="Open Signups" value={loading ? "—" : stats.upcomingEvents} icon={<Calendar />} />
        </section>

        {/* Quick Actions */}
        <section className="space-y-5">
          <h2 className="text-xl font-semibold text-[hsl(var(--beta-text-primary))]">Quick Actions</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <Link to="/beta/tournaments">
              <GlassCard variant="interactive" className="h-full group">
                <div className="flex items-start gap-4">
                  <div className="shrink-0 p-3 rounded-[var(--beta-radius-lg)] bg-[hsl(var(--beta-accent-subtle))] transition-colors group-hover:bg-[hsl(var(--beta-accent)/0.2)]">
                    <Trophy className="h-5 w-5 text-[hsl(var(--beta-accent))]" />
                  </div>
                  <div className="min-w-0 space-y-1">
                    <h3 className="font-semibold text-[hsl(var(--beta-text-primary))] group-hover:text-[hsl(var(--beta-accent))] transition-colors">Find Tournaments</h3>
                    <p className="text-sm text-[hsl(var(--beta-text-muted))]">Browse and register for upcoming events</p>
                  </div>
                </div>
              </GlassCard>
            </Link>
            <Link to="/beta/leaderboard">
              <GlassCard variant="interactive" className="h-full group">
                <div className="flex items-start gap-4">
                  <div className="shrink-0 p-3 rounded-[var(--beta-radius-lg)] bg-[hsl(var(--beta-accent-subtle))] transition-colors group-hover:bg-[hsl(var(--beta-accent)/0.2)]">
                    <BarChart3 className="h-5 w-5 text-[hsl(var(--beta-accent))]" />
                  </div>
                  <div className="min-w-0 space-y-1">
                    <h3 className="font-semibold text-[hsl(var(--beta-text-primary))] group-hover:text-[hsl(var(--beta-accent))] transition-colors">Leaderboard</h3>
                    <p className="text-sm text-[hsl(var(--beta-text-muted))]">Check rankings and top players</p>
                  </div>
                </div>
              </GlassCard>
            </Link>
            <Link to="/beta/players">
              <GlassCard variant="interactive" className="h-full group">
                <div className="flex items-start gap-4">
                  <div className="shrink-0 p-3 rounded-[var(--beta-radius-lg)] bg-[hsl(var(--beta-accent-subtle))] transition-colors group-hover:bg-[hsl(var(--beta-accent)/0.2)]">
                    <Users className="h-5 w-5 text-[hsl(var(--beta-accent))]" />
                  </div>
                  <div className="min-w-0 space-y-1">
                    <h3 className="font-semibold text-[hsl(var(--beta-text-primary))] group-hover:text-[hsl(var(--beta-accent))] transition-colors">Find Players</h3>
                    <p className="text-sm text-[hsl(var(--beta-text-muted))]">Connect with other competitors</p>
                  </div>
                </div>
              </GlassCard>
            </Link>
          </div>
        </section>

        {/* Upcoming Section */}
        <section className="space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-[hsl(var(--beta-text-primary))]">Upcoming Tournaments</h2>
            <Link to="/beta/tournaments" className="text-sm font-medium text-[hsl(var(--beta-accent))] hover:text-[hsl(var(--beta-accent-muted))] transition-colors flex items-center gap-1">
              View all <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <GlassCard variant="subtle" className="flex flex-col items-center justify-center py-16 text-center">
            <Trophy className="h-10 w-10 text-[hsl(var(--beta-text-muted))] mb-3" />
            <p className="text-[hsl(var(--beta-text-muted))]">Tournament cards will be displayed here</p>
          </GlassCard>
        </section>
      </div>
    </GradientBackground>
  );
};

export default BetaIndex;
