import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { VetoAction } from "@/components/map-veto/types";

interface UseRealtimeMapVetoProps {
  vetoSessionId: string;
  enabled: boolean;
}

interface MapVetoSession {
  id: string;
  status: string;
  current_turn_team_id: string | null;
  home_team_id: string | null;
  away_team_id: string | null;
  match_id: string | null;
  created_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  roll_seed: string | null;
  roll_timestamp: string | null;
  roll_initiator_id: string | null;
  veto_order: any;
}

export function useRealtimeMapVeto({ vetoSessionId, enabled }: UseRealtimeMapVetoProps) {
  const [vetoActions, setVetoActions] = useState<VetoAction[]>([]);
  const [sessionData, setSessionData] = useState<MapVetoSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Initial data fetch
  const fetchInitialData = useCallback(async () => {
    if (!enabled || !vetoSessionId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // Fetch veto actions
      const { data: actionsData, error: actionsError } = await supabase
        .from("map_veto_actions")
        .select("*,maps:map_id (*),users:performed_by (discord_username)")
        .eq("veto_session_id", vetoSessionId)
        .order("order_number");

      if (actionsError) throw actionsError;

      const formattedActions = (actionsData || []).map((a: any) => ({
        ...a,
        side_choice:
          a.side_choice === "attack" || a.side_choice === "defend"
            ? a.side_choice
            : null,
      })) as VetoAction[];

      setVetoActions(formattedActions);

      // Fetch session data
      const { data: sessionDataResponse, error: sessionError } = await supabase
        .from("map_veto_sessions")
        .select("*")
        .eq("id", vetoSessionId)
        .single();

      if (sessionError) throw sessionError;
      setSessionData(sessionDataResponse);

    } catch (err: any) {
      console.error("Error fetching initial veto data:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [vetoSessionId, enabled]);

  // Set up polling for updates instead of realtime
  useEffect(() => {
    if (!enabled || !vetoSessionId) return;

    fetchInitialData();

    // Poll for updates every 2 seconds
    const pollInterval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchInitialData();
      }
    }, 2000);

    return () => {
      console.log('🧹 Cleaning up polling interval');
      clearInterval(pollInterval);
    };
  }, [vetoSessionId, enabled, fetchInitialData]);

  return {
    vetoActions,
    sessionData,
    loading,
    error,
    refetch: fetchInitialData
  };
}