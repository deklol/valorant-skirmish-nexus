import React, { useCallback, useEffect, useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
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

/**
 * Simplified, real-time-only MapVetoDialog.
 * No polling or redundant syncs, state solely driven by real-time events + initial source of truth on open/reset.
 */
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
}: any) => {
  const [maps, setMaps] = useState<MapData[]>([]);
  const [vetoActions, setVetoActions] = useState<VetoAction[]>([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(true);
  const { toast } = useToast();
  const [currentTurnTeamId, setCurrentTurnTeamId] = useState<string>(currentTeamTurn);
  const [sidePickModal, setSidePickModal] = useState<null | { mapId: string, onPick: (side: "attack" | "defend") => void }>(null);
  const [connectionStatus, setConnectionStatus] = useState<"connecting" | "online" | "offline" | "error" | "timeout" | "closed">("connecting");
  const [retryNonce, setRetryNonce] = useState<number>(0);

  // Timeout syncing state after 10s if stuck
  const syncingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Defensive fallback for critical crash/loop conditions
  const hasMinimalData = vetoSessionId && team1Id && team2Id;
  if (!hasMinimalData) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Critical Error: Missing Map Veto Session Data</DialogTitle>
            <DialogDescription>
              Session or teams are missing. Please contact an administrator.<br />
              <span className="text-xs text-red-400">
                Missing: {[
                  !vetoSessionId && "vetoSessionId",
                  !team1Id && "team1Id",
                  !team2Id && "team2Id"
                ].filter(Boolean).join(", ") || "Unknown"}
              </span>
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    );
  }

  // WATCH: Show dialog title & description for accessibility every time
  // DialogHeader/Title is always present. Map Veto dialog always has a description.
  const dialogTitle = `Map Veto - ${team1Name} vs ${team2Name}`;

  // ----- Realtime Connection / Syncing -----
  useEffect(() => {
    setConnectionStatus("connecting");
    setSyncing(true);
    syncingTimeoutRef.current && clearTimeout(syncingTimeoutRef.current);
    syncingTimeoutRef.current = setTimeout(() => {
      setConnectionStatus("timeout");
      setSyncing(false);
    }, 10000); // 10s max to connect
    return () => {
      if (syncingTimeoutRef.current) clearTimeout(syncingTimeoutRef.current);
    };
  }, [open, vetoSessionId, retryNonce]);

  // Main data loading on open/reset
  const fetchMaps = useCallback(async () => {
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
  }, [toast]);
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
      const normalized: VetoAction[] = (data || []).map((a: any) => ({
        ...a,
        side_choice:
          a.side_choice === "attack" || a.side_choice === "defend"
            ? a.side_choice
            : null,
      }));
      setVetoActions(normalized);
    } catch (e) {
      toast({
        title: "Error",
        description: "Failed to fetch map veto actions.",
        variant: "destructive",
      });
    }
  }, [vetoSessionId, toast]);

  useEffect(() => {
    if (open) {
      setMaps([]);
      setVetoActions([]);
      setCurrentTurnTeamId(currentTeamTurn);
      Promise.all([fetchMaps(), fetchVetoActions()]).finally(() => setSyncing(false));
    }
  }, [open, vetoSessionId, currentTeamTurn, fetchMaps, fetchVetoActions, retryNonce]);

  // Subscribe to realtime; update status for UI/timeout
  useMapVetoSessionRealtime(
    hasMinimalData ? vetoSessionId : null,
    payload => {
      if (payload && payload.new && payload.new.current_turn_team_id) {
        setCurrentTurnTeamId(payload.new.current_turn_team_id);
      }
    },
    { onConnectionChange: (connState) => {
      setConnectionStatus(connState);
      if (connState === "connecting") setSyncing(true);
      if (connState === "online") {
        setSyncing(false);
        // kill sync timeout if alive
        if (syncingTimeoutRef.current) clearTimeout(syncingTimeoutRef.current);
        syncingTimeoutRef.current = null;
      }
      if (connState === "error" || connState === "offline") {
        setSyncing(true);
      }
    }}
  );
  useMapVetoActionsRealtime(
    hasMinimalData ? vetoSessionId : null,
    fetchVetoActions,
    { onConnectionChange: (connState) => {
      // This line intentionally does not set connectionStatus;
      // Only setSyncing to block UI if offline
      if (connState === "connecting") setSyncing(true);
      if (connState === "online") setSyncing(false);
      if (connState === "error" || connState === "offline") setSyncing(true);
    } }
  );

  // Manual retry logic for real-time connection
  const handleRetry = () => {
    setRetryNonce(n => n + 1);
    setConnectionStatus("connecting");
    setSyncing(true);
  };

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
    seq: 0 // always 0, versions dropped in simplified code
  });

  // Log permission values clearly to debug (especially for home team/captain voting issues)
  useEffect(() => {
    if (open) {
      console.log("VETO DEBUG | Permission Inputs:", {
        userTeamId,
        currentTurnTeamId,
        isUserCaptain,
        teamSize,
        team1Id,
        team2Id,
        vetoSessionId,
        bestOf,
      });
    }
  }, [open, userTeamId, currentTurnTeamId, isUserCaptain, teamSize, team1Id, team2Id, vetoSessionId, bestOf]);

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
    onActionComplete: fetchVetoActions,
    checkPermissions: () => {
      const result = explainPermissions();
      const reason = typeof result === "string" ? result : result.reason ?? "You are not allowed to perform this action";
      if (reason) console.error("VETO | PERMISSION DENIED", {
        userTeamId,
        currentTurnTeamId,
        isUserCaptain,
        teamSize,
        team1Id,
        team2Id,
        reason,
      });
      return reason;
    },
    setLoading,
    toast,
  });

  // Ensure vetoFlow and all steps have proper data before accessing them
  const vetoFlow = React.useMemo(() => {
    if (!homeTeamId || !awayTeamId || maps.length === 0) return [];
    return getVctVetoFlow({ homeTeamId, awayTeamId, bestOf, maps });
  }, [homeTeamId, awayTeamId, bestOf, maps]);

  const vetoStep = vetoFlow.length > 0 && vetoActions.length < vetoFlow.length
    ? vetoActions.length
    : Math.max(0, vetoFlow.length - 1);

  // Defensive: prevent null access if out of bounds or not yet set
  const currentStep = vetoFlow[vetoStep] || null;

  // Defensive: vetoComplete, action checks
  const bansMade = vetoActions.filter(a => a.action === "ban").length;
  const totalBansNeeded = maps.length - 1;
  const pickMade = vetoActions.some(a => a.action === "pick");
  const sideChosen = vetoActions.some(a => a.side_choice);
  const vetoComplete =
    bestOf === 1
      ? (bansMade === totalBansNeeded && pickMade && sideChosen)
      : vetoActions.length >= maps.length;

  const canVeto = vetoFlow.length > 0;

  useEffect(() => {
    if (
      bestOf === 1 &&
      maps.length > 0 &&
      bansMade === totalBansNeeded // all bans done
    ) {
      const lastPick = vetoActions.filter(a => a.action === "pick").pop();
      if (
        lastPick &&
        isUserCaptain &&
        userTeamId === homeTeamId
      ) {
        setSidePickModal({
          mapId: lastPick.map_id,
          onPick: async (side: "attack" | "defend") => {
            if (lastPick.side_choice) return;
            setLoading(true);
            const { error } = await supabase
              .from("map_veto_actions")
              .update({ side_choice: side })
              .eq("id", lastPick.id)
              .is("side_choice", null);
            setLoading(false);
            setSidePickModal(null);
            fetchVetoActions();
            toast({ title: "Side Selected", description: `You picked ${side} side.` });
          },
        });
      }
    } else {
      setSidePickModal(null);
    }
  }, [bestOf, maps, bansMade, pickMade, sideChosen, vetoActions, currentStep, isUserCaptain, userTeamId, homeTeamId, toast, fetchVetoActions]);

  // Defensive: only pass allowed action/props, do not crash if currentStep/teamId is missing!
  const safeCurrentAction: "ban" | "pick" =
    currentStep && (currentStep.action === "ban" || currentStep.action === "pick")
      ? currentStep.action
      : "ban";

  // FINAL summary for veto result
  const finalPickAction = vetoActions.find(a => a.action === 'pick');
  const pickedMap = maps.find(m => m.id === finalPickAction?.map_id);
  const pickedSide = finalPickAction?.side_choice;

  // Defensive gets for map status
  const getMapStatus = (mapId: string) => {
    const action = vetoActions.find((action) => action.map_id === mapId);
    if (!action) return null;
    return {
      action: action.action,
      team: action.team_id === userTeamId ? "Your Team" : "Opponent",
    };
  };

  // Defensive home/away labels
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

  // Defensive: fallback UI if syncing or missing data
  if (!open || !vetoFlow || vetoFlow.length === 0) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{dialogTitle}</DialogTitle>
            <DialogDescription>
              Unable to load veto: Missing session, teams, or maps.
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    );
  }

  // UI: Real-time connection state/indicator for users
  const renderConnectionInfo = () => {
    switch (connectionStatus) {
      case "online":
        return <span className="text-green-400 text-xs">Connected to server</span>;
      case "offline":
      case "error":
      case "closed":
        return (
          <div className="flex flex-col items-center gap-2">
            <span className="text-red-300 text-xs">Connection to server lost.</span>
            <Button variant="link" className="text-blue-300 underline text-xs p-0 h-auto font-medium hover:text-blue-400" onClick={handleRetry}>
              Reconnect
            </Button>
          </div>
        );
      case "timeout":
        return (
          <div className="flex flex-col items-center gap-2">
            <span className="text-yellow-300 text-xs">Unable to reach server. App is in read-only mode. Retry below.</span>
            <Button variant="link" className="text-blue-300 underline text-xs p-0 h-auto font-medium hover:text-blue-400" onClick={handleRetry}>
              Reconnect
            </Button>
          </div>
        );
      case "connecting":
      default:
        return <span className="text-yellow-300 text-xs">Syncing with server...</span>;
    }
  };

  // Dialog Render
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-slate-900 border-slate-700 text-white" aria-describedby="map-veto-dialog-description">
        <DialogHeader>
          <DialogTitle>{dialogTitle}</DialogTitle>
          <DialogDescription id="map-veto-dialog-description">
            Participate in map bans and picks. All team members see this in real time. <br />
            <span>{renderConnectionInfo()}</span>
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-6">
          {/* If waiting for dice roll */}
          {(!homeTeamId || !awayTeamId) ? (
            <div className="flex flex-col items-center justify-center py-14">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-yellow-500 mb-2" />
              <div className="text-yellow-200 text-lg font-semibold">
                Waiting for dice roll...
              </div>
              <div className="text-slate-300 text-base mt-2">
                Home/Away are not set yet.<br />
                A captain or admin must roll dice to set Home/Away.
              </div>
              <pre className="bg-slate-800 mt-4 p-2 rounded text-xs text-slate-400 border border-slate-700 max-w-xl overflow-auto">
                Missing: {!homeTeamId && "homeTeamId "}
                {!awayTeamId && "awayTeamId"}
                {"\n"}vetoSessionId: {vetoSessionId}
                {"\n"}team1Id: {team1Id}
                {"\n"}team2Id: {team2Id}
              </pre>
            </div>
          ) : (
            <>
              {/* Connection status indicator always at the top */}
              <div className="flex justify-center">{renderConnectionInfo()}</div>
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
                key={currentTurnTeamId}
                canAct={isUserEligible && canVeto && !syncing}
                isUserTurn={isUserTeamTurn}
                teamSize={teamSize}
                isUserCaptain={isUserCaptain!}
                // Only allow "ban" or "pick" as MapActionType!
                currentAction={safeCurrentAction}
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
                  {pickedSide && (
                    <div className="mt-2 text-green-200">Side already selected: <span className="font-bold">{pickedSide}</span></div>
                  )}
                </div>
              ) : (
                <MapVetoMapGrid
                  maps={maps}
                  canAct={isUserEligible && canVeto && currentStep && currentStep.action !== "side_pick" && !syncing}
                  currentAction={safeCurrentAction}
                  bestOf={bestOf}
                  remainingMaps={getRemainingMaps(maps, vetoActions)}
                  vetoActions={vetoActions}
                  onMapAction={(mapId: string) => handleMapAction(mapId, safeCurrentAction)}
                  currentTeamTurn={currentTurnTeamId}
                  getMapStatus={getMapStatus}
                  isMapAvailable={(id) => isMapAvailable(id, vetoActions) && !vetoComplete}
                />
              )}

              {/* Instructions */}
              <MapVetoInstructions />
            </>
          )}
          {!syncing && vetoFlow.length === 0 && (
            <div className="text-red-400 text-center p-16">
              Unable to start map veto: Session, teams, or map list is not loaded. Please retry later.
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default MapVetoDialog;
