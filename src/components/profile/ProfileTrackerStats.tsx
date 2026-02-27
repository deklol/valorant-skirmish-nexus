import { useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { RefreshCw, ExternalLink, Target, Crosshair, Swords, TrendingUp, Shield, AlertCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useValorantTrackerStats } from "@/hooks/useValorantTrackerStats";
import { toast } from "sonner";

/**
 * ProfileTrackerStats component
 * 
 * Displays Valorant competitive stats scraped from tracker.gg.
 * Shows: rank, win rate, K/D, headshot %, ACS, damage/round, top agents.
 * 
 * Features:
 * - Auto-fetches if data is stale (>24h) and user is viewing own profile
 * - Manual refresh button for profile owner
 * - Links to tracker.gg profile
 * 
 * Used in: PublicProfile.tsx, Profile.tsx (Ranked Stats tab)
 */

interface Props {
  userId: string;
}

export default function ProfileTrackerStats({ userId }: Props) {
  const {
    stats,
    isLoading,
    error,
    isStale,
    isRefreshing,
    refreshError,
    refresh,
    shouldAutoRefresh,
    isOwnProfile,
  } = useValorantTrackerStats(userId);

  // Auto-refresh stale data on own profile
  useEffect(() => {
    if (shouldAutoRefresh) {
      refresh();
    }
  }, [shouldAutoRefresh, refresh]);

  // Show toast on refresh error
  useEffect(() => {
    if (refreshError) {
      toast.error(refreshError.message || "Failed to refresh tracker stats");
    }
  }, [refreshError]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-44 w-full bg-slate-700" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 bg-slate-700" />
          ))}
        </div>
      </div>
    );
  }

  if (!stats && !isRefreshing) {
    return (
      <Card className="bg-slate-700 border-slate-600">
        <CardContent className="p-6 text-center">
          <AlertCircle className="w-10 h-10 text-slate-400 mx-auto mb-3" />
          <p className="text-slate-300 mb-2">No tracker.gg stats available yet.</p>
          {isOwnProfile && (
            <>
              <p className="text-slate-400 text-sm mb-4">
                Make sure your Riot ID is set in profile settings, then click refresh to pull your stats.
              </p>
              <Button
                onClick={refresh}
                disabled={isRefreshing}
                variant="outline"
                className="border-slate-500 text-slate-300 hover:bg-slate-600"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`} />
                {isRefreshing ? "Fetching Stats..." : "Fetch Stats from Tracker.gg"}
              </Button>
            </>
          )}
          {!isOwnProfile && (
            <p className="text-slate-400 text-sm">This user hasn't synced their tracker.gg stats yet.</p>
          )}
        </CardContent>
      </Card>
    );
  }

  // While refreshing with no existing data
  if (isRefreshing && !stats) {
    return (
      <Card className="bg-slate-700 border-slate-600">
        <CardContent className="p-6 text-center">
          <RefreshCw className="w-10 h-10 text-blue-400 mx-auto mb-3 animate-spin" />
          <p className="text-slate-300">Scraping tracker.gg for ranked stats...</p>
          <p className="text-slate-400 text-sm mt-1">This may take a few seconds.</p>
        </CardContent>
      </Card>
    );
  }

  if (!stats) return null;

  const hasAnyStats = stats.win_rate !== null || stats.kd_ratio !== null || stats.avg_combat_score !== null || stats.tracker_score !== null;

  return (
    <div className="space-y-4">
      {/* Header with refresh & link */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold text-white">Tracker.gg Stats</h3>
          {stats.last_fetched_at && (
            <span className="text-xs text-slate-400">
              Updated {formatDistanceToNow(new Date(stats.last_fetched_at), { addSuffix: true })}
            </span>
          )}
          {isStale && <Badge variant="outline" className="text-yellow-400 border-yellow-500/30 text-xs">Stale</Badge>}
        </div>
        <div className="flex items-center gap-2">
          {stats.tracker_url && (
            <a href={stats.tracker_url} target="_blank" rel="noopener noreferrer">
              <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white">
                <ExternalLink className="w-4 h-4 mr-1" /> View on Tracker.gg
              </Button>
            </a>
          )}
          {isOwnProfile && (
            <Button
              onClick={refresh}
              disabled={isRefreshing}
              variant="outline"
              size="sm"
              className="border-slate-500 text-slate-300 hover:bg-slate-600"
            >
              <RefreshCw className={`w-4 h-4 mr-1 ${isRefreshing ? "animate-spin" : ""}`} />
              {isRefreshing ? "Refreshing..." : "Refresh"}
            </Button>
          )}
        </div>
      </div>

      {/* Rank & Tracker Score Card */}
      {(stats.current_rank || stats.tracker_score !== null) && (
        <Card className="bg-slate-800 border-slate-700">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Shield className="w-8 h-8 text-blue-400" />
              <div>
                {stats.current_rank && (
                  <div className="text-white font-bold text-xl">{stats.current_rank}</div>
                )}
                {stats.current_rr !== null && (
                  <div className="text-slate-400 text-sm">{stats.current_rr} RR</div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-6">
              {/* Tracker Score */}
              {stats.tracker_score !== null && (
                <div className="text-center">
                  <div className="text-xs text-slate-400 uppercase tracking-wider">Tracker Score</div>
                  <div className="text-white font-bold text-lg">
                    {stats.tracker_score}
                    <span className="text-slate-500 font-normal text-sm">/{stats.tracker_score_max || 1000}</span>
                  </div>
                </div>
              )}
              {/* Peak Rank */}
              {stats.peak_rank && (
                <div className="text-right">
                  <div className="text-xs text-slate-400 uppercase tracking-wider">Peak</div>
                  <div className="text-yellow-400 font-semibold">{stats.peak_rank}</div>
                  {stats.peak_rank_act && (
                    <div className="text-xs text-slate-500">{stats.peak_rank_act}</div>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Grid */}
      {hasAnyStats && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {stats.win_rate !== null && (
            <StatCard
              icon={<TrendingUp className="w-5 h-5" />}
              value={`${stats.win_rate}%`}
              label="Win Rate"
              color={stats.win_rate >= 50 ? "text-green-400" : "text-red-400"}
              sub={stats.wins !== null && stats.losses !== null ? `${stats.wins}W - ${stats.losses}L` : undefined}
            />
          )}
          {stats.kd_ratio !== null && (
            <StatCard
              icon={<Target className="w-5 h-5" />}
              value={stats.kd_ratio.toFixed(2)}
              label="K/D Ratio"
              color={stats.kd_ratio >= 1 ? "text-green-400" : "text-red-400"}
            />
          )}
          {stats.headshot_pct !== null && (
            <StatCard
              icon={<Crosshair className="w-5 h-5" />}
              value={`${stats.headshot_pct}%`}
              label="Headshot %"
              color="text-blue-400"
            />
          )}
          {stats.avg_combat_score !== null && (
            <StatCard
              icon={<Swords className="w-5 h-5" />}
              value={stats.avg_combat_score.toFixed(0)}
              label="Avg Combat Score"
              color="text-purple-400"
            />
          )}
          {stats.avg_damage_per_round !== null && (
            <StatCard
              icon={<Target className="w-5 h-5" />}
              value={stats.avg_damage_per_round.toFixed(1)}
              label="Damage/Round"
              color="text-orange-400"
            />
          )}
          {stats.kills_per_round !== null && (
            <StatCard
              icon={<Crosshair className="w-5 h-5" />}
              value={stats.kills_per_round.toFixed(2)}
              label="Kills/Round"
              color="text-yellow-400"
            />
          )}
        </div>
      )}

      {/* Top Agents */}
      {stats.top_agents && stats.top_agents.length > 0 && (
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-white">Top Agents</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
              {stats.top_agents.map((agent, i) => (
                <div key={i} className="flex items-center justify-between bg-slate-700 rounded-lg p-3">
                  <span className="text-white font-medium">{agent.name}</span>
                  <div className="flex gap-3 text-xs text-slate-400">
                    {agent.games && <span>{agent.games} games</span>}
                    {agent.win_rate && <span className="text-green-400">{agent.win_rate}% WR</span>}
                    {agent.kd && <span>{agent.kd} K/D</span>}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* No meaningful data warning */}
      {!hasAnyStats && !isRefreshing && (
        <Card className="bg-slate-700 border-slate-600">
          <CardContent className="p-4 text-center text-slate-400">
            <p>Stats were fetched but couldn't be parsed from tracker.gg.</p>
            <p className="text-sm mt-1">This can happen if the profile is private or the page structure has changed.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

/** Small stat display card */
function StatCard({
  icon,
  value,
  label,
  color,
  sub,
}: {
  icon: React.ReactNode;
  value: string;
  label: string;
  color: string;
  sub?: string;
}) {
  return (
    <div className="bg-slate-700 rounded-lg p-3 text-center">
      <div className={`flex items-center justify-center mb-1 ${color}`}>{icon}</div>
      <div className={`text-xl font-bold ${color}`}>{value}</div>
      <div className="text-xs text-slate-400">{label}</div>
      {sub && <div className="text-xs text-slate-500 mt-0.5">{sub}</div>}
    </div>
  );
}
