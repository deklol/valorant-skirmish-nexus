
import React, { useEffect, useState, useCallback } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Map, RefreshCw, ShieldAlert, CheckCircle2, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

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
  const { toast } = useToast();

  // Fetch all veto sessions currently pending or in_progress
  const fetchSessions = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("map_veto_sessions")
      .select("*")
      .in("status", ["pending", "in_progress"])
      .order("started_at", { ascending: false });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      setSessions([]);
    } else {
      setSessions(data);
    }
    setLoading(false);
  }, [toast]);

  useEffect(() => {
    fetchSessions();
    // Optionally: add realtime triggers here for full live admin view
  }, [fetchSessions]);

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

  // Force complete (marks session as completed immediately)
  const forceCompleteSession = async (sessionId: string) => {
    setActionSessionId(sessionId);
    try {
      await supabase
        .from("map_veto_sessions")
        .update({
          status: "completed",
          completed_at: new Date().toISOString(),
        })
        .eq("id", sessionId);

      toast({
        title: "Veto Forced Complete",
        description: "Veto session forcibly completed.",
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
    }
  };

  return (
    <Card className="bg-slate-800 border-slate-700">
      <CardHeader>
        <CardTitle className="flex gap-2 items-center text-white">
          <ShieldAlert className="w-5 h-5 text-yellow-300" />
          Veto Medic <span className="text-xs text-yellow-300">(Admin Veto Recovery)</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center text-slate-300 py-8">Loading active veto sessions...</div>
        ) : sessions.length === 0 ? (
          <div className="text-center text-slate-400 py-8">No active/pending veto sessions found.</div>
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
                        : "bg-yellow-500/10 text-yellow-400 border-yellow-500/40"
                    }>
                      {session.status === "in_progress" ? "In Progress" : "Pending"}
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
                    onClick={() => forceCompleteSession(session.id)}
                  >
                    <CheckCircle2 className="w-4 h-4 mr-1" /> Force Complete
                  </Button>
                  {/* Future: manual map select goes here */}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
