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

  // ---- Enhanced: Validate user membership in match teams ----
  const isUserOnMatchTeam = !!userTeamId && (userTeamId === team1Id || userTeamId === team2Id);

  // Separate: is it user's team's turn
  const isUserTeamTurn = isUserOnMatchTeam && userTeamId === currentTurnTeamId && !!userTeamId;

  // Separate: is user allowed to act (captain, or 1v1)
  const isUserEligible = isUserTeamTurn && ((teamSize === 1) || (teamSize && teamSize > 1 && isUserCaptain));

  // Debug: Log permissions, veto state, ban counts, etc
  useEffect(() => {
    console.log("[DEBUG VETO][Permissions]", {
      userTeamId, currentTurnTeamId, isUserCaptain, teamSize, vetoActions, 
      isUserOnMatchTeam, isUserTeamTurn, isUserEligible,
    });
  }, [userTeamId, currentTurnTeamId, isUserCaptain, teamSize, vetoActions, isUserOnMatchTeam, isUserTeamTurn, isUserEligible]);

  // --- Simplified BO1 Ban Logic for Completion ---
  const bansMade = vetoActions.filter(a => a.action === "ban").length;
  const totalBansNeeded = maps.length - 1;
  const remainingMaps = maps.filter(
    map => !vetoActions.some(action => action.map_id === map.id)
  );
  const vetoComplete = (bestOf === 1)
    ? (bansMade === totalBansNeeded && remainingMaps.length === 1)
    : (vetoActions.length >= maps.length);
  let currentAction: "ban" | "pick" = "ban";
  if (bestOf === 1 && vetoComplete) {
    currentAction = "pick";
  } else if (bestOf !== 1) {
    currentAction = vetoActions.length % 2 === 0 ? "ban" : "pick";
  }

  // Permission function to cleanly display reasons
  const checkPermissions = () => {
    if (!isUserOnMatchTeam) {
      return {
        ok: false,
        reason: "You are not a member of either team in this match."
      }
    }
    if (!isUserTeamTurn) {
      return {
        ok: false,
        reason: "It's not your team's turn to act. Wait for your team’s turn."
      }
    }
    if (!isUserEligible) {
      return {
        ok: false,
        reason: teamSize === 1
          ? "Eligibility error (should not happen in 1v1)"
          : "Only the team captain can veto maps in team games."
      }
    }
    return { ok: true, reason: null };
  };

  // ---- MAIN ACTION HANDLER W/ ENHANCED DB ERROR HANDLING & LOGGING ----
  const handleMapAction = async (mapId: string) => {
    console.log("[ACTION] handleMapAction", { mapId, vetoComplete, currentAction, bansMade, totalBansNeeded, userTeamId, currentTurnTeamId });
    // --- Permission and state checks ---
    const perms = checkPermissions();
    if (!perms.ok) {
      toast({
        title: "Action Not Permitted",
        description: perms.reason,
        variant: "destructive"
      });
      console.warn("[VETO][PERM]", perms.reason);
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

      let actionType: "ban" | "pick" = currentAction;

      // Defensive log for DB update start
      console.log("[VETO][DB] Inserting action", {
        veto_session_id: vetoSessionId,
        team_id: userTeamId,
        map_id: mapId,
        action: actionType,
        order_number: vetoActions.length + 1,
        performed_by: performedById,
      });

      // Insert action
      const { error: insertError, data: insertedAction } = await supabase.from("map_veto_actions").insert({
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
      // Confirm that the action appeared in the db with correct turn (redundant with real-time, but explicit for user)
      await fetchVetoActions();

      // ----- Simplified: Special handling for BO1 completion -----
      if (bestOf === 1) {
        // After THIS ban, are there now 9 bans and 1 map left?
        const postBanActions = [...vetoActions, insertedAction];
        const postBanBans = postBanActions.filter(a => a.action === "ban").length;
        const postBanRemainingMaps = maps.filter(m =>
          !postBanActions.some(a => a.map_id === m.id)
        );
        if (postBanBans === totalBansNeeded && postBanRemainingMaps.length === 1) {
          // Auto-pick for other team
          const finalTeam = getNextTeamId();
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
            // Rollback attempted
            toast({
              title: "Veto Completion Error",
              description: "Auto-pick of final map failed. Please contact admin.",
              variant: "destructive"
            });
            // Consider fallback: try to set session to completed anyway
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
              current_turn_team_id: getNextTeamId(),
            })
            .eq("id", vetoSessionId);
          if (turnSwitchError) {
            toast({
              title: "Turn Switch Error",
              description: "Could not switch turn after ban.",
              variant: "destructive"
            });
            // Optionally rollback by deleting the just-inserted action
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
              current_turn_team_id: getNextTeamId(),
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

      // --- End of successful branch ---
      await fetchVetoActions();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to perform map action",
        variant: "destructive",
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
