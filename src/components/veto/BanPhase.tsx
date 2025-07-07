import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { VetoService } from '@/services/VetoService';
import { VetoSessionData } from '@/hooks/useVetoSession';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Ban, Loader2 } from 'lucide-react';

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
}

export function BanPhase({ matchId, session, isMyTurn, canAct, onBanComplete }: BanPhaseProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [maps, setMaps] = useState<MapData[]>([]);
  const [banning, setBanning] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Get tournament ID from session (we'll need to modify this)
  const [tournamentId, setTournamentId] = useState<string | null>(null);

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

  const handleBanMap = async (mapId: string) => {
    if (!user || !isMyTurn) return;

    setBanning(mapId);
    try {
      const result = await VetoService.performBan(matchId, user.id, mapId);
      
      if (result.success) {
        toast({
          title: "Map Banned",
          description: "Map has been banned successfully",
        });
        onBanComplete();
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to ban map",
          variant: "destructive"
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to ban map",
        variant: "destructive"
      });
    } finally {
      setBanning(null);
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
        <Ban className="w-12 h-12 mx-auto text-red-400 mb-4" />
        <h3 className="text-xl font-semibold text-white mb-2">
          Ban Maps
        </h3>
        <p className="text-slate-400">
          Click on a map to ban it from the match
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {maps.map(map => {
          const banned = isBanned(map.id);
          const picked = isPicked(map.id);
          const isCurrentlyBanning = banning === map.id;
          
          return (
            <div
              key={map.id}
              className={`relative rounded-lg border-2 transition-all ${
                banned 
                  ? 'border-red-500 bg-red-500/20' 
                  : picked
                  ? 'border-green-500 bg-green-500/20'
                  : isMyTurn && canAct
                  ? 'border-slate-600 bg-slate-800 hover:border-red-400 hover:bg-red-500/10 cursor-pointer'
                  : 'border-slate-700 bg-slate-800'
              }`}
              onClick={() => !banned && !picked && isMyTurn && canAct && handleBanMap(map.id)}
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
              {(banned || picked || isCurrentlyBanning) && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-lg">
                  {isCurrentlyBanning ? (
                    <div className="text-center">
                      <Loader2 className="w-6 h-6 animate-spin text-white mx-auto mb-1" />
                      <span className="text-white text-sm">Banning...</span>
                    </div>
                  ) : banned ? (
                    <div className="text-center">
                      <Ban className="w-6 h-6 text-red-400 mx-auto mb-1" />
                      <span className="text-red-400 text-sm font-semibold">BANNED</span>
                    </div>
                  ) : picked ? (
                    <div className="text-center">
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
          Waiting for the other team to ban a map...
        </p>
      )}
    </div>
  );
}