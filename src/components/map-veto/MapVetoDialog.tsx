// Refactored MapVetoDialog: Composes history, status, maps, instructions!
import React, { useCallback, useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useMapVetoActionsRealtime, useMapVetoSessionRealtime } from "@/hooks/useMapVetoRealtime";
import MapVetoTurnStatus from "./MapVetoTurnStatus";
import MapVetoMapGrid from "./MapVetoMapGrid";
import MapVetoHistory from "./MapVetoHistory";
import MapVetoInstructions from "./MapVetoInstructions";
import { MapData, VetoAction } from "./types";
import { useVetoPermissions } from "./useVetoPermissions";
import { useVetoMapAction } from "./useVetoMapAction";
import { isMapAvailable, getRemainingMaps } from "./mapVetoUtils";

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

  // Always trust backend for turn
  const [currentTurnTeamId, setCurrentTurnTeamId] = useState<string>(currentTeamTurn);

  // New: Force a counter to trigger hook recalculation after RT update
  const [permissionUpdateSeq, setPermissionUpdateSeq] = useState<number>(0);

  useMapVetoSessionRealtime(
    vetoSessionId,
    payload => {
      // Real-time DB update: turn just changed!
      if (payload && payload.new && payload.new.current_turn_team_id) {
        setCurrentTurnTeamId(payload.new.current_turn_team_id);
        setPermissionUpdateSeq(seq => seq + 1);
        console.log("[MapVetoDialog][REALTIME] RT session update: turn NOW is", payload.new.current_turn_team_id, "(perms seq)", permissionUpdateSeq + 1);
      }
    }
  );

  useEffect(() => {
    if (currentTeamTurn) {
      setCurrentTurnTeamId(currentTeamTurn);
      setPermissionUpdateSeq(seq => seq + 1);
      console.log("[MapVetoDialog][Init] Set turnTeam on dialog open/init", currentTeamTurn, "(perms seq)", permissionUpdateSeq + 1);
    }
  }, [currentTeamTurn, vetoSessionId]);

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

  // Permissions logic via custom hook (pass seq)
  const {
    isUserOnMatchTeam,
    isUserTeamTurn,
    isUserEligible,
    explainPermissions,
  } = useVetoPermissions({
    userTeamId,
    currentTurnTeamId,
    isUserCaptain,
    teamSize,
    team1Id,
    team2Id,
    seq: permissionUpdateSeq // pass for forced recalculation
  });

  // Map action handler via custom hook
  const { handleMapAction } = useVetoMapAction({
    vetoSessionId,
    team1Id,
    team2Id,
    currentTurnTeamId,
    userTeamId,
    bestOf,
    vetoActions,
    maps,
    fetchVetoActions,
    checkPermissions: explainPermissions,
    setLoading,
    toast,
  });

  // Derive ban/pick/remainingMaps/complete status
  const bansMade = vetoActions.filter(a => a.action === "ban").length;
  const totalBansNeeded = maps.length - 1;
  const remainingMaps = getRemainingMaps(maps, vetoActions);
  const vetoComplete =
    bestOf === 1
      ? bansMade === totalBansNeeded && remainingMaps.length === 1
      : vetoActions.length >= maps.length;
  let currentAction: "ban" | "pick" = "ban";
  if (bestOf === 1 && vetoComplete) {
    currentAction = "pick";
  } else if (bestOf !== 1) {
    currentAction = vetoActions.length % 2 === 0 ? "ban" : "pick";
  }

  // Add explicit log when turn or eligibility changes (easy to spot in devtools)
  useEffect(() => {
    console.log("[DEBUG VETO][PERMSTATE] Turn:", currentTurnTeamId, "| isUserOnTeam:", isUserOnMatchTeam, "| isUserTeamTurn:", isUserTeamTurn, "| isUserEligible:", isUserEligible, "| turnAction:", vetoActions.length, "| updateSeq:", permissionUpdateSeq);
  }, [currentTurnTeamId, isUserOnMatchTeam, isUserTeamTurn, isUserEligible, vetoActions.length, permissionUpdateSeq]);

  // For debugging (keep code)
  useEffect(() => {
    console.log("[DEBUG VETO][Permissions]", {
      userTeamId, currentTurnTeamId, isUserCaptain, teamSize, vetoActions,
      isUserOnMatchTeam, isUserTeamTurn, isUserEligible,
    });
  }, [userTeamId, currentTurnTeamId, isUserCaptain, teamSize, vetoActions, isUserOnMatchTeam, isUserTeamTurn, isUserEligible]);

  // Get map status - unmodified
  const getMapStatus = (mapId: string) => {
    const action = vetoActions.find((action) => action.map_id === mapId);
    if (!action) return null;
    return {
      action: action.action,
      team: action.team_id === currentTurnTeamId ? "Your Team" : "Opponent",
    };
  };

  // UI
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
            canAct={isUserEligible && !vetoComplete}
            isUserTurn={isUserTeamTurn}
            teamSize={teamSize}
            isUserCaptain={isUserCaptain!}
            currentAction={currentAction}
          />

          {/* Veto History */}
          <MapVetoHistory vetoActions={vetoActions} />

          {/* Map Grid */}
          <MapVetoMapGrid
            maps={maps}
            canAct={isUserEligible && !vetoComplete}
            currentAction={currentAction}
            bestOf={bestOf}
            remainingMaps={remainingMaps}
            vetoActions={vetoActions}
            onMapAction={handleMapAction}
            currentTeamTurn={currentTurnTeamId}
            getMapStatus={getMapStatus}
            isMapAvailable={(id) => isMapAvailable(id, vetoActions) && !vetoComplete}
          />

          {/* Instructions */}
          <MapVetoInstructions />
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default MapVetoDialog;
// End of real-time update-improved file
