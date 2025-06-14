
import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

type Callback = (payload: any) => void;

export function useMapVetoActionsRealtime(
  vetoSessionId: string | null,
  callback: Callback
) {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  useEffect(() => {
    if (!vetoSessionId) return;
    const channel = supabase
      .channel(`map-veto-actions-${vetoSessionId}`)
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
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vetoSessionId]);
}

export function useMapVetoSessionRealtime(
  vetoSessionId: string | null,
  callback: Callback
) {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  useEffect(() => {
    if (!vetoSessionId) return;
    const channel = supabase
      .channel(`map-veto-session-${vetoSessionId}`)
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
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vetoSessionId]);
}
