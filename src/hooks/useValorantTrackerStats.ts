import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

/**
 * Hook to fetch and manage Valorant tracker.gg stats for a user.
 * 
 * Features:
 * - Auto-fetches from DB (valorant_tracker_stats table)
 * - Provides a refresh function that triggers a new Firecrawl scrape
 * - Auto-triggers scrape if data is stale (>24h) and user is viewing their own profile
 * 
 * Dependencies:
 * - valorant_tracker_stats table
 * - fetch-valorant-tracker-stats edge function
 * - FIRECRAWL_API_KEY secret
 */

export interface ValorantTrackerStats {
  id: string;
  user_id: string;
  current_rank: string | null;
  current_rr: number | null;
  peak_rank: string | null;
  peak_rank_act: string | null;
  win_rate: number | null;
  wins: number | null;
  losses: number | null;
  kd_ratio: number | null;
  kda_ratio: number | null;
  headshot_pct: number | null;
  avg_damage_per_round: number | null;
  avg_combat_score: number | null;
  kills_per_round: number | null;
  first_bloods_per_round: number | null;
  tracker_score: number | null;
  tracker_score_max: number | null;
  top_agents: Array<{ name: string; games?: number; win_rate?: number; kd?: number }>;
  top_weapons: Array<{ name: string; headshot_pct?: number; kills?: number }>;
  tracker_url: string | null;
  last_fetched_at: string | null;
  created_at: string;
  updated_at: string;
}

const STALE_THRESHOLD_MS = 24 * 60 * 60 * 1000; // 24 hours

export function useValorantTrackerStats(userId: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isOwnProfile = user?.id === userId;

  // Fetch existing stats from DB
  const {
    data: stats,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["valorant-tracker-stats", userId],
    queryFn: async () => {
      // Table not yet in generated types, so we use a raw query approach
      const { data, error } = await supabase
        .from("valorant_tracker_stats" as any)
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();

      if (error) throw error;
      return (data as unknown) as ValorantTrackerStats | null;
    },
    enabled: !!userId,
  });

  // Mutation to trigger a fresh scrape
  const refreshMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke(
        "fetch-valorant-tracker-stats",
        { body: { user_id: userId } }
      );
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["valorant-tracker-stats", userId] });
    },
  });

  // Check if data is stale
  const isStale = stats?.last_fetched_at
    ? Date.now() - new Date(stats.last_fetched_at).getTime() > STALE_THRESHOLD_MS
    : true; // No data = stale

  // Auto-refresh if stale for ANY visitor (not just own profile), fire once
  const shouldAutoRefresh = isStale && !isLoading && !refreshMutation.isPending;

  return {
    stats,
    isLoading,
    error,
    isStale,
    isRefreshing: refreshMutation.isPending,
    refreshError: refreshMutation.error,
    refresh: () => refreshMutation.mutate(),
    shouldAutoRefresh,
    isOwnProfile,
  };
}
