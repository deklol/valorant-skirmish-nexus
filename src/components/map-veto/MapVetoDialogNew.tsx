import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { useVetoState } from "@/hooks/useVetoState";
import { useUserTeam } from "@/hooks/useUserTeam";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import MapVetoMapGrid from "./MapVetoMapGrid";
import MapVetoHistory from "./MapVetoHistory";
import { AlertTriangle, CheckCircle, Clock, Users } from "lucide-react";

interface MapVetoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  matchId: string;
  vetoSessionId: string;
  team1Name: string;
  team2Name: string;
  tournamentMapPool: any[];
  onVetoComplete: () => void;
  // Legacy props for backward compatibility
  currentTeamTurn?: string;
  userTeamId?: string | null;
  team1Id?: string;
  team2Id?: string;
  isUserCaptain?: boolean;
  teamSize?: number | null;
  bestOf?: number;
  homeTeamId?: string | null;
  awayTeamId?: string | null;
}

export default function MapVetoDialogNew({
  open,
  onOpenChange,
  matchId,
  vetoSessionId,
  team1Name,
  team2Name,
  tournamentMapPool,
  onVetoComplete,
}: MapVetoDialogProps) {
  const { user } = useAuth();
  const { userTeam } = useUserTeam(matchId);
  const { toast } = useToast();
  const [sidePickMode, setSidePickMode] = useState(false);

  // Use the centralized veto state service
  const { state: vetoState, loading, error, performAction, fixTurnSync } = useVetoState(
    vetoSessionId,
    userTeam?.id || null
  );

  // Handle side choice for BO1
  const handleSideChoice = async (side: 'attack' | 'defend') => {
    if (!user || !vetoState) return;

    try {
      const { data, error } = await supabase.rpc('set_side_choice', {
        p_veto_session_id: vetoSessionId,
        p_user_id: user.id,
        p_side_choice: side,
      });

      if (error) throw error;
      if (data !== 'OK') throw new Error(data);

      toast({
        title: "Side Selected",
        description: `You chose ${side} side`,
      });

      setSidePickMode(false);
      onVetoComplete();
    } catch (err: any) {
      toast({
        title: "Failed to select side",
        description: err.message,
        variant: "destructive",
      });
    }
  };

  // Handle map action (ban/pick)
  const handleMapAction = async (mapId: string) => {
    if (!user || !vetoState?.canUserAct) {
      toast({
        title: "Cannot Act",
        description: vetoState?.turnError || "Not your turn",
        variant: "destructive",
      });
      return;
    }

    const success = await performAction(mapId, user.id);
    
    if (success) {
      toast({
        title: "Action Successful",
        description: "Veto action completed",
      });
      
      // Check if we need side selection for BO1
      if (vetoState.currentPosition === vetoState.banSequence.length + 1) {
        // All bans done, final map picked, now need side choice
        if (vetoState.homeTeamId === userTeam?.id) {
          setSidePickMode(true);
        }
      }
    }
  };

  // Auto-complete when veto is done
  useEffect(() => {
    if (vetoState?.status === 'completed') {
      onVetoComplete();
    }
  }, [vetoState?.status, onVetoComplete]);

  if (!vetoState && loading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl bg-slate-900 border-slate-700 text-white">
          <DialogHeader>
            <DialogTitle>Map Veto - {team1Name} vs {team2Name}</DialogTitle>
            <DialogDescription>Loading veto session...</DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (error || !vetoState) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl bg-slate-900 border-slate-700 text-white">
          <DialogHeader>
            <DialogTitle>Map Veto Error</DialogTitle>
            <DialogDescription>Failed to load veto session: {error}</DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-center py-12 text-red-400">
            <AlertTriangle className="w-6 h-6 mr-2" />
            Unable to load veto data
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const homeTeamName = vetoState.homeTeamId === userTeam?.id ? 'Your Team' : 'Opponent';
  const awayTeamName = vetoState.awayTeamId === userTeam?.id ? 'Your Team' : 'Opponent';
  
  const currentTeamName = vetoState.expectedTurnTeamId === vetoState.homeTeamId ? homeTeamName : awayTeamName;
  const actionType = vetoState.currentPosition <= vetoState.banSequence.length ? 'ban' : 'pick';
  
  const finalPick = vetoState.actions.find(a => a.action === 'pick');
  const pickedMap = tournamentMapPool.find(m => m.id === finalPick?.mapId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-slate-900 border-slate-700 text-white">
        <DialogHeader>
          <DialogTitle>Map Veto - {team1Name} vs {team2Name}</DialogTitle>
          <DialogDescription>
            Centralized veto state management - Turn sequence guaranteed
            {vetoState.turnError && (
              <div className="text-red-400 mt-1 text-sm">⚠️ {vetoState.turnError}</div>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Team Assignments */}
          <div className="flex gap-4 justify-center">
            <Badge className="bg-yellow-900/50 text-yellow-200 border-yellow-600">
              Home: {team1Name}
            </Badge>
            <Badge className="bg-blue-900/50 text-blue-200 border-blue-600">
              Away: {team2Name}
            </Badge>
          </div>

          {/* Turn Status */}
          <div className="flex items-center justify-center gap-3 p-4 bg-slate-800/50 rounded-lg border border-slate-700">
            {vetoState.status === 'completed' ? (
              <div className="flex items-center gap-2 text-green-400">
                <CheckCircle className="w-5 h-5" />
                Veto Complete
              </div>
            ) : (
              <>
                <Clock className="w-5 h-5 text-blue-400" />
                <span className="text-slate-300">
                  Position {vetoState.currentPosition}: {currentTeamName} to {actionType}
                </span>
                {vetoState.isUsersTurn && (
                  <Badge className="bg-green-900/50 text-green-200 border-green-600 ml-2">
                    Your Turn
                  </Badge>
                )}
                {vetoState.turnError && (
                  <Button
                    onClick={fixTurnSync}
                    size="sm"
                    className="bg-yellow-600 hover:bg-yellow-700 ml-2"
                  >
                    Fix Sync
                  </Button>
                )}
              </>
            )}
          </div>

          {/* Turn Sequence Debug Info */}
          <div className="text-xs text-slate-500 text-center">
            Expected: {vetoState.expectedTurnTeamId?.slice(0, 8)} | 
            DB Shows: {vetoState.currentTurnTeamId?.slice(0, 8)} | 
            Can Act: {vetoState.canUserAct ? 'Yes' : 'No'}
          </div>

          {/* Veto History */}
          <MapVetoHistory vetoActions={vetoState.actions.map(a => ({
            id: a.id,
            action: a.action,
            team_id: a.teamId,
            map_id: a.mapId,
            order_number: a.orderNumber,
            maps: { display_name: a.mapName }
          }))} />

          {/* Final Result */}
          {vetoState.status === 'completed' && finalPick && pickedMap && (
            <div className="text-center p-6 bg-green-900/20 border border-green-700 rounded-lg">
              <div className="text-xl font-bold text-green-300 mb-4">Veto Complete!</div>
              <div className="flex items-center justify-center gap-4">
                {pickedMap.thumbnail_url && (
                  <img 
                    src={pickedMap.thumbnail_url} 
                    alt={pickedMap.display_name}
                    className="w-16 h-16 rounded border-2 border-green-600"
                  />
                )}
                <div>
                  <div className="text-lg font-semibold text-white">{pickedMap.display_name}</div>
                  <div className="text-green-200">Selected Map</div>
                </div>
              </div>
            </div>
          )}

          {/* Side Choice Mode */}
          {sidePickMode && vetoState.homeTeamId === userTeam?.id && (
            <div className="text-center p-6 bg-blue-900/20 border border-blue-700 rounded-lg">
              <div className="text-lg font-semibold mb-4">Choose Starting Side</div>
              <div className="flex gap-4 justify-center">
                <Button
                  onClick={() => handleSideChoice('attack')}
                  className="bg-red-600 hover:bg-red-700"
                >
                  Attack
                </Button>
                <Button
                  onClick={() => handleSideChoice('defend')}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  Defend
                </Button>
              </div>
            </div>
          )}

          {/* Map Grid */}
          {!sidePickMode && vetoState.status !== 'completed' && (
            <MapVetoMapGrid
              maps={tournamentMapPool}
              canAct={vetoState.canUserAct}
              currentAction={actionType as 'ban' | 'pick'}
              bestOf={1}
              remainingMaps={tournamentMapPool.filter(map => 
                !vetoState.actions.some(action => action.mapId === map.id)
              )}
              vetoActions={vetoState.actions.map(a => ({
                id: a.id,
                action: a.action,
                team_id: a.teamId,
                map_id: a.mapId,
                order_number: a.orderNumber,
                maps: { display_name: a.mapName }
              }))}
              onMapAction={handleMapAction}
              currentTeamTurn={vetoState.expectedTurnTeamId || ''}
              getMapStatus={(mapId) => {
                const action = vetoState.actions.find(a => a.mapId === mapId);
                if (!action) return null;
                return {
                  action: action.action,
                  team: action.teamId === userTeam?.id ? "Your Team" : "Opponent"
                };
              }}
              isMapAvailable={(mapId) => !vetoState.actions.some(a => a.mapId === mapId)}
            />
          )}

          {/* Instructions */}
          <div className="text-sm text-slate-400 text-center p-4 bg-slate-800/30 rounded-lg">
            <div className="font-medium mb-2">BO1 Veto Sequence:</div>
            <div>Home → Away → Away → Home → Away → Home</div>
            <div className="mt-2">Then home team picks starting side</div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}