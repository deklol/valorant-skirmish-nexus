import { useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Improved real-time hook that prevents syncing issues and duplicate subscriptions
 */

type ConnectionState = "connecting" | "online" | "offline" | "error";

interface RealtimeHookOptions {
  enabled?: boolean;
  onConnectionChange?: (state: ConnectionState) => void;
}

/**
 * Clean and robust real-time subscription for map veto actions
 */
export function useMapVetoActionsRealtime(
  vetoSessionId: string | null,
  onUpdate: (payload: any) => void,
  options: RealtimeHookOptions = {}
) {
  const { enabled = true, onConnectionChange } = options;
  const channelRef = useRef<any>(null);
  const onUpdateRef = useRef(onUpdate);
  const onConnectionRef = useRef(onConnectionChange);
  
  // Keep refs updated
  onUpdateRef.current = onUpdate;
  onConnectionRef.current = onConnectionChange;

  const cleanup = useCallback(() => {
    if (channelRef.current) {
      try {
        channelRef.current.unsubscribe();
        supabase.removeChannel(channelRef.current);
      } catch (error) {
        console.warn('Error cleaning up channel:', error);
      }
      channelRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!enabled || !vetoSessionId) {
      cleanup();
      return;
    }

    onConnectionRef.current?.("connecting");

    // Create unique channel name to prevent conflicts
    const channelName = `veto-actions-${vetoSessionId}-${Date.now()}`;
    const channel = supabase.channel(channelName);

    // Set up postgres changes listener
    channel.on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "map_veto_actions",
        filter: `veto_session_id=eq.${vetoSessionId}`,
      },
      (payload) => {
        console.log('Veto action real-time update:', payload);
        onUpdateRef.current?.(payload);
      }
    );

    // Subscribe and handle connection status
    channel.subscribe((status) => {
      console.log('Veto actions subscription status:', status);
      switch (status) {
        case "SUBSCRIBED":
          onConnectionRef.current?.("online");
          break;
        case "CHANNEL_ERROR":
        case "TIMED_OUT":
        case "CLOSED":
          onConnectionRef.current?.("error");
          break;
      }
    });

    channelRef.current = channel;

    return cleanup;
  }, [vetoSessionId, enabled, cleanup]);

  return cleanup;
}

/**
 * Clean and robust real-time subscription for map veto sessions
 */
export function useMapVetoSessionRealtime(
  vetoSessionId: string | null,
  onUpdate: (payload: any) => void,
  options: RealtimeHookOptions = {}
) {
  const { enabled = true, onConnectionChange } = options;
  const channelRef = useRef<any>(null);
  const onUpdateRef = useRef(onUpdate);
  const onConnectionRef = useRef(onConnectionChange);
  
  // Keep refs updated
  onUpdateRef.current = onUpdate;
  onConnectionRef.current = onConnectionChange;

  const cleanup = useCallback(() => {
    if (channelRef.current) {
      try {
        channelRef.current.unsubscribe();
        supabase.removeChannel(channelRef.current);
      } catch (error) {
        console.warn('Error cleaning up channel:', error);
      }
      channelRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!enabled || !vetoSessionId) {
      cleanup();
      return;
    }

    onConnectionRef.current?.("connecting");

    // Create unique channel name to prevent conflicts
    const channelName = `veto-session-${vetoSessionId}-${Date.now()}`;
    const channel = supabase.channel(channelName);

    // Set up postgres changes listener
    channel.on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "map_veto_sessions",
        filter: `id=eq.${vetoSessionId}`,
      },
      (payload) => {
        console.log('Veto session real-time update:', payload);
        onUpdateRef.current?.(payload);
      }
    );

    // Subscribe and handle connection status
    channel.subscribe((status) => {
      console.log('Veto session subscription status:', status);
      switch (status) {
        case "SUBSCRIBED":
          onConnectionRef.current?.("online");
          break;
        case "CHANNEL_ERROR":
        case "TIMED_OUT":
        case "CLOSED":
          onConnectionRef.current?.("error");
          break;
      }
    });

    channelRef.current = channel;

    return cleanup;
  }, [vetoSessionId, enabled, cleanup]);

  return cleanup;
}
