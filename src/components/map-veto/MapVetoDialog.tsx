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
import { Button } from "@/components/ui/button";
import { getVctVetoFlow } from "./vetoFlowUtils";

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
  homeTeamId?: string | null;
  awayTeamId?: string | null;
}

const asMapActionType = (act: string | undefined | null): "ban" | "pick" =>
  act === "ban" ? "ban" : act === "pick" ? "pick" : "ban";

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
  homeTeamId,
  awayTeamId,
}: MapVetoDialogProps) => {
  const [maps, setMaps] = useState<MapData[]>([]);
  const [vetoActions, setVetoActions] = useState<VetoAction[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  // Current turn - always trust backend for turn
  const [currentTurnTeamId, setCurrentTurnTeamId] = useState<string>(currentTeamTurn);

  // Track render version for MapVetoTurnStatus
  const [turnVersion, setTurnVersion] = useState(0);

  // Forcing RT permission recalculation
  const [permissionUpdateSeq, setPermissionUpdateSeq] = useState<number>(0);

  // ----------- NEW: VCT-style veto flow and side pick steps ----------
  const [sidePickModal, setSidePickModal] = useState<null | { mapId: string, onPick: (side: "attack" | "defend") => void }>(null);

  // Helper: Refetch session and force local sync on mismatch
  const forceSessionRefetch = useCallback(async (logReason?: string) => {
    if (!vetoSessionId) return;
    try {
      const { data, error } = await supabase
        .from('map_veto_sessions')
        .select('current_turn_team_id')
        .eq('id', vetoSessionId)
        .maybeSingle();
      if (error) throw error;
      if (
        data &&
        data.current_turn_team_id &&
        data.current_turn_team_id !== currentTurnTeamId
      ) {
        console.warn("[FORCE REFRESH][forceSessionRefetch]", logReason || "",
          "Local turn id:", currentTurnTeamId,
          " != DB:", data.current_turn_team_id, "-> forcing sync");
        setCurrentTurnTeamId(data.current_turn_team_id);
        setTurnVersion((v) => v + 1);
        setPermissionUpdateSeq(seq => seq + 1);
      }
    } catch (err) {
      console.warn("[FORCE REFRESH][forceSessionRefetch] Could not load session:", err);
    }
  }, [vetoSessionId, currentTurnTeamId]);

  useMapVetoSessionRealtime(
    vetoSessionId,
    payload => {
      if (payload && payload.new && payload.new.current_turn_team_id) {
        if (payload.new.current_turn_team_id !== currentTurnTeamId) {
          setCurrentTurnTeamId(payload.new.current_turn_team_id);
          setTurnVersion((v) => v + 1);
          setPermissionUpdateSeq(seq => seq + 1);
          console.log("[MapVetoDialog][REALTIME]",
            "RT session update: turn NOW is", payload.new.current_turn_team_id,
            "(was", currentTurnTeamId, "), turnVersion", turnVersion + 1);
        } else {
          console.log("[MapVetoDialog][REALTIME] Session RT: turn unchanged (no-op)", payload.new.current_turn_team_id);
        }
      } else {
        console.log("[MapVetoDialog][REALTIME] Session RT: no new current_turn_team_id in payload", payload);
      }
    }
  );

  // Always force local state sync on props change (mount, dialog open, or match switch)
  useEffect(() => {
    if (currentTeamTurn && currentTeamTurn !== currentTurnTeamId) {
      setCurrentTurnTeamId(currentTeamTurn);
      setTurnVersion(v => v + 1);
      setPermissionUpdateSeq(seq => seq + 1);
      console.log("[MapVetoDialog][Init]",
        "Set turnTeam on dialog open/init",
        currentTeamTurn, "-> (was", currentTurnTeamId,
        ") turnVersion", turnVersion + 1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTeamTurn, vetoSessionId]);

  // Strong: Always refetch session if veto actions change.
  useEffect(() => {
    if (vetoActions.length > 0) {
      forceSessionRefetch("vetoActions.length changed");
    }
  }, [vetoActions.length, forceSessionRefetch]);

  // Always refetch actions; after that, force turn sync
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

      // FIX: type safety for side_choice!
      const normalized: VetoAction[] = (data || []).map((a: any) => ({
        ...a,
        side_choice:
          a.side_choice === "attack" || a.side_choice === "defend"
            ? a.side_choice
            : null,
      }));

      setVetoActions(normalized);
      // Immediately check for turn sync after action update
      forceSessionRefetch("fetchVetoActions");
    } catch (e) {
      console.warn("[MapVetoDialog][fetchVetoActions] Could not fetch veto actions:", e);
    }
  }, [vetoSessionId, forceSessionRefetch]);

  useMapVetoActionsRealtime(vetoSessionId, fetchVetoActions);

  useEffect(() => {
    if (open) {
      fetchMaps();
      fetchVetoActions();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  // Memo: determine flow based on home/away and map set
  const vetoFlow = React.useMemo(() => {
    if (!homeTeamId || !awayTeamId || maps.length === 0) return [];
    return getVctVetoFlow({ homeTeamId, awayTeamId, bestOf, maps });
  }, [homeTeamId, awayTeamId, bestOf, maps]);

  // Which step are we on, and what's next?
  const vetoStep = vetoActions.length;
  const currentStep = vetoFlow[vetoStep];

  // Defensive: vetoComplete is true after all bans, pick, and side are done
  const bansMade = vetoActions.filter(a => a.action === "ban").length;
  const totalBansNeeded = maps.length - 1;
  const pickMade = vetoActions.some(a => a.action === "pick");
  const sideChosen = vetoActions.some(a => a.side_choice);
  const vetoComplete =
    bestOf === 1
      ? (bansMade === totalBansNeeded && pickMade && sideChosen)
      : vetoActions.length >= maps.length;

  // Block if dice not rolled
  const canVeto = homeTeamId && awayTeamId && vetoFlow.length > 0;

  // If it's a side_pick step, show Side Picker UI instead of map grid
  // (VCT: after each "pick", next action is side_pick, performed by the other team)
  useEffect(() => {
    if (
      bestOf === 1 &&
      maps.length > 0 &&
      bansMade === totalBansNeeded && // all bans done
      pickMade &&                     // pick recorded in db
      !sideChosen                     // but not side picked yet!
    ) {
      // If this is the home team/captain, allow side pick
      const lastPick = vetoActions.filter(a => a.action === "pick").pop();
      if (
        lastPick &&
        isUserCaptain &&
        userTeamId === homeTeamId
      ) {
        setSidePickModal({
          mapId: lastPick.map_id,
          onPick: async (side: "attack" | "defend") => {
            if (lastPick.side_choice) return; // Don't allow picking if already picked
            setLoading(true);
            // Persist the choice to Supabase, only if not already picked
            const { error } = await supabase
              .from("map_veto_actions")
              .update({ side_choice: side })
              .eq("id", lastPick.id)
              .is("side_choice", null); // Only update if not already set
            setLoading(false);
            setSidePickModal(null);
            fetchVetoActions();
            toast({ title: "Side Selected", description: `You picked ${side} side.` });
          },
        });
      }
    } else {
      // Close modal if not in side-pick state or already picked
      setSidePickModal(null);
    }
    // eslint-disable-next-line
  }, [bestOf, maps, bansMade, pickMade, sideChosen, vetoActions, currentStep, isUserCaptain, userTeamId, homeTeamId, toast]);

  // Derive ban/pick/remainingMaps/complete status
  let currentAction: "ban" | "pick" = "ban";
  if (bestOf === 1 && vetoComplete) {
    currentAction = "pick";
  } else if (bestOf !== 1) {
    currentAction = vetoActions.length % 2 === 0 ? "ban" : "pick";
  }

  // Safety: poll for state mismatch after every veto action or RT event (redundancy for bad clients)
  useEffect(() => {
    // Defensive: poll latest backend TURN value, compare to local
    async function pollAndSyncTurn() {
      if (!vetoSessionId) return;
      try {
        const { data, error } = await supabase
          .from('map_veto_sessions')
          .select('current_turn_team_id')
          .eq('id', vetoSessionId)
          .maybeSingle();
        if (error) throw error;
        if (data?.current_turn_team_id !== currentTurnTeamId) {
          console.warn("[DEBUG][TURN DESYNC] Local turn", currentTurnTeamId, "!= backend", data?.current_turn_team_id, "- FORCING TURN SYNC");
          setCurrentTurnTeamId(data?.current_turn_team_id);
          setTurnVersion(v => v + 1);
          setPermissionUpdateSeq(seq => seq + 1);
        } else {
          // console.log("[DEBUG][TURN SYNC] All good: local", currentTurnTeamId);
        }
      } catch (e) {
        console.warn("Error polling backend for turn sync:", e);
      }
    }
    pollAndSyncTurn();
  }, [currentTurnTeamId, vetoActions.length, turnVersion, vetoSessionId]);

  // Add extra debugging to catch desync: compare frontend turn to backend after every significant change
  useEffect(() => {
    async function debugTurnConsistency() {
      if (!vetoSessionId) return;
      try {
        const { data, error } = await supabase
          .from('map_veto_sessions')
          .select('current_turn_team_id')
          .eq('id', vetoSessionId)
          .maybeSingle();
        if (error) throw error;
        if (data?.current_turn_team_id !== currentTurnTeamId) {
          console.warn("[DEBUG][TURN DESYNC] Local turnTeamId", currentTurnTeamId, "!= backend", data?.current_turn_team_id, "- syncing...");
          setCurrentTurnTeamId(data?.current_turn_team_id);
          setTurnVersion(v => v + 1);
          setPermissionUpdateSeq(seq => seq + 1);
        } else {
          // All good
          // console.log("[DEBUG][TURN SYNC] Local and backend match:", currentTurnTeamId);
        }
      } catch (e) {
        // silent
      }
    }
    debugTurnConsistency();
    // Now, always check on change of vetoActions, turnTeamId, or RT version
  }, [currentTurnTeamId, vetoActions.length, turnVersion, vetoSessionId]);

  // Add explicit log when turn or eligibility changes (easy to spot in devtools)
  useEffect(() => {
    console.log("[DEBUG VETO][PERMSTATE] Turn:", currentTurnTeamId, "| isUserOnTeam:", isUserOnMatchTeam, "| isUserTeamTurn:", isUserTeamTurn, "| isUserEligible:", isUserEligible, "| turnAction:", vetoActions.length, "| updateSeq:", permissionUpdateSeq, "| turnVersion:", turnVersion);
  }, [currentTurnTeamId, isUserOnMatchTeam, isUserTeamTurn, isUserEligible, vetoActions.length, permissionUpdateSeq, turnVersion]);

  // Add log for MapVetoTurnStatus for clarity
  useEffect(() => {
    console.log("[DEBUG VETO][TurnStatus Render] Key:", turnVersion, "| isUserTurn", isUserTeamTurn, "| localTurnTeamId:", currentTurnTeamId);
  }, [isUserTeamTurn, currentTurnTeamId, turnVersion]);

  // For debugging (keep code)
  useEffect(() => {
    console.log("[DEBUG VETO][Permissions]", {
      userTeamId, currentTurnTeamId, isUserCaptain, teamSize, vetoActions,
      isUserOnMatchTeam, isUserTeamTurn, isUserEligible,
      turnVersion,
    });
  }, [userTeamId, currentTurnTeamId, isUserCaptain, teamSize, vetoActions, isUserOnMatchTeam, isUserTeamTurn, isUserEligible, turnVersion]);

  // Get map status - FIX attribution "Your Team" vs "Opponent"
  const getMapStatus = (mapId: string) => {
    const action = vetoActions.find((action) => action.map_id === mapId);
    if (!action) return null;
    return {
      action: action.action,
      team: action.team_id === userTeamId ? "Your Team" : "Opponent",
    };
  };

  // Add home/away UI context
  const [homeLabel, setHomeLabel] = useState<string>("Home");
  const [awayLabel, setAwayLabel] = useState<string>("Away");

  useEffect(() => {
    if (team1Id && homeTeamId === team1Id) {
      setHomeLabel(team1Name);
      setAwayLabel(team2Name);
    } else if (team2Id && homeTeamId === team2Id) {
      setHomeLabel(team2Name);
      setAwayLabel(team1Name);
    }
  }, [homeTeamId, awayTeamId, team1Id, team2Id, team1Name, team2Name]);

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
          {/* Show home/away info */}
          <div className="flex gap-8 justify-center pb-2">
            <div className="bg-slate-900/60 px-3 py-1 rounded text-yellow-100 border border-yellow-700 text-sm">
              Home: <b>{homeLabel}</b>
            </div>
            <div className="bg-slate-900/60 px-3 py-1 rounded text-blue-100 border border-blue-700 text-sm">
              Away: <b>{awayLabel}</b>
            </div>
          </div>

          {/* Turn/Phase */}
          <MapVetoTurnStatus
            key={turnVersion}
            canAct={isUserEligible && canVeto}
            isUserTurn={isUserTeamTurn}
            teamSize={teamSize}
            isUserCaptain={isUserCaptain!}
            // Only allow "ban" or "pick" as MapActionType!
            currentAction={asMapActionType(currentStep?.action)}
          />

          {/* Veto History */}
          <MapVetoHistory vetoActions={vetoActions} />

          {/* Display Final Map & Side after veto is complete */}
          {vetoComplete && finalPickAction && (
            <div className="flex flex-col items-center gap-4 border border-green-700 rounded-lg bg-green-900/40 p-4 my-2 mx-auto w-fit">
              <div className="text-xl font-bold text-green-200">Veto Complete!</div>
              {pickedMap && (
                <div className="flex flex-col items-center gap-2">
                  <span className="text-green-100">Selected Map:</span>
                  <div className="flex items-center gap-3">
                    {pickedMap.thumbnail_url && (
                      <img src={pickedMap.thumbnail_url}
                        alt={pickedMap.display_name}
                        className="w-20 h-20 rounded shadow border-2 border-green-700 bg-slate-800 object-cover"
                      />
                    )}
                    <span className="font-semibold text-lg">{pickedMap.display_name}</span>
                  </div>
                </div>
              )}
              {finalPickAction.side_choice ? (
                <span className="mt-2 text-green-200">
                  <b>{homeLabel}</b> selected:{" "}
                  {finalPickAction.side_choice === "attack" ? (
                    <span className="inline-flex items-center gap-2 px-3 py-1 rounded bg-red-700 text-white font-bold shadow">Attack</span>
                  ) : (
                    <span className="inline-flex items-center gap-2 px-3 py-1 rounded bg-blue-700 text-white font-bold shadow">Defend</span>
                  )}
                </span>
              ) : (
                bestOf === 1 && isUserCaptain && userTeamId === homeTeamId && (
                  <span className="mt-2 text-yellow-200">You must now choose a starting side!</span>
                )
              )}
            </div>
          )}

          {/* Map Grid or Side Pick Modal */}
          {sidePickModal && !pickedSide ? (
            <div className="flex flex-col items-center gap-4 p-6">
              <div className="text-lg mb-2">Choose Starting Side</div>
              <div className="flex gap-4">
                <Button
                  disabled={loading}
                  onClick={() => sidePickModal.onPick("attack")}
                  className="bg-red-600 hover:bg-red-700"
                >
                  Attack
                </Button>
                <Button
                  disabled={loading}
                  onClick={() => sidePickModal.onPick("defend")}
                  className="bg-blue-700 hover:bg-blue-800"
                >
                  Defend
                </Button>
              </div>
              {/* If for some reason side_choice is set, show a badge */}
              {pickedSide && (
                <div className="mt-2 text-green-200">Side already selected: <span className="font-bold">{pickedSide}</span></div>
              )}
            </div>
          ) : (
            <MapVetoMapGrid
              maps={maps}
              canAct={isUserEligible && canVeto && currentStep && currentStep.action !== "side_pick"}
              currentAction={asMapActionType(currentStep?.action)}
              bestOf={bestOf}
              remainingMaps={getRemainingMaps(maps, vetoActions)}
              vetoActions={vetoActions}
              onMapAction={handleMapAction}
              currentTeamTurn={currentTurnTeamId}
              getMapStatus={getMapStatus}
              isMapAvailable={(id) => isMapAvailable(id, vetoActions) && !vetoComplete}
            />
          )}

          {/* Instructions */}
          <MapVetoInstructions />
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default MapVetoDialog;
