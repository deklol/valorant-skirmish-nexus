
import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

// Utility to safely unsubscribe and remove a channel, basic version with no registry to avoid recursion
function cleanupChannel(channelRef: React.MutableRefObject<any>) {
  if (!channelRef.current) return;
  try {
    channelRef.current.unsubscribe();
  } catch (e) {
    // swallow errors
  }
  try {
    supabase.removeChannel(channelRef.current);
  } catch (e) {
    // swallow errors
  }
  channelRef.current = null;
}

// Simple subscription logic; do not attempt auto-retries to avoid runaway recursion
type Callback = (payload: any) => void;
type ConnectionCallback = (state: "connecting" | "online" | "offline" | "error") => void;

export function useMapVetoActionsRealtime(
  vetoSessionId: string | null,
  callback: Callback,
  onConnectionChange?: ConnectionCallback
) {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;
  const channelRef = useRef<any>(null);

  useEffect(() => {
    cleanupChannel(channelRef);
    if (!vetoSessionId) return;
    let isMounted = true;

    onConnectionChange?.("connecting");
    const channelName = `map-veto-actions-${vetoSessionId}`;
    const channel = supabase.channel(channelName);

    const handleChange = (payload: any) => {
      if (callbackRef.current) callbackRef.current(payload);
    };

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

export function useMapVetoSessionRealtime(
  vetoSessionId: string | null,
  callback: Callback,
  onConnectionChange?: ConnectionCallback
) {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;
  const channelRef = useRef<any>(null);

  useEffect(() => {
    cleanupChannel(channelRef);
    if (!vetoSessionId) return;
    let isMounted = true;

    onConnectionChange?.("connecting");
    const channelName = `map-veto-session-${vetoSessionId}`;
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
