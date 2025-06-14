
// Refactored MapVetoDialog: Composes history, status, maps, instructions!
import React, { useCallback, useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useMapVetoActionsRealtime } from "@/hooks/useMapVetoRealtime";
import MapVetoTurnStatus from "./MapVetoTurnStatus";
import MapVetoMapGrid from "./MapVetoMapGrid";
import MapVetoHistory from "./MapVetoHistory";
import MapVetoInstructions from "./MapVetoInstructions";
import { MapData, VetoAction, MapStatus } from "./types";

interface MapVetoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  matchId: string;
  vetoSessionId: string;
  team1Name: string;
  team2Name: string;
  currentTeamTurn: string;
  userTeamId: string | null;
  isUserCaptain?: boolean;
  teamSize?: number | null;
  team1Id: string | null;
  team2Id: string | null;
  bestOf?: number;
}

const MapVetoDialog = ({
  open,
  onOpenChange,
  matchId,
  vetoSessionId,
  team1Name,
  team2Name,
  currentTeamTurn,
  userTeamId,
  isUserCaptain = false,
  teamSize = null,
  team1Id,
  team2Id,
  bestOf = 1,
}: MapVetoDialogProps) => {
  const [maps, setMaps] = useState<MapData[]>([]);
  const [vetoActions, setVetoActions] = useState<VetoAction[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  // Actions subscription/fetch only!
  const fetchVetoActions = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("map_veto_actions")
        .select(
          "*,maps:map_id (*),users:performed_by (discord_username)"
        )
        .eq("veto_session_id", vetoSessionId)
        .order("order_number");
      if (error) throw error;
      setVetoActions(data || []);
    } catch {}
  }, [vetoSessionId]);

  useMapVetoActionsRealtime(vetoSessionId, fetchVetoActions);

  useEffect(() => {
    if (open) {
      fetchMaps();
      fetchVetoActions();
    }
    // eslint-disable-next-line
  }, [open, vetoSessionId, fetchVetoActions]);

  const fetchMaps = async () => {
    try {
      const { data, error } = await supabase
        .from("maps")
        .select("*")
        .eq("is_active", true)
        .order("name");

      if (error) throw error;
      setMaps(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to load maps",
        variant: "destructive",
      });
    }
  };

  const totalBansNeeded = maps.length - (bestOf === 1 ? 1 : bestOf);
  const remainingMaps = maps.filter(
    (map) => !vetoActions.some((action) => action.map_id === map.id)
  );

  let currentAction: "ban" | "pick" = "ban";
  if (bestOf === 1) {
    // Only bans, then auto-pick the last
    if (remainingMaps.length === 1 && vetoActions.length >= totalBansNeeded) {
      currentAction = "pick";
    }
  } else {
    currentAction = vetoActions.length % 2 === 0 ? "ban" : "pick";
  }

  const handleMapAction = async (mapId: string) => {
    if (!userTeamId || userTeamId !== currentTeamTurn || !canAct) {
      toast({
        title: "Not Your Turn",
        description: "Wait for your turn to make a selection",
        variant: "destructive",
      });
      return;
    }
    setLoading(true);
    try {
      const { data: authUser } = await supabase.auth.getUser();
      const performedById = authUser?.user?.id ?? null;
      let actionType: "ban" | "pick" = currentAction;
      if (bestOf === 1 && remainingMaps.length === 1) actionType = "pick";

      const { error } = await supabase.from("map_veto_actions").insert({
        veto_session_id: vetoSessionId,
        team_id: userTeamId,
        map_id: mapId,
        action: actionType,
        order_number: vetoActions.length + 1,
        performed_by: performedById,
      });
      if (error) throw error;
      toast({
        title: `Map ${actionType === "ban" ? "Banned" : "Picked"}`,
        description: `Successfully ${actionType === "ban" ? "banned" : "picked"} the map`,
      });

      if (bestOf === 1 && actionType === "pick") {
        await supabase
          .from("map_veto_sessions")
          .update({
            status: "completed",
            completed_at: new Date().toISOString(),
          })
          .eq("id", vetoSessionId);

        toast({
          title: "Map Veto Completed",
          description: `Map selected!`,
        });
      } else if (bestOf !== 1 && vetoActions.length + 1 >= maps.length) {
        await supabase
          .from("map_veto_sessions")
          .update({
            status: "completed",
            completed_at: new Date().toISOString(),
          })
          .eq("id", vetoSessionId);

        toast({
          title: "Map Veto Completed",
          description: "All veto actions are finished. Match is ready.",
        });
      } else {
        if (team1Id && team2Id) {
          const nextTurnId = userTeamId === team1Id ? team2Id : team1Id;
          await supabase
            .from("map_veto_sessions")
            .update({
              current_turn_team_id: nextTurnId,
            })
            .eq("id", vetoSessionId);
        }
      }

      await fetchVetoActions();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to perform action",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getMapStatus = (mapId: string): MapStatus => {
    const action = vetoActions.find((action) => action.map_id === mapId);
    if (!action) return null;
    return {
      action: action.action,
      team: action.team_id === currentTeamTurn ? "Your Team" : "Opponent",
    };
  };

  const isMapAvailable = (mapId: string) =>
    !vetoActions.some((action) => action.map_id === mapId);

  const isUserTurn = userTeamId === currentTeamTurn;
  const canAct =
    isUserTurn &&
    ((teamSize === 1) ||
      (teamSize && teamSize > 1 && isUserCaptain));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-slate-900 border-slate-700 text-white">
        <DialogHeader>
          <DialogTitle className="text-white">
            Map Veto - {team1Name} vs {team2Name}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-6">
          {/* Turn/Phase */}
          <MapVetoTurnStatus
            canAct={canAct}
            isUserTurn={isUserTurn}
            teamSize={teamSize}
            isUserCaptain={isUserCaptain!}
            currentAction={currentAction}
          />

          {/* Veto History */}
          <MapVetoHistory vetoActions={vetoActions} />

          {/* Map Grid */}
          <MapVetoMapGrid
            maps={maps}
            canAct={canAct}
            currentAction={currentAction}
            bestOf={bestOf}
            remainingMaps={remainingMaps}
            vetoActions={vetoActions}
            onMapAction={handleMapAction}
            currentTeamTurn={currentTeamTurn}
            getMapStatus={getMapStatus}
            isMapAvailable={isMapAvailable}
          />

          {/* Instructions */}
          <MapVetoInstructions />
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default MapVetoDialog;
