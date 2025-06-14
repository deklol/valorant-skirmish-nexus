import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

type Callback = (payload: any) => void;

export function useMapVetoActionsRealtime(
  vetoSessionId: string | null,
  callback: Callback
) {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;
  const channelRef = useRef<any>(null);

  useEffect(() => {
    if (!vetoSessionId) {
      // Clean up any previous channel
      if (channelRef.current) {
        try {
          channelRef.current.unsubscribe();
        } catch {}
        try {
          supabase.removeChannel(channelRef.current);
        } catch {}
        channelRef.current = null;
      }
      return;
    }

    // Clean up existing channel BEFORE subscribing again
    if (channelRef.current) {
      try {
        channelRef.current.unsubscribe();
      } catch (e) {
        console.warn('[MapVetoRealtime] Unsubscribe error:', e);
      }
      try {
        supabase.removeChannel(channelRef.current);
      } catch (e) {
        console.warn('[MapVetoRealtime] Channel remove error:', e);
      }
    }

    // Use a unique channel name per session
    const channelName = `map-veto-actions-${vetoSessionId}`;
    const channel = supabase
      .channel(channelName)
      .on(
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
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          console.log(`[MapVetoRealtime] Subscribed to ${channelName}`);
        }
      });

    channelRef.current = channel;

    return () => {
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
    };
    // Only re-create the channel when vetoSessionId changes
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
    if (!vetoSessionId) {
      if (channelRef.current) {
        try {
          channelRef.current.unsubscribe();
        } catch {}
        try {
          supabase.removeChannel(channelRef.current);
        } catch {}
        channelRef.current = null;
      }
      return;
    }

    if (channelRef.current) {
      try {
        channelRef.current.unsubscribe();
      } catch (e) {
        console.warn('[MapVetoRealtime] Unsubscribe error:', e);
      }
      try {
        supabase.removeChannel(channelRef.current);
      } catch (e) {
        console.warn('[MapVetoRealtime] Channel remove error:', e);
      }
    }

    const channelName = `map-veto-session-${vetoSessionId}`;
    const channel = supabase
      .channel(channelName)
      .on(
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
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          console.log(`[MapVetoRealtime] Subscribed to ${channelName}`);
        }
      });

    channelRef.current = channel;

    return () => {
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
    };
    // Only re-create the channel when vetoSessionId changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vetoSessionId]);
}
