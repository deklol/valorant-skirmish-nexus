import React, { useCallback, useEffect, useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
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
import { useRealtimeMapVeto } from "@/hooks/useRealtimeMapVeto";

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
  tournamentMapPool: MapData[];
  onVetoComplete: () => void;
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
  homeTeamId,
  awayTeamId,
  tournamentMapPool,
  onVetoComplete,
}: MapVetoDialogProps) => {
  const { toast } = useToast();

  const [sidePickModal, setSidePickModal] = useState<null | { mapId: string, onPick: (side: "attack" | "defend") => void }>(null);
  const [loading, setLoading] = useState(false);

  const hasMinimalData = vetoSessionId && team1Id && team2Id;
  if (!hasMinimalData) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Critical Error: Missing Map Veto Session Data</DialogTitle>
            <DialogDescription>
              Session or teams are missing. Please contact an administrator.
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    );
  }

  const dialogTitle = `Map Veto - ${team1Name} vs ${team2Name}`;

  // Use tournament map pool directly
  const maps = tournamentMapPool;

  // Use realtime hook for instant updates
  const {
    vetoActions,
    sessionData,
    loading: realtimeLoading,
    error: realtimeError,
    refetch
  } = useRealtimeMapVeto({
    vetoSessionId,
    enabled: open && !!vetoSessionId
  });

  const loadingAny = realtimeLoading || loading;

  // Error handling for realtime
  useEffect(() => {
    if (realtimeError) {
      toast({
        title: "Connection Error",
        description: realtimeError,
        variant: "destructive"
      });
    }
  }, [realtimeError, toast]);

  // Pull current turn from session (DB is source of truth)
  const currentTurnTeamId = sessionData?.current_turn_team_id ?? currentTeamTurn;

  // Permissions
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
    seq: 0
  });

  // Map action handler via custom hook - with better completion handling
  const { handleMapAction } = useVetoMapAction({
    vetoSessionId,
    team1Id,
    team2Id,
    currentTurnTeamId,
    userTeamId,
    bestOf,
    vetoActions,
    maps,
    onActionComplete: () => {
      // With realtime updates, we don't need to manually refetch
      // Just check completion status after a short delay
      setTimeout(() => {
        const isActuallyComplete = sessionData?.status === 'completed';
        if (isActuallyComplete) {
          onVetoComplete();
        }
      }, 100); // Short delay for UI smoothness
    },
    checkPermissions: () => {
      const result = explainPermissions();
      if (typeof result === "string") return result;
      if (result && result.ok === false) {
        console.error("VETO | PERMISSION DENIED", {
          userTeamId,
          currentTurnTeamId,
          isUserCaptain,
          teamSize,
          team1Id,
          team2Id,
          reason: result.reason,
        });
        return result.reason ?? "You are not allowed to perform this action";
      }
      return null;
    },
    setLoading,
    toast,
  });

  // Veto flow and steps
  const vetoFlow = useMemo(() => {
    if (!homeTeamId || !awayTeamId || maps.length === 0) return [];
    return getVctVetoFlow({ 
      homeTeamId, 
      awayTeamId, 
      bestOf, 
      tournamentMapPool: maps.map(m => ({ id: m.id, name: m.display_name || m.name }))
    });
  }, [homeTeamId, awayTeamId, bestOf, maps]);
  
  const vetoStep = vetoActions.length < vetoFlow.length
    ? vetoActions.length
    : Math.max(0, vetoFlow.length - 1);
  const currentStep = vetoFlow[vetoStep] || null;

  // Veto completion logic
  const bansMade = vetoActions.filter(a => a.action === "ban").length;
  const totalBansNeeded = maps.length - 1;
  const pickMade = vetoActions.some(a => a.action === "pick");
  const sideChosen = vetoActions.some(a => a.side_choice);
  const vetoComplete =
    bestOf === 1
      ? (bansMade === totalBansNeeded && pickMade && sideChosen)
      : vetoActions.length >= maps.length;

  const canVeto = vetoFlow.length > 0;

  // Home/away labels
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

  // Side pick modal logic - prevent auto-close during side selection
  useEffect(() => {
    if (
      bestOf === 1 &&
      maps.length > 0 &&
      bansMade === totalBansNeeded
    ) {
      const lastPick = vetoActions.filter(a => a.action === "pick").pop();
      if (
        lastPick &&
        isUserCaptain &&
        userTeamId === homeTeamId &&
        !lastPick.side_choice
      ) {
        setSidePickModal({
          mapId: lastPick.map_id,
          onPick: async (side: "attack" | "defend") => {
            setLoading(true);
            try {
              const { data, error } = await supabase.rpc('set_side_choice', {
                p_veto_session_id: vetoSessionId,
                p_user_id: (await supabase.auth.getUser()).data.user?.id,
                p_side_choice: side,
              });
              setSidePickModal(null);
              // Realtime will handle the update automatically
              if (error) {
                toast({ title: "Error", description: error.message, variant: "destructive" });
              } else if (data === "OK") {
                toast({ title: "Side Selected", description: `You picked ${side} side.` });
                // Only call onVetoComplete here since veto is truly complete
                onVetoComplete();
              } else if (typeof data === "string") {
                toast({ title: "Error", description: data, variant: "destructive" });
              }
            } catch (error: any) {
              toast({ title: "Error", description: error.message, variant: "destructive" });
            } finally {
              setLoading(false);
            }
          },
        });
      }
    } else {
      setSidePickModal(null);
    }
  }, [bestOf, maps, bansMade, pickMade, sideChosen, vetoActions, currentStep, isUserCaptain, userTeamId, homeTeamId, toast, vetoSessionId, onVetoComplete]);

  const safeCurrentAction: "ban" | "pick" =
    currentStep && (currentStep.action === "ban" || currentStep.action === "pick")
      ? currentStep.action
      : "ban";

  const finalPickAction = vetoActions.find(a => a.action === 'pick');
  const pickedMap = maps.find(m => m.id === finalPickAction?.map_id);
  const pickedSide = finalPickAction?.side_choice;

  const getMapStatus = (mapId: string) => {
    const action = vetoActions.find((action) => action.map_id === mapId);
    if (!action) return null;
    return {
      action: action.action,
      team: action.team_id === userTeamId ? "Your Team" : "Opponent",
    };
  };

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-slate-900 border-slate-700 text-white" aria-describedby="map-veto-dialog-description">
        <DialogHeader>
          <DialogTitle>{dialogTitle}</DialogTitle>
          <DialogDescription id="map-veto-dialog-description">
            Participate in map bans and picks. Updates automatically in real time.
            {loadingAny && (
              <span className="ml-2 text-yellow-200 text-xs">Loading latest data...</span>
            )}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-6">
          {(!homeTeamId || !awayTeamId) ? (
            <div className="flex flex-col items-center justify-center py-14">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-yellow-500 mb-2" />
              <div className="text-yellow-200 text-lg font-semibold">
                Waiting for dice roll...
              </div>
              <div className="text-slate-300 text-base mt-2">
                Home/Away are not set yet. A captain or admin must roll dice to set Home/Away.
              </div>
            </div>
          ) : (
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
                canAct={isUserEligible && canVeto && !loadingAny}
                isUserTurn={isUserTeamTurn}
                teamSize={teamSize}
                isUserCaptain={isUserCaptain!}
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
                      disabled={loadingAny}
                      onClick={() => sidePickModal.onPick("attack")}
                      className="bg-red-600 hover:bg-red-700"
                    >
                      Attack
                    </Button>
                    <Button
                      disabled={loadingAny}
                      onClick={() => sidePickModal.onPick("defend")}
                      className="bg-blue-700 hover:bg-blue-800"
                    >
                      Defend
                    </Button>
                  </div>
                </div>
              ) : (
                <MapVetoMapGrid
                  maps={maps}
                  canAct={isUserEligible && canVeto && currentStep && currentStep.action !== "side_pick" && !loadingAny}
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
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default MapVetoDialog;
