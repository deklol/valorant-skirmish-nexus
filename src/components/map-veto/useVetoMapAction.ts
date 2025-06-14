
import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { VetoAction, MapData } from "./types";
import { useToast } from "@/hooks/use-toast";
import { getNextTeamId, isMapAvailable, getRemainingMaps } from "./mapVetoUtils";

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
  // --- MAIN ACTION HANDLER W/ ENHANCED DB ERROR HANDLING & LOGGING ----
  const handleMapAction = useCallback(
    async (mapId: string) => {
      // Permission checks
      const perms = checkPermissions();
      if (!perms.ok) {
        toast({
          title: "Action Not Permitted",
          description: perms.reason,
          variant: "destructive",
        });
        return;
      }
      if (!isMapAvailable(mapId, vetoActions)) {
        toast({
          title: "Invalid Action",
          description: "Cannot act on this map at this stage.",
          variant: "destructive",
        });
        return;
      }
      setLoading(true);
      try {
        const { data: authUser } = await supabase.auth.getUser();
        const performedById = authUser?.user?.id ?? null;
        let bansMade = vetoActions.filter((a) => a.action === "ban").length;
        const totalBansNeeded = maps.length - 1;
        const remainingMaps = getRemainingMaps(maps, vetoActions);
        const vetoComplete =
          bestOf === 1
            ? bansMade === totalBansNeeded && remainingMaps.length === 1
            : vetoActions.length >= maps.length;

        let actionType: "ban" | "pick" = bestOf === 1 && vetoComplete
          ? "pick"
          : vetoActions.length % 2 === 0 || bestOf === 1
          ? "ban"
          : "pick";

        // Insert action
        const { error: insertError, data: insertedAction } =
          await supabase.from("map_veto_actions").insert({
            veto_session_id: vetoSessionId,
            team_id: userTeamId,
            map_id: mapId,
            action: actionType,
            order_number: vetoActions.length + 1,
            performed_by: performedById,
          }).select().maybeSingle();

        if (insertError || !insertedAction) {
          throw new Error(insertError?.message || "Failed to insert action");
        }
        await fetchVetoActions();

        // Special handling for BO1 completion
        if (bestOf === 1) {
          const postBanActions = [...vetoActions, insertedAction];
          const postBanBans = postBanActions.filter(a => a.action === "ban").length;
          const postBanRemainingMaps = getRemainingMaps(maps, postBanActions);
          if (
            postBanBans === totalBansNeeded &&
            postBanRemainingMaps.length === 1
          ) {
            // Auto-pick for other team
            const finalTeam = getNextTeamId(currentTurnTeamId, team1Id, team2Id);
            const finalMapId = postBanRemainingMaps[0].id;
            const { error: autoPickError, data: autoPick } = await supabase.from("map_veto_actions").insert({
              veto_session_id: vetoSessionId,
              team_id: finalTeam,
              map_id: finalMapId,
              action: "pick",
              order_number: vetoActions.length + 2,
              performed_by: null,
            }).select().maybeSingle();
            if (autoPickError || !autoPick) {
              toast({
                title: "Veto Completion Error",
                description: "Auto-pick of final map failed. Please contact admin.",
                variant: "destructive"
              });
              setLoading(false);
              return;
            }
            // Update session in DB
            const { error: compError } = await supabase
              .from("map_veto_sessions")
              .update({
                status: "completed",
                completed_at: new Date().toISOString(),
              })
              .eq("id", vetoSessionId);
            if (compError) {
              toast({
                title: "Veto Complete, but Error",
                description: "Map auto-picked, but veto session did not complete. Contact admin.",
                variant: "destructive"
              });
              setLoading(false);
              return;
            }
            toast({
              title: "Veto Completed!",
              description: "Last map auto-picked!",
            });
          } else {
            // Switch turn (since ban was made but not final ban)
            const { error: turnSwitchError } = await supabase
              .from("map_veto_sessions")
              .update({
                current_turn_team_id: getNextTeamId(currentTurnTeamId, team1Id, team2Id),
              })
              .eq("id", vetoSessionId);
            if (turnSwitchError) {
              toast({
                title: "Turn Switch Error",
                description: "Could not switch turn after ban.",
                variant: "destructive"
              });
              setLoading(false);
              return;
            }
          }
        } else {
          // Standard veto: is now completed?
          if (vetoActions.length + 1 >= maps.length) {
            // Complete session
            const { error: compError } = await supabase
              .from("map_veto_sessions")
              .update({
                status: "completed",
                completed_at: new Date().toISOString(),
              })
              .eq("id", vetoSessionId);
            if (compError) {
              toast({
                title: "Veto Completion Error",
                description: "Could not mark session as completed.",
                variant: "destructive"
              });
              setLoading(false);
              return;
            }
            toast({
              title: "Map Veto Completed",
              description: "All actions finished!",
            });
          } else {
            // Switch turn
            const { error: turnSwitchError } = await supabase
              .from("map_veto_sessions")
              .update({
                current_turn_team_id: getNextTeamId(currentTurnTeamId, team1Id, team2Id),
              })
              .eq("id", vetoSessionId);
            if (turnSwitchError) {
              toast({
                title: "Turn Switch Error",
                description: "Could not switch turn.",
                variant: "destructive"
              });
              setLoading(false);
              return;
            }
          }
        }
        await fetchVetoActions();
      } catch (error: any) {
        toast({
          title: "Error",
          description: error.message || "Failed to perform map action",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    },
    [
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
    ]
  );
  return { handleMapAction };
}
