import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Users, Crown, X, Check, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import Header from "@/components/Header";

interface Map {
  id: string;
  name: string;
  display_name: string;
  image_url: string | null;
  is_active: boolean;
}

interface VetoSession {
  id: string;
  match_id: string;
  status: "pending" | "active" | "completed";
  current_turn_team_id: string | null;
  veto_order: any[];
  started_at: string | null;
  completed_at: string | null;
}

interface VetoAction {
  id: string;
  veto_session_id: string;
  team_id: string;
  map_id: string;
  action: "ban" | "pick";
  order_number: number;
  performed_at: string;
  performed_by: string;
}

interface Match {
  id: string;
  tournament_id: string;
  team1_id: string;
  team2_id: string;
  best_of: number;
  status: string;
  team1?: { name: string; id: string };
  team2?: { name: string; id: string };
}

const MapVeto = () => {
  const { matchId } = useParams<{ matchId: string }>();
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();
  const { toast } = useToast();

  const [match, setMatch] = useState<Match | null>(null);
  const [maps, setMaps] = useState<Map[]>([]);
  const [vetoSession, setVetoSession] = useState<VetoSession | null>(null);
  const [vetoActions, setVetoActions] = useState<VetoAction[]>([]);
  const [isPlayerTeamCaptain, setIsPlayerTeamCaptain] = useState(false);
  const [userTeamId, setUserTeamId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!matchId) return;

      try {
        // Fetch match details
        const { data: matchData, error: matchError } = await supabase
          .from('matches')
          .select(`
            *,
            team1:teams!matches_team1_id_fkey (name, id),
            team2:teams!matches_team2_id_fkey (name, id)
          `)
          .eq('id', matchId)
          .single();

        if (matchError) throw matchError;
        setMatch(matchData);

        // Fetch active maps
        const { data: mapsData, error: mapsError } = await supabase
          .from('maps')
          .select('*')
          .eq('is_active', true)
          .order('display_name');

        if (mapsError) throw mapsError;
        setMaps(mapsData || []);

        // Fetch or create veto session
        let { data: sessionData, error: sessionError } = await supabase
          .from('map_veto_sessions')
          .select('*')
          .eq('match_id', matchId)
          .single();

        if (sessionError && sessionError.code === 'PGRST116') {
          // No session exists, create one
          const vetoOrder = generateVetoOrder(matchData.best_of);
          const { data: newSession, error: createError } = await supabase
            .from('map_veto_sessions')
            .insert({
              match_id: matchId,
              status: 'pending',
              current_turn_team_id: matchData.team1_id,
              veto_order: vetoOrder
            })
            .select()
            .single();

          if (createError) throw createError;
          sessionData = newSession;
        } else if (sessionError) {
          throw sessionError;
        }

        // Convert the status to our expected type
        const convertedSession: VetoSession = {
          ...sessionData,
          status: sessionData.status === 'in_progress' ? 'active' : sessionData.status as "pending" | "active" | "completed"
        };
        setVetoSession(convertedSession);

        // Fetch veto actions
        const { data: actionsData, error: actionsError } = await supabase
          .from('map_veto_actions')
          .select('*')
          .eq('veto_session_id', sessionData.id)
          .order('order_number');

        if (actionsError) throw actionsError;
        setVetoActions(actionsData || []);

        // Check if current user is a captain of either team
        if (user) {
          const { data: captainData } = await supabase
            .from('team_members')
            .select('team_id, is_captain')
            .eq('user_id', user.id)
            .eq('is_captain', true)
            .in('team_id', [matchData.team1_id, matchData.team2_id]);

          if (captainData && captainData.length > 0) {
            setIsPlayerTeamCaptain(true);
            setUserTeamId(captainData[0].team_id);
          }
        }

      } catch (error: any) {
        console.error('Error fetching veto data:', error);
        toast({
          title: "Error",
          description: "Failed to load map veto session",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    // Set up real-time subscription for veto actions
    const subscription = supabase
      .channel('veto-updates')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'map_veto_actions' },
        () => {
          fetchData(); // Refetch data when actions change
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [matchId, user, toast]);

  const generateVetoOrder = (bestOf: number) => {
    if (bestOf === 1) {
      return [
        { team: 1, action: 'ban' },
        { team: 2, action: 'ban' },
        { team: 1, action: 'ban' },
        { team: 2, action: 'ban' },
        { team: 1, action: 'ban' },
        { team: 2, action: 'ban' },
        { team: 1, action: 'pick' } // Last map remaining
      ];
    } else if (bestOf === 3) {
      return [
        { team: 1, action: 'ban' },
        { team: 2, action: 'ban' },
        { team: 1, action: 'pick' },
        { team: 2, action: 'pick' },
        { team: 1, action: 'ban' },
        { team: 2, action: 'ban' },
        { team: 1, action: 'pick' } // Decider map
      ];
    } else { // BO5
      return [
        { team: 1, action: 'ban' },
        { team: 2, action: 'ban' },
        { team: 1, action: 'pick' },
        { team: 2, action: 'pick' },
        { team: 1, action: 'pick' },
        { team: 2, action: 'pick' },
        { team: 1, action: 'ban' },
        { team: 2, action: 'ban' },
        { team: 1, action: 'pick' } // Decider map
      ];
    }
  };

  const performVetoAction = async (mapId: string, action: 'ban' | 'pick') => {
    if (!vetoSession || !userTeamId || !match) return;

    try {
      const nextOrderNumber = vetoActions.length + 1;
      
      const { error } = await supabase
        .from('map_veto_actions')
        .insert({
          veto_session_id: vetoSession.id,
          team_id: userTeamId,
          map_id: mapId,
          action,
          order_number: nextOrderNumber,
          performed_by: user?.id || ''
        });

      if (error) throw error;

      // Update session with next team's turn
      const currentOrder = vetoSession.veto_order[nextOrderNumber - 1];
      const nextOrder = vetoSession.veto_order[nextOrderNumber];
      
      if (nextOrder) {
        const nextTeamId = nextOrder.team === 1 ? match.team1_id : match.team2_id;
        await supabase
          .from('map_veto_sessions')
          .update({ 
            current_turn_team_id: nextTeamId,
            status: 'active'
          })
          .eq('id', vetoSession.id);
      } else {
        // Veto session completed
        await supabase
          .from('map_veto_sessions')
          .update({ 
            status: 'completed',
            completed_at: new Date().toISOString()
          })
          .eq('id', vetoSession.id);
      }

      toast({
        title: "Success",
        description: `Map ${action === 'ban' ? 'banned' : 'picked'} successfully`,
      });

    } catch (error: any) {
      console.error('Error performing veto action:', error);
      toast({
        title: "Error",
        description: "Failed to perform veto action",
        variant: "destructive",
      });
    }
  };

  const getMapStatus = (mapId: string) => {
    const action = vetoActions.find(a => a.map_id === mapId);
    if (!action) return null;
    return { action: action.action, teamId: action.team_id };
  };

  const getCurrentTurnInfo = () => {
    if (!vetoSession || !match) return null;
    
    const currentOrderIndex = vetoActions.length;
    const currentOrder = vetoSession.veto_order[currentOrderIndex];
    
    if (!currentOrder) return null;
    
    const teamName = currentOrder.team === 1 ? match.team1?.name : match.team2?.name;
    return {
      teamName,
      action: currentOrder.action,
      isUserTurn: vetoSession.current_turn_team_id === userTeamId
    };
  };

  const getAvailableMaps = () => {
    const bannedMapIds = vetoActions.filter(a => a.action === 'ban').map(a => a.map_id);
    const pickedMapIds = vetoActions.filter(a => a.action === 'pick').map(a => a.map_id);
    return maps.filter(map => !bannedMapIds.includes(map.id) && !pickedMapIds.includes(map.id));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <p className="text-white text-lg">Loading map veto...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!match || !vetoSession) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <p className="text-white text-lg">Map veto session not found</p>
            <Button className="mt-4" onClick={() => navigate(-1)}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Go Back
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const turnInfo = getCurrentTurnInfo();
  const availableMaps = getAvailableMaps();
  const pickedMaps = vetoActions.filter(a => a.action === 'pick');

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <Header />
      
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center gap-4 mb-8">
          <Button variant="outline" onClick={() => navigate(-1)} className="border-slate-600 text-white">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-white">Map Veto</h1>
            <p className="text-slate-400">
              {match.team1?.name} vs {match.team2?.name} - BO{match.best_of}
            </p>
          </div>
        </div>

        {/* Current Turn Info */}
        {turnInfo && vetoSession.status !== 'completed' && (
          <Card className="bg-slate-800 border-slate-700 mb-6">
            <CardContent className="p-4">
              <div className="flex items-center justify-center gap-4">
                <Crown className="w-5 h-5 text-yellow-500" />
                <span className="text-white text-lg">
                  {turnInfo.teamName}'s turn to {turnInfo.action}
                </span>
                {turnInfo.isUserTurn && (
                  <Badge className="bg-green-500/20 text-green-400">Your Turn</Badge>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Map Pool */}
        <Card className="bg-slate-800 border-slate-700 mb-6">
          <CardHeader>
            <CardTitle className="text-white">Map Pool</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {maps.map((map) => {
                const status = getMapStatus(map.id);
                const isAvailable = availableMaps.includes(map);
                const canInteract = turnInfo?.isUserTurn && isAvailable && (isPlayerTeamCaptain || isAdmin);
                
                return (
                  <div
                    key={map.id}
                    className={`relative p-4 rounded-lg border-2 transition-all ${
                      status?.action === 'ban' 
                        ? 'bg-red-500/20 border-red-500/50 opacity-50' 
                        : status?.action === 'pick'
                        ? 'bg-green-500/20 border-green-500/50'
                        : isAvailable
                        ? 'bg-slate-700 border-slate-600 hover:border-slate-500'
                        : 'bg-slate-700 border-slate-600 opacity-75'
                    }`}
                  >
                    {map.image_url && (
                      <img
                        src={map.image_url}
                        alt={map.display_name}
                        className="w-full h-32 object-cover rounded mb-2"
                      />
                    )}
                    
                    <h3 className="text-white font-medium text-center mb-2">{map.display_name}</h3>
                    
                    {status && (
                      <div className="absolute top-2 right-2">
                        {status.action === 'ban' ? (
                          <Badge className="bg-red-500/80 text-white">
                            <X className="w-3 h-3 mr-1" />
                            Banned
                          </Badge>
                        ) : (
                          <Badge className="bg-green-500/80 text-white">
                            <Check className="w-3 h-3 mr-1" />
                            Picked
                          </Badge>
                        )}
                      </div>
                    )}
                    
                    {canInteract && turnInfo && (
                      <div className="flex gap-2 mt-2">
                        {turnInfo.action === 'ban' && (
                          <Button
                            size="sm"
                            variant="destructive"
                            className="flex-1"
                            onClick={() => performVetoAction(map.id, 'ban')}
                          >
                            <X className="w-3 h-3 mr-1" />
                            Ban
                          </Button>
                        )}
                        {turnInfo.action === 'pick' && (
                          <Button
                            size="sm"
                            className="flex-1 bg-green-600 hover:bg-green-700"
                            onClick={() => performVetoAction(map.id, 'pick')}
                          >
                            <Check className="w-3 h-3 mr-1" />
                            Pick
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Picked Maps */}
        {pickedMaps.length > 0 && (
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white">Selected Maps</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {pickedMaps.map((action, index) => {
                  const map = maps.find(m => m.id === action.map_id);
                  const teamName = action.team_id === match.team1_id ? match.team1?.name : match.team2?.name;
                  
                  return (
                    <div key={action.id} className="flex items-center justify-between p-3 bg-slate-700 rounded">
                      <div className="flex items-center gap-3">
                        <Badge variant="outline" className="border-green-500 text-green-400">
                          Map {index + 1}
                        </Badge>
                        <span className="text-white font-medium">{map?.display_name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-slate-400" />
                        <span className="text-slate-300">{teamName}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {vetoSession.status === 'completed' && (
          <Card className="bg-green-500/20 border-green-500/30 mt-6">
            <CardContent className="p-4 text-center">
              <div className="text-green-400 font-medium text-lg">
                Map veto completed! The match can now begin.
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default MapVeto;
