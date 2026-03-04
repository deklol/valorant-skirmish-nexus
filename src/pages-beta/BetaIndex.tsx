import { Link } from "react-router-dom";
import { Trophy, Users, BarChart3, Calendar, ArrowRight, ShoppingBag, Activity, Award, Clock, TrendingUp, ExternalLink, Circle } from "lucide-react";
import { GradientBackground, GlassCard, StatCard, BetaButton, BetaBadge } from "@/components-beta/ui-beta";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { format, formatDistanceToNow } from "date-fns";
import { Username } from "@/components/Username";
import BetaOrgAboutSection from "@/components-beta/BetaOrgAboutSection";

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

interface RecentUser {
  id: string;
  discord_username: string;
  discord_avatar_url: string | null;
  last_seen: string;
}

// Live Matches Section Component
const LiveMatchesSection = () => {
  const [liveMatches, setLiveMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLiveMatches = async () => {
      try {
        const { data, error } = await supabase
          .from('matches')
          .select(`
            id, round_number, match_number, score_team1, score_team2,
            team1:teams!matches_team1_id_fkey (id, name),
            team2:teams!matches_team2_id_fkey (id, name),
            tournament:tournaments (id, name)
          `)
          .eq('status', 'live')
          .order('scheduled_time', { ascending: true })
          .limit(6);

        if (error) throw error;
        setLiveMatches(data || []);
      } catch (error) {
        console.error('Error fetching live matches:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchLiveMatches();

    const channel = supabase
      .channel('beta-live-matches')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'matches',
        filter: 'status=eq.live'
      }, () => fetchLiveMatches())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  if (loading) return null;
  if (liveMatches.length === 0) return null;

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
        <h2 className="text-xl font-semibold text-[hsl(var(--beta-text-primary))]">Live Matches</h2>
        <Link to="/tournaments" className="text-sm text-[hsl(var(--beta-accent))] hover:underline ml-auto">
          View tournaments
        </Link>
      </div>
      <div className={`grid gap-4 ${
        liveMatches.length === 1 ? 'grid-cols-1' : 
        liveMatches.length === 2 ? 'grid-cols-1 md:grid-cols-2' : 
        'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
      }`}>
        {liveMatches.map((match) => (
          <Link key={match.id} to={`/match/${match.id}`}>
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
                    {match.team1?.name || 'TBD'}
                  </span>
                  <span className="text-lg font-bold text-[hsl(var(--beta-text-primary))]">
                    {match.score_team1 || 0}
                  </span>
                </div>
                <div className="text-center text-xs text-[hsl(var(--beta-text-muted))]">VS</div>
                <div className="flex items-center justify-between p-2 rounded-lg bg-[hsl(var(--beta-surface-3))]">
                  <span className="text-[hsl(var(--beta-text-primary))] font-medium truncate">
                    {match.team2?.name || 'TBD'}
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

// Recently Online Component
const RecentlyOnlineSection = () => {
  const [users, setUsers] = useState<RecentUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRecentUsers = async () => {
      try {
        const { data, error } = await supabase
          .from("users")
          .select("id, discord_username, discord_avatar_url, last_seen")
          .not("last_seen", "is", null)
          .eq("is_phantom", false)
          .order("last_seen", { ascending: false })
          .limit(5);

        if (error) {
          console.error("Error fetching recently online users:", error);
        } else {
          setUsers(data || []);
        }
      } catch (error) {
        console.error("Error fetching recently online:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchRecentUsers();
  }, []);

  const isOnlineNow = (lastSeen: string) => {
    const diff = Date.now() - new Date(lastSeen).getTime();
    return diff < 5 * 60 * 1000;
  };

  return (
    <div className="flex items-center gap-3 flex-wrap">
      <div className="flex items-center gap-1.5 text-sm text-[hsl(var(--beta-text-secondary))]">
        <Clock className="w-3.5 h-3.5 text-[hsl(var(--beta-accent))]" />
        <span className="font-medium">Online</span>
      </div>
      {loading ? (
        <span className="text-xs text-[hsl(var(--beta-text-muted))]">Loading...</span>
      ) : users.length === 0 ? (
        <span className="text-xs text-[hsl(var(--beta-text-muted))]">No recent activity</span>
      ) : (
        <div className="flex items-center gap-1">
          {users.map((user) => {
            const online = isOnlineNow(user.last_seen);
            return (
              <Link
                key={user.id}
                to={`/profile/${user.id}`}
                className="relative group"
                title={`${user.discord_username} — ${online ? "Online now" : formatDistanceToNow(new Date(user.last_seen), { addSuffix: true })}`}
              >
                <div className="relative">
                  <div className="w-8 h-8 rounded-full bg-[hsl(var(--beta-surface-4))] border-2 border-[hsl(var(--beta-glass-border))] group-hover:border-[hsl(var(--beta-accent))] flex items-center justify-center overflow-hidden transition-colors">
                    {user.discord_avatar_url ? (
                      <img src={user.discord_avatar_url} alt={user.discord_username} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-xs font-bold text-[hsl(var(--beta-accent))]">
                        {user.discord_username.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <Circle
                    className={`w-2.5 h-2.5 absolute -bottom-0.5 -right-0.5 ${
                      online
                        ? "text-emerald-400 fill-emerald-400"
                        : "text-[hsl(var(--beta-text-muted))] fill-[hsl(var(--beta-text-muted))]"
                    }`}
                  />
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
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
  const [upcomingTournaments, setUpcomingTournaments] = useState<UpcomingTournament[]>([]);
  const [recentWinners, setRecentWinners] = useState<RecentWinner[]>([]);
  const [topPlayers, setTopPlayers] = useState<TopPlayer[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
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
                maxParticipants: t.registration_type === "team" ? (t.max_teams || 8) : (t.max_players || 40),
                registration_type: t.registration_type || "solo",
              };
            })
          );
          setUpcomingTournaments(withSignups);
        }

        // Fetch recent winners
        const { data: completedTournaments } = await supabase
          .from("tournaments")
          .select("id, name")
          .eq("status", "completed")
          .order("start_time", { ascending: false })
          .limit(5);

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

        // Fetch top players
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
      case "open": return "success";
      case "live": return "accent";
      case "balancing": return "warning";
      default: return "default";
    }
  };

  return (
    <GradientBackground>
      <div className="w-full px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-12 max-w-7xl mx-auto space-y-8 sm:space-y-10 lg:space-y-12">
        {/* Hero Section */}
        <section className="space-y-4 sm:space-y-6">
          <div className="space-y-3 sm:space-y-4 max-w-3xl">
            <h1 className="text-2xl sm:text-3xl lg:text-5xl font-bold tracking-tight text-[hsl(var(--beta-text-primary))]">
              Welcome to{" "}
              <span className="beta-gradient-text">TLR Skirmish Hub</span>
            </h1>
            <p className="text-sm sm:text-base lg:text-lg text-[hsl(var(--beta-text-secondary))] leading-relaxed">
              Join the #1 competitive Valorant tournament community. Free-to-enter events with prizes, 
              live brackets, fair ATLAS team balancing, and a thriving Discord community.
            </p>
          </div>

          <div className="flex flex-wrap gap-2 sm:gap-3">
            <Link to="/tournaments">
              <BetaButton variant="primary" size="lg">
                <Trophy className="h-4 w-4 mr-2" />
                Browse Tournaments
              </BetaButton>
            </Link>
            <Link to="/leaderboard">
              <BetaButton variant="outline" size="lg">
                View Leaderboard
                <ArrowRight className="h-4 w-4 ml-2" />
              </BetaButton>
            </Link>
          </div>
        </section>

        {/* Stats Grid */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <StatCard label="Tournaments" value={loading ? "—" : stats.totalTournaments} icon={<Trophy />} />
          <StatCard label="Active Players" value={loading ? "—" : stats.activePlayers} icon={<Users />} />
          <StatCard label="Matches Played" value={loading ? "—" : stats.matchesPlayed} icon={<BarChart3 />} />
          <StatCard label="Live Matches" value={loading ? "—" : stats.liveMatches} icon={<Activity />} />
        </section>

        {/* Live Matches Section */}
        <LiveMatchesSection />

        {/* Quick Actions */}
        <section className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <Link to="/tournaments">
            <GlassCard variant="interactive" className="p-4 text-center h-full">
              <Trophy className="h-5 w-5 text-[hsl(var(--beta-accent))] mx-auto mb-2" />
              <h3 className="font-semibold text-sm text-[hsl(var(--beta-text-primary))]">Tournaments</h3>
              <p className="text-xs text-[hsl(var(--beta-text-muted))] mt-1">Browse & register</p>
            </GlassCard>
          </Link>
          <Link to="/leaderboard">
            <GlassCard variant="interactive" className="p-4 text-center h-full">
              <BarChart3 className="h-5 w-5 text-[hsl(var(--beta-accent))] mx-auto mb-2" />
              <h3 className="font-semibold text-sm text-[hsl(var(--beta-text-primary))]">Leaderboard</h3>
              <p className="text-xs text-[hsl(var(--beta-text-muted))] mt-1">Rankings & stats</p>
            </GlassCard>
          </Link>
          <Link to="/players">
            <GlassCard variant="interactive" className="p-4 text-center h-full">
              <Users className="h-5 w-5 text-[hsl(var(--beta-accent))] mx-auto mb-2" />
              <h3 className="font-semibold text-sm text-[hsl(var(--beta-text-primary))]">Players</h3>
              <p className="text-xs text-[hsl(var(--beta-text-muted))] mt-1">Find competitors</p>
            </GlassCard>
          </Link>
          <Link to="/shop">
            <GlassCard variant="interactive" className="p-4 text-center h-full">
              <ShoppingBag className="h-5 w-5 text-[hsl(var(--beta-accent))] mx-auto mb-2" />
              <h3 className="font-semibold text-sm text-[hsl(var(--beta-text-primary))]">Shop</h3>
              <p className="text-xs text-[hsl(var(--beta-text-muted))] mt-1">Spend your points</p>
            </GlassCard>
          </Link>
        </section>

        {/* Community Grid - Upcoming, Top Players, Recent Winners */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {/* Upcoming Tournaments */}
          <GlassCard className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-[hsl(var(--beta-text-primary))]">Upcoming Events</h3>
              <Link to="/tournaments" className="text-sm text-[hsl(var(--beta-accent))] hover:underline">
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
                  <Link key={t.id} to={`/tournament/${t.id}`}>
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

          {/* Top Players */}
          <GlassCard className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-[hsl(var(--beta-text-primary))]">Top Players</h3>
              <Link to="/leaderboard" className="text-sm text-[hsl(var(--beta-accent))] hover:underline">
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
                  <Link key={player.id} to={`/profile/${player.id}`}>
                    <div className="flex items-center gap-3 p-2 rounded-[var(--beta-radius-md)] hover:bg-[hsl(var(--beta-surface-3))] transition-colors">
                      <span className="text-sm font-bold text-[hsl(var(--beta-accent))] w-5">
                        #{idx + 1}
                      </span>
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
                          <Username userId={player.id} username={player.discord_username || 'Unknown'} />
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

          {/* Recent Winners */}
          <GlassCard className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-[hsl(var(--beta-text-primary))]">Recent Champions</h3>
              <Link to="/tournaments?status=completed" className="text-sm text-[hsl(var(--beta-accent))] hover:underline">
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
                  <Link key={winner.id} to={`/tournament/${winner.id}`} className="block">
                    <div className="p-3 rounded-[var(--beta-radius-md)] bg-[hsl(var(--beta-surface-3))] hover:bg-[hsl(var(--beta-surface-4))] transition-colors">
                      <div className="flex items-center gap-2 mb-1">
                        <Trophy className="w-4 h-4 text-yellow-400" />
                        <span className="font-medium text-yellow-400 text-sm truncate">
                          {winner.winnerTeamName}
                        </span>
                      </div>
                      <p className="text-xs text-[hsl(var(--beta-text-muted))] truncate">
                        {winner.name}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </GlassCard>
        </section>

        {/* Recently Online */}
        <section>
          <RecentlyOnlineSection />
        </section>

        {/* Organization About Section */}
        <BetaOrgAboutSection />
      </div>
    </GradientBackground>
  );
};

export default BetaIndex;