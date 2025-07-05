import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import MapVetoDialogNew from "./MapVetoDialogNew";
import MapVetoHistory from "./MapVetoHistory";
import AdminVetoControls from "./AdminVetoControls";
import RollDiceButton from "./RollDiceButton";
import SessionRecoveryTools from "./SessionRecoveryTools";
import { getTournamentMapPool } from "./vetoFlowUtils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Dice3, AlertCircle, Map, Play, Settings } from "lucide-react";
import ErrorBoundary from "@/components/ErrorBoundary";

interface MapVetoManagerProps {
  matchId: string;
  team1Id?: string;
  team2Id?: string;
  team1Name?: string;
  team2Name?: string;
  matchStatus?: string;
  userTeamId?: string | null;
  isAdmin?: boolean;
  onVetoComplete?: () => void;
}

export default function MapVetoManager({ 
  matchId, 
  team1Id, 
  team2Id, 
  team1Name, 
  team2Name, 
  matchStatus, 
  userTeamId, 
  isAdmin = false,
  onVetoComplete 
}: MapVetoManagerProps) {
  const [match, setMatch] = useState<any>(null);
  const [vetoSession, setVetoSession] = useState<any>(null);
  const [vetoActions, setVetoActions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tournamentMapPool, setTournamentMapPool] = useState<any[]>([]);
  const [vetoDialogOpen, setVetoDialogOpen] = useState(false);
  const [isUserCaptain, setIsUserCaptain] = useState(false);
  const { toast } = useToast();

  const loadMatchAndSession = useCallback(async () => {
    setLoading(true);
    try {
      // Load match data with full tournament details for permission checks
      const { data: matchData, error: matchError } = await supabase
        .from("matches")
        .select(`
          *,
          tournament:tournament_id (
            id, name, map_pool, enable_map_veto, team_size, registration_type
          )
        `)
        .eq("id", matchId)
        .maybeSingle();

      if (matchError) throw matchError;
      if (!matchData) throw new Error("Match not found");
      
      // Load team names separately to avoid the table alias conflict
      let team1Data = null;
      let team2Data = null;
      
      if (matchData.team1_id) {
        const { data } = await supabase
          .from("teams")
          .select("id, name")
          .eq("id", matchData.team1_id)
          .maybeSingle();
        team1Data = data;
      }
      
      if (matchData.team2_id) {
        const { data } = await supabase
          .from("teams")
          .select("id, name")
          .eq("id", matchData.team2_id)
          .maybeSingle();
        team2Data = data;
      }

      // Add team data to match object
      const enrichedMatchData = {
        ...matchData,
        team1: team1Data,
        team2: team2Data
      };
      
      setMatch(enrichedMatchData);

      // Load tournament map pool
      if (matchData.tournament?.map_pool && Array.isArray(matchData.tournament.map_pool)) {
        const mapIds = matchData.tournament.map_pool;
        if (mapIds.length > 0) {
          const stringMapIds = mapIds.map(id => String(id));
          const { data: mapData } = await supabase
            .from('maps')
            .select('*')
            .in('id', stringMapIds)
            .eq('is_active', true);
          
          if (mapData) {
            setTournamentMapPool(mapData.sort((a, b) => a.display_name.localeCompare(b.display_name)));
          }
        }
      }

      // Check if user is a member of their team (allow any member for solo tournaments)
      if (userTeamId) {
        const currentUser = (await supabase.auth.getUser()).data.user;
        if (currentUser?.id) {
          const { data: memberData } = await supabase
            .from('team_members')
            .select('is_captain')
            .eq('team_id', userTeamId)
            .eq('user_id', currentUser.id)
            .maybeSingle();
          
          // For solo tournaments, any team member can perform veto actions
          // For team tournaments, only captains can act
          const isTeamMember = memberData !== null;
          const isCaptain = memberData?.is_captain === true;
          
          // Set captain status (used for UI display)
          setIsUserCaptain(isCaptain);
          
          // For veto permissions: allow captains OR any member in solo tournaments  
          const canPerformVeto = isCaptain || (isTeamMember && (matchData?.tournament?.team_size === 1 || matchData?.tournament?.registration_type === 'solo'));
        }
      }

      // Load veto session
      const { data: sessionData } = await supabase
        .from("map_veto_sessions")
        .select("*")
        .eq("match_id", matchId)
        .maybeSingle();

      setVetoSession(sessionData);

      // Load veto actions if session exists
      if (sessionData) {
        const { data: actionsData } = await supabase
          .from("map_veto_actions")
          .select("*, maps:map_id(*), users:performed_by(discord_username)")
          .eq("veto_session_id", sessionData.id)
          .order("order_number");
        
        setVetoActions(actionsData || []);
        
        // Check for inconsistent session state
        const actionCount = (actionsData || []).length;
        const isInconsistent = sessionData?.status === 'completed' && actionCount < 6; // Minimum actions for BO1
        
        if (isInconsistent && isAdmin) {
          console.warn('Inconsistent veto session detected:', { sessionId: sessionData.id, status: sessionData.status, actionCount });
        }
      }
    } catch (error: any) {
      console.error("MapVeto: Error loading data:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to load match data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [matchId, userTeamId, toast]);

  const refreshData = useCallback(() => {
    loadMatchAndSession();
  }, [loadMatchAndSession]);

  const initializeMapVeto = async () => {
    setLoading(true);
    try {
      const { data: matchData } = await supabase
        .from('matches')
        .select('team1_id, team2_id')
        .eq('id', matchId)
        .single();

      if (!matchData) throw new Error('Match not found');

      // Initialize session without setting current_turn_team_id - it will be set after dice roll
      const { error } = await supabase
        .from('map_veto_sessions')
        .insert({
          match_id: matchId,
          status: 'pending', // Start in pending so dice roll shows
          current_turn_team_id: null, // Don't set until after dice roll
          started_at: new Date().toISOString()
        });

      if (error) throw error;

      toast({
        title: "Map Veto Started",
        description: "Map veto session has been initialized",
      });
      
      refreshData();
      onVetoComplete?.();
    } catch (error: any) {
      console.error("MapVeto: Failed to initialize:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to start veto",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const forceCompleteVeto = async () => {
    if (!vetoSession) return;
    
    setLoading(true);
    try {
      await supabase
        .from('map_veto_sessions')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString()
        })
        .eq('id', vetoSession.id);

      toast({
        title: "Veto Force Completed",
        description: "Map veto session has been force completed",
      });
      
      refreshData();
      onVetoComplete?.();
    } catch (error: any) {
      console.error("MapVeto: Failed to force complete:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to force complete veto",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Load initial data once - stable dependency to prevent loops
  useEffect(() => {
    loadMatchAndSession();
  }, [matchId]); // Only matchId dependency

  if (loading) {
    return <div className="text-center py-4">Loading map veto...</div>;
  }

  if (!match) {
    return <div className="text-center py-4 text-red-400">Match not found</div>;
  }

  // Check veto availability (no console spam)

  // If a veto session exists, it means admin has enabled veto for this match - always show it
  const hasActiveVetoSession = vetoSession && (vetoSession.status === 'pending' || vetoSession.status === 'in_progress');
  
  // Allow admins to bypass tournament veto settings, or if match-level veto is explicitly enabled, or if active veto session exists
  if (!isAdmin && !match.tournament?.enable_map_veto && match.map_veto_enabled !== true && !hasActiveVetoSession) {
    return <div className="text-center py-4 text-slate-400">Map veto is not enabled for this tournament</div>;
  }

  // Derived state - prioritize match-level setting over tournament-level
  const mapVetoAvailable = isAdmin || match.map_veto_enabled === true || (match.tournament?.enable_map_veto && match.map_veto_enabled !== false);
  const showStartVeto = !vetoSession;
  const showVetoFlow = vetoSession;
  const isVetoActive = vetoSession?.status === 'in_progress';
  const isVetoComplete = vetoSession?.status === 'completed';
  const canParticipate = userTeamId && (userTeamId === team1Id || userTeamId === team2Id);
  
  // Get actual team size from tournament data - default to 1 for solo tournaments
  const teamSize = match?.tournament?.team_size || (match?.tournament?.registration_type === 'solo' ? 1 : 5);
  
  // Check for inconsistent session state
  const actionCount = vetoActions.length;
  const isInconsistent = vetoSession?.status === 'completed' && actionCount < 6; // Minimum actions for BO1

  // Labels for home/away teams - use loaded team data as fallback to passed props
  const homeLabel = vetoSession?.home_team_id === team1Id ? (match.team1?.name || team1Name || 'Team 1') : (match.team2?.name || team2Name || 'Team 2');
  const awayLabel = vetoSession?.away_team_id === team1Id ? (match.team1?.name || team1Name || 'Team 1') : (match.team2?.name || team2Name || 'Team 2');
  const rollInfo = {
    roll_seed: vetoSession?.roll_seed,
    roll_timestamp: vetoSession?.roll_timestamp,
    roll_initiator_id: vetoSession?.roll_initiator_id
  };

  // Turn status available for debugging if needed

  return (
    <Card className="bg-slate-800 border-slate-700">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <Map className="w-5 h-5" />
          Map Veto
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Admin Controls */}
        {isAdmin && (
          <AdminVetoControls
            matchId={matchId}
            onVetoAction={() => {
              refreshData();
              onVetoComplete?.();
            }}
            vetoSession={vetoSession}
            matchSettings={match}
          />
        )}
        
        {/* Session Recovery Tools - only show if session is inconsistent */}
        {isAdmin && isInconsistent && vetoSession && (
          <SessionRecoveryTools
            sessionId={vetoSession.id}
            onRecovery={refreshData}
          />
        )}

        {/* Dice roll pre-veto */}
        {vetoSession &&
          vetoSession.status === "in_progress" &&
          (!vetoSession.home_team_id || !vetoSession.away_team_id) && (
            <div className="p-4 mb-3 bg-slate-900/80 border border-blue-700 rounded-lg flex flex-col gap-3 items-center">
              <div className="text-yellow-300 text-sm flex items-center gap-2">
                <Dice3 className="w-6 h-6" />
                <span>
                  Before map veto, a captain must randomly determine "Home" and "Away" team.
                  This is <strong>public, fair, and auditable</strong>. Home team gets first ban.
                </span>
              </div>
              {isAdmin || isUserCaptain ? (
                <RollDiceButton
                  sessionId={vetoSession.id}
                  team1Id={team1Id!}
                  team2Id={team2Id!}
                  isCaptain={isUserCaptain || (match?.tournament?.team_size === 1 || match?.tournament?.registration_type === 'solo')}
                  onComplete={() => {
                    refreshData();
                  }}
                />
              ) : (
                <div className="text-slate-400">Waiting for captain to roll...</div>
              )}
            </div>
          )}

        {/* Show dice roll results if set */}
        {vetoSession &&
          vetoSession.home_team_id &&
          vetoSession.away_team_id && (
            <div className="mb-2 flex gap-8 justify-center">
              <div className="bg-slate-900/60 px-3 py-1 rounded text-yellow-100 border border-yellow-700 text-sm">
                <Dice3 className="w-4 h-4 inline mr-1" />
                <span>
                  Home: <b>{homeLabel}</b>
                </span>
              </div>
              <div className="bg-slate-900/60 px-3 py-1 rounded text-blue-100 border border-blue-700 text-sm">
                <span>
                  Away: <b>{awayLabel}</b>
                </span>
              </div>
              <div className="bg-slate-900/60 px-3 py-1 rounded text-pink-100 border border-pink-700 text-xs">
                Seed: <span className="font-mono">{rollInfo.roll_seed?.slice(0, 32)}</span>
              </div>
            </div>
          )}

        {/* Map Veto start logic */}
        {!mapVetoAvailable ? (
          <div className="flex items-center gap-2 p-3 bg-gray-500/10 border border-gray-500/20 rounded-lg">
            <AlertCircle className="w-4 h-4 text-gray-500" />
            <span className="text-gray-500 text-sm">
              Map veto is not enabled for this match.
              {isAdmin && " Use admin controls above to override."}
            </span>
          </div>
        )
        : showStartVeto ? (
          <div className="text-center space-y-4">
            <p className="text-slate-400">
              Map veto has not been started for this match yet
            </p>
            {(isAdmin || canParticipate) && (
              <Button
                onClick={initializeMapVeto}
                disabled={loading || !team1Id || !team2Id}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Map className="w-4 h-4 mr-2" />
                {loading ? 'Starting...' : 'Start Map Veto'}
              </Button>
            )}
          </div>
        ) : (
          showVetoFlow && (
            <div className="space-y-4">
              {/* Veto status and participate button */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-white font-medium">Veto Status:</span>
                  <Badge
                    className={
                      isVetoActive
                        ? "bg-green-500/20 text-green-400 border-green-500/30"
                        : isVetoComplete
                          ? "bg-blue-500/20 text-blue-400 border-blue-500/30"
                          : "bg-gray-500/20 text-gray-400 border-gray-500/30"
                    }
                  >
                    {vetoSession.status === 'in_progress' ? 'In Progress' :
                      vetoSession.status === 'completed' ? 'Completed' :
                        'Pending'}
                  </Badge>
                </div>

                {/* Only allow open dialog if dice roll is complete */}
                {isVetoActive && canParticipate && vetoSession.home_team_id && vetoSession.away_team_id && (
                  <Button
                    onClick={() => setVetoDialogOpen(true)}
                    className="bg-green-600 hover:bg-green-700"
                    disabled={!isUserCaptain && teamSize > 1}
                  >
                    <Play className="w-4 h-4 mr-2" />
                    {!isUserCaptain && teamSize > 1
                      ? "Only Captain May Veto"
                      : "Participate"}
                  </Button>
                )}
              </div>

              {/* Admin controls & completed message */}
              {isAdmin && isVetoActive && (
                <div className="flex gap-2">
                  <Button
                    onClick={forceCompleteVeto}
                    disabled={loading}
                    variant="outline"
                    className="bg-red-600/20 hover:bg-red-600/30 border-red-600/30 text-red-400"
                  >
                    <Settings className="w-4 h-4 mr-2" />
                    Force Complete Veto
                  </Button>
                </div>
              )}

              {isVetoComplete && (
                <div className="text-center">
                  <p className="text-green-400 font-medium">
                    Map veto completed! Match is ready to begin.
                  </p>
                </div>
              )}
            </div>
          )
        )}

        {/* Show veto history if session exists */}
        {vetoSession && <MapVetoHistory vetoActions={vetoActions} />}
      </CardContent>

      {/* Map Veto Dialog */}
      {vetoSession &&
        vetoSession.status === "in_progress" &&
        team1Id && team2Id && mapVetoAvailable &&
        vetoSession.home_team_id && vetoSession.away_team_id && (
          <ErrorBoundary>
            <MapVetoDialogNew
              open={vetoDialogOpen}
              onOpenChange={setVetoDialogOpen}
              matchId={matchId}
              vetoSessionId={vetoSession.id}
              team1Name={match.team1?.name || team1Name || 'Team 1'}
              team2Name={match.team2?.name || team2Name || 'Team 2'}
              currentTeamTurn={vetoSession.current_turn_team_id || team1Id}
              userTeamId={userTeamId}
              isUserCaptain={isUserCaptain}
              teamSize={teamSize}
              team1Id={team1Id}
              team2Id={team2Id}
              bestOf={match?.best_of || 1}
              homeTeamId={vetoSession.home_team_id}
              awayTeamId={vetoSession.away_team_id}
              tournamentMapPool={tournamentMapPool}
              onVetoComplete={() => {
                refreshData();
                onVetoComplete?.();
              }}
            />
          </ErrorBoundary>
        )}
    </Card>
  );
}
