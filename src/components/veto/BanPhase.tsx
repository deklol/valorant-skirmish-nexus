import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { VetoService } from '@/services/VetoService';
import { VetoSessionData } from '@/hooks/useVetoSession';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Ban, Loader2, Target } from 'lucide-react';

interface MapData {
  id: string;
  name: string;
  display_name: string;
  thumbnail_url?: string;
}

interface BanPhaseProps {
  matchId: string;
  session: VetoSessionData;
  isMyTurn: boolean;
  canAct: boolean;
  onBanComplete: () => void;
  bestOf?: number; // Add bestOf prop to determine action type
}

export function BanPhase({ matchId, session, isMyTurn, canAct, onBanComplete, bestOf = 1 }: BanPhaseProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [maps, setMaps] = useState<MapData[]>([]);
  const [processing, setProcessing] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Get tournament ID from session (we'll need to modify this)
  const [tournamentId, setTournamentId] = useState<string | null>(null);
  
  // Determine if current action should be pick or ban based on sequence
  const getCurrentActionType = () => {
    const actionCount = session.actions.length;
    
    if (bestOf === 1) {
      // BO1: All bans until final auto-pick
      return 'ban';
    } else if (bestOf === 3) {
      // BO3: ban-ban-pick-pick-ban-ban-pick
      const sequence = ['ban', 'ban', 'pick', 'pick', 'ban', 'ban', 'pick'];
      return sequence[actionCount] || 'ban';
    }
    
    return 'ban'; // Default fallback
  };
  
  const currentActionType = getCurrentActionType();

  useEffect(() => {
    // Get tournament ID from match
    const fetchTournamentId = async () => {
      try {
        const { data } = await supabase
          .from('matches')
          .select('tournament_id')
          .eq('id', matchId)
          .single();
        
        if (data) {
          setTournamentId(data.tournament_id);
        }
      } catch (error) {
        console.error('Error fetching tournament ID:', error);
      }
    };

    fetchTournamentId();
  }, [matchId]);

  useEffect(() => {
    if (!tournamentId) return;

    const fetchMaps = async () => {
      setLoading(true);
      const { data, error } = await VetoService.getTournamentMaps(tournamentId);
      
      if (error) {
        toast({
          title: "Error",
          description: "Failed to load tournament maps",
          variant: "destructive"
        });
      } else {
        setMaps(data);
      }
      setLoading(false);
    };

    fetchMaps();
  }, [tournamentId, toast]);

  const handleMapAction = async (mapId: string) => {
    if (!user || !isMyTurn) return;

    setProcessing(mapId);
    try {
      const result = await VetoService.performBan(matchId, user.id, mapId);
      
      if (result.success) {
        toast({
          title: currentActionType === 'ban' ? "Map Banned" : "Map Selected",
          description: currentActionType === 'ban' 
            ? "Map has been banned successfully" 
            : "Map has been selected for the match",
        });
        onBanComplete();
      } else {
        toast({
          title: "Error",
          description: result.error || `Failed to ${currentActionType} map`,
          variant: "destructive"
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || `Failed to ${currentActionType} map`,
        variant: "destructive"
      });
    } finally {
      setProcessing(null);
    }
  };

  const isBanned = (mapId: string) => {
    return session.actions.some(action => 
      action.map.id === mapId && action.action === 'ban'
    );
  };

  const isPicked = (mapId: string) => {
    return session.actions.some(action => 
      action.map.id === mapId && action.action === 'pick'
    );
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <Loader2 className="w-8 h-8 animate-spin text-blue-400 mx-auto mb-4" />
        <p className="text-slate-400">Loading maps...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="text-center mb-6">
        {currentActionType === 'ban' ? (
          <Ban className="w-12 h-12 mx-auto text-red-400 mb-4" />
        ) : (
          <Target className="w-12 h-12 mx-auto text-green-400 mb-4" />
        )}
        <h3 className="text-xl font-semibold text-white mb-2">
          {currentActionType === 'ban' ? 'Ban Maps' : 'Pick Map'}
        </h3>
        <p className="text-slate-400">
          {currentActionType === 'ban' 
            ? 'Click on a map to ban it from the match'
            : 'Click on a map to select it for the match'
          }
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {maps.map(map => {
          const banned = isBanned(map.id);
          const picked = isPicked(map.id);
          const isCurrentlyProcessing = processing === map.id;
          
          return (
            <div
              key={map.id}
              className={`relative rounded-lg border-2 transition-all ${
                banned 
                  ? 'border-red-500 bg-red-500/20' 
                  : picked
                  ? 'border-green-500 bg-green-500/20'
                  : isMyTurn && canAct
                  ? `border-slate-600 bg-slate-800 hover:border-${currentActionType === 'ban' ? 'red' : 'green'}-400 hover:bg-${currentActionType === 'ban' ? 'red' : 'green'}-500/10 cursor-pointer`
                  : 'border-slate-700 bg-slate-800'
              }`}
              onClick={() => !banned && !picked && isMyTurn && canAct && handleMapAction(map.id)}
            >
              {/* Map thumbnail or placeholder */}
              <div className="aspect-video bg-slate-700 rounded-t-md overflow-hidden">
                {map.thumbnail_url ? (
                  <img 
                    src={map.thumbnail_url} 
                    alt={map.display_name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-500">
                    {map.display_name}
                  </div>
                )}
              </div>

              {/* Map name */}
              <div className="p-3">
                <h4 className="font-semibold text-white text-sm">
                  {map.display_name}
                </h4>
              </div>

              {/* Status overlay */}
              {(banned || picked || isCurrentlyProcessing) && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-lg">
                  {isCurrentlyProcessing ? (
                    <div className="text-center">
                      <Loader2 className="w-6 h-6 animate-spin text-white mx-auto mb-1" />
                      <span className="text-white text-sm">
                        {currentActionType === 'ban' ? 'Banning...' : 'Selecting...'}
                      </span>
                    </div>
                  ) : banned ? (
                    <div className="text-center">
                      <Ban className="w-6 h-6 text-red-400 mx-auto mb-1" />
                      <span className="text-red-400 text-sm font-semibold">BANNED</span>
                    </div>
                  ) : picked ? (
                    <div className="text-center">
                      <Target className="w-6 h-6 text-green-400 mx-auto mb-1" />
                      <span className="text-green-400 text-sm font-semibold">SELECTED</span>
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {!isMyTurn && (
        <p className="text-center text-slate-400 mt-4">
          Waiting for the other team to {currentActionType} a map...
        </p>
      )}
    </div>
  );
}