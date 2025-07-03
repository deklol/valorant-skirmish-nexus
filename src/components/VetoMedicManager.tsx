import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertTriangle, RefreshCw, RotateCcw, MapPin, CheckCircle, XCircle, Clock, Users, Undo, Play, Settings } from "lucide-react";
import { checkVetoSessionHealth } from "@/components/map-veto/vetoHealthUtils";

interface VetoSession {
  id: string;
  match_id: string;
  status: string;
  home_team_id: string | null;
  away_team_id: string | null;
  current_turn_team_id: string | null;
  roll_seed: string | null;
  roll_timestamp: string | null;
  roll_initiator_id: string | null;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
  veto_order: any;
  // Related data
  match?: {
    id: string;
    team1_id: string;
    team2_id: string;
    tournament_id: string;
    round_number: number;
    match_number: number;
    team1?: { name: string };
    team2?: { name: string };
    tournament?: { name: string };
  };
  actions?: Array<{
    id: string;
    action: string;
    map_id: string;
    team_id: string;
    order_number: number;
    maps?: { display_name: string };
  }>;
}

interface HealthStatus {
  issues: string[];
  isStuck: boolean;
  actionCount: number;
  expectedActions: number;
  lastActivity: string;
}

interface VetoSessionWithHealth extends VetoSession {
  healthStatus?: HealthStatus;
}

