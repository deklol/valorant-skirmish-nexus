import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Trophy,
  Users,
  Calendar,
  Play,
  CheckCircle2,
  Swords,
  ArrowRight,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { GradientBackground, GlassCard, BetaBadge, StatCard } from "@/components-beta/ui-beta";

interface TournamentWithBracket {
  id: string;
  name: string;
  status: string;
  max_teams: number;
  match_format: string | null;
  bracket_type: string | null;
  start_time: string | null;
  prize_pool: string | null;
  matchCount: number;
  completedCount: number;
  liveCount: number;
}

type FilterStatus = "all" | "live" | "completed";

const BetaBrackets = () => {
  const [tournaments, setTournaments] = useState<TournamentWithBracket[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterStatus>("all");

  useEffect(() => {
    fetchTournaments();
  }, []);

  const fetchTournaments = async () => {
    try {
      // Fetch tournaments that are live or completed (have brackets)
      const { data: tournamentsData, error } = await supabase
        .from("tournaments")
        .select("id, name, status, max_teams, match_format, bracket_type, start_time, prize_pool")
        .in("status", ["live", "completed"])
        .order("start_time", { ascending: false });

      if (error) throw error;

      if (!tournamentsData || tournamentsData.length === 0) {
        setTournaments([]);
        setLoading(false);
        return;
      }

      // Fetch match counts per tournament
      const tournamentIds = tournamentsData.map((t) => t.id);
      const { data: matchesData } = await supabase
        .from("matches")
        .select("tournament_id, status")
        .in("tournament_id", tournamentIds);

      const matchCounts = new Map<string, { total: number; completed: number; live: number }>();
      (matchesData || []).forEach((m) => {
        const existing = matchCounts.get(m.tournament_id!) || { total: 0, completed: 0, live: 0 };
        existing.total++;
        if (m.status === "completed") existing.completed++;
        if (m.status === "live") existing.live++;
        matchCounts.set(m.tournament_id!, existing);
      });

      const enriched: TournamentWithBracket[] = tournamentsData.map((t) => {
        const counts = matchCounts.get(t.id) || { total: 0, completed: 0, live: 0 };
        return {
          ...t,
          matchCount: counts.total,
          completedCount: counts.completed,
          liveCount: counts.live,
        };
      });

      setTournaments(enriched);
    } catch (error) {
      console.error("Error fetching tournaments:", error);
    } finally {
      setLoading(false);
    }
  };

  const filtered = tournaments.filter((t) => {
    if (filter === "all") return true;
    return t.status === filter;
  });

  const liveTournaments = tournaments.filter((t) => t.status === "live");
  const completedTournaments = tournaments.filter((t) => t.status === "completed");
  const totalMatches = tournaments.reduce((sum, t) => sum + t.matchCount, 0);

  const getFormatLabel = (bracketType: string | null) => {
    const labels: Record<string, string> = {
      single_elimination: "Single Elim",
      double_elimination: "Double Elim",
      swiss: "Swiss",
      round_robin: "Round Robin",
      group_stage_knockout: "Groups + KO",
    };
    return labels[bracketType || ""] || bracketType || "Standard";
  };

  const getFormatColor = (bracketType: string | null) => {
    const colors: Record<string, string> = {
      single_elimination: "text-green-400 bg-green-500/15",
      double_elimination: "text-orange-400 bg-orange-500/15",
      swiss: "text-blue-400 bg-blue-500/15",
      round_robin: "text-purple-400 bg-purple-500/15",
      group_stage_knockout: "text-teal-400 bg-teal-500/15",
    };
    return colors[bracketType || ""] || "text-[hsl(var(--beta-text-secondary))] bg-[hsl(var(--beta-surface-4))]";
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "TBD";
    return new Date(dateString).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  if (loading) {
    return (
      <GradientBackground>
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <Trophy className="w-12 h-12 text-[hsl(var(--beta-accent))] mx-auto mb-4 animate-pulse" />
              <p className="text-[hsl(var(--beta-text-secondary))]">Loading brackets...</p>
            </div>
          </div>
        </div>
      </GradientBackground>
    );
  }

  return (
    <GradientBackground>
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-3">
            <Trophy className="w-7 h-7 text-[hsl(var(--beta-accent))]" />
            <div>
              <h1 className="text-3xl font-bold text-[hsl(var(--beta-text-primary))]">
                Tournament Brackets
              </h1>
              <p className="text-[hsl(var(--beta-text-secondary))]">
                Live and completed tournament brackets
              </p>
            </div>
          </div>

          {/* Filter */}
          <div className="flex items-center gap-1 p-1 rounded-[var(--beta-radius-lg)] bg-[hsl(var(--beta-surface-2))] border border-[hsl(var(--beta-border))]">
            {(["all", "live", "completed"] as FilterStatus[]).map((status) => (
              <button
                key={status}
                onClick={() => setFilter(status)}
                className={`px-3 py-1.5 rounded-[var(--beta-radius-md)] text-sm font-medium transition-all duration-200 capitalize ${
                  filter === status
                    ? "bg-[hsl(var(--beta-accent))] text-[hsl(220_20%_4%)]"
                    : "text-[hsl(var(--beta-text-secondary))] hover:text-[hsl(var(--beta-text-primary))] hover:bg-[hsl(var(--beta-surface-3))]"
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          <StatCard label="Total Brackets" value={tournaments.length} icon={<Trophy />} />
          <StatCard
            label="Live Now"
            value={liveTournaments.length}
            icon={<Play />}
            valueClassName={liveTournaments.length > 0 ? "text-red-400" : undefined}
          />
          <StatCard label="Completed" value={completedTournaments.length} icon={<CheckCircle2 />} />
          <StatCard label="Total Matches" value={totalMatches} icon={<Swords />} />
        </div>

        {/* Tournament List */}
        <div className="space-y-4">
          {filtered.map((tournament, index) => {
            const progress =
              tournament.matchCount > 0
                ? Math.round((tournament.completedCount / tournament.matchCount) * 100)
                : 0;

            return (
              <Link
                key={tournament.id}
                to={`/bracket/${tournament.id}`}
                className="block beta-animate-fade-in"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <GlassCard
                  variant="strong"
                  hover
                  className="group relative overflow-hidden"
                >
                  {/* Live indicator bar */}
                  {tournament.status === "live" && (
                    <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-red-500 via-red-400 to-red-500 animate-pulse" />
                  )}
                  {tournament.status === "completed" && (
                    <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-[hsl(var(--beta-success))] to-[hsl(var(--beta-success)/0.5)]" />
                  )}

                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    {/* Left: Tournament info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-bold text-[hsl(var(--beta-text-primary))] truncate group-hover:text-[hsl(var(--beta-accent))] transition-colors">
                          {tournament.name}
                        </h3>
                        <BetaBadge
                          variant={tournament.status === "live" ? "error" : "success"}
                          size="sm"
                        >
                          {tournament.status === "live" && (
                            <span className="w-1.5 h-1.5 rounded-full bg-current mr-1 animate-pulse" />
                          )}
                          {tournament.status.toUpperCase()}
                        </BetaBadge>
                      </div>

                      <div className="flex flex-wrap items-center gap-3 text-sm">
                        {/* Format badge */}
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${getFormatColor(
                            tournament.bracket_type
                          )}`}
                        >
                          {getFormatLabel(tournament.bracket_type)}
                        </span>

                        <span className="flex items-center gap-1.5 text-[hsl(var(--beta-text-muted))]">
                          <Users className="w-3.5 h-3.5" />
                          {tournament.max_teams} teams
                        </span>

                        {tournament.match_format && (
                          <span className="flex items-center gap-1.5 text-[hsl(var(--beta-text-muted))]">
                            <Swords className="w-3.5 h-3.5" />
                            {tournament.match_format}
                          </span>
                        )}

                        <span className="flex items-center gap-1.5 text-[hsl(var(--beta-text-muted))]">
                          <Calendar className="w-3.5 h-3.5" />
                          {formatDate(tournament.start_time)}
                        </span>

                        {tournament.prize_pool && (
                          <span className="flex items-center gap-1.5 text-[hsl(var(--beta-accent))] font-medium">
                            <Trophy className="w-3.5 h-3.5" />
                            {tournament.prize_pool}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Right: Progress & match stats */}
                    <div className="flex items-center gap-6 shrink-0">
                      {/* Match progress */}
                      <div className="text-center">
                        <div className="flex items-center gap-2 mb-1">
                          {tournament.liveCount > 0 && (
                            <span className="flex items-center gap-1 text-xs text-red-400 font-medium">
                              <Play className="w-3 h-3" />
                              {tournament.liveCount} live
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-[hsl(var(--beta-text-secondary))]">
                          <span className="font-bold text-[hsl(var(--beta-text-primary))]">
                            {tournament.completedCount}
                          </span>
                          /{tournament.matchCount} matches
                        </p>
                        {/* Progress bar */}
                        <div className="w-24 h-1.5 rounded-full bg-[hsl(var(--beta-surface-4))] mt-1.5 overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                              width: `${progress}%`,
                              background:
                                progress === 100
                                  ? "hsl(var(--beta-success))"
                                  : "hsl(var(--beta-accent))",
                            }}
                          />
                        </div>
                      </div>

                      <ArrowRight className="w-5 h-5 text-[hsl(var(--beta-text-muted))] group-hover:text-[hsl(var(--beta-accent))] transition-colors" />
                    </div>
                  </div>
                </GlassCard>
              </Link>
            );
          })}
        </div>

        {/* Empty state */}
        {filtered.length === 0 && (
          <GlassCard className="p-12 text-center">
            <Trophy className="w-12 h-12 text-[hsl(var(--beta-text-muted))] mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-[hsl(var(--beta-text-primary))] mb-2">
              {filter === "all"
                ? "No Active Brackets"
                : `No ${filter} brackets`}
            </h3>
            <p className="text-[hsl(var(--beta-text-muted))]">
              {filter === "all"
                ? "Brackets will appear here when tournaments go live."
                : `There are no ${filter} tournaments at the moment.`}
            </p>
          </GlassCard>
        )}
      </div>
    </GradientBackground>
  );
};

export default BetaBrackets;
