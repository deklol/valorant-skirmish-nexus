import React, { useEffect, useState, useCallback } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Map, RefreshCw, ShieldAlert, CheckCircle2, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import MapPickerDialog from "./MapPickerDialog";

interface VetoSession {
  id: string;
  match_id: string | null;
  status: string | null;
  current_turn_team_id: string | null;
  started_at: string | null;
  completed_at: string | null;
}

export default function VetoMedicManager() {
  const [sessions, setSessions] = useState<VetoSession[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionSessionId, setActionSessionId] = useState<string | null>(null);
  const [forceDialogOpen, setForceDialogOpen] = useState(false);
  const [maps, setMaps] = useState<any[]>([]);
  const [pickableMaps, setPickableMaps] = useState<any[]>([]);
  const [forceSession, setForceSession] = useState<VetoSession | null>(null);
  const { toast } = useToast();

  // Fetch ALL veto sessions (not limited to pending/in_progress!)
  const fetchSessions = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("map_veto_sessions")
      .select("*")
      .order("started_at", { ascending: false })
      .limit(40); // for admin, fetch the latest 40
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      setSessions([]);
    } else {
      setSessions(data || []);
    }
    setLoading(false);
  }, [toast]);

  // Fetch all active maps once
  const fetchMaps = useCallback(async () => {
    const { data, error } = await supabase
      .from("maps")
      .select("*")
      .eq("is_active", true)
      .order("display_name", { ascending: true });
    if (!error) setMaps(data || []);
  }, []);

  useEffect(() => {
    fetchSessions();
    fetchMaps();
  }, [fetchSessions, fetchMaps]);

  // Reset (clear the session's actions and set to pending)
  const resetSession = async (sessionId: string) => {
    setActionSessionId(sessionId);
    try {
      // 1. Delete all actions for this session
      const { error: actionsErr } = await supabase
        .from("map_veto_actions")
        .delete()
        .eq("veto_session_id", sessionId);
      if (actionsErr) throw actionsErr;

      // 2. Reset the session itself
      const { error: sessionErr } = await supabase
        .from("map_veto_sessions")
        .update({
          status: "pending",
          current_turn_team_id: null,
          started_at: null,
          completed_at: null,
        })
        .eq("id", sessionId);

      if (sessionErr) throw sessionErr;

      toast({
        title: "Veto Reset",
        description: "Veto session has been reset to pending.",
      });
      fetchSessions();
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to reset veto session.",
        variant: "destructive"
      });
    } finally {
      setActionSessionId(null);
    }
  };

  // Open the force-complete dialog, fetch possible maps to pick
  const openForceDialog = async (session: VetoSession) => {
    setForceSession(session);
    setActionSessionId(session.id);

    // 1. Find maps not yet picked/banned in this session
    const { data: takenMaps, error: actionsErr } = await supabase
      .from("map_veto_actions")
      .select("map_id")
      .eq("veto_session_id", session.id);

    if (actionsErr) {
      toast({ title: "Error", description: actionsErr.message, variant: "destructive" });
      setForceSession(null);
      setActionSessionId(null);
      return;
    }
    const takenIds = (takenMaps || []).map(a => a.map_id);
    const availableMaps = maps.filter((m: any) => !takenIds.includes(m.id));
    setPickableMaps(availableMaps || []);
    setForceDialogOpen(true);
    setActionSessionId(null);
  };

  // "Force Complete" + save picks
  const handleForceConfirm = async (selectedMapIds: string[]) => {
    if (!forceSession) return;
    setActionSessionId(forceSession.id);
    try {
      // Find the opposite team for final pick
      let sessionRow = forceSession;
      // Find which team's turn it was last
      let oppositeTeam: string | null = null;
      if (sessionRow.team1_id && sessionRow.team2_id && sessionRow.current_turn_team_id) {
        oppositeTeam =
          sessionRow.current_turn_team_id === sessionRow.team1_id
            ? sessionRow.team2_id
            : sessionRow.team1_id;
      }
      // Insert pick actions for each selected map as 'pick'
      for (const mapId of selectedMapIds) {
        await supabase.from("map_veto_actions").insert({
          veto_session_id: sessionRow.id,
          team_id: oppositeTeam,
          map_id: mapId,
          action: "pick",
          performed_by: null,
          order_number:
            (await getNextOrderNumber(sessionRow.id)),
        });
      }
      // Mark session as completed
      await supabase
        .from("map_veto_sessions")
        .update({
          status: "completed",
          completed_at: new Date().toISOString(),
        })
        .eq("id", sessionRow.id);

      toast({
        title: "Veto Forced Complete",
        description: `Veto session forcibly completed. Map(s) selected.`,
      });
      fetchSessions();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to complete veto.",
        variant: "destructive",
      });
    } finally {
      setActionSessionId(null);
      setForceDialogOpen(false);
    }
  };

  // Helper to get the next order number for actions in a session
  async function getNextOrderNumber(vetoSessionId: string): Promise<number> {
    const { data, error } = await supabase
      .from("map_veto_actions")
      .select("order_number")
      .eq("veto_session_id", vetoSessionId)
      .order("order_number", { ascending: false })
      .limit(1);

    if (error || !data || !data[0]) return 1;
    return (data[0].order_number || 0) + 1;
  }

  return (
    <>
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="flex gap-2 items-center text-white">
            <ShieldAlert className="w-5 h-5 text-yellow-300" />
            Veto Medic <span className="text-xs text-yellow-300">(Admin Veto Recovery)</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center text-slate-300 py-8">Loading veto sessions...</div>
          ) : sessions.length === 0 ? (
            <div className="text-center text-slate-400 py-8">No veto sessions found.</div>
          ) : (
            <div className="space-y-4">
              {sessions.map((session) => (
                <div
                  key={session.id}
                  className="flex flex-col md:flex-row md:items-center md:justify-between border border-slate-700 bg-slate-900 rounded-lg p-4 shadow"
                >
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={
                        session.status === "in_progress"
                          ? "bg-green-500/10 text-green-400 border-green-500/40"
                          : session.status === "completed"
                          ? "bg-blue-500/10 text-blue-400 border-blue-500/40"
                          : "bg-yellow-500/10 text-yellow-400 border-yellow-500/40"
                      }>
                        {session.status === "in_progress"
                          ? "In Progress"
                          : session.status === "completed"
                          ? "Completed"
                          : "Pending"}
                      </Badge>
                      <span className="text-sm text-slate-200 font-mono">Session ID: {session.id.slice(0, 8)}...</span>
                    </div>
                    <div className="text-xs text-slate-400">
                      <span>
                        <Map className="inline-block w-4 h-4 mr-1 text-slate-400" />
                        Match ID: <span className="font-mono">{session.match_id || "?"}</span>
                      </span>
                    </div>
                    {session.started_at && (
                      <div className="text-xs text-slate-500">
                        Started: {new Date(session.started_at).toLocaleString()}
                      </div>
                    )}
                    {session.completed_at && (
                      <div className="text-xs text-blue-400">
                        Completed: {new Date(session.completed_at).toLocaleString()}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2 items-center mt-2 md:mt-0">
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-yellow-500/40 text-yellow-400"
                      disabled={!!actionSessionId}
                      onClick={() => resetSession(session.id)}
                    >
                      <RefreshCw className="w-4 h-4 mr-1" /> Reset Veto
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-green-600/40 text-green-400"
                      disabled={!!actionSessionId}
                      onClick={() => openForceDialog(session)}
                    >
                      <CheckCircle2 className="w-4 h-4 mr-1" /> Force Complete
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      <MapPickerDialog
        open={forceDialogOpen}
        onOpenChange={(open) => setForceDialogOpen(open)}
        availableMaps={pickableMaps}
        onConfirm={handleForceConfirm}
        allowMultiPick={false}
        loading={!!actionSessionId}
      />
    </>
  );
}
