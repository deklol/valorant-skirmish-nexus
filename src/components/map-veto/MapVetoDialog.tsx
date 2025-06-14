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

  // --- Map veto logic for turn alternation and BO1 ---
  const totalBansNeeded = maps.length - (bestOf === 1 ? 1 : bestOf);
  const bansMade = vetoActions.filter(a => a.action === "ban").length;
  const remainingMaps = maps.filter(
    (map) => !vetoActions.some((action) => action.map_id === map.id)
  );
  const vetoComplete = (bestOf === 1)
    ? (remainingMaps.length === 1 && bansMade >= totalBansNeeded)
    : (vetoActions.length >= maps.length);

  // Turn alternation logic
  let currentAction: "ban" | "pick" = "ban";
  if (bestOf === 1) {
    // BO1: only ban actions until 1 left
    if (remainingMaps.length === 1 && bansMade >= totalBansNeeded) {
      currentAction = "pick";
    } else {
      currentAction = "ban";
    }
  } else {
    // Standard best-of: alternate ban/pick
    currentAction = vetoActions.length % 2 === 0 ? "ban" : "pick";
  }

  // Only teams alternate!
  const getNextTeamId = () => {
    if (!team1Id || !team2Id) return currentTeamTurn;
    return currentTeamTurn === team1Id ? team2Id : team1Id;
  };

  // --- Main veto action handler ---
  const handleMapAction = async (mapId: string) => {
    if (!userTeamId || userTeamId !== currentTeamTurn || !canAct) {
      toast({
        title: "Not Your Turn",
        description: "Wait for your turn to make a selection",
        variant: "destructive",
      });
      return;
    }
    if (!isMapAvailable(mapId) || vetoComplete) {
      // Should not be possible but defensive
      toast({
        title: "Invalid Veto Action",
        description: "You cannot ban or pick this map at this stage.",
        variant: "destructive",
      });
      return;
    }
    setLoading(true);
    try {
      const { data: authUser } = await supabase.auth.getUser();
      const performedById = authUser?.user?.id ?? null;

      // --- BO1 Logic: Stop when 1 left, auto-pick ---
      let actionType: "ban" | "pick" = currentAction;
      if (bestOf === 1 && remainingMaps.length === 1) {
        actionType = "pick";
      }

      // Defensive: Don't allow ban after veto complete
      if (bestOf === 1 && bansMade >= totalBansNeeded && remainingMaps.length <= 1) {
        toast({
          title: "Veto Complete",
          description: "All bans finished, the map is auto-picked.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      // 1. Insert veto action (ban or pick)
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

      // --- Completion logic ---
      // After this action: for BO1 if the last ban was made, auto-pick the last map
      let sessionComplete = false;
      if (bestOf === 1) {
        // After final ban, pick last map automatically
        const newVetoActions = [...vetoActions, { map_id: mapId, action: actionType, team_id: userTeamId }];
        const _remainingMaps = maps.filter(
          (map) => !newVetoActions.some((a: any) => a.map_id === map.id)
        );
        // Only one remaining, simulate auto-pick (if a pick entry for last map doesn't exist)
        if (_remainingMaps.length === 1 && actionType === "ban") {
          // Insert auto-pick
          await supabase.from("map_veto_actions").insert({
            veto_session_id: vetoSessionId,
            team_id: getNextTeamId(), // The other team "picks" by default
            map_id: _remainingMaps[0].id,
            action: "pick",
            order_number: vetoActions.length + 2,
            performed_by: null,
          });
          sessionComplete = true;
        } else if (actionType === "pick") {
          sessionComplete = true;
        }

        if (sessionComplete) {
          // Complete veto session
          await supabase
            .from("map_veto_sessions")
            .update({
              status: "completed",
              completed_at: new Date().toISOString(),
            })
            .eq("id", vetoSessionId);
          toast({
            title: "Map Veto Completed",
            description: "Map selected!",
          });
        } else {
          // Otherwise (not last), alternate turn
          await supabase
            .from("map_veto_sessions")
            .update({
              current_turn_team_id: getNextTeamId(),
            })
            .eq("id", vetoSessionId);
        }
      } else {
        // Standard: check for completion
        if (vetoActions.length + 1 >= maps.length) {
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
          // Alternate to next team
          await supabase
            .from("map_veto_sessions")
            .update({
              current_turn_team_id: getNextTeamId(),
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

  // --- status helpers ---
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
            canAct={canAct && !vetoComplete}
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
            canAct={canAct && !vetoComplete}
            currentAction={currentAction}
            bestOf={bestOf}
            remainingMaps={remainingMaps}
            vetoActions={vetoActions}
            onMapAction={handleMapAction}
            currentTeamTurn={currentTeamTurn}
            getMapStatus={getMapStatus}
            isMapAvailable={(id) => isMapAvailable(id) && !vetoComplete}
          />

          {/* Instructions */}
          <MapVetoInstructions />
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default MapVetoDialog;
