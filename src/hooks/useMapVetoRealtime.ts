
import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

// Utility to safely unsubscribe and remove a channel
function cleanupChannel(channelRef: React.MutableRefObject<any>) {
  if (channelRef.current) {
    try {
      channelRef.current.unsubscribe();
    } catch (e) {
      console.warn('[MapVetoRealtime] Unsubscribe error (cleanup):', e);
    }
    try {
      supabase.removeChannel(channelRef.current);
    } catch (e) {
      console.warn('[MapVetoRealtime] Channel remove error (cleanup):', e);
    }
    channelRef.current = null;
  }
}

type Callback = (payload: any) => void;

export function useMapVetoActionsRealtime(
  vetoSessionId: string | null,
  callback: Callback
) {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;
  const channelRef = useRef<any>(null);

  useEffect(() => {
    // On id change or unmount: always cleanup first!
    cleanupChannel(channelRef);

    if (!vetoSessionId) return;

    const channelName = `map-veto-actions-${vetoSessionId}`;
    const channel = supabase
      .channel(channelName);

    // Listen for inserts/updates on the actions table
    channel.on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "map_veto_actions",
        filter: `veto_session_id=eq.${vetoSessionId}`,
      },
      (payload) => {
        if (callbackRef.current) callbackRef.current(payload);
      }
    );

    // Only subscribe ONCE per instance
    channel.subscribe((status) => {
      if (status === "SUBSCRIBED") {
        console.log(`[MapVetoRealtime] Subscribed to ${channelName}`);
      }
    });

    channelRef.current = channel;

    // Cleanup on id change or unmount
    return () => {
      cleanupChannel(channelRef);
    };
    // Only re-run when session ID changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vetoSessionId]);
}


export function useMapVetoSessionRealtime(
  vetoSessionId: string | null,
  callback: Callback
) {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;
  const channelRef = useRef<any>(null);

  useEffect(() => {
    // Always cleanup existing channel first
    cleanupChannel(channelRef);

    if (!vetoSessionId) return;

    const channelName = `map-veto-session-${vetoSessionId}`;
    const channel = supabase
      .channel(channelName);

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

    // Only subscribe once!
    channel.subscribe((status) => {
      if (status === "SUBSCRIBED") {
        console.log(`[MapVetoRealtime] Subscribed to ${channelName}`);
      }
    });

    channelRef.current = channel;

    // Cleanup on id change / unmount
    return () => {
      cleanupChannel(channelRef);
    };
    // Only re-run when session id changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vetoSessionId]);
}
