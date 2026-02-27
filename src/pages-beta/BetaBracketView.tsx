import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  Trophy,
  ArrowLeft,
  RefreshCw,
  Users,
  Swords,
  Clock,
  Play,
  CheckCircle2,
  ExternalLink,
  Share2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { GradientBackground, GlassCard, BetaBadge, BetaButton, StatCard } from "@/components-beta/ui-beta";
import { SwissStandingsView, RoundRobinView, DoubleEliminationView } from "@/components/bracket-views";
import type { BracketType } from "@/utils/formatGenerators";

interface MatchData {
  id: string;
  round_number: number;
  match_number: number;
  team1_id: string | null;
  team2_id: string | null;
  winner_id: string | null;
  status: string;
  score_team1: number;
  score_team2: number;
  scheduled_time: string | null;
  map_veto_enabled: boolean;
  bracket_position?: string | null;
  team1?: { name: string; id: string } | null;
  team2?: { name: string; id: string } | null;
}

interface TournamentMeta {
  id: string;
  name: string;
  status: string;
  max_teams: number;
  bracket_type: string | null;
  match_format: string | null;
  swiss_rounds?: number;
  prize_pool: string | null;
  start_time: string | null;
}

const BetaBracketView = () => {
  const { id: tournamentId } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [tournament, setTournament] = useState<TournamentMeta | null>(null);
  const [matches, setMatches] = useState<MatchData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!tournamentId) return;
    fetchData();

    const channel = supabase
      .channel(`beta-bracket:${tournamentId}`)
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "matches",
        filter: `tournament_id=eq.${tournamentId}`,
      }, () => fetchData())
      .on("postgres_changes", {
        event: "UPDATE",
        schema: "public",
        table: "tournaments",
        filter: `id=eq.${tournamentId}`,
      }, () => fetchData())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tournamentId]);

  const fetchData = async () => {
    if (!tournamentId) return;
    try {
      setError(null);

      const [{ data: tData, error: tErr }, { data: mData }] = await Promise.all([
        supabase
          .from("tournaments")
          .select("id, name, status, max_teams, bracket_type, match_format, swiss_rounds, prize_pool, start_time")
          .eq("id", tournamentId)
          .maybeSingle(),
        supabase
          .from("matches")
          .select(`
            *, 
            team1:teams!matches_team1_id_fkey (name, id),
            team2:teams!matches_team2_id_fkey (name, id)
          `)
          .eq("tournament_id", tournamentId)
          .order("round_number", { ascending: true })
          .order("match_number", { ascending: true }),
      ]);

      if (tErr) throw tErr;
      if (!tData) throw new Error("Tournament not found");

      setTournament(tData);

      const processed = (mData || []).map((match: any) => ({
        ...match,
        team1: match.team1 && typeof match.team1 === "object" && "name" in match.team1 ? match.team1 : null,
        team2: match.team2 && typeof match.team2 === "object" && "name" in match.team2 ? match.team2 : null,
      }));
      setMatches(processed);
    } catch (err: any) {
      setError(err.message || "Failed to load bracket");
    } finally {
      setLoading(false);
    }
  };

  const getFormatLabel = (bracketType: string | null) => {
    const labels: Record<string, string> = {
      single_elimination: "Single Elimination",
      double_elimination: "Double Elimination",
      swiss: "Swiss System",
      round_robin: "Round Robin",
      group_stage_knockout: "Group Stage + Knockout",
    };
    return labels[bracketType || ""] || "Standard";
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

  const getRoundName = (roundNumber: number, maxRounds: number) => {
    if (roundNumber === maxRounds) return "Final";
    if (roundNumber === maxRounds - 1) return "Semi-Final";
    if (roundNumber === maxRounds - 2) return "Quarter-Final";
    return `Round ${roundNumber}`;
  };

  const generateBracketStructure = (maxTeams: number) => {
    const rounds = Math.ceil(Math.log2(maxTeams));
    const structure = [];
    for (let round = 1; round <= rounds; round++) {
      const matchesInRound = Math.ceil(maxTeams / Math.pow(2, round));
      structure.push({ round, matchCount: matchesInRound, name: getRoundName(round, rounds) });
    }
    return structure;
  };

  const formatTime = (timeString: string | null) => {
    if (!timeString) return "TBD";
    return new Date(timeString).toLocaleDateString("en-GB", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
  };

  // Loading state
  if (loading) {
    return (
      <GradientBackground>
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <RefreshCw className="w-10 h-10 text-[hsl(var(--beta-accent))] mx-auto mb-4 animate-spin" />
              <p className="text-[hsl(var(--beta-text-secondary))]">Loading bracket...</p>
            </div>
          </div>
        </div>
      </GradientBackground>
    );
  }

  // Error state
  if (error || !tournament) {
    return (
      <GradientBackground>
        <div className="container mx-auto px-4 py-8">
          <button
            onClick={() => navigate("/brackets")}
            className="flex items-center gap-2 text-[hsl(var(--beta-text-secondary))] hover:text-[hsl(var(--beta-text-primary))] transition-colors mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Brackets
          </button>
          <GlassCard className="p-12 text-center">
            <Trophy className="w-12 h-12 text-[hsl(var(--beta-text-muted))] mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-[hsl(var(--beta-text-primary))] mb-2">
              {error || "Tournament not found"}
            </h3>
            <BetaButton variant="outline" onClick={fetchData} className="mt-4">
              <RefreshCw className="w-4 h-4 mr-2" />
              Retry
            </BetaButton>
          </GlassCard>
        </div>
      </GradientBackground>
    );
  }

  const liveMatches = matches.filter((m) => m.status === "live");
  const completedMatches = matches.filter((m) => m.status === "completed");
  const _pendingMatches = matches.filter((m) => m.status === "pending");
  const progress = matches.length > 0 ? Math.round((completedMatches.length / matches.length) * 100) : 0;
  const bracketType = tournament.bracket_type as BracketType;

  // Render format-specific bracket content
  const renderBracketContent = () => {
    // Swiss
    if (bracketType === "swiss") {
      return (
        <GlassCard variant="strong" noPadding className="overflow-hidden">
          <div className="p-4 border-b border-[hsl(var(--beta-border))]">
            <h2 className="text-lg font-semibold text-[hsl(var(--beta-text-primary))]">
              Swiss Standings
            </h2>
          </div>
          <div className="p-4">
            <SwissStandingsView tournamentId={tournamentId!} tournamentName={tournament.name} />
          </div>
        </GlassCard>
      );
    }

    // Round Robin
    if (bracketType === "round_robin") {
      return (
        <GlassCard variant="strong" noPadding className="overflow-hidden">
          <div className="p-4 border-b border-[hsl(var(--beta-border))]">
            <h2 className="text-lg font-semibold text-[hsl(var(--beta-text-primary))]">
              Round Robin Standings
            </h2>
          </div>
          <div className="p-4">
            <RoundRobinView tournamentId={tournamentId!} />
          </div>
        </GlassCard>
      );
    }

    // Double Elimination
    if (bracketType === "double_elimination") {
      return (
        <GlassCard variant="strong" noPadding className="overflow-hidden">
          <div className="p-4 border-b border-[hsl(var(--beta-border))]">
            <h2 className="text-lg font-semibold text-[hsl(var(--beta-text-primary))]">
              Double Elimination Bracket
            </h2>
          </div>
          <div className="p-4">
            <DoubleEliminationView tournamentId={tournamentId!} />
          </div>
        </GlassCard>
      );
    }

    // Group Stage + Knockout
    if (bracketType === "group_stage_knockout") {
      const knockoutMatches = matches.filter((m) => m.bracket_position === "knockout");
      if (knockoutMatches.length === 0) {
        return (
          <GlassCard className="p-12 text-center">
            <Trophy className="w-12 h-12 text-[hsl(var(--beta-text-muted))] mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-[hsl(var(--beta-text-primary))] mb-2">
              Knockout Stage Not Yet Generated
            </h3>
            <p className="text-[hsl(var(--beta-text-muted))]">
              Group stage matches must be completed first.
            </p>
          </GlassCard>
        );
      }
      return renderSingleElimBracket(knockoutMatches, Math.pow(2, Math.ceil(Math.log2(knockoutMatches.length + 1))));
    }

    // Single Elimination (default) — also handles matches for group_stage_knockout after filtering
    if (matches.length === 0) {
      return (
        <GlassCard className="p-12 text-center">
          <Trophy className="w-12 h-12 text-[hsl(var(--beta-text-muted))] mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-[hsl(var(--beta-text-primary))] mb-2">
            No Bracket Generated Yet
          </h3>
          <p className="text-[hsl(var(--beta-text-muted))]">
            The bracket will appear once teams are balanced and matches are scheduled.
          </p>
        </GlassCard>
      );
    }

    return renderSingleElimBracket(matches, tournament.max_teams || 8);
  };

  const renderSingleElimBracket = (bracketMatches: MatchData[], maxTeams: number) => {
    const structure = generateBracketStructure(maxTeams);

    return (
      <GlassCard variant="strong" noPadding className="overflow-hidden">
        <div className="p-4 border-b border-[hsl(var(--beta-border))]">
          <h2 className="text-lg font-semibold text-[hsl(var(--beta-text-primary))]">
            Bracket
          </h2>
        </div>
        <div className="p-4 overflow-x-auto">
          <div className="flex gap-6 min-w-max">
            {structure.map((roundInfo) => {
              const roundMatches = bracketMatches.filter(
                (m) => m.round_number === roundInfo.round
              );

              return (
                <div key={roundInfo.round} className="flex flex-col min-w-[260px]">
                  {/* Round header */}
                  <div className="text-center text-sm font-semibold text-[hsl(var(--beta-text-secondary))] pb-3 mb-3 border-b border-[hsl(var(--beta-border))]">
                    {roundInfo.name}
                  </div>

                  <div className="flex flex-col gap-3 justify-around flex-1">
                    {Array.from({ length: roundInfo.matchCount }, (_, idx) => {
                      const match = roundMatches.find((m) => m.match_number === idx + 1);

                      return (
                        <div
                          key={`${roundInfo.round}-${idx}`}
                          className={`
                            rounded-[var(--beta-radius-lg)] border transition-all overflow-hidden
                            ${
                              match?.status === "live"
                                ? "bg-[hsl(var(--beta-accent)/0.08)] border-[hsl(var(--beta-accent)/0.4)] ring-1 ring-[hsl(var(--beta-accent)/0.2)]"
                                : match?.status === "completed"
                                ? "bg-[hsl(var(--beta-surface-3))] border-[hsl(var(--beta-success)/0.3)]"
                                : "bg-[hsl(var(--beta-surface-3))] border-[hsl(var(--beta-border))]"
                            }
                          `}
                        >
                          {/* Match header */}
                          <div className="flex items-center justify-between px-3 py-1.5 border-b border-[hsl(var(--beta-border-subtle))]">
                            <span className="text-[10px] font-medium uppercase tracking-wider text-[hsl(var(--beta-text-muted))]">
                              Match {idx + 1}
                            </span>
                            {match ? (
                              <BetaBadge
                                variant={
                                  match.status === "live"
                                    ? "accent"
                                    : match.status === "completed"
                                    ? "success"
                                    : "default"
                                }
                                size="sm"
                              >
                                {match.status === "live" && (
                                  <span className="w-1.5 h-1.5 rounded-full bg-current mr-1 animate-pulse" />
                                )}
                                {match.status}
                              </BetaBadge>
                            ) : (
                              <BetaBadge variant="default" size="sm">
                                pending
                              </BetaBadge>
                            )}
                          </div>

                          {/* Teams */}
                          <div className="p-2 space-y-1">
                            {/* Team 1 */}
                            <div
                              className={`flex items-center justify-between px-2 py-1.5 rounded-[var(--beta-radius-sm)] ${
                                match?.winner_id && match.winner_id === match.team1_id
                                  ? "bg-[hsl(var(--beta-success)/0.15)]"
                                  : ""
                              }`}
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                {match?.winner_id === match?.team1_id && (
                                  <Trophy className="w-3 h-3 text-[hsl(var(--beta-accent))] shrink-0" />
                                )}
                                <span
                                  className={`text-sm truncate ${
                                    match?.winner_id === match?.team1_id
                                      ? "font-semibold text-[hsl(var(--beta-success))]"
                                      : "text-[hsl(var(--beta-text-primary))]"
                                  }`}
                                >
                                  {match?.team1?.name || "TBD"}
                                </span>
                              </div>
                              <span
                                className={`text-sm font-bold ml-2 ${
                                  match?.winner_id === match?.team1_id
                                    ? "text-[hsl(var(--beta-success))]"
                                    : "text-[hsl(var(--beta-text-secondary))]"
                                }`}
                              >
                                {match?.score_team1 ?? "-"}
                              </span>
                            </div>

                            {/* Team 2 */}
                            <div
                              className={`flex items-center justify-between px-2 py-1.5 rounded-[var(--beta-radius-sm)] ${
                                match?.winner_id && match.winner_id === match.team2_id
                                  ? "bg-[hsl(var(--beta-success)/0.15)]"
                                  : ""
                              }`}
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                {match?.winner_id === match?.team2_id && (
                                  <Trophy className="w-3 h-3 text-[hsl(var(--beta-accent))] shrink-0" />
                                )}
                                <span
                                  className={`text-sm truncate ${
                                    match?.winner_id === match?.team2_id
                                      ? "font-semibold text-[hsl(var(--beta-success))]"
                                      : "text-[hsl(var(--beta-text-primary))]"
                                  }`}
                                >
                                  {match?.team2?.name || "TBD"}
                                </span>
                              </div>
                              <span
                                className={`text-sm font-bold ml-2 ${
                                  match?.winner_id === match?.team2_id
                                    ? "text-[hsl(var(--beta-success))]"
                                    : "text-[hsl(var(--beta-text-secondary))]"
                                }`}
                              >
                                {match?.score_team2 ?? "-"}
                              </span>
                            </div>
                          </div>

                          {/* Footer - scheduled time / match link */}
                          {match && (
                            <div className="flex items-center justify-between px-3 py-1.5 border-t border-[hsl(var(--beta-border-subtle))]">
                              {match.scheduled_time ? (
                                <span className="text-[10px] text-[hsl(var(--beta-text-muted))] flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {formatTime(match.scheduled_time)}
                                </span>
                              ) : (
                                <span />
                              )}
                              <Link
                                to={`/match/${match.id}`}
                                className="text-[10px] font-medium text-[hsl(var(--beta-accent))] hover:text-[hsl(var(--beta-accent-glow))] transition-colors"
                                onClick={(e) => e.stopPropagation()}
                              >
                                Details →
                              </Link>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </GlassCard>
    );
  };

  return (
    <GradientBackground>
      <div className="container mx-auto px-4 py-8">
        {/* Back navigation */}
        <button
          onClick={() => navigate("/brackets")}
          className="flex items-center gap-2 text-[hsl(var(--beta-text-secondary))] hover:text-[hsl(var(--beta-text-primary))] transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Brackets
        </button>

        {/* Tournament Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl md:text-3xl font-bold text-[hsl(var(--beta-text-primary))]">
                {tournament.name}
              </h1>
              <BetaBadge variant={tournament.status === "live" ? "error" : "success"}>
                {tournament.status === "live" && (
                  <span className="w-1.5 h-1.5 rounded-full bg-current mr-1 animate-pulse" />
                )}
                {tournament.status.toUpperCase()}
              </BetaBadge>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${getFormatColor(tournament.bracket_type)}`}>
                {getFormatLabel(tournament.bracket_type)}
              </span>
              {tournament.match_format && (
                <span className="text-sm text-[hsl(var(--beta-text-muted))] flex items-center gap-1">
                  <Swords className="w-3.5 h-3.5" />
                  {tournament.match_format}
                </span>
              )}
              <span className="text-sm text-[hsl(var(--beta-text-muted))] flex items-center gap-1">
                <Users className="w-3.5 h-3.5" />
                {tournament.max_teams} teams
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <BetaButton variant="ghost" size="sm" onClick={handleShare}>
              <Share2 className="w-4 h-4 mr-1" />
              Share
            </BetaButton>
            <BetaButton variant="outline" size="sm" onClick={fetchData}>
              <RefreshCw className="w-4 h-4 mr-1" />
              Refresh
            </BetaButton>
            <Link to={`/tournament/${tournamentId}`}>
              <BetaButton variant="secondary" size="sm">
                <ExternalLink className="w-4 h-4 mr-1" />
                Tournament Page
              </BetaButton>
            </Link>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          <StatCard label="Total Matches" value={matches.length} icon={<Swords />} />
          <StatCard
            label="Live"
            value={liveMatches.length}
            icon={<Play />}
            valueClassName={liveMatches.length > 0 ? "text-red-400" : undefined}
          />
          <StatCard label="Completed" value={completedMatches.length} icon={<CheckCircle2 />} />
          <StatCard
            label="Progress"
            value={`${progress}%`}
            icon={<Trophy />}
            valueClassName={progress === 100 ? "text-[hsl(var(--beta-success))]" : undefined}
          />
        </div>

        {/* Bracket Content */}
        {renderBracketContent()}
      </div>
    </GradientBackground>
  );
};

export default BetaBracketView;
