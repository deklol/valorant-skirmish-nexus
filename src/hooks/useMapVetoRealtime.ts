
import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

type Callback = (payload: any) => void;

export function useMapVetoActionsRealtime(vetoSessionId: string | null, callback: Callback) {
  useEffect(() => {
    if (!vetoSessionId) return;
    const channel = supabase.channel(`map-veto-actions-${vetoSessionId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "map_veto_actions",
          filter: `veto_session_id=eq.${vetoSessionId}`,
        },
        callback
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [vetoSessionId, callback]);
}

export function useMapVetoSessionRealtime(vetoSessionId: string | null, callback: Callback) {
  useEffect(() => {
    if (!vetoSessionId) return;
    const channel = supabase.channel(`map-veto-session-${vetoSessionId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "map_veto_sessions",
          filter: `id=eq.${vetoSessionId}`,
        },
        callback
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [vetoSessionId, callback]);
}
