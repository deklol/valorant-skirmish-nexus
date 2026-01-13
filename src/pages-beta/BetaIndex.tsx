import { Link } from "react-router-dom";
import {
  Trophy,
  Users,
  BarChart3,
  Calendar,
  ArrowRight,
  Shield,
  Target,
  Zap,
  ShoppingBag,
  Activity,
  Award,
  Clock,
  TrendingUp,
  ExternalLink,
} from "lucide-react";
import { GradientBackground, GlassCard, StatCard, BetaButton, BetaBadge } from "@/components-beta/ui-beta";
import { HeroSection, OrgSection, TeamShowcase } from "@/components-beta/homepage";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { format } from "date-fns";
import { Username } from "@/components/Username";

interface Stats {
  totalTournaments: number;
  activePlayers: number;
  matchesPlayed: number;
  liveMatches: number;
}

interface UpcomingTournament {
  id: string;
  name: string;
  start_time: string;
  status: string;
  currentSignups: number;
  maxParticipants: number;
  registration_type: string;
}

interface RecentWinner {
  id: string;
  name: string;
  winnerTeamName: string;
}

interface TopPlayer {
  id: string;
  discord_username: string;
  discord_avatar_url: string | null;
  tournaments_won: number;
  wins: number;
  weight_rating: number;
}

interface HomepageContent {
  hero_headline: string | null;
  hero_subheadline: string | null;
  hero_cta_text: string | null;
  hero_cta_link: string | null;
  hero_image_url: string | null;
  org_name: string | null;
  org_tagline: string | null;
  org_about: string | null;
  org_image_url: string | null;
  org_founded_year: number | null;
  org_history_enabled: boolean | null;
  org_history_title: string | null;
  org_history_content: string | null;
  show_hero_section: boolean | null;
  show_org_section: boolean | null;
  show_stats_section: boolean | null;
  show_tournaments_section: boolean | null;
  show_leaderboard_section: boolean | null;
  show_winners_section: boolean | null;
  show_features_section: boolean | null;
  show_how_it_works_section: boolean | null;
  show_faq_section: boolean | null;
}

