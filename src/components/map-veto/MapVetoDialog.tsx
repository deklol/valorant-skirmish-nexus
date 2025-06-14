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

  // State: Always trust the backend for turn
  const [currentTurnTeamId, setCurrentTurnTeamId] = useState<string>(currentTeamTurn);

  // Subscribe to session changes to keep turn/currentTurnTeamId in real time
  useMapVetoSessionRealtime(
    vetoSessionId,
    payload => {
      if (payload && payload.new && payload.new.current_turn_team_id) {
        setCurrentTurnTeamId(payload.new.current_turn_team_id);
        console.log("[MapVetoDialog] RT: turn switched ->", payload.new.current_turn_team_id);
      }
    }
  );

  // Defensive: if the session is loaded for the first time, update local
  useEffect(() => {
    if (currentTeamTurn) setCurrentTurnTeamId(currentTeamTurn);
  }, [currentTeamTurn, vetoSessionId]);

  // Actions fetching
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

  // Debug: Log permissions, veto state, ban counts, etc
  useEffect(() => {
    console.log("[DEBUG VETO] Permissions", {
      userTeamId, currentTurnTeamId, isUserCaptain, teamSize, vetoActions
    });
  }, [userTeamId, currentTurnTeamId, isUserCaptain, teamSize, vetoActions]);

  // --- SIMPLIFY LOGIC ---
  const bansMade = vetoActions.filter(a => a.action === "ban").length;
  const totalBansNeeded = maps.length - (bestOf === 1 ? 1 : bestOf);
  const remainingMaps = maps.filter(
    map => !vetoActions.some(action => action.map_id === map.id)
  );
  const vetoComplete = bestOf === 1
    ? (remainingMaps.length === 1 && bansMade >= totalBansNeeded)
    : (vetoActions.length >= maps.length);

  // Always derive action from state
  let currentAction: "ban" | "pick" = "ban";
  if (bestOf === 1) {
    if (remainingMaps.length === 1 && bansMade >= totalBansNeeded) {
      currentAction = "pick";
    }
  } else {
    currentAction = vetoActions.length % 2 === 0 ? "ban" : "pick";
  }

  // Only allow acting if user on the correct team and (is captain or 1v1)
  const isUserTurn = userTeamId === currentTurnTeamId && !!userTeamId;
  const canAct = isUserTurn && ((teamSize === 1) || (teamSize && teamSize > 1 && isUserCaptain));
  useEffect(() => {
    console.log("[DEBUG VETO] isUserTurn", isUserTurn, "canAct", canAct, { teamSize, isUserCaptain });
  }, [isUserTurn, canAct, teamSize, isUserCaptain]);

  // Only allow acting on available maps, never on completed veto
  const isMapAvailable = (mapId: string) =>
    !vetoActions.some((action) => action.map_id === mapId);

  // Which team picks next?
  const getNextTeamId = () => {
    if (!team1Id || !team2Id) return currentTurnTeamId;
    return currentTurnTeamId === team1Id ? team2Id : team1Id;
  };

  // ACTION HANDLER: all logic routes through here!
  const handleMapAction = async (mapId: string) => {
    console.log("[ACTION] handleMapAction called with", { mapId, canAct, vetoComplete, isMapAvailable: isMapAvailable(mapId), currentAction, bansMade, totalBansNeeded });
    if (!userTeamId || userTeamId !== currentTurnTeamId || !canAct) {
      toast({
        title: "Not Your Turn",
        description: "Wait for your team's turn.",
        variant: "destructive"
      });
      return;
    }
    if (!isMapAvailable(mapId) || vetoComplete) {
      toast({
        title: "Invalid Action",
        description: "Cannot act on this map at this stage.",
        variant: "destructive"
      });
      return;
    }
    setLoading(true);
    try {
      const { data: authUser } = await supabase.auth.getUser();
      const performedById = authUser?.user?.id ?? null;

      // --- BAN LOGIC ---
      let actionType: "ban" | "pick" = currentAction;
      // For BO1, once only 1 map remains, pick is only permitted
      if (bestOf === 1 && remainingMaps.length === 1) {
        actionType = "pick";
      }
      // Defensive: prevent extra bans
      if (bestOf === 1 && bansMade >= totalBansNeeded && remainingMaps.length <= 1 && actionType === "ban") {
        toast({
          title: "Veto Complete",
          description: "All bans finished, map is already picked.",
          variant: "destructive"
        });
        setLoading(false);
        return;
      }

      // Insert action to DB
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
        description: `Successfully ${actionType === "ban" ? "banned" : "picked"} the map.`,
      });

      // --- COMPLETION HANDLING ---
      let sessionComplete = false;

      if (bestOf === 1) {
        const newVetoActions = [...vetoActions, { map_id: mapId, action: actionType, team_id: userTeamId }];
        const _remainingMaps = maps.filter(
          (map) => !newVetoActions.some((a: any) => a.map_id === map.id)
        );
        if (_remainingMaps.length === 1 && actionType === "ban") {
          // Insert auto-pick for other team
          await supabase.from("map_veto_actions").insert({
            veto_session_id: vetoSessionId,
            team_id: getNextTeamId(),
            map_id: _remainingMaps[0].id,
            action: "pick",
            order_number: vetoActions.length + 2,
            performed_by: null,
          });
          sessionComplete = true;
          console.log("[COMPLETE] BO1 veto complete: last map auto-picked", _remainingMaps[0].id);
        } else if (actionType === "pick") {
          sessionComplete = true;
          console.log("[COMPLETE] User picked final map");
        }

        // Update session
        if (sessionComplete) {
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
          // Switch turn
          await supabase
            .from("map_veto_sessions")
            .update({
              current_turn_team_id: getNextTeamId(),
            })
            .eq("id", vetoSessionId);
          console.log("[TURN] BO1 Turn Switched ->", getNextTeamId());
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
          // Switch turn
          await supabase
            .from("map_veto_sessions")
            .update({
              current_turn_team_id: getNextTeamId(),
            })
            .eq("id", vetoSessionId);
          console.log("[TURN] Standard Turn Switched ->", getNextTeamId());
        }
      }

      await fetchVetoActions();

    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to perform action",
        variant: "destructive"
      });
      console.error("[ERROR] Map action failed:", error);
    } finally {
      setLoading(false);
    }
  };

  // Get map status - unmodified
  const getMapStatus = (mapId: string): MapStatus => {
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
            currentTeamTurn={currentTurnTeamId}
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

// -- End of file -- (Flag: file is long, recommend refactor)
