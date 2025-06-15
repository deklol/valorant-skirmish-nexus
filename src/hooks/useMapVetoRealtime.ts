import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

// Utility to safely unsubscribe and remove a channel (dedup-aware)
const globalChannelRegistry = new Map<string, any>();

/**
 * Use a unique property name for dedup/cleanup registry.
 * We do NOT use any private property from the Supabase client.
 */
type RegistryChannel = {
  __customRegistryKey?: string;
};

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
    // Remove from registry using our custom property
    const regChannel = channelRef.current as RegistryChannel;
    if (regChannel.__customRegistryKey) {
      globalChannelRegistry.delete(regChannel.__customRegistryKey);
    }
    channelRef.current = null;
  }
}

// ------- Realtime connection/sync/auto-resubscribe hooks with backoff/connect-state -------

// Exponential backoff utility
function getBackoffDelay(attempt: number, base: number = 500, max: number = 15000) {
  return Math.min(base * Math.pow(2, attempt), max);
}

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
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    // Always cleanup!
    cleanupChannel(channelRef);
    if (!vetoSessionId) return;

    let isMounted = true;
    let retryCount = 0;
    function subscribeWithBackoff() {
      if (!isMounted) return;
      onConnectionChange?.("connecting");

      const channelName = `map-veto-actions-${vetoSessionId}`;
      let disconnected = false;
      // Deduplication remains the same
      if (globalChannelRegistry.has(channelName)) {
        channelRef.current = globalChannelRegistry.get(channelName);
        onConnectionChange?.("online");
        return;
      }
      const channel = supabase.channel(channelName);
      (channel as RegistryChannel).__customRegistryKey = channelName;

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
      // Reconnection/error handlers
      channel.subscribe((status) => {
        if (status === "SUBSCRIBED") {
          retryCount = 0;
          onConnectionChange?.("online");
        }
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          onConnectionChange?.("error");
          // Cleanup, backoff and re-subscribe
          disconnected = true;
          cleanupChannel(channelRef);
          const nextDelay = getBackoffDelay(retryCount++);
          setTimeout(subscribeWithBackoff, nextDelay);
        }
      });

      channel.on("close", {}, () => {
        disconnected = true;
        onConnectionChange?.("offline");
        cleanupChannel(channelRef);
        const nextDelay = getBackoffDelay(retryCount++);
        setTimeout(subscribeWithBackoff, nextDelay);
      });

      channelRef.current = channel;
      globalChannelRegistry.set(channelName, channel);
    }

    subscribeWithBackoff();

    // Cleanup on id change/unmount
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
    let retryCount = 0;
    function subscribeWithBackoff() {
      if (!isMounted) return;
      onConnectionChange?.("connecting");

      const channelName = `map-veto-session-${vetoSessionId}`;
      let disconnected = false;
      if (globalChannelRegistry.has(channelName)) {
        channelRef.current = globalChannelRegistry.get(channelName);
        onConnectionChange?.("online");
        return;
      }
      const channel = supabase.channel(channelName);
      (channel as RegistryChannel).__customRegistryKey = channelName;

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
          retryCount = 0;
          onConnectionChange?.("online");
        }
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          onConnectionChange?.("error");
          disconnected = true;
          cleanupChannel(channelRef);
          const nextDelay = getBackoffDelay(retryCount++);
          setTimeout(subscribeWithBackoff, nextDelay);
        }
      });
      channel.on("close", {}, () => {
        disconnected = true;
        onConnectionChange?.("offline");
        cleanupChannel(channelRef);
        const nextDelay = getBackoffDelay(retryCount++);
        setTimeout(subscribeWithBackoff, nextDelay);
      });

      channelRef.current = channel;
      globalChannelRegistry.set(channelName, channel);
    }

    subscribeWithBackoff();

    return () => {
      isMounted = false;
      cleanupChannel(channelRef);
    };
  }, [vetoSessionId, onConnectionChange]);
}
