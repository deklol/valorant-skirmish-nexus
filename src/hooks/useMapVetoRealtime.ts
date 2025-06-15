
import { useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

type ConnectionState = "connecting" | "online" | "offline" | "error" | "closed";

interface RealtimeHookOptions {
  enabled?: boolean;
  onConnectionChange?: (state: ConnectionState) => void;
}

function useSingleSubscription(
  channelKey: string,
  getChannel: () => any,
  onUpdate: (payload: any) => void,
  onConnectionChange?: (state: ConnectionState) => void
) {
  const channelRef = useRef<any>(null);
  const onUpdateRef = useRef(onUpdate);
  const onConnectionRef = useRef(onConnectionChange);

  onUpdateRef.current = onUpdate;
  onConnectionRef.current = onConnectionChange;

  useEffect(() => {
    let unsubscribed = false;

    if (channelRef.current) {
      try {
        channelRef.current.unsubscribe();
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      } catch (e) {}
    }

    onConnectionRef.current?.("connecting");
    const channel = getChannel();

    channel.on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: channelKey.includes("actions") ? "map_veto_actions" : "map_veto_sessions",
        filter: channelKey.split("-")[2],
      },
      (payload) => {
        if (unsubscribed) return;
        onUpdateRef.current?.(payload);
      }
    );
    channel.subscribe((status) => {
      if (status === "SUBSCRIBED") onConnectionRef.current?.("online");
      if (status === "CHANNEL_ERROR") onConnectionRef.current?.("error");
      if (status === "TIMED_OUT") onConnectionRef.current?.("offline");
      if (status === "CLOSED") onConnectionRef.current?.("closed");
    });
    channelRef.current = channel;

    return () => {
      unsubscribed = true;
      if (channelRef.current) {
        try {
          channelRef.current.unsubscribe();
          supabase.removeChannel(channelRef.current);
        } catch (e) {}
        channelRef.current = null;
      }
    };
  }, [channelKey]);

  return () => {
    if (channelRef.current) {
      try {
        channelRef.current.unsubscribe();
        supabase.removeChannel(channelRef.current);
      } catch (e) {}
      channelRef.current = null;
    }
  };
}

export function useMapVetoActionsRealtime(
  vetoSessionId: string | null,
  onUpdate: (payload: any) => void,
  options: RealtimeHookOptions = {}
) {
  const { enabled = true, onConnectionChange } = options;
  // Compose channel key to use as an effect dep
  const channelKey = vetoSessionId ? `veto-actions-${vetoSessionId}` : "";
  useSingleSubscription(
    channelKey,
    () =>
      supabase.channel(`${channelKey}-${Date.now()}`),
    onUpdate,
    onConnectionChange
  );
}

export function useMapVetoSessionRealtime(
  vetoSessionId: string | null,
  onUpdate: (payload: any) => void,
  options: RealtimeHookOptions = {}
) {
  const { enabled = true, onConnectionChange } = options;
  const channelKey = vetoSessionId ? `veto-session-${vetoSessionId}` : "";
  useSingleSubscription(
    channelKey,
    () => supabase.channel(`${channelKey}-${Date.now()}`),
    onUpdate,
    onConnectionChange
  );
}