export default function VetoMedicManager() {
  const [vetoSessions, setVetoSessions] = useState<VetoSession[]>([]);
  const [tournamentMaps, setTournamentMaps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
  const [selectedForceMap, setSelectedForceMap] = useState<string>("");
  const { toast } = useToast();

  const loadVetoSessions = useCallback(async () => {
    console.log("🔄 VetoMedic: Loading veto sessions with comprehensive data");
    setLoading(true);
    try {
      const { data: sessions, error } = await supabase
        .from('map_veto_sessions')
        .select(`
          *,
          matches!inner (
            id, team1_id, team2_id, tournament_id, round_number, match_number,
            team1:team1_id ( name ),
            team2:team2_id ( name ),
            tournaments:tournament_id ( name )
          ),
          map_veto_actions (
            id, action, map_id, team_id, order_number,
            maps:map_id ( display_name )
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const processedSessions = (sessions || []).map((session: any) => ({
        ...session,
        match: session.matches,
        actions: session.map_veto_actions || []
      }));

      setVetoSessions(processedSessions);
      console.log(`✅ VetoMedic: Loaded ${processedSessions.length} veto sessions`);
      
      // Load available maps for force completion
      const { data: maps } = await supabase
        .from('maps')
        .select('*')
        .eq('is_active', true)
        .order('display_name');
      
      setTournamentMaps(maps || []);

      // Run health checks
      await runHealthChecks(processedSessions);
    } catch (error: any) {
      console.error("❌ VetoMedic: Error loading sessions:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to load veto sessions",
        variant: "destructive",
      });
      setVetoSessions([]);
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const runHealthChecks = async (sessions: VetoSession[]) => {
    console.log("🔄 VetoMedic: Running health checks on all sessions");
    for (const session of sessions) {
      try {
        const health = await analyzeSessionHealthAsync(session);
        console.log(`🔍 VetoMedic: Checking health for session ${session.id.slice(0, 8)}`);
        console.log(`📊 VetoMedic: Session ${session.id.slice(0, 8)} health details:`, {
          status: session.status,
          issues: health.issues,
          isStuck: health.isStuck,
          actionCount: health.actionCount,
          expectedActions: health.expectedActions,
          lastActivity: health.lastActivity
        });
      } catch (error) {
        console.error(`❌ VetoMedic: Health check failed for ${session.id.slice(0, 8)}:`, error);
      }
    }
    console.log("✅ VetoMedic: Completed health checks for", sessions.length, "sessions");
  };

  // Async version for background health checks
  const analyzeSessionHealthAsync = async (session: VetoSession): Promise<HealthStatus> => {
    const actionCount = session.actions?.length || 0;
    const mapPoolSize = 7; // Default assumption
    const expectedActions = session.match?.tournament ? mapPoolSize - 1 : 8;
    
    // Basic legacy checks first
    const basicIssues: string[] = [];
    
    // Check for missing team assignments
    if (!session.match?.team1_id || !session.match?.team2_id) {
      basicIssues.push("Missing team assignments");
    }

    // Check for invalid home/away assignments
    if (session.home_team_id && session.away_team_id && session.home_team_id === session.away_team_id) {
      basicIssues.push("Home and away teams are the same");
    }

    // Check for stale sessions
    const lastActivity = session.completed_at || session.started_at || session.created_at;
    const isStale = lastActivity && (Date.now() - new Date(lastActivity).getTime()) > 24 * 60 * 60 * 1000;
    if (isStale && session.status === 'in_progress') {
      basicIssues.push("Session appears stale (>24h old)");
    }

    // Check for incomplete dice rolls
    if (session.status === 'in_progress' && (!session.home_team_id || !session.away_team_id)) {
      basicIssues.push("Incomplete dice roll data");
    }

    // NEW: Use enhanced health check for turn sequence validation
    let enhancedIssues: string[] = [];
    
    try {
      // Get tournament map pool for proper validation
      const maps = tournamentMaps.length > 0 ? tournamentMaps : [
        { id: '1', name: 'Ascent' }, { id: '2', name: 'Bind' }, { id: '3', name: 'Haven' },
        { id: '4', name: 'Split' }, { id: '5', name: 'Icebox' }, { id: '6', name: 'Breeze' }, { id: '7', name: 'Fracture' }
      ];

      const healthCheck = await checkVetoSessionHealth({
        session,
        actions: session.actions || [],
        maps
      });
      
      enhancedIssues = healthCheck.warnings;
      
      console.log(`🔍 VetoMedic Enhanced: Session ${session.id.slice(0, 8)} health check:`, {
        basicIssues: basicIssues.length,
        enhancedIssues: enhancedIssues.length,
        allIssues: [...basicIssues, ...enhancedIssues]
      });
      
    } catch (error) {
      console.warn(`⚠️ VetoMedic: Enhanced health check failed for ${session.id.slice(0, 8)}:`, error);
    }

    const allIssues = [...basicIssues, ...enhancedIssues];

    return {
      issues: allIssues,
      isStuck: allIssues.length > 0 && session.status === 'in_progress',
      actionCount,
      expectedActions,
      lastActivity: lastActivity || 'never'
    };
  };

  // Sync version for UI rendering
  const analyzeSessionHealthSync = (session: VetoSession): HealthStatus => {
    const actionCount = session.actions?.length || 0;
    const mapPoolSize = 7; // Default assumption
    const expectedActions = session.match?.tournament ? mapPoolSize - 1 : 8;
    
    const issues: string[] = [];
    
    // Check for missing team assignments
    if (!session.match?.team1_id || !session.match?.team2_id) {
      issues.push("Missing team assignments");
    }

    // Check for invalid home/away assignments
    if (session.home_team_id && session.away_team_id && session.home_team_id === session.away_team_id) {
      issues.push("Home and away teams are the same");
    }

    // Check for stale sessions
    const lastActivity = session.completed_at || session.started_at || session.created_at;
    const isStale = lastActivity && (Date.now() - new Date(lastActivity).getTime()) > 24 * 60 * 60 * 1000;
    if (isStale && session.status === 'in_progress') {
      issues.push("Session appears stale (>24h old)");
    }

    // Check for incomplete dice rolls
    if (session.status === 'in_progress' && (!session.home_team_id || !session.away_team_id)) {
      issues.push("Incomplete dice roll data");
    }

    return {
      issues,
      isStuck: issues.length > 0 && session.status === 'in_progress',
      actionCount,
      expectedActions,
      lastActivity: lastActivity || 'never'
    };
  };

  const resetVetoSession = async (sessionId: string) => {
    const shortId = sessionId.slice(0, 8);
    console.log(`🔄 VetoMedic: Starting complete reset of session ${shortId}`);
    setActionInProgress(sessionId);
    
    try {
      // Step 1: Get current session data for logging
      const { data: currentSession } = await supabase
        .from('map_veto_sessions')
        .select('*')
        .eq('id', sessionId)
        .single();

      if (currentSession) {
        console.log(`📊 VetoMedic: Current session ${shortId} state:`, {
          status: currentSession.status,
          homeTeam: currentSession.home_team_id?.slice(0, 8) || 'null',
          awayTeam: currentSession.away_team_id?.slice(0, 8) || 'null',
          currentTurn: currentSession.current_turn_team_id?.slice(0, 8) || 'null',
          rollSeed: currentSession.roll_seed ? 'present' : 'null',
          rollTimestamp: currentSession.roll_timestamp ? 'present' : 'null'
        });
      }

      // Step 2: Count and delete all veto actions
      const { data: existingActions, error: countError } = await supabase
        .from('map_veto_actions')
        .select('id, action, map_id')
        .eq('veto_session_id', sessionId);

      if (countError) {
        console.warn(`⚠️ VetoMedic: Failed to count actions for ${shortId}:`, countError);
      } else {
        console.log(`📝 VetoMedic: Found ${existingActions?.length || 0} actions to delete for session ${shortId}`);
      }

      const { error: actionsError } = await supabase
        .from('map_veto_actions')
        .delete()
        .eq('veto_session_id', sessionId);

      if (actionsError) {
        console.error(`❌ VetoMedic: Failed to delete actions for ${shortId}:`, actionsError);
        throw new Error(`Failed to delete veto actions: ${actionsError.message}`);
      } else {
        console.log(`✅ VetoMedic: Successfully deleted ${existingActions?.length || 0} actions for session ${shortId}`);
      }

      // Step 3: Complete session reset with all fields nullified
      console.log(`🔄 VetoMedic: Resetting all session fields for ${shortId}`);
      const resetData = {
        status: 'pending' as const,
        current_turn_team_id: null,
        started_at: null,
        completed_at: null,
        home_team_id: null,
        away_team_id: null,
        roll_seed: null,
        roll_timestamp: null,
        roll_initiator_id: null,
        veto_order: null
      };

      const { error: sessionError } = await supabase
        .from('map_veto_sessions')
        .update(resetData)
        .eq('id', sessionId);

      if (sessionError) {
        console.error(`❌ VetoMedic: Failed to reset session ${shortId}:`, sessionError);
        throw new Error(`Failed to reset session: ${sessionError.message}`);
      }

      console.log(`✅ VetoMedic: Successfully reset session ${shortId} to clean state:`, resetData);

      // Step 4: Verify reset was successful
      const { data: verifySession } = await supabase
        .from('map_veto_sessions')
        .select('status, current_turn_team_id, home_team_id, away_team_id, roll_seed')
        .eq('id', sessionId)
        .single();

      if (verifySession) {
        console.log(`🔍 VetoMedic: Post-reset verification for ${shortId}:`, {
          status: verifySession.status,
          currentTurn: verifySession.current_turn_team_id,
          homeTeam: verifySession.home_team_id,
          awayTeam: verifySession.away_team_id,
          rollSeed: verifySession.roll_seed
        });

        const isClean = verifySession.status === 'pending' &&
                       verifySession.current_turn_team_id === null &&
                       verifySession.home_team_id === null &&
                       verifySession.away_team_id === null &&
                       verifySession.roll_seed === null;

        if (isClean) {
          console.log(`🎉 VetoMedic: Session ${shortId} successfully reset to clean state`);
        } else {
          console.warn(`⚠️ VetoMedic: Session ${shortId} may not be completely clean after reset`);
        }
      }

      toast({
        title: "Veto Session Reset",
        description: `Session ${shortId} has been completely reset`,
      });

      // Reload sessions to reflect changes
      await loadVetoSessions();
      
    } catch (error: any) {
      console.error(`❌ VetoMedic: Reset failed for session ${shortId}:`, error);
      toast({
        title: "Reset Failed",
        description: error.message || "Failed to reset veto session",
        variant: "destructive",
      });
    } finally {
      setActionInProgress(null);
      console.log(`🏁 VetoMedic: Reset operation completed for session ${shortId}`);
    }
  };

  const forceCompleteVeto = async (sessionId: string, mapId: string) => {
    const shortId = sessionId.slice(0, 8);
    console.log(`🏁 VetoMedic: Force completing session ${shortId} with map ${mapId}`);
    setActionInProgress(sessionId);

    try {
      // Delete existing actions
      const { error: deleteError } = await supabase
        .from('map_veto_actions')
        .delete()
        .eq('veto_session_id', sessionId);

      if (deleteError) throw deleteError;

      // Add final pick action
      const { error: pickError } = await supabase
        .from('map_veto_actions')
        .insert({
          veto_session_id: sessionId,
          team_id: null,
          map_id: mapId,
          action: 'pick',
          order_number: 1,
          performed_by: null
        });

      if (pickError) throw pickError;

      // Mark session as completed
      const { error: updateError } = await supabase
        .from('map_veto_sessions')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString()
        })
        .eq('id', sessionId);

      if (updateError) throw updateError;

      console.log(`✅ VetoMedic: Force completed session ${shortId}`);
      toast({
        title: "Veto Force Completed",
        description: `Session ${shortId} has been force completed`,
      });

      await loadVetoSessions();
    } catch (error: any) {
      console.error(`❌ VetoMedic: Force complete failed for ${shortId}:`, error);
      toast({
        title: "Force Complete Failed",
        description: error.message || "Failed to force complete veto",
        variant: "destructive",
      });
    } finally {
      setActionInProgress(null);
    }
  };

  const rollbackLastAction = async (sessionId: string) => {
    const shortId = sessionId.slice(0, 8);
    console.log(`↩️ VetoMedic: Rolling back last action for session ${shortId}`);
    setActionInProgress(sessionId);

    try {
      // Get the last action
      const { data: lastAction, error: fetchError } = await supabase
        .from('map_veto_actions')
        .select('*')
        .eq('veto_session_id', sessionId)
        .order('order_number', { ascending: false })
        .limit(1)
        .single();

      if (fetchError || !lastAction) {
        throw new Error('No actions to rollback');
      }

      console.log(`🔄 VetoMedic: Rolling back action ${lastAction.id} (${lastAction.action} ${lastAction.map_id})`);

      // Delete the last action
      const { error: deleteError } = await supabase
        .from('map_veto_actions')
        .delete()
        .eq('id', lastAction.id);

      if (deleteError) throw deleteError;

      // Reset session status if it was completed
      if (lastAction.action === 'pick') {
        const { error: statusError } = await supabase
          .from('map_veto_sessions')
          .update({
            status: 'in_progress',
            completed_at: null
          })
          .eq('id', sessionId);

        if (statusError) throw statusError;
      }

      console.log(`✅ VetoMedic: Successfully rolled back last action for session ${shortId}`);
      toast({
        title: "Action Rolled Back",
        description: `Last action has been rolled back for session ${shortId}`,
      });

      await loadVetoSessions();
    } catch (error: any) {
      console.error(`❌ VetoMedic: Rollback failed for ${shortId}:`, error);
      toast({
        title: "Rollback Failed",
        description: error.message || "Failed to rollback last action",
        variant: "destructive",
      });
    } finally {
      setActionInProgress(null);
    }
  };

  const fixSyncIssue = async (sessionId: string) => {
    const shortId = sessionId.slice(0, 8);
    console.log(`🔧 VetoMedic: Fixing sync issue for session ${shortId}`);
    setActionInProgress(sessionId);

    try {
      // Get session and actions for analysis
      const { data: session, error: sessionError } = await supabase
        .from('map_veto_sessions')
        .select('*')
        .eq('id', sessionId)
        .single();

      if (sessionError || !session) {
        throw new Error('Failed to fetch session data');
      }

      const { data: actions, error: actionsError } = await supabase
        .from('map_veto_actions')
        .select('*')
        .eq('veto_session_id', sessionId)
        .order('order_number');

      if (actionsError) {
        throw new Error('Failed to fetch actions data');
      }

      const banCount = actions?.filter(a => a.action === 'ban').length || 0;
      
      // For BO1, determine correct next team based on ban count
      let correctNextTeam: string | null = null;
      if (banCount === 1) {
        // After ban 1 (home), next should be away team for ban 2
        correctNextTeam = session.away_team_id;
      } else if (banCount === 2) {
        // After ban 2 (away), next should be away team for ban 3 (double ban)
        correctNextTeam = session.away_team_id;
      } else if (banCount === 3) {
        // After ban 3 (away), next should be home team for ban 4
        correctNextTeam = session.home_team_id;
      } else if (banCount === 4) {
        // After ban 4 (home), next should be away team for ban 5
        correctNextTeam = session.away_team_id;
      } else if (banCount === 5) {
        // After ban 5 (away), next should be home team for ban 6
        correctNextTeam = session.home_team_id;
      }

      if (correctNextTeam && correctNextTeam !== session.current_turn_team_id) {
        console.log(`🔧 VetoMedic: Correcting turn from ${session.current_turn_team_id?.slice(0, 8)} to ${correctNextTeam.slice(0, 8)}`);
        
        const { error: updateError } = await supabase
          .from('map_veto_sessions')
          .update({ current_turn_team_id: correctNextTeam })
          .eq('id', sessionId);

        if (updateError) throw updateError;

        console.log(`✅ VetoMedic: Fixed sync issue for session ${shortId}`);
        toast({
          title: "Sync Issue Fixed",
          description: `Corrected turn sequence for session ${shortId}`,
        });
      } else {
        toast({
          title: "No Sync Issue Found",
          description: `Session ${shortId} appears to be in correct state`,
        });
      }

      await loadVetoSessions();
    } catch (error: any) {
      console.error(`❌ VetoMedic: Sync fix failed for ${shortId}:`, error);
      toast({
        title: "Sync Fix Failed",
        description: error.message || "Failed to fix sync issue",
        variant: "destructive",
      });
    } finally {
      setActionInProgress(null);
    }
  };

  useEffect(() => {
    loadVetoSessions();
  }, [loadVetoSessions]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">Pending</Badge>;
      case 'in_progress':
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">In Progress</Badge>;
      case 'completed':
        return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">Completed</Badge>;
      default:
        return <Badge className="bg-gray-500/20 text-gray-400 border-gray-500/30">{status}</Badge>;
    }
  };

  const getHealthBadge = (health: HealthStatus) => {
    if (health.issues.length === 0) {
      return <Badge className="bg-green-500/20 text-green-400 border-green-500/30 flex items-center gap-1">
        <CheckCircle className="w-3 h-3" />
        Healthy
      </Badge>;
    } else if (health.isStuck) {
      return <Badge className="bg-red-500/20 text-red-400 border-red-500/30 flex items-center gap-1">
        <XCircle className="w-3 h-3" />
        Stuck
      </Badge>;
    } else {
      return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30 flex items-center gap-1">
        <AlertTriangle className="w-3 h-3" />
        Issues ({health.issues.length})
      </Badge>;
    }
  };

  if (loading) {
    return (
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <MapPin className="w-5 h-5 text-blue-400" />
            VetoMedic - Map Veto Session Management
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-slate-400">Loading veto sessions...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-slate-800 border-slate-700">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2 justify-between">
          <div className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-blue-400" />
            VetoMedic - Map Veto Session Management
          </div>
          <Button
            onClick={loadVetoSessions}
            disabled={loading}
            variant="outline"
            size="sm"
            className="border-blue-500/40 text-blue-300"
          >
            <RefreshCw className="w-4 h-4 mr-1" />
            Refresh
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {vetoSessions.length === 0 ? (
          <div className="text-center py-8 text-slate-400">No veto sessions found</div>
        ) : (
          <div className="space-y-4">
            {vetoSessions.map((session) => {
              const health = analyzeSessionHealthSync(session);
              const shortId = session.id.slice(0, 8);
              const isProcessing = actionInProgress === session.id;
              
              return (
                <div
                  key={session.id}
                  id={`vetomedic-session-${session.id}`}
                  className="border border-slate-700 bg-slate-900/50 rounded-lg p-4"
                >
                  <div className="flex flex-col gap-3">
                    {/* Header row with session info */}
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-sm text-blue-300">
                          Session: {shortId}
                        </span>
                        {getStatusBadge(session.status)}
                        {getHealthBadge(health)}
                      </div>
                    </div>

                    {/* Match info */}
                    {session.match && (
                      <div className="text-sm text-slate-400">
                        <span className="text-amber-300">{session.match.tournament?.name || 'Unknown Tournament'}</span>
                        {' - '}
                        <span>Round {session.match.round_number}, Match #{session.match.match_number}</span>
                        {' - '}
                        <span className="text-blue-200">
                          {session.match.team1?.name || 'Team 1'} vs {session.match.team2?.name || 'Team 2'}
                        </span>
                      </div>
                    )}

                    {/* Team assignments */}
                    <div className="flex items-center gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-slate-400" />
                        <span className="text-slate-400">Home:</span>
                        <span className="text-yellow-300">
                          {session.home_team_id ? session.home_team_id.slice(0, 8) : 'Not Set'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-slate-400">Away:</span>
                        <span className="text-blue-300">
                          {session.away_team_id ? session.away_team_id.slice(0, 8) : 'Not Set'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-slate-400" />
                        <span className="text-slate-400">Actions:</span>
                        <span className="text-white font-mono">
                          {health.actionCount}/{health.expectedActions}
                        </span>
                      </div>
                    </div>

                    {/* Health issues */}
                    {health.issues.length > 0 && (
                      <div className="bg-red-900/20 border border-red-700/30 rounded p-2">
                        <div className="text-red-400 text-sm font-medium mb-1">Issues Detected:</div>
                        <ul className="text-red-300 text-xs space-y-1">
                          {health.issues.map((issue, idx) => (
                            <li key={idx}>• {issue}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Actions summary */}
                    {session.actions && session.actions.length > 0 && (
                      <div className="bg-slate-800/50 rounded p-2">
                        <div className="text-slate-300 text-sm font-medium mb-1">Recent Actions:</div>
                        <div className="flex flex-wrap gap-1">
                          {session.actions.slice(-5).map((action, idx) => (
                            <span
                              key={idx}
                              className={`text-xs px-2 py-1 rounded ${
                                action.action === 'ban'
                                  ? 'bg-red-700/30 text-red-300'
                                  : 'bg-green-700/30 text-green-300'
                              }`}
                            >
                              {action.action} {action.maps?.display_name || 'Unknown Map'}
                            </span>
                          ))}
                          {session.actions.length > 5 && (
                            <span className="text-xs text-slate-400">
                              +{session.actions.length - 5} more
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* VetoMedic Action Buttons */}
                    <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-700">
                      {/* Reset Veto */}
                      <Button
                        onClick={() => resetVetoSession(session.id)}
                        disabled={isProcessing}
                        size="sm"
                        className="bg-yellow-600/20 hover:bg-yellow-600/30 border-yellow-600/30 text-yellow-400"
                      >
                        <RotateCcw className="w-4 h-4 mr-1" />
                        {isProcessing ? 'Resetting...' : 'Reset Veto'}
                      </Button>

                      {/* Force Complete Veto */}
                      {session.status !== 'completed' && (
                        <div className="flex items-center gap-2">
                          <Select value={selectedForceMap} onValueChange={setSelectedForceMap}>
                            <SelectTrigger className="w-32 h-8 text-xs">
                              <SelectValue placeholder="Select Map" />
                            </SelectTrigger>
                            <SelectContent>
                              {tournamentMaps.map((map) => (
                                <SelectItem key={map.id} value={map.id}>
                                  {map.display_name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Button
                            onClick={() => forceCompleteVeto(session.id, selectedForceMap)}
                            disabled={isProcessing || !selectedForceMap}
                            size="sm"
                            className="bg-green-600/20 hover:bg-green-600/30 border-green-600/30 text-green-400"
                          >
                            <Play className="w-4 h-4 mr-1" />
                            Force Complete
                          </Button>
                        </div>
                      )}

                      {/* Rollback Last Action */}
                      {session.actions && session.actions.length > 0 && (
                        <Button
                          onClick={() => rollbackLastAction(session.id)}
                          disabled={isProcessing}
                          size="sm"
                          className="bg-orange-600/20 hover:bg-orange-600/30 border-orange-600/30 text-orange-400"
                        >
                          <Undo className="w-4 h-4 mr-1" />
                          Rollback Last
                        </Button>
                      )}

                      {/* Fix Sync Issue */}
                      {health.issues.some(issue => issue.includes('SYNC ERROR') || issue.includes('TURN SEQUENCE ERROR')) && (
                        <Button
                          onClick={() => fixSyncIssue(session.id)}
                          disabled={isProcessing}
                          size="sm"
                          className="bg-cyan-600/20 hover:bg-cyan-600/30 border-cyan-600/30 text-cyan-400"
                        >
                          <Settings className="w-4 h-4 mr-1" />
                          Fix Sync
                        </Button>
                      )}

                      {/* Health Check (Manual Refresh) */}
                      <Button
                        onClick={() => runHealthChecks([session])}
                        disabled={isProcessing}
                        size="sm"
                        variant="outline"
                        className="border-blue-500/40 text-blue-300"
                      >
                        <Settings className="w-4 h-4 mr-1" />
                        Health Check
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