// Live Matches Section Component
const LiveMatchesSection = () => {
  const [liveMatches, setLiveMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLiveMatches = async () => {
      try {
        const { data, error } = await supabase
          .from("matches")
          .select(
            `
            id, round_number, match_number, score_team1, score_team2,
            team1:teams!matches_team1_id_fkey (id, name),
            team2:teams!matches_team2_id_fkey (id, name),
            tournament:tournaments (id, name)
          `,
          )
          .eq("status", "live")
          .order("scheduled_time", { ascending: true })
          .limit(6);

        if (error) throw error;
        setLiveMatches(data || []);
      } catch (error) {
        console.error("Error fetching live matches:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchLiveMatches();

    // Real-time subscription
    const channel = supabase
      .channel("beta-live-matches")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "matches",
          filter: "status=eq.live",
        },
        () => fetchLiveMatches(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  if (loading) return null;
  if (liveMatches.length === 0) return null;

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
        <h2 className="text-xl font-semibold text-[hsl(var(--beta-text-primary))]">Live Matches</h2>
        <Link to="/beta/tournaments" className="text-sm text-[hsl(var(--beta-accent))] hover:underline ml-auto">
          View tournaments
        </Link>
      </div>
      <div
        className={`grid gap-4 ${
          liveMatches.length === 1
            ? "grid-cols-1"
            : liveMatches.length === 2
              ? "grid-cols-1 md:grid-cols-2"
              : "grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
        }`}
      >
        {liveMatches.map((match) => (
          <Link key={match.id} to={`/beta/match/${match.id}`}>
            <GlassCard variant="interactive" className="p-4">
              <div className="flex items-center justify-between mb-3">
                <BetaBadge variant="accent" size="sm">
                  <span className="mr-1">🔴</span> LIVE
                </BetaBadge>
                <span className="text-xs text-[hsl(var(--beta-text-muted))]">
                  {match.tournament?.name} · R{match.round_number}
                </span>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between p-2 rounded-lg bg-[hsl(var(--beta-surface-3))]">
                  <span className="text-[hsl(var(--beta-text-primary))] font-medium truncate">
                    {match.team1?.name || "TBD"}
                  </span>
                  <span className="text-lg font-bold text-[hsl(var(--beta-text-primary))]">
                    {match.score_team1 || 0}
                  </span>
                </div>
                <div className="text-center text-xs text-[hsl(var(--beta-text-muted))]">VS</div>
                <div className="flex items-center justify-between p-2 rounded-lg bg-[hsl(var(--beta-surface-3))]">
                  <span className="text-[hsl(var(--beta-text-primary))] font-medium truncate">
                    {match.team2?.name || "TBD"}
                  </span>
                  <span className="text-lg font-bold text-[hsl(var(--beta-text-primary))]">
                    {match.score_team2 || 0}
                  </span>
                </div>
              </div>

              <div className="mt-3 flex justify-end">
                <BetaButton variant="outline" size="sm">
                  <ExternalLink className="w-3 h-3 mr-1" />
                  Watch
                </BetaButton>
              </div>
            </GlassCard>
          </Link>
        ))}
      </div>
    </section>
  );
};

const BetaIndex = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<Stats>({
    totalTournaments: 0,
    activePlayers: 0,
    matchesPlayed: 0,
    liveMatches: 0,
  });
  const [loading, setLoading] = useState(true);
  const [homepageContent, setHomepageContent] = useState<HomepageContent | null>(null);
  const [upcomingTournaments, setUpcomingTournaments] = useState<UpcomingTournament[]>([]);
  const [recentWinners, setRecentWinners] = useState<RecentWinner[]>([]);
  const [topPlayers, setTopPlayers] = useState<TopPlayer[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch homepage content
        const { data: contentData } = await supabase.from("homepage_content").select("*").limit(1).maybeSingle();

        if (contentData) {
          setHomepageContent(contentData);
        }

        // Fetch stats
        const [tournamentsRes, usersRes, matchesRes, liveRes] = await Promise.all([
          supabase.from("tournaments").select("id", { count: "exact", head: true }),
          supabase.from("public_user_profiles").select("id", { count: "exact", head: true }).eq("is_phantom", false),
          supabase.from("matches").select("id", { count: "exact", head: true }).eq("status", "completed"),
          supabase.from("matches").select("id", { count: "exact", head: true }).eq("status", "live"),
        ]);

        setStats({
          totalTournaments: tournamentsRes.count || 0,
          activePlayers: usersRes.count || 0,
          matchesPlayed: matchesRes.count || 0,
          liveMatches: liveRes.count || 0,
        });

        // Fetch upcoming tournaments
        const { data: tournamentsData } = await supabase
          .from("tournaments")
          .select("id, name, start_time, status, max_players, max_teams, registration_type")
          .in("status", ["open", "live", "balancing"])
          .order("start_time", { ascending: true })
          .limit(3);

        if (tournamentsData) {
          const withSignups = await Promise.all(
            tournamentsData.map(async (t) => {
              const table = t.registration_type === "team" ? "team_tournament_registrations" : "tournament_signups";
              const { count } = await supabase
                .from(table)
                .select("*", { count: "exact", head: true })
                .eq("tournament_id", t.id);

              return {
                id: t.id,
                name: t.name,
                start_time: t.start_time,
                status: t.status,
                currentSignups: count || 0,
                maxParticipants: t.registration_type === "team" ? t.max_teams || 8 : t.max_players || 40,
                registration_type: t.registration_type || "solo",
              };
            }),
          );
          setUpcomingTournaments(withSignups);
        }

        // Fetch recent winners - get completed tournaments and find winner teams
        const { data: completedTournaments } = await supabase
          .from("tournaments")
          .select("id, name")
          .eq("status", "completed")
          .order("start_time", { ascending: false })
          .limit(3);

        if (completedTournaments) {
          const winnersWithTeams: RecentWinner[] = [];
          for (const t of completedTournaments) {
            const { data: winnerTeam } = await supabase
              .from("teams")
              .select("name")
              .eq("tournament_id", t.id)
              .eq("status", "winner")
              .maybeSingle();

            if (winnerTeam) {
              winnersWithTeams.push({
                id: t.id,
                name: t.name,
                winnerTeamName: winnerTeam.name || "Unknown Team",
              });
            }
          }
          setRecentWinners(winnersWithTeams);
        }

        // Fetch top players - sorted by tournament wins, then match wins, then weight rating
        const { data: players } = await supabase
          .from("public_user_profiles")
          .select("id, discord_username, discord_avatar_url, tournaments_won, wins, weight_rating")
          .eq("is_phantom", false)
          .order("tournaments_won", { ascending: false })
          .order("wins", { ascending: false })
          .order("weight_rating", { ascending: false })
          .limit(5);

        if (players) {
          setTopPlayers(players);
        }
      } catch (error) {
        console.error("Failed to fetch data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const getStatusVariant = (status: string) => {
    switch (status) {
      case "open":
        return "success";
      case "live":
        return "accent";
      case "balancing":
        return "warning";
      default:
        return "default";
    }
  };

  // Use content settings or defaults
  const showHero = homepageContent?.show_hero_section !== false;
  const showOrg = homepageContent?.show_org_section !== false;
  const showStats = homepageContent?.show_stats_section !== false;
  const showTournaments = homepageContent?.show_tournaments_section !== false;
  const showLeaderboard = homepageContent?.show_leaderboard_section !== false;
  const showWinners = homepageContent?.show_winners_section !== false;
  const showFeatures = homepageContent?.show_features_section !== false;
  const showHowItWorks = homepageContent?.show_how_it_works_section !== false;
  const showFaq = homepageContent?.show_faq_section !== false;

  return (
    <GradientBackground>
      <div className="w-full px-4 lg:px-8 py-8 lg:py-12 max-w-7xl mx-auto space-y-12">
        {/* Hero Section */}
        {showHero && (
          <HeroSection
            headline={homepageContent?.hero_headline}
            subheadline={homepageContent?.hero_subheadline}
            ctaText={homepageContent?.hero_cta_text}
            ctaLink={homepageContent?.hero_cta_link}
            imageUrl={homepageContent?.hero_image_url}
          />
        )}

        {/* Stats Grid */}
        {showStats && (
          <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Tournaments" value={loading ? "—" : stats.totalTournaments} icon={<Trophy />} />
            <StatCard label="Active Players" value={loading ? "—" : stats.activePlayers} icon={<Users />} />
            <StatCard label="Matches Played" value={loading ? "—" : stats.matchesPlayed} icon={<BarChart3 />} />
            <StatCard label="Live Matches" value={loading ? "—" : stats.liveMatches} icon={<Activity />} />
          </section>
        )}

        {/* Organization Section */}
        {showOrg && homepageContent && (
          <OrgSection
            orgName={homepageContent.org_name}
            orgTagline={homepageContent.org_tagline}
            orgAbout={homepageContent.org_about}
            orgImageUrl={homepageContent.org_image_url}
            orgFoundedYear={homepageContent.org_founded_year}
            historyEnabled={homepageContent.org_history_enabled}
            historyTitle={homepageContent.org_history_title}
            historyContent={homepageContent.org_history_content}
          />
        )}

        {/* Featured Teams */}
        <TeamShowcase />

        {/* Live Matches Section */}
        <LiveMatchesSection />

        {/* Community Grid - Upcoming, Top Players, Recent Winners */}
        {(showTournaments || showLeaderboard || showWinners) && (
          <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Upcoming Tournaments */}
            {showTournaments && (
              <GlassCard className="p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-[hsl(var(--beta-text-primary))]">Upcoming Events</h3>
                  <Link to="/beta/tournaments" className="text-sm text-[hsl(var(--beta-accent))] hover:underline">
                    View all
                  </Link>
                </div>
                {upcomingTournaments.length === 0 ? (
                  <div className="text-center py-8">
                    <Calendar className="w-8 h-8 text-[hsl(var(--beta-text-muted))] mx-auto mb-2" />
                    <p className="text-sm text-[hsl(var(--beta-text-muted))]">No upcoming tournaments</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {upcomingTournaments.map((t) => (
                      <Link key={t.id} to={`/beta/tournament/${t.id}`}>
                        <div className="p-3 rounded-[var(--beta-radius-md)] bg-[hsl(var(--beta-surface-3))] hover:bg-[hsl(var(--beta-surface-4))] transition-colors">
                          <div className="flex items-start justify-between mb-1">
                            <span className="font-medium text-[hsl(var(--beta-text-primary))] text-sm truncate pr-2">
                              {t.name}
                            </span>
                            <BetaBadge variant={getStatusVariant(t.status)} size="sm">
                              {t.status}
                            </BetaBadge>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-[hsl(var(--beta-text-muted))]">
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {format(new Date(t.start_time), "MMM d, h:mm a")}
                            </span>
                            <span className="flex items-center gap-1">
                              <Users className="w-3 h-3" />
                              {t.currentSignups}/{t.maxParticipants}
                            </span>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </GlassCard>
            )}

            {/* Top Players */}
            {showLeaderboard && (
              <GlassCard className="p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-[hsl(var(--beta-text-primary))]">Top Players</h3>
                  <Link to="/beta/leaderboard" className="text-sm text-[hsl(var(--beta-accent))] hover:underline">
                    View all
                  </Link>
                </div>
                {topPlayers.length === 0 ? (
                  <div className="text-center py-8">
                    <TrendingUp className="w-8 h-8 text-[hsl(var(--beta-text-muted))] mx-auto mb-2" />
                    <p className="text-sm text-[hsl(var(--beta-text-muted))]">No players yet</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {topPlayers.map((player, idx) => (
                      <Link key={player.id} to={`/beta/profile/${player.id}`}>
                        <div className="flex items-center gap-3 p-2 rounded-[var(--beta-radius-md)] hover:bg-[hsl(var(--beta-surface-3))] transition-colors">
                          <span className="text-sm font-bold text-[hsl(var(--beta-accent))] w-5">#{idx + 1}</span>
                          <div className="w-8 h-8 rounded-full bg-[hsl(var(--beta-surface-4))] flex items-center justify-center overflow-hidden">
                            {player.discord_avatar_url ? (
                              <img src={player.discord_avatar_url} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-sm font-bold text-[hsl(var(--beta-accent))]">
                                {player.discord_username?.charAt(0).toUpperCase()}
                              </span>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-[hsl(var(--beta-text-primary))] truncate">
                              <Username userId={player.id} username={player.discord_username || "Unknown"} />
                            </p>
                            <p className="text-xs text-[hsl(var(--beta-text-muted))]">
                              {player.tournaments_won} tourney wins · {player.wins || 0} match wins
                            </p>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </GlassCard>
            )}

            {/* Recent Winners */}
            {showWinners && (
              <GlassCard className="p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-[hsl(var(--beta-text-primary))]">Recent Champions</h3>
                  <Link
                    to="/beta/tournaments?status=completed"
                    className="text-sm text-[hsl(var(--beta-accent))] hover:underline"
                  >
                    View all
                  </Link>
                </div>
                {recentWinners.length === 0 ? (
                  <div className="text-center py-8">
                    <Award className="w-8 h-8 text-[hsl(var(--beta-text-muted))] mx-auto mb-2" />
                    <p className="text-sm text-[hsl(var(--beta-text-muted))]">No completed tournaments</p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    {recentWinners.map((winner) => (
                      <Link key={winner.id} to={`/beta/tournament/${winner.id}`} className="block">
                        <div className="p-3 rounded-[var(--beta-radius-md)] bg-[hsl(var(--beta-surface-3))] hover:bg-[hsl(var(--beta-surface-4))] transition-colors">
                          <div className="flex items-center gap-2 mb-1">
                            <Trophy className="w-4 h-4 text-yellow-400" />
                            <span className="font-medium text-yellow-400 text-sm truncate">
                              {winner.winnerTeamName}
                            </span>
                          </div>
                          <p className="text-xs text-[hsl(var(--beta-text-muted))] truncate">{winner.name}</p>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </GlassCard>
            )}
          </section>
        )}

        {/* Quick Actions */}
        <section className="space-y-5">
          <h2 className="text-xl font-semibold text-[hsl(var(--beta-text-primary))]">Quick Actions</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Link to="/beta/tournaments">
              <GlassCard variant="interactive" className="h-full group">
                <div className="flex items-start gap-4">
                  <div className="shrink-0 p-3 rounded-[var(--beta-radius-lg)] bg-[hsl(var(--beta-accent-subtle))] transition-colors group-hover:bg-[hsl(var(--beta-accent)/0.2)]">
                    <Trophy className="h-5 w-5 text-[hsl(var(--beta-accent))]" />
                  </div>
                  <div className="min-w-0 space-y-1">
                    <h3 className="font-semibold text-[hsl(var(--beta-text-primary))] group-hover:text-[hsl(var(--beta-accent))] transition-colors">
                      Find Tournaments
                    </h3>
                    <p className="text-sm text-[hsl(var(--beta-text-muted))]">Browse and register for events</p>
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
                    <h3 className="font-semibold text-[hsl(var(--beta-text-primary))] group-hover:text-[hsl(var(--beta-accent))] transition-colors">
                      Leaderboard
                    </h3>
                    <p className="text-sm text-[hsl(var(--beta-text-muted))]">Check rankings and stats</p>
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
                    <h3 className="font-semibold text-[hsl(var(--beta-text-primary))] group-hover:text-[hsl(var(--beta-accent))] transition-colors">
                      Find Players
                    </h3>
                    <p className="text-sm text-[hsl(var(--beta-text-muted))]">Connect with competitors</p>
                  </div>
                </div>
              </GlassCard>
            </Link>
            <Link to="/beta/shop">
              <GlassCard variant="interactive" className="h-full group">
                <div className="flex items-start gap-4">
                  <div className="shrink-0 p-3 rounded-[var(--beta-radius-lg)] bg-[hsl(var(--beta-accent-subtle))] transition-colors group-hover:bg-[hsl(var(--beta-accent)/0.2)]">
                    <ShoppingBag className="h-5 w-5 text-[hsl(var(--beta-accent))]" />
                  </div>
                  <div className="min-w-0 space-y-1">
                    <h3 className="font-semibold text-[hsl(var(--beta-text-primary))] group-hover:text-[hsl(var(--beta-accent))] transition-colors">
                      Shop
                    </h3>
                    <p className="text-sm text-[hsl(var(--beta-text-muted))]">Spend your points</p>
                  </div>
                </div>
              </GlassCard>
            </Link>
          </div>
        </section>

        {/* Features Section */}
        {showFeatures && (
          <section className="space-y-6">
            <div className="text-center max-w-2xl mx-auto">
              <h2 className="text-2xl font-bold text-[hsl(var(--beta-text-primary))] mb-3">
                Premium Features for Competitive Play
              </h2>
              <p className="text-[hsl(var(--beta-text-secondary))]">
                From automated brackets to our bespoke ATLAS balancing algorithm, we handle every aspect of your
                tournament experience.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <GlassCard className="p-5">
                <div className="w-10 h-10 rounded-[var(--beta-radius-lg)] bg-red-500/20 flex items-center justify-center mb-3">
                  <Trophy className="h-5 w-5 text-red-400" />
                </div>
                <h3 className="font-semibold text-[hsl(var(--beta-text-primary))] mb-2">Automated Brackets</h3>
                <p className="text-sm text-[hsl(var(--beta-text-muted))]">
                  Generate tournament brackets automatically with fair seeding and elimination progression.
                </p>
              </GlassCard>

              <GlassCard className="p-5">
                <div className="w-10 h-10 rounded-[var(--beta-radius-lg)] bg-blue-500/20 flex items-center justify-center mb-3">
                  <Shield className="h-5 w-5 text-blue-400" />
                </div>
                <h3 className="font-semibold text-[hsl(var(--beta-text-primary))] mb-2">ATLAS Team Balancing</h3>
                <p className="text-sm text-[hsl(var(--beta-text-muted))]">
                  Our smart algorithm analyzes player skill to ensure fair competition across all teams.
                </p>
              </GlassCard>

              <GlassCard className="p-5">
                <div className="w-10 h-10 rounded-[var(--beta-radius-lg)] bg-green-500/20 flex items-center justify-center mb-3">
                  <Target className="h-5 w-5 text-green-400" />
                </div>
                <h3 className="font-semibold text-[hsl(var(--beta-text-primary))] mb-2">Map Veto System</h3>
                <p className="text-sm text-[hsl(var(--beta-text-muted))]">
                  Interactive map veto process with real-time controls for team captains.
                </p>
              </GlassCard>

              <GlassCard className="p-5">
                <div className="w-10 h-10 rounded-[var(--beta-radius-lg)] bg-purple-500/20 flex items-center justify-center mb-3">
                  <Zap className="h-5 w-5 text-purple-400" />
                </div>
                <h3 className="font-semibold text-[hsl(var(--beta-text-primary))] mb-2">Stat Tracking</h3>
                <p className="text-sm text-[hsl(var(--beta-text-muted))]">
                  Track your tournament history, performance analytics, and match history.
                </p>
              </GlassCard>

              <GlassCard className="p-5">
                <div className="w-10 h-10 rounded-[var(--beta-radius-lg)] bg-yellow-500/20 flex items-center justify-center mb-3">
                  <Users className="h-5 w-5 text-yellow-400" />
                </div>
                <h3 className="font-semibold text-[hsl(var(--beta-text-primary))] mb-2">Player Profiles</h3>
                <p className="text-sm text-[hsl(var(--beta-text-muted))]">
                  Complete profiles with rank tracking, performance data, and match history.
                </p>
              </GlassCard>

              <GlassCard className="p-5">
                <div className="w-10 h-10 rounded-[var(--beta-radius-lg)] bg-pink-500/20 flex items-center justify-center mb-3">
                  <ShoppingBag className="h-5 w-5 text-pink-400" />
                </div>
                <h3 className="font-semibold text-[hsl(var(--beta-text-primary))] mb-2">Shop & Rewards</h3>
                <p className="text-sm text-[hsl(var(--beta-text-muted))]">
                  Earn achievement points and spend them on name effects and profile customizations.
                </p>
              </GlassCard>
            </div>
          </section>
        )}

        {/* How It Works */}
        {showHowItWorks && (
          <section className="space-y-6">
            <div className="text-center max-w-2xl mx-auto">
              <h2 className="text-2xl font-bold text-[hsl(var(--beta-text-primary))] mb-3">How It Works</h2>
              <p className="text-[hsl(var(--beta-text-secondary))]">
                From registration to championship matches, our streamlined process makes competing simple.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                {
                  step: 1,
                  title: "Register",
                  desc: "Create your account and set your Riot ID. Registration is free.",
                  color: "green",
                },
                {
                  step: 2,
                  title: "Join Tournaments",
                  desc: "Browse active tournaments and register. ATLAS ensures fair matchmaking.",
                  color: "blue",
                },
                {
                  step: 3,
                  title: "Compete",
                  desc: "Play matches with map veto, submit scores, and track progress.",
                  color: "purple",
                },
                {
                  step: 4,
                  title: "Win Prizes",
                  desc: "Earn points, unlock items, and compete for prizes.",
                  color: "yellow",
                },
              ].map((item) => (
                <GlassCard key={item.step} className="p-5 text-center">
                  <div
                    className={`w-10 h-10 rounded-full bg-${item.color}-500/20 flex items-center justify-center mx-auto mb-3`}
                  >
                    <span className={`font-bold text-${item.color}-400`}>{item.step}</span>
                  </div>
                  <h3 className="font-semibold text-[hsl(var(--beta-text-primary))] mb-2">{item.title}</h3>
                  <p className="text-sm text-[hsl(var(--beta-text-muted))]">{item.desc}</p>
                </GlassCard>
              ))}
            </div>
          </section>
        )}

        {/* FAQ Section */}
        {showFaq && (
          <section className="space-y-6">
            <div className="text-center max-w-2xl mx-auto">
              <h2 className="text-2xl font-bold text-[hsl(var(--beta-text-primary))] mb-3">
                Frequently Asked Questions
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                {
                  q: "How do I join tournaments?",
                  a: "Sign up on our platform, set your Riot ID, and join our Discord. Then browse and register for any open tournament.",
                },
                {
                  q: "Are tournaments free to enter?",
                  a: "Yes, all standard tournaments are free-to-enter and include prizes, fair ATLAS balancing, and Discord integration.",
                },
                {
                  q: "What ranks can participate?",
                  a: "All ranks from Iron to Radiant are welcome. Our ATLAS system ensures balanced matches for everyone.",
                },
                {
                  q: "How does ATLAS balancing work?",
                  a: "ATLAS analyzes player ranks, recent performance, and historical data to create balanced teams for fair competition.",
                },
              ].map((faq, idx) => (
                <GlassCard key={idx} className="p-5">
                  <h3 className="font-semibold text-[hsl(var(--beta-text-primary))] mb-2">{faq.q}</h3>
                  <p className="text-sm text-[hsl(var(--beta-text-muted))]">{faq.a}</p>
                </GlassCard>
              ))}
            </div>
          </section>
        )}
      </div>
    </GradientBackground>
  );
};

export default BetaIndex;
