import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

// Utility to safely unsubscribe and remove a channel (dedup-aware)
function cleanupChannel(channelRef: React.MutableRefObject<any>) {
  if (channelRef.current) {
    try {
      channelRef.current.unsubscribe();
    } catch (e) {
      console.warn('[MapVetoRealtime] Unsubscribe error (cleanup):', e);
    }
    try {
      // Only remove if it is present
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    } catch (e) {
      console.warn('[MapVetoRealtime] Channel remove error (cleanup):', e);
    }
    channelRef.current = null;
  }
}

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

  useEffect(() => {
    cleanupChannel(channelRef);
    if (!vetoSessionId) return;

    let isMounted = true;
    let retryCount = 0;
    function subscribeWithBackoff() {
      if (!isMounted) return;
      onConnectionChange?.("connecting");

      const channelName = `map-veto-actions-${vetoSessionId}`;
      let disconnected = false;

      // Normal subscription/no registry
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
        if (status === "CLOSED") {
          disconnected = true;
          onConnectionChange?.("offline");
          cleanupChannel(channelRef);
          const nextDelay = getBackoffDelay(retryCount++);
          setTimeout(subscribeWithBackoff, nextDelay);
        }
      });

      channelRef.current = channel;
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
        if (status === "CLOSED") {
          disconnected = true;
          onConnectionChange?.("offline");
          cleanupChannel(channelRef);
          const nextDelay = getBackoffDelay(retryCount++);
          setTimeout(subscribeWithBackoff, nextDelay);
        }
      });

      channelRef.current = channel;
    }

    subscribeWithBackoff();

    return () => {
      isMounted = false;
      cleanupChannel(channelRef);
    };
  }, [vetoSessionId, onConnectionChange]);
}
