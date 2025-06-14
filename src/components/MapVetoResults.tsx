
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
  const [maps, setMaps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadSession() {
      setLoading(true);
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
        <CardTitle className="text-white">Map Veto Results</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          <h4 className="font-bold text-green-400 mb-2">Picked Maps</h4>
          <div className="flex flex-wrap gap-3">
            {pickedMaps.map((pick) => (
              <Badge key={pick.id} className="bg-green-600/20 border-green-500/40 text-green-200">
                {pick.maps?.display_name}
              </Badge>
            ))}
            {pickedMaps.length === 0 && <div className="text-slate-400">No picks</div>}
          </div>
        </div>
        <div className="mb-4">
          <h4 className="font-bold text-red-400 mb-2">Banned Maps</h4>
          <div className="flex flex-wrap gap-3">
            {bannedMaps.map((ban) => (
              <Badge key={ban.id} className="bg-red-600/20 border-red-500/40 text-red-200">
                {ban.maps?.display_name}
              </Badge>
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
