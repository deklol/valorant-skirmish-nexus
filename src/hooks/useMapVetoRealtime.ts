
import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Cleanly remove and unsubscribe a Supabase channel.
 */
function cleanupChannel(channelRef: React.MutableRefObject<any>) {
  if (channelRef.current) {
    try {
      channelRef.current.unsubscribe();
    } catch {}
    try {
      supabase.removeChannel(channelRef.current);
    } catch {}
    channelRef.current = null;
  }
}

/**
 * Real-time subscription hook for map_veto_actions.
 */
export function useMapVetoActionsRealtime(
  vetoSessionId: string | null,
  callback: (payload: any) => void,
  onConnectionChange?: (state: "connecting" | "online" | "offline" | "error") => void
) {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;
  const channelRef = useRef<any>(null);

  useEffect(() => {
    // Always cleanup channel before creating new one
    cleanupChannel(channelRef);
    if (!vetoSessionId) return;

    let isMounted = true;
    onConnectionChange?.("connecting");

    // Channel name must be unique per session
    const channelName = `map-veto-actions-${vetoSessionId}-${Math.random().toString(36).slice(2, 10)}`;
    const channel = supabase.channel(channelName);

    const handleChange = (payload: any) => {
      if (callbackRef.current) callbackRef.current(payload);
    };

    // Setup subscription handlers
    channel.on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "map_veto_actions",
        filter: `veto_session_id=eq.${vetoSessionId}`,
      },
      handleChange
    );

    // Subscribe: only run once!
    let subscribed = false;
    channel.subscribe((status) => {
      if (!isMounted) return;
      if (status === "SUBSCRIBED") {
        onConnectionChange?.("online");
      }
      // Failures
      if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
        onConnectionChange?.("error");
      }
      subscribed = true;
    });

    channelRef.current = channel;

    return () => {
      isMounted = false;
      cleanupChannel(channelRef);
    };
  }, [vetoSessionId, onConnectionChange]);
}

/**
 * Real-time subscription hook for map_veto_sessions.
 */
export function useMapVetoSessionRealtime(
  vetoSessionId: string | null,
  callback: (payload: any) => void,
  onConnectionChange?: (state: "connecting" | "online" | "offline" | "error") => void
) {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;
  const channelRef = useRef<any>(null);

  useEffect(() => {
    cleanupChannel(channelRef);
    if (!vetoSessionId) return;
    let isMounted = true;
    onConnectionChange?.("connecting");
    // Make channel name unique to avoid cache
    const channelName = `map-veto-session-${vetoSessionId}-${Math.random().toString(36).slice(2, 10)}`;
    const channel = supabase.channel(channelName);

    channel.on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "map_veto_sessions",
        filter: `id=eq.${vetoSessionId}`,
      },
      (payload) => {
        if (callbackRef.current) callbackRef.current(payload);
      }
    );

    channel.subscribe((status) => {
      if (!isMounted) return;
      if (status === "SUBSCRIBED") onConnectionChange?.("online");
      if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
        onConnectionChange?.("error");
      }
    });

    channelRef.current = channel;
    return () => {
      isMounted = false;
      cleanupChannel(channelRef);
    };
  }, [vetoSessionId, onConnectionChange]);
}
