/**
 * Valorant Tracker.gg Stats Display Component (Beta Design System)
 * 
 * Displays Valorant competitive stats from tracker.gg on user profiles.
 * Styled to match the beta design system, similar to FaceitStatsDisplay.
 * Shows: current rank, peak rank, tracker score, win rate, K/D, HS%, ACS, top agents.
 * 
 * Used in: BetaProfile.tsx (as a standalone section, not a tab)
 * Dependencies: useValorantTrackerStats hook, valorant_tracker_stats table
 */

import { useEffect } from "react";
import { GlassCard, BetaBadge } from "@/components-beta/ui-beta";
import {
  Target, Crosshair, Swords, TrendingUp, Shield,
  ExternalLink, RefreshCw, AlertCircle
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useValorantTrackerStats } from "@/hooks/useValorantTrackerStats";
import { toast } from "sonner";
import { BetaButton } from "@/components-beta/ui-beta";

interface ValorantTrackerStatsDisplayProps {
  userId: string;
}

const ValorantTrackerStatsDisplay = ({ userId }: ValorantTrackerStatsDisplayProps) => {
  const {
    stats,
    isLoading,
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
      <GlassCard className="p-6">
        <div className="animate-pulse flex items-center gap-3">
          <div className="w-8 h-8 bg-[hsl(var(--beta-surface-4))] rounded-lg" />
          <div className="h-4 bg-[hsl(var(--beta-surface-4))] rounded w-40" />
        </div>
      </GlassCard>
    );
  }

  // Refreshing with no data yet
  if (isRefreshing && !stats) {
    return (
      <GlassCard className="p-6">
        <div className="flex items-center gap-3">
          <RefreshCw className="w-5 h-5 text-[hsl(var(--beta-accent))] animate-spin" />
          <div>
            <p className="text-sm font-medium text-[hsl(var(--beta-text-primary))]">
              Scraping tracker.gg for ranked stats...
            </p>
            <p className="text-xs text-[hsl(var(--beta-text-muted))]">This may take a few seconds.</p>
          </div>
        </div>
      </GlassCard>
    );
  }

  // No stats available
  if (!stats) {
    if (!isOwnProfile) return null; // Don't show anything for other users with no stats
    return (
      <GlassCard className="p-6">
        <div className="flex items-center gap-3 mb-3">
          <AlertCircle className="w-5 h-5 text-[hsl(var(--beta-text-muted))]" />
          <h3 className="text-lg font-semibold text-[hsl(var(--beta-text-primary))]">Valorant Tracker.gg Stats</h3>
        </div>
        <p className="text-sm text-[hsl(var(--beta-text-muted))] mb-4">
          Make sure your Riot ID is set in profile settings, then click below to pull your stats.
        </p>
        <BetaButton
          variant="outline"
          size="sm"
          onClick={refresh}
          disabled={isRefreshing}
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`} />
          {isRefreshing ? "Fetching..." : "Fetch Stats from Tracker.gg"}
        </BetaButton>
      </GlassCard>
    );
  }

  const hasAnyStats = stats.win_rate !== null || stats.kd_ratio !== null || stats.avg_combat_score !== null || stats.tracker_score !== null;

  return (
    <GlassCard className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Target className="w-5 h-5 text-red-500" />
          <h3 className="text-lg font-semibold text-[hsl(var(--beta-text-primary))]">Valorant Ranked Stats</h3>
          {isStale && (
            <BetaBadge variant="warning" size="sm">Stale</BetaBadge>
          )}
        </div>
        <div className="flex items-center gap-2">
          {stats.tracker_url && (
            <a
              href={stats.tracker_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[hsl(var(--beta-accent))] hover:underline text-sm flex items-center gap-1"
            >
              View on Tracker.gg
              <ExternalLink className="w-3 h-3" />
            </a>
          )}
          {isOwnProfile && (
            <BetaButton
              variant="outline"
              size="sm"
              onClick={refresh}
              disabled={isRefreshing}
            >
              <RefreshCw className={`w-4 h-4 mr-1 ${isRefreshing ? "animate-spin" : ""}`} />
              {isRefreshing ? "..." : "Refresh"}
            </BetaButton>
          )}
        </div>
      </div>

      {/* Rank Display */}
      {(stats.current_rank || stats.peak_rank || stats.tracker_score !== null) && (
        <div className="flex items-center gap-4 mb-6 p-4 rounded-xl bg-[hsl(var(--beta-surface-3))]">
          {/* Current Rank */}
          <div className="flex items-center gap-3 flex-1">
            <Shield className="w-8 h-8 text-[hsl(var(--beta-accent))]" />
            <div>
              <p className="text-xs text-[hsl(var(--beta-text-muted))] uppercase tracking-wider">Current Rating</p>
              <p className="text-xl font-bold text-[hsl(var(--beta-text-primary))]">
                {stats.current_rank || "Unrated"}
              </p>
              {stats.current_rr !== null && stats.current_rank !== 'Unrated' && stats.current_rank !== 'Unranked' && (
                <p className="text-xs text-[hsl(var(--beta-text-muted))]">{stats.current_rr} RR</p>
              )}
            </div>
          </div>

          {/* Tracker Score */}
          {stats.tracker_score !== null && (
            <div className="text-center px-4">
              <p className="text-xs text-[hsl(var(--beta-text-muted))] uppercase tracking-wider">Tracker Score</p>
              <p className="text-xl font-bold text-[hsl(var(--beta-accent))]">
                {stats.tracker_score}
                <span className="text-sm font-normal text-[hsl(var(--beta-text-muted))]">/{stats.tracker_score_max || 1000}</span>
              </p>
            </div>
          )}

          {/* Peak Rank */}
          {stats.peak_rank && (
            <div className="text-right">
              <p className="text-xs text-[hsl(var(--beta-text-muted))] uppercase tracking-wider">Peak Rating</p>
              <p className="text-lg font-semibold text-yellow-400">{stats.peak_rank}</p>
              {stats.peak_rank_act && (
                <p className="text-xs text-[hsl(var(--beta-text-muted))]">{stats.peak_rank_act}</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Stats Grid */}
      {hasAnyStats && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
          {stats.win_rate !== null && (
            <div className="p-3 rounded-xl bg-[hsl(var(--beta-surface-3))] text-center">
              <TrendingUp className={`w-4 h-4 mx-auto mb-1 ${stats.win_rate >= 50 ? 'text-green-400' : 'text-red-400'}`} />
              <p className={`text-lg font-bold ${stats.win_rate >= 50 ? 'text-green-400' : 'text-red-400'}`}>
                {stats.win_rate}%
              </p>
              <p className="text-xs text-[hsl(var(--beta-text-muted))]">Win Rate</p>
              {stats.wins !== null && stats.losses !== null && (
                <p className="text-xs text-[hsl(var(--beta-text-muted))]">{stats.wins}W - {stats.losses}L</p>
              )}
            </div>
          )}
          {stats.kd_ratio !== null && (
            <div className="p-3 rounded-xl bg-[hsl(var(--beta-surface-3))] text-center">
              <Target className={`w-4 h-4 mx-auto mb-1 ${stats.kd_ratio >= 1 ? 'text-green-400' : 'text-red-400'}`} />
              <p className={`text-lg font-bold ${stats.kd_ratio >= 1 ? 'text-green-400' : 'text-red-400'}`}>
                {stats.kd_ratio.toFixed(2)}
              </p>
              <p className="text-xs text-[hsl(var(--beta-text-muted))]">K/D Ratio</p>
            </div>
          )}
          {stats.headshot_pct !== null && (
            <div className="p-3 rounded-xl bg-[hsl(var(--beta-surface-3))] text-center">
              <Crosshair className="w-4 h-4 mx-auto mb-1 text-blue-400" />
              <p className="text-lg font-bold text-blue-400">{stats.headshot_pct}%</p>
              <p className="text-xs text-[hsl(var(--beta-text-muted))]">Headshot %</p>
            </div>
          )}
          {stats.avg_combat_score !== null && (
            <div className="p-3 rounded-xl bg-[hsl(var(--beta-surface-3))] text-center">
              <Swords className="w-4 h-4 mx-auto mb-1 text-purple-400" />
              <p className="text-lg font-bold text-purple-400">{stats.avg_combat_score.toFixed(0)}</p>
              <p className="text-xs text-[hsl(var(--beta-text-muted))]">ACS</p>
            </div>
          )}
          {stats.avg_damage_per_round !== null && (
            <div className="p-3 rounded-xl bg-[hsl(var(--beta-surface-3))] text-center">
              <Target className="w-4 h-4 mx-auto mb-1 text-orange-400" />
              <p className="text-lg font-bold text-orange-400">{stats.avg_damage_per_round.toFixed(1)}</p>
              <p className="text-xs text-[hsl(var(--beta-text-muted))]">DMG/Round</p>
            </div>
          )}
          {stats.kills_per_round !== null && (
            <div className="p-3 rounded-xl bg-[hsl(var(--beta-surface-3))] text-center">
              <Crosshair className="w-4 h-4 mx-auto mb-1 text-yellow-400" />
              <p className="text-lg font-bold text-yellow-400">{stats.kills_per_round.toFixed(2)}</p>
              <p className="text-xs text-[hsl(var(--beta-text-muted))]">Kills/Round</p>
            </div>
          )}
        </div>
      )}

      {/* Top Agents */}
      {stats.top_agents && stats.top_agents.length > 0 && (
        <div className="mb-4">
          <h4 className="text-sm font-medium text-[hsl(var(--beta-text-secondary))] mb-3">Top Agents</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
            {stats.top_agents.map((agent, i) => (
              <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-[hsl(var(--beta-surface-2))]">
                <span className="text-sm font-medium text-[hsl(var(--beta-text-primary))]">{agent.name}</span>
                <div className="flex gap-2 text-xs text-[hsl(var(--beta-text-muted))]">
                  {agent.games && <span>{agent.games} games</span>}
                  {agent.win_rate && <span className="text-green-400">{agent.win_rate}% WR</span>}
                  {agent.kd && <span>{agent.kd} K/D</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* No meaningful data warning */}
      {!hasAnyStats && !isRefreshing && (
        <p className="text-sm text-[hsl(var(--beta-text-muted))] text-center py-4">
          Stats were fetched but couldn't be parsed. The profile may be private or the page structure changed.
        </p>
      )}

      {/* Last Updated */}
      {stats.last_fetched_at && (
        <p className="text-xs text-[hsl(var(--beta-text-muted))] mt-4">
          Last updated {formatDistanceToNow(new Date(stats.last_fetched_at), { addSuffix: true })}
        </p>
      )}
    </GlassCard>
  );
};

export default ValorantTrackerStatsDisplay;
