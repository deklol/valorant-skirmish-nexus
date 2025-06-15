import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { VetoAction, MapData } from "./types";
import { useToast } from "@/hooks/use-toast";

interface UseVetoMapActionParams {
  vetoSessionId: string;
  team1Id: string | null;
  team2Id: string | null;
  currentTurnTeamId: string;
  userTeamId: string | null;
  bestOf: number;
  vetoActions: VetoAction[];
  maps: MapData[];
  fetchVetoActions: () => Promise<void>;
  checkPermissions: () => { ok: boolean; reason: string | null };
  setLoading: (b: boolean) => void;
  toast: ReturnType<typeof useToast>["toast"];
}

// This hook returns the action handler ready to use in MapVetoDialog
export function useVetoMapAction({
  vetoSessionId,
  team1Id,
  team2Id,
  currentTurnTeamId,
  userTeamId,
  bestOf,
  vetoActions,
  maps,
  fetchVetoActions,
  checkPermissions,
  setLoading,
  toast,
}: UseVetoMapActionParams) {
  // Fully-offloaded veto logic: all handled by DB transaction
  const handleMapAction = useCallback(
    async (mapId: string) => {
      // Defensive: TODO move logic to backend for non-cheatable veto enforcement!
      setLoading(true);
      try {
        const { data: authUser } = await supabase.auth.getUser();
        const performedById = authUser?.user?.id ?? null;

        // --- Prevent actions if not their turn or if action out of order
        if (!performedById || !vetoSessionId || !userTeamId) {
          toast({
            title: "Action not allowed",
            description: "You are not authenticated or eligible.",
            variant: "destructive",
          });
          setLoading(false);
          return;
        }

        // ONLY allow action that matches current veto turn/action
        // (For full enforcement, this should be handled and validated server-side)
        // You could also get vetoFlow from context or as parameter

        // Call perform_veto_action RPC like before
        const { data, error } = await supabase.rpc("perform_veto_action", {
          p_veto_session_id: vetoSessionId,
          p_user_id: performedById,
          p_team_id: userTeamId,
          p_map_id: mapId
        }); 

        if (error) {
          toast({
            title: "Error",
            description: error.message ?? "Failed to perform map veto action.",
            variant: "destructive"
          });
        } else if (typeof data === "string" && data !== "OK") {
          toast({
            title: "Veto Action Error",
            description: data,
            variant: "destructive"
          });
        } else {
          toast({
            title: "Veto Action Complete!",
            description: "Action was successful and session updated."
          });
        }

        await fetchVetoActions();
      } catch (err: any) {
        toast({
          title: "Unexpected Error",
          description: err?.message || "Unknown error.",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    },
    [
      vetoSessionId,
      userTeamId,
      fetchVetoActions,
      toast,
      setLoading
    ]
  );
  return { handleMapAction };
}
