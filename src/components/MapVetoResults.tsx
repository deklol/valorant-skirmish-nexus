
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Ban, CheckCircle, Map } from "lucide-react";

interface MapVetoResultsProps {
  matchId: string;
}

export default function MapVetoResults({ matchId }: MapVetoResultsProps) {
  const [vetoSessionId, setVetoSessionId] = useState<string | null>(null);
  const [actions, setActions] = useState<any[]>([]);
  const [tournamentMapPool, setTournamentMapPool] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadSession() {
      setLoading(true);
      
      // Find veto session and get tournament info
      const { data: match } = await supabase
        .from("matches")
        .select(`
          tournament_id,
          tournaments:tournament_id (
            map_pool
          )
        `)
        .eq("id", matchId)
        .maybeSingle();

      // Load tournament map pool
      if (match?.tournaments?.map_pool && Array.isArray(match.tournaments.map_pool)) {
        const mapIds = match.tournaments.map_pool;
        if (mapIds.length > 0) {
          const { data: mapData } = await supabase
            .from('maps')
            .select('id, name, display_name, thumbnail_url, is_active')
            .in('id', mapIds);
          
          if (mapData) {
            setTournamentMapPool(mapData.sort((a, b) => a.display_name.localeCompare(b.display_name)));
          }
        }
      }

      // Find veto session
      const { data: session } = await supabase
        .from("map_veto_sessions")
        .select("id")
        .eq("match_id", matchId)
        .eq("status", "completed")
        .maybeSingle();
        
      if (!session) {
        setVetoSessionId(null);
        setActions([]);
        setLoading(false);
        return;
      }
      setVetoSessionId(session.id);

      // Get all veto actions (with performer and map)
      const { data: vetoActions } = await supabase
        .from("map_veto_actions")
        .select(`
          *,
          maps:map_id (*),
          users:performed_by (discord_username)
        `)
        .eq("veto_session_id", session.id)
        .order("order_number");

      setActions(vetoActions || []);
      setLoading(false);
    }
    loadSession();
  }, [matchId]);

  if (loading) {
    return (
      <Card className="bg-slate-900 border-slate-700 my-6">
        <CardHeader>
          <CardTitle className="text-white">Map Veto Results</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-slate-400">Loading results...</div>
        </CardContent>
      </Card>
    );
  }
  
  if (!vetoSessionId) {
    return null;
  }
  
  // Group picks/bans
  const pickedMaps = actions.filter((a) => a.action === "pick");
  const bannedMaps = actions.filter((a) => a.action === "ban");

  return (
    <Card className="bg-slate-900 border-slate-700 my-6">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <Map className="w-5 h-5" />
          Map Veto Results
          <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">
            Pool: {tournamentMapPool.length} Maps
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Tournament Map Pool Overview */}
        {tournamentMapPool.length > 0 && (
          <div className="mb-4 p-3 bg-slate-800/50 border border-slate-600 rounded-lg">
            <h4 className="font-medium text-slate-300 mb-2 text-sm">Tournament Map Pool Used:</h4>
            <div className="flex flex-wrap gap-2">
              {tournamentMapPool.map(map => {
                const wasBanned = bannedMaps.some(ban => ban.map_id === map.id);
                const wasPicked = pickedMaps.some(pick => pick.map_id === map.id);
                
                return (
                  <div key={map.id} className={`flex items-center gap-1 px-2 py-1 rounded text-xs border ${
                    wasPicked 
                      ? "bg-green-600/20 border-green-500/40 text-green-200"
                      : wasBanned
                      ? "bg-red-600/20 border-red-500/40 text-red-300"
                      : "bg-slate-700/40 border-slate-600 text-slate-300"
                  }`}>
                    {map.thumbnail_url && (
                      <img src={map.thumbnail_url} alt={map.display_name} className="w-4 h-3 object-cover rounded" />
                    )}
                    <span>{map.display_name}</span>
                    {wasPicked && <CheckCircle className="w-3 h-3" />}
                    {wasBanned && <Ban className="w-3 h-3" />}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="mb-4">
          <h4 className="font-bold text-green-400 mb-2">Picked Maps</h4>
          <div className="flex flex-wrap gap-3">
            {pickedMaps.map((pick) => (
              <div key={pick.id} className="flex flex-col items-center gap-2 bg-green-600/20 border border-green-500/40 rounded-lg p-3">
                {pick.maps?.thumbnail_url && (
                  <img 
                    src={pick.maps.thumbnail_url} 
                    alt={pick.maps?.display_name}
                    className="w-24 h-16 object-cover rounded"
                  />
                )}
                <Badge className="bg-green-600/20 border-green-500/40 text-green-200">
                  {pick.maps?.display_name}
                </Badge>
                {pick.side_choice && (
                  <Badge className={
                    pick.side_choice === "attack"
                      ? "bg-red-700/30 text-red-200 border-red-500/40"
                      : "bg-blue-700/30 text-blue-200 border-blue-500/40"
                  }>
                    {pick.side_choice.toUpperCase()} SIDE
                  </Badge>
                )}
              </div>
            ))}
            {pickedMaps.length === 0 && <div className="text-slate-400">No picks</div>}
          </div>
        </div>
        
        <div className="mb-4">
          <h4 className="font-bold text-red-400 mb-2">Banned Maps</h4>
          <div className="flex flex-wrap gap-3">
            {bannedMaps.map((ban) => (
              <div key={ban.id} className="flex flex-col items-center gap-2 bg-red-600/20 border border-red-500/40 rounded-lg p-3">
                {ban.maps?.thumbnail_url && (
                  <img 
                    src={ban.maps.thumbnail_url} 
                    alt={ban.maps?.display_name}
                    className="w-24 h-16 object-cover rounded opacity-50"
                  />
                )}
                <Badge className="bg-red-600/20 border-red-500/40 text-red-200">
                  {ban.maps?.display_name}
                </Badge>
              </div>
            ))}
            {bannedMaps.length === 0 && <div className="text-slate-400">No bans</div>}
          </div>
        </div>
        
        <div>
          <h4 className="font-bold text-slate-300 mb-2">Full Timeline</h4>
          {actions.length ? (
            <div className="space-y-2">
              {actions.map((a, idx) => (
                <div key={a.id} className="flex items-center gap-2">
                  {a.action === "ban" ? (
                    <Ban className="w-4 h-4 text-red-400" />
                  ) : (
                    <CheckCircle className="w-4 h-4 text-green-400" />
                  )}
                  <span className="text-white">{a.maps?.display_name}</span>
                  {a.side_choice && (
                    <Badge className={
                      a.side_choice === "attack"
                        ? "bg-red-700/30 text-red-200 border-red-500/40"
                        : "bg-blue-700/30 text-blue-200 border-blue-500/40"
                    }>
                      {a.side_choice.toUpperCase()}
                    </Badge>
                  )}
                  {a.users?.discord_username && (
                    <span className="text-blue-300 text-xs ml-2">
                      by {a.users.discord_username}
                    </span>
                  )}
                  <span className="text-xs text-slate-400 ml-2">
                    {a.performed_at && new Date(a.performed_at).toLocaleTimeString()}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-slate-400">No veto actions found.</div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
