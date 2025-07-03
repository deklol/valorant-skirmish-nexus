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

  // Set up realtime subscriptions
  useEffect(() => {
    if (!enabled || !vetoSessionId) return;

    fetchInitialData();

    // Subscribe to veto actions changes
    const actionsChannel = supabase
      .channel(`veto-actions-${vetoSessionId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'map_veto_actions',
          filter: `veto_session_id=eq.${vetoSessionId}`
        },
        async (payload) => {
          console.log('🔄 Realtime: Veto action change detected', payload);
          
          if (payload.eventType === 'INSERT') {
            // Fetch the full record with relations
            const { data: newAction } = await supabase
              .from("map_veto_actions")
              .select("*,maps:map_id (*),users:performed_by (discord_username)")
              .eq("id", payload.new.id)
              .single();

            if (newAction) {
              const formattedAction = {
                ...newAction,
                side_choice:
                  newAction.side_choice === "attack" || newAction.side_choice === "defend"
                    ? newAction.side_choice
                    : null,
              } as VetoAction;

              setVetoActions(prev => {
                const updated = [...prev, formattedAction].sort((a, b) => a.order_number - b.order_number);
                console.log('✅ Realtime: Updated veto actions', updated);
                return updated;
              });
            }
          } else if (payload.eventType === 'UPDATE') {
            // Handle updates (like side_choice being set)
            const { data: updatedAction } = await supabase
              .from("map_veto_actions")
              .select("*,maps:map_id (*),users:performed_by (discord_username)")
              .eq("id", payload.new.id)
              .single();

            if (updatedAction) {
              const formattedAction = {
                ...updatedAction,
                side_choice:
                  updatedAction.side_choice === "attack" || updatedAction.side_choice === "defend"
                    ? updatedAction.side_choice
                    : null,
              } as VetoAction;

              setVetoActions(prev => 
                prev.map(action => 
                  action.id === formattedAction.id ? formattedAction : action
                )
              );
            }
          }
        }
      )
      .subscribe();

    // Subscribe to session changes
    const sessionChannel = supabase
      .channel(`veto-session-${vetoSessionId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'map_veto_sessions',
          filter: `id=eq.${vetoSessionId}`
        },
        (payload) => {
          console.log('🔄 Realtime: Session change detected', payload);
          
          if (payload.eventType === 'UPDATE') {
            setSessionData(payload.new as MapVetoSession);
            console.log('✅ Realtime: Updated session data', payload.new);
          }
        }
      )
      .subscribe();

    // Cleanup subscriptions
    return () => {
      console.log('🧹 Cleaning up realtime subscriptions');
      supabase.removeChannel(actionsChannel);
      supabase.removeChannel(sessionChannel);
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