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
}: MapVetoDialogProps) => {
  const [maps, setMaps] = useState<MapData[]>([]);
  const [vetoActions, setVetoActions] = useState<VetoAction[]>([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(true);
  const { toast } = useToast();

  // Current turn as single source of truth, updated by session RT only
  const [currentTurnTeamId, setCurrentTurnTeamId] = useState<string>(currentTeamTurn);

  // ----------- NEW: VCT-style veto flow and side pick steps ----------
  const [sidePickModal, setSidePickModal] = useState<null | { mapId: string, onPick: (side: "attack" | "defend") => void }>(null);

  // Initial fetch for maps and actions (fresh start or open/reset)
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

  // Connection/reactivation: do a full data refresh ONCE on dialog open
  useEffect(() => {
    if (open) {
      setSyncing(true);
      setMaps([]);
      setVetoActions([]);
      setCurrentTurnTeamId(currentTeamTurn);
      Promise.all([fetchMaps(), fetchVetoActions()]).finally(() => setSyncing(false));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, vetoSessionId, currentTeamTurn]);

  // Session real-time: only update turn when session not null
  useMapVetoSessionRealtime(
    vetoSessionId,
    payload => {
      if (payload && payload.new && payload.new.current_turn_team_id) {
        setCurrentTurnTeamId(payload.new.current_turn_team_id);
      }
    },
    connState => {
      if (connState === "connecting") setSyncing(true);
      if (connState === "online") setSyncing(false);
      if (connState === "error" || connState === "offline") {
        setSyncing(true);
        toast({ title: "Lost connection to veto session!", description: "Trying to reconnect...", variant: "destructive" });
      }
    }
  );

  // Map veto actions real-time
  useMapVetoActionsRealtime(
    vetoSessionId,
    fetchVetoActions,
    connState => {
      if (connState === "connecting") setSyncing(true);
      if (connState === "online") setSyncing(false);
      if (connState === "error" || connState === "offline") {
        setSyncing(true);
        toast({ title: "Lost connection to veto actions!", description: "Trying to reconnect...", variant: "destructive" });
      }
    }
  );

  // Permissions logic via custom hook (direct state, no version/seq)
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

  // Memoized veto flow (always with non-null teamId for each step)
  const vetoFlow = React.useMemo(() => {
    if (!homeTeamId || !awayTeamId || maps.length === 0) return [];
    return getVctVetoFlow({ homeTeamId, awayTeamId, bestOf, maps });
  }, [homeTeamId, awayTeamId, bestOf, maps]);

  const vetoStep = Math.min(vetoActions.length, vetoFlow.length - 1);
  const currentStep = vetoFlow[vetoStep] || null; // may be null if not ready

  // Defensive: vetoComplete is true after all bans, pick, and side are done
  const bansMade = vetoActions.filter(a => a.action === "ban").length;
  const totalBansNeeded = maps.length - 1;
  const pickMade = vetoActions.some(a => a.action === "pick");
  const sideChosen = vetoActions.some(a => a.side_choice);
  const vetoComplete =
    bestOf === 1
      ? (bansMade === totalBansNeeded && pickMade && sideChosen)
      : vetoActions.length >= maps.length;

  const canVeto = homeTeamId && awayTeamId && vetoFlow.length > 0;

  // If it's a side_pick step, show Side Picker UI instead of map grid
  useEffect(() => {
    if (
      bestOf === 1 &&
      maps.length > 0 &&
      bansMade === totalBansNeeded // all bans done
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
    // eslint-disable-next-line
  }, [bestOf, maps, bansMade, pickMade, sideChosen, vetoActions, currentStep, isUserCaptain, userTeamId, homeTeamId, toast]);

  // Derive ban/pick/remainingMaps/complete status
  let currentAction: "ban" | "pick" = "ban";
  if (bestOf === 1 && vetoComplete) {
    currentAction = "pick";
  } else if (bestOf !== 1) {
    currentAction = vetoActions.length % 2 === 0 ? "ban" : "pick";
  }

  // Defensive: only pass allowed action/props, do not crash if currentStep/teamId is missing!
  const safeCurrentAction: "ban" | "pick" =
    currentStep && (currentStep.action === "ban" || currentStep.action === "pick")
      ? asMapActionType(currentStep.action)
      : "ban";

  // FINAL summary for veto result
  const finalPickAction = vetoActions.find(a => a.action === 'pick');
  const pickedMap = maps.find(m => m.id === finalPickAction?.map_id);
  const pickedSide = finalPickAction?.side_choice;

  // Get map status - FIX attribution "Your Team" vs "Opponent"
  const getMapStatus = (mapId: string) => {
    const action = vetoActions.find((action) => action.map_id === mapId);
    if (!action) return null;
    return {
      action: action.action,
      team: action.team_id === userTeamId ? "Your Team" : "Opponent",
    };
  };

  // Home/away labels (unchanged)
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

  // --- UI / Output ---
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-slate-900 border-slate-700 text-white">
        <DialogHeader>
          <DialogTitle className="text-white">
            Map Veto - {team1Name} vs {team2Name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {syncing && (
            <div className="w-full flex flex-col items-center justify-center py-16">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500 mb-3"></div>
              <p className="text-yellow-300 text-lg">Syncing with server...<br /><span className="text-slate-400 text-sm">Please wait, actions are disabled during sync.</span></p>
            </div>
          )}
          {!syncing && vetoFlow.length > 0 && currentStep && (
            <>
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
                  onMapAction={handleMapAction}
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
