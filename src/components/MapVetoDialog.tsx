import { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Map, Ban, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useMapVetoActionsRealtime, useMapVetoSessionRealtime } from "@/hooks/useMapVetoRealtime";
import ClickableUsername from "@/components/ClickableUsername";

interface MapVetoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  matchId: string;
  vetoSessionId: string; // <-- NEW prop
  team1Name: string;
  team2Name: string;
  currentTeamTurn: string;
  userTeamId: string | null;
  isUserCaptain?: boolean;
  teamSize?: number | null;
}

interface MapData {
  id: string;
  name: string;
  display_name: string;
  thumbnail_url: string | null;
}

interface VetoAction {
  id: string;
  action: 'ban' | 'pick';
  map_id: string;
  team_id: string;
  order_number: number;
  performed_by?: string | null; // <-- add this line
  performed_at?: string | null; // <-- add this line
  map?: MapData;
  users?: {
    discord_username?: string;
  };
}

const MapVetoDialog = ({
  open,
  onOpenChange,
  matchId,
  vetoSessionId, // <-- NEW prop
  team1Name,
  team2Name,
  currentTeamTurn,
  userTeamId,
  isUserCaptain = false,
  teamSize = null,
}: MapVetoDialogProps) => {
  const [maps, setMaps] = useState<MapData[]>([]);
  const [vetoActions, setVetoActions] = useState<VetoAction[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentAction, setCurrentAction] = useState<'ban' | 'pick'>('ban');
  const [sessionTurnTeam, setSessionTurnTeam] = useState(currentTeamTurn);
  const { toast } = useToast();

  // --- Realtime subscriptions ---
  const vetoSessionIdSafe = vetoSessionId || ""; // avoid undefined

  // Keep veto actions in realtime
  const fetchVetoActions = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('map_veto_actions')
        .select(`
          *,
          maps:map_id (*),
          users:performed_by (discord_username)
        `)
        .eq('veto_session_id', vetoSessionId)
        .order('order_number');
      if (error) throw error;
      setVetoActions(data || []);
      // Determine currentAction from the order (alternate ban/pick)
      setCurrentAction((data?.length || 0) % 2 === 0 ? "ban" : "pick");
    } catch {}
  }, [vetoSessionId]);

  // Keep session "current turn" in realtime
  const fetchSession = useCallback(async () => {
    // Get latest current_turn_team_id
    if (!vetoSessionId) return;
    const { data, error } = await supabase
      .from("map_veto_sessions")
      .select("*")
      .eq("id", vetoSessionId)
      .single();
    if (data?.current_turn_team_id) {
      setSessionTurnTeam(data.current_turn_team_id);
    }
  }, [vetoSessionId]);

  // Use custom realtime hooks (actions and session)
  useMapVetoActionsRealtime(vetoSessionId, () => {
    fetchVetoActions();
    fetchSession();
  });
  useMapVetoSessionRealtime(vetoSessionId, () => {
    fetchSession();
  });

  useEffect(() => {
    if (open) {
      fetchMaps();
      fetchVetoActions();
      fetchSession();
    }
  }, [open, vetoSessionId, fetchVetoActions, fetchSession]);

  const fetchMaps = async () => {
    try {
      const { data, error } = await supabase
        .from('maps')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setMaps(data || []);
    } catch (error: any) {
      console.error('Error fetching maps:', error);
      toast({
        title: "Error",
        description: "Failed to load maps",
        variant: "destructive",
      });
    }
  };

  const handleMapAction = async (mapId: string) => {
    if (!userTeamId || userTeamId !== sessionTurnTeam) {
      toast({
        title: "Not Your Turn",
        description: "Wait for your turn to make a selection",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // Fix: await the getUser call and get the user id correctly
      const { data: authUser } = await supabase.auth.getUser();
      const performedById = authUser?.user?.id ?? null;

      const { error } = await supabase.from('map_veto_actions').insert({
        veto_session_id: vetoSessionId,
        team_id: userTeamId,
        map_id: mapId,
        action: currentAction,
        order_number: vetoActions.length + 1,
        performed_by: performedById
      });

      if (error) throw error;

      toast({
        title: `Map ${currentAction === 'ban' ? 'Banned' : 'Picked'}`,
        description: `Successfully ${currentAction === 'ban' ? 'banned' : 'picked'} the map`,
      });

      // Calculate if veto is now complete (e.g., only one map left, or pick/ban limit)
      const mapCount = maps.length;
      if (vetoActions.length + 1 >= mapCount) {
        // auto-complete session
        await supabase
          .from("map_veto_sessions")
          .update({
            status: "completed",
            completed_at: new Date().toISOString()
          })
          .eq("id", vetoSessionId);

        toast({
          title: "Map Veto Completed",
          description: "All veto actions are finished. Match is ready.",
        });
      } else {
        // Switch turn team
        const nextTeamId = userTeamId === team1Name ? team2Name : team1Name; // fallback: alternate
        // But the actual IDs are used
        const nextTeam = userTeamId === team1Name ? team2Name : team1Name;
        await supabase
          .from("map_veto_sessions")
          .update({
            current_turn_team_id: nextTeamId
          })
          .eq("id", vetoSessionId);
      }

      await fetchVetoActions();
    } catch (error: any) {
      console.error('Error performing map action:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to perform action",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getMapStatus = (mapId: string) => {
    const action = vetoActions.find(action => action.map_id === mapId);
    if (!action) return null;
    
    return {
      action: action.action,
      team: action.team_id === currentTeamTurn ? 'Your Team' : 'Opponent'
    };
  };

  const isMapAvailable = (mapId: string) => {
    return !vetoActions.some(action => action.map_id === mapId);
  };

  const isUserTurn = userTeamId === currentTeamTurn;
  const canAct = isUserTurn && (
    (teamSize === 1) ||
    (teamSize && teamSize > 1 && isUserCaptain)
  );

  function formatDateTime(dateStr: string) {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    return date.toLocaleString(undefined, {
      hour: "2-digit", minute: "2-digit", second: "2-digit"
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-slate-900 border-slate-700 text-white">
        <DialogHeader>
          <DialogTitle className="text-white">Map Veto - {team1Name} vs {team2Name}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Current Turn Indicator */}
          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="text-white">
                  <span className="font-medium">Current Turn: </span>
                  <span className={isUserTurn ? "text-green-400" : "text-red-400"}>
                    {isUserTurn
                      ? (canAct
                          ? (teamSize === 1 ? "Your Team" : isUserCaptain ? "Your Team Captain" : "Not Captain")
                          : "Not Captain")
                      : "Opponent"}
                  </span>
                  {/* Show a badge if user is not the captain */}
                  {(isUserTurn && teamSize && teamSize > 1 && !isUserCaptain) && (
                    <span className="ml-2 text-xs text-yellow-400">(Only Captain can veto)</span>
                  )}
                </div>
                <Badge className={currentAction === 'ban' ? "bg-red-500/20 text-red-400 border-red-500/30" : "bg-green-500/20 text-green-400 border-green-500/30"}>
                  {currentAction === 'ban' ? 'BAN' : 'PICK'} Phase
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Veto History */}
          {vetoActions.length > 0 && (
            <Card className="bg-slate-800 border-slate-700">
              <CardContent className="p-4">
                <h3 className="text-white font-medium mb-3">Veto History</h3>
                <div className="space-y-2">
                  {vetoActions.map((action, index) => (
                    <div key={action.id} className="flex items-center justify-between bg-slate-700 p-2 rounded">
                      <div className="flex items-center gap-3">
                        <span className="text-slate-400 text-sm">#{index + 1}</span>
                        <div className="flex items-center gap-2">
                          {action.action === 'ban' ? (
                            <Ban className="w-4 h-4 text-red-400" />
                          ) : (
                            <CheckCircle className="w-4 h-4 text-green-400" />
                          )}
                          <span className="text-white">{action.map?.display_name}</span>
                          {action.users && action.users.discord_username && (
                            <span className="text-sm text-blue-300 ml-2">
                              by <ClickableUsername userId={action.performed_by} username={action.users.discord_username} />
                            </span>
                          )}
                          <span className="ml-2 text-xs text-slate-400">
                            {formatDateTime(action.performed_at)}
                          </span>
                        </div>
                      </div>
                      <Badge className={action.action === 'ban' ? "bg-red-500/20 text-red-400 border-red-500/30" : "bg-green-500/20 text-green-400 border-green-500/30"}>
                        {action.action.toUpperCase()}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Map Selection Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {maps.map((map) => {
              const status = getMapStatus(map.id);
              const available = isMapAvailable(map.id);

              return (
                <Card
                  key={map.id}
                  className={`border-slate-600 transition-all cursor-pointer ${
                    !available
                      ? 'bg-slate-700 opacity-50'
                      : canAct && available
                        ? 'bg-slate-800 hover:bg-slate-700 hover:border-slate-500'
                        : 'bg-slate-800'
                  }`}
                  onClick={() => available && canAct && handleMapAction(map.id)}
                >
                  <CardContent className="p-4">
                    <div className="space-y-3">
                      {/* Map Image Placeholder */}
                      <div className="aspect-video bg-slate-600 rounded-lg flex items-center justify-center">
                        {map.thumbnail_url ? (
                          <img 
                            src={map.thumbnail_url} 
                            alt={map.display_name}
                            className="w-full h-full object-cover rounded-lg"
                          />
                        ) : (
                          <Map className="w-8 h-8 text-slate-400" />
                        )}
                      </div>
                      
                      {/* Map Name */}
                      <div className="text-center">
                        <h3 className="text-white font-medium">{map.display_name}</h3>
                      </div>
                      
                      {/* Status */}
                      <div className="text-center">
                        {status ? (
                          <Badge className={status.action === 'ban' ? "bg-red-500/20 text-red-400 border-red-500/30" : "bg-green-500/20 text-green-400 border-green-500/30"}>
                            {status.action.toUpperCase()} by {status.team}
                          </Badge>
                        ) : available && isUserTurn ? (
                          <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">
                            Click to {currentAction.toUpperCase()}
                          </Badge>
                        ) : (
                          <Badge className="bg-slate-500/20 text-slate-400 border-slate-500/30">
                            Available
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Instructions */}
          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="p-4">
              <div className="text-sm text-slate-400 space-y-1">
                <p>• Teams alternate between banning and picking maps</p>
                <p>• Banned maps cannot be played in this match</p>
                <p>• Picked maps will be played in the order they were selected</p>
                <p>• Wait for your turn to make a selection</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default MapVetoDialog;

// NOTE: This file is now > 280 lines. Consider refactoring this dialog into smaller subcomponents!
