import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

// Utility to safely unsubscribe and remove a channel (dedup-aware)
const globalChannelRegistry = new Map<string, any>();

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
    // Remove from registry
    if (channelRef.current._name) {
      globalChannelRegistry.delete(channelRef.current._name);
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
    // Always cleanup first!
    cleanupChannel(channelRef);

    if (!vetoSessionId) return;

    const channelName = `map-veto-actions-${vetoSessionId}`;
    // Deduplication: if already exists, re-use
    if (globalChannelRegistry.has(channelName)) {
      channelRef.current = globalChannelRegistry.get(channelName);
      return () => cleanupChannel(channelRef);
    }
    const channel = supabase.channel(channelName);

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

    channel.subscribe((status) => {
      if (status === "SUBSCRIBED") {
        console.log(`[MapVetoRealtime] Subscribed to ${channelName}`);
      }
    });

    channelRef.current = channel;
    channel._name = channelName; // for registry
    globalChannelRegistry.set(channelName, channel);

    // Cleanup on id change/unmount
    return () => {
      cleanupChannel(channelRef);
    };
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
    // Deduplication: if already exists, re-use
    if (globalChannelRegistry.has(channelName)) {
      channelRef.current = globalChannelRegistry.get(channelName);
      return () => cleanupChannel(channelRef);
    }
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
      if (status === "SUBSCRIBED") {
        console.log(`[MapVetoRealtime] Subscribed to ${channelName}`);
      }
    });

    channelRef.current = channel;
    channel._name = channelName; // for registry
    globalChannelRegistry.set(channelName, channel);

    // Cleanup on id change / unmount
    return () => {
      cleanupChannel(channelRef);
    };
  }, [vetoSessionId]);
}
