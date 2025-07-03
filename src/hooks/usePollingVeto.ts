import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

interface UsePollingVetoProps {
  vetoSessionId: string;
  enabled: boolean;
  pollInterval?: number; // in milliseconds, default 2000
}

interface VetoAction {
  id: string;
  action: 'ban' | 'pick';
  team_id: string | null;
  map_id: string;
  order_number: number;
  maps: { display_name: string } | null;
  side_choice?: string | null;
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

export function usePollingVeto({ vetoSessionId, enabled, pollInterval = 2000 }: UsePollingVetoProps) {
  const [vetoActions, setVetoActions] = useState<VetoAction[]>([]);
  const [sessionData, setSessionData] = useState<MapVetoSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<number>(0);

  // Fetch data from database
  const fetchData = useCallback(async () => {
    if (!enabled || !vetoSessionId) return;
    
    try {
      // Fetch veto actions
      const { data: actionsData, error: actionsError } = await supabase
        .from("map_veto_actions")
        .select("*, maps:map_id (display_name)")
        .eq("veto_session_id", vetoSessionId)
        .order("order_number");

      if (actionsError) throw actionsError;

      const formattedActions = (actionsData || []).map((a: any) => ({
        ...a,
        side_choice: a.side_choice === "attack" || a.side_choice === "defend" ? a.side_choice : null,
      })) as VetoAction[];

      // Fetch session data
      const { data: sessionDataResponse, error: sessionError } = await supabase
        .from("map_veto_sessions")
        .select("*")
        .eq("id", vetoSessionId)
        .single();

      if (sessionError) throw sessionError;

      // Only update state if data actually changed
      const actionsChanged = JSON.stringify(formattedActions) !== JSON.stringify(vetoActions);
      const sessionChanged = JSON.stringify(sessionDataResponse) !== JSON.stringify(sessionData);

      if (actionsChanged) {
        console.log('📊 Polling: Actions updated', formattedActions.length);
        setVetoActions(formattedActions);
      }

      if (sessionChanged) {
        console.log('📊 Polling: Session updated', sessionDataResponse.status);
        setSessionData(sessionDataResponse);
      }

      if (actionsChanged || sessionChanged) {
        setLastUpdate(Date.now());
      }

      setError(null);
    } catch (err: any) {
      console.error("Error polling veto data:", err);
      setError(err.message);
    } finally {
      if (loading) setLoading(false);
    }
  }, [vetoSessionId, enabled, vetoActions, sessionData, loading]);

  // Initial data fetch
  useEffect(() => {
    if (!enabled || !vetoSessionId) return;
    
    setLoading(true);
    fetchData();
  }, [vetoSessionId, enabled]);

  // Set up polling
  useEffect(() => {
    if (!enabled || !vetoSessionId) return;

    const interval = setInterval(() => {
      // Only poll when page is visible to save resources
      if (document.visibilityState === 'visible') {
        fetchData();
      }
    }, pollInterval);

    return () => clearInterval(interval);
  }, [enabled, vetoSessionId, pollInterval, fetchData]);

  // Manual refresh function
  const refresh = useCallback(() => {
    if (enabled && vetoSessionId) {
      fetchData();
    }
  }, [enabled, vetoSessionId, fetchData]);

  return {
    vetoActions,
    sessionData,
    loading,
    error,
    lastUpdate,
    refresh
  };
}