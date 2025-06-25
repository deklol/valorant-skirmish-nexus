import React, { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  Search, 
  RefreshCw, 
  ShieldAlert, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Wrench,
  Trash2,
  Activity,
  Settings,
  Zap
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { 
  auditMapVetoSystem, 
  auditVetoSession, 
  cleanupVetoSessions,
  VetoAuditResult,
  VetoSessionHealth 
} from "@/utils/mapVetoAudit";
import MapVetoAuditPanel from "./MapVetoAuditPanel";

interface VetoSession {
  id: string;
  match_id: string;
  status: string;
  created_at: string;
  home_team_id?: string;
  away_team_id?: string;
  current_turn_team_id?: string;
  matches?: {
    tournament_id: string;
    team1_id: string;
    team2_id: string;
    tournaments?: {
      name: string;
      map_pool: any; // Changed from any[] to any to match Supabase Json type
    };
    team1?: { name: string };
    team2?: { name: string };
  };
}

interface Tournament {
  id: string;
  name: string;
}

const VetoMedicManager = () => {
  const [sessions, setSessions] = useState<VetoSession[]>([]);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [selectedTournament, setSelectedTournament] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [systemAuditResult, setSystemAuditResult] = useState<VetoAuditResult | null>(null);
  const [sessionHealthData, setSessionHealthData] = useState<Record<string, VetoSessionHealth>>({});
  const [showAuditPanel, setShowAuditPanel] = useState(false);
  const { toast } = useToast();

  // Load tournaments for filtering
  const loadTournaments = useCallback(async () => {
    console.log("🔄 VetoMedic: Loading tournaments for filter dropdown");
    try {
      const { data, error } = await supabase
        .from("tournaments")
        .select("id, name")
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      setTournaments(data || []);
      console.log(`✅ VetoMedic: Loaded ${data?.length || 0} tournaments`);
    } catch (error: any) {
      console.error("❌ VetoMedic: Failed to load tournaments:", error);
      toast({
        title: "Error",
        description: "Failed to load tournaments",
        variant: "destructive",
      });
    }
  }, [toast]);

  // Load veto sessions with comprehensive data
  const loadVetoSessions = useCallback(async () => {
    console.log("🔄 VetoMedic: Loading veto sessions with comprehensive data");
    setLoading(true);
    
    try {
      let query = supabase
        .from("map_veto_sessions")
        .select(`
          *,
          matches!inner(
            tournament_id,
            team1_id,
            team2_id,
            tournaments!inner(name, map_pool),
            team1:team1_id(name),
            team2:team2_id(name)
          )
        `)
        .order("created_at", { ascending: false });

      // Apply tournament filter if selected
      if (selectedTournament) {
        query = query.eq("matches.tournament_id", selectedTournament);
        console.log(`🔍 VetoMedic: Filtering by tournament ${selectedTournament}`);
      }

      const { data, error } = await query.limit(100);

      if (error) throw error;

      const sessionsData = data || [];
      setSessions(sessionsData);
      
      console.log(`✅ VetoMedic: Loaded ${sessionsData.length} veto sessions`);
      console.log("📊 VetoMedic: Session status breakdown:", {
        pending: sessionsData.filter(s => s.status === 'pending').length,
        in_progress: sessionsData.filter(s => s.status === 'in_progress').length,
        completed: sessionsData.filter(s => s.status === 'completed').length,
      });

      // Load individual session health data
      const healthPromises = sessionsData.map(async (session) => {
        try {
          const health = await auditVetoSession(session.id);
          console.log(`🔍 VetoMedic: Session ${session.id.slice(0,8)} health check:`, {
            issues: health.issues.length,
            isStuck: health.isStuck,
            actionCount: health.actionCount,
            expectedActions: health.expectedActions
          });
          return { sessionId: session.id, health };
        } catch (error) {
          console.error(`❌ VetoMedic: Failed to audit session ${session.id}:`, error);
          return { sessionId: session.id, health: null };
        }
      });

      const healthResults = await Promise.all(healthPromises);
      const healthMap = healthResults.reduce((acc, { sessionId, health }) => {
        if (health) acc[sessionId] = health;
        return acc;
      }, {} as Record<string, VetoSessionHealth>);

      setSessionHealthData(healthMap);
      console.log(`✅ VetoMedic: Completed health checks for ${Object.keys(healthMap).length} sessions`);

    } catch (error: any) {
      console.error("❌ VetoMedic: Failed to load veto sessions:", error);
      toast({
        title: "Error",
        description: "Failed to load veto sessions",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [selectedTournament, toast]);

  // System-wide audit function
  const runSystemAudit = async () => {
    console.log("🔄 VetoMedic: Starting comprehensive system audit");
    setLoading(true);
    
    try {
      const auditResult = await auditMapVetoSystem(selectedTournament || undefined);
      setSystemAuditResult(auditResult);
      setShowAuditPanel(true);
      
      console.log("✅ VetoMedic: System audit completed:", {
        isHealthy: auditResult.isHealthy,
        totalSessions: auditResult.sessionCount,
        completedSessions: auditResult.completedSessions,
        issuesFound: auditResult.issues.length,
        warningsFound: auditResult.warnings.length,
        recommendations: auditResult.recommendations.length
      });

      toast({
        title: auditResult.isHealthy ? "System Healthy" : "Issues Found",
        description: auditResult.isHealthy 
          ? `All ${auditResult.sessionCount} sessions are healthy`
          : `Found ${auditResult.issues.length} issues and ${auditResult.warnings.length} warnings`,
        variant: auditResult.isHealthy ? "default" : "destructive",
      });
    } catch (error: any) {
      console.error("❌ VetoMedic: System audit failed:", error);
      toast({
        title: "Audit Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Enhanced cleanup function
  const cleanupStuckSessions = async () => {
    console.log("🔄 VetoMedic: Starting cleanup of stuck sessions");
    
    const stuckSessionIds = Object.entries(sessionHealthData)
      .filter(([_, health]) => health.isStuck)
      .map(([sessionId]) => sessionId);

    if (stuckSessionIds.length === 0) {
      console.log("ℹ️ VetoMedic: No stuck sessions found to cleanup");
      toast({
        title: "No Cleanup Needed",
        description: "No stuck sessions found",
      });
      return;
    }

    console.log(`🧹 VetoMedic: Cleaning up ${stuckSessionIds.length} stuck sessions:`, stuckSessionIds.map(id => id.slice(0,8)));
    
    setLoading(true);
    try {
      const cleanupResult = await cleanupVetoSessions(stuckSessionIds);
      
      console.log("✅ VetoMedic: Cleanup completed:", {
        cleaned: cleanupResult.cleaned,
        errors: cleanupResult.errors.length,
        errorDetails: cleanupResult.errors
      });

      toast({
        title: "Cleanup Completed",
        description: `Cleaned ${cleanupResult.cleaned} sessions${cleanupResult.errors.length > 0 ? ` (${cleanupResult.errors.length} errors)` : ''}`,
        variant: cleanupResult.errors.length > 0 ? "destructive" : "default",
      });

      // Reload sessions after cleanup
      await loadVetoSessions();
    } catch (error: any) {
      console.error("❌ VetoMedic: Cleanup failed:", error);
      toast({
        title: "Cleanup Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const checkVetoSessionHealth = async (sessionId: string) => {
    console.log(`🔍 VetoMedic: Checking health for session ${sessionId.slice(0,8)}`);
    
    try {
      const health = await auditVetoSession(sessionId);
      
      console.log(`📊 VetoMedic: Session ${sessionId.slice(0,8)} health details:`, {
        status: health.status,
        issues: health.issues,
        isStuck: health.isStuck,
        actionCount: health.actionCount,
        expectedActions: health.expectedActions,
        lastActivity: health.lastActivity
      });

      // Update the session health data
      setSessionHealthData(prev => ({
        ...prev,
        [sessionId]: health
      }));

      if (health.issues.length === 0) {
        toast({
          title: "Session Healthy",
          description: `Session ${sessionId.slice(0,8)} has no issues`,
        });
      } else {
        toast({
          title: "Issues Found",
          description: `${health.issues.length} issues in session ${sessionId.slice(0,8)}`,
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error(`❌ VetoMedic: Health check failed for session ${sessionId}:`, error);
      toast({
        title: "Health Check Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const resetVetoSession = async (sessionId: string) => {
    console.log(`🔄 VetoMedic: Resetting veto session ${sessionId.slice(0,8)}`);
    
    try {
      const { error } = await supabase
        .from("map_veto_sessions")
        .update({ 
          status: "pending",
          current_turn_team_id: null,
          home_team_id: null,
          away_team_id: null,
          roll_seed: null,
          roll_timestamp: null,
          roll_initiator_id: null
        })
        .eq("id", sessionId);

      if (error) throw error;

      // Also delete all veto actions for this session
      const { error: actionsError } = await supabase
        .from("map_veto_actions")
        .delete()
        .eq("veto_session_id", sessionId);

      if (actionsError) {
        console.warn(`⚠️ VetoMedic: Failed to delete actions for session ${sessionId}:`, actionsError);
      }

      console.log(`✅ VetoMedic: Successfully reset session ${sessionId.slice(0,8)}`);
      
      toast({
        title: "Session Reset",
        description: `Session ${sessionId.slice(0,8)} has been reset to pending`,
      });

      loadVetoSessions();
    } catch (error: any) {
      console.error(`❌ VetoMedic: Failed to reset session ${sessionId}:`, error);
      toast({
        title: "Reset Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const forceCompleteVeto = async (sessionId: string) => {
    console.log(`🔄 VetoMedic: Force completing veto session ${sessionId.slice(0,8)}`);
    
    try {
      const { error } = await supabase
        .from("map_veto_sessions")
        .update({ 
          status: "completed",
          completed_at: new Date().toISOString()
        })
        .eq("id", sessionId);

      if (error) throw error;

      console.log(`✅ VetoMedic: Successfully force completed session ${sessionId.slice(0,8)}`);
      
      toast({
        title: "Session Completed",
        description: `Session ${sessionId.slice(0,8)} has been force completed`,
      });

      loadVetoSessions();
    } catch (error: any) {
      console.error(`❌ VetoMedic: Failed to force complete session ${sessionId}:`, error);
      toast({
        title: "Force Complete Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const rollbackLastAction = async (sessionId: string) => {
    console.log(`🔄 VetoMedic: Rolling back last action for session ${sessionId.slice(0,8)}`);
    
    try {
      // Get the last action
      const { data: lastAction, error: getError } = await supabase
        .from("map_veto_actions")
        .select("*")
        .eq("veto_session_id", sessionId)
        .order("order_number", { ascending: false })
        .limit(1)
        .single();

      if (getError || !lastAction) {
        throw new Error("No actions to rollback");
      }

      console.log(`🔄 VetoMedic: Found last action to rollback:`, {
        actionId: lastAction.id,
        action: lastAction.action,
        mapId: lastAction.map_id,
        orderNumber: lastAction.order_number
      });

      // Delete the last action
      const { error: deleteError } = await supabase
        .from("map_veto_actions")
        .delete()
        .eq("id", lastAction.id);

      if (deleteError) throw deleteError;

      // Update session status back to in_progress if it was completed
      const { error: updateError } = await supabase
        .from("map_veto_sessions")
        .update({ 
          status: "in_progress",
          completed_at: null
        })
        .eq("id", sessionId);

      if (updateError) throw updateError;

      console.log(`✅ VetoMedic: Successfully rolled back last action for session ${sessionId.slice(0,8)}`);
      
      toast({
        title: "Action Rolled Back",
        description: `Last action for session ${sessionId.slice(0,8)} has been removed`,
      });

      loadVetoSessions();
    } catch (error: any) {
      console.error(`❌ VetoMedic: Failed to rollback action for session ${sessionId}:`, error);
      toast({
        title: "Rollback Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  // Filter sessions based on search term
  const filteredSessions = sessions.filter((session) => {
    const searchLower = searchTerm.toLowerCase();
    const matchData = session.matches;
    
    return (
      session.id.toLowerCase().includes(searchLower) ||
      session.status.toLowerCase().includes(searchLower) ||
      matchData?.tournaments?.name?.toLowerCase().includes(searchLower) ||
      matchData?.team1?.name?.toLowerCase().includes(searchLower) ||
      matchData?.team2?.name?.toLowerCase().includes(searchLower)
    );
  });

  // Get status badge variant
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-500/20 text-green-400 border-green-500/30";
      case "in_progress":
        return "bg-blue-500/20 text-blue-400 border-blue-500/30";
      case "pending":
        return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
      default:
        return "bg-gray-500/20 text-gray-400 border-gray-500/30";
    }
  };

  // Get health status icon
  const getHealthIcon = (sessionId: string) => {
    const health = sessionHealthData[sessionId];
    if (!health) return <Activity className="w-4 h-4 text-gray-400" />;
    
    if (health.isStuck) return <XCircle className="w-4 h-4 text-red-400" />;
    if (health.issues.length > 0) return <AlertTriangle className="w-4 h-4 text-yellow-400" />;
    return <CheckCircle className="w-4 h-4 text-green-400" />;
  };

  // Load data on component mount
  useEffect(() => {
    console.log("🚀 VetoMedic: Component mounted, loading initial data");
    loadTournaments();
    loadVetoSessions();
  }, [loadTournaments, loadVetoSessions]);

  return (
    <div className="space-y-6">
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <ShieldAlert className="w-5 h-5 text-red-400" />
            Veto Medic
            <span className="text-xs text-red-300">(Map Veto Emergency System)</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Enhanced Controls */}
          <div className="flex flex-wrap gap-4 mb-6">
            {/* Search */}
            <div className="relative flex-1 min-w-[300px]">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search sessions by ID, status, tournament, or team..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-slate-700 border-slate-600"
              />
            </div>

            {/* Tournament Filter */}
            <select
              value={selectedTournament}
              onChange={(e) => setSelectedTournament(e.target.value)}
              className="px-4 py-2 bg-slate-700 border border-slate-600 rounded-md text-white"
            >
              <option value="">All Tournaments</option>
              {tournaments.map((tournament) => (
                <option key={tournament.id} value={tournament.id}>
                  {tournament.name}
                </option>
              ))}
            </select>

            {/* Refresh Button */}
            <Button
              onClick={loadVetoSessions}
              disabled={loading}
              variant="outline"
              className="border-slate-600"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>

          {/* System-wide Actions */}
          <div className="flex flex-wrap gap-2 mb-6 p-4 bg-slate-900/50 rounded-lg border border-slate-700">
            <Button
              onClick={runSystemAudit}
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Zap className="w-4 h-4 mr-2" />
              System Audit
            </Button>
            
            <Button
              onClick={cleanupStuckSessions}
              disabled={loading || Object.values(sessionHealthData).filter(h => h.isStuck).length === 0}
              className="bg-orange-600 hover:bg-orange-700"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Cleanup Stuck Sessions
            </Button>

            <Button
              onClick={() => setShowAuditPanel(!showAuditPanel)}
              variant="outline"
              className="border-slate-600"
            >
              <Settings className="w-4 h-4 mr-2" />
              {showAuditPanel ? 'Hide' : 'Show'} Audit Panel
            </Button>
          </div>

          {/* System Audit Panel */}
          {showAuditPanel && (
            <MapVetoAuditPanel 
              tournamentId={selectedTournament || undefined}
            />
          )}

          {/* Sessions List */}
          <div className="space-y-4">
            {loading && (
              <div className="text-center py-8">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
                <p className="text-gray-400">Loading veto sessions...</p>
              </div>
            )}

            {!loading && filteredSessions.length === 0 && (
              <div className="text-center py-8 text-gray-400">
                {sessions.length === 0 ? "No veto sessions found" : "No sessions match your search"}
              </div>
            )}

            {!loading && filteredSessions.map((session) => {
              const health = sessionHealthData[session.id];
              const matchData = session.matches;

              return (
                <div
                  key={session.id}
                  className="p-6 bg-slate-900 rounded-lg border border-slate-700 space-y-4"
                >
                  {/* Session Header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {getHealthIcon(session.id)}
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm text-gray-300">
                            {session.id.slice(0, 8)}...
                          </span>
                          <Badge className={getStatusBadge(session.status)}>
                            {session.status}
                          </Badge>
                        </div>
                        <div className="text-xs text-gray-400 mt-1">
                          {matchData?.tournaments?.name || "Unknown Tournament"}
                        </div>
                      </div>
                    </div>
                    <div className="text-xs text-gray-400">
                      {new Date(session.created_at).toLocaleString()}
                    </div>
                  </div>

                  {/* Teams */}
                  <div className="flex items-center gap-4 text-sm">
                    <span className="text-blue-400">
                      {matchData?.team1?.name || "Team 1"}
                    </span>
                    <span className="text-gray-500">vs</span>
                    <span className="text-blue-400">
                      {matchData?.team2?.name || "Team 2"}
                    </span>
                  </div>

                  {/* Health Information */}
                  {health && (
                    <div className="bg-slate-800 p-3 rounded border border-slate-600">
                      <div className="flex items-center gap-2 mb-2">
                        <Activity className="w-4 h-4" />
                        <span className="text-sm font-medium">Health Status</span>
                      </div>
                      <div className="text-xs space-y-1">
                        <div>Actions: {health.actionCount}/{health.expectedActions}</div>
                        <div>Last Activity: {health.lastActivity}</div>
                        {health.issues.length > 0 && (
                          <div className="text-red-400">
                            Issues: {health.issues.join(", ")}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => checkVetoSessionHealth(session.id)}
                      disabled={loading}
                      className="border-slate-600"
                    >
                      <Activity className="w-4 h-4 mr-1" />
                      Health Check
                    </Button>

                    {session.status !== "completed" && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => resetVetoSession(session.id)}
                          disabled={loading}
                          className="border-yellow-600 text-yellow-400"
                        >
                          <RefreshCw className="w-4 h-4 mr-1" />
                          Reset
                        </Button>

                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => forceCompleteVeto(session.id)}
                          disabled={loading}
                          className="border-green-600 text-green-400"
                        >
                          <CheckCircle className="w-4 h-4 mr-1" />
                          Force Complete
                        </Button>

                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => rollbackLastAction(session.id)}
                          disabled={loading}
                          className="border-red-600 text-red-400"
                        >
                          <XCircle className="w-4 h-4 mr-1" />
                          Rollback
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default VetoMedicManager;
