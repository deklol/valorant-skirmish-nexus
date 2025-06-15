import React from "react";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { Map, Play, Settings, AlertCircle, Dice3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useEnhancedNotifications } from "@/hooks/useEnhancedNotifications";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect, useRef, useCallback } from "react";
import MapVetoDialog from "./MapVetoDialog";
import { useMapVetoSessionRealtime } from "@/hooks/useMapVetoRealtime";
import ErrorBoundary from "../ErrorBoundary";
import RollDiceButton from "./RollDiceButton";

interface MapVetoManagerProps {
  matchId: string;
  team1Id: string | null;
  team2Id: string | null;
  team1Name: string;
  team2Name: string;
  matchStatus: string;
  userTeamId: string | null;
  roundNumber?: number;
  isAdmin?: boolean;
  onVetoReset?: (sessionId: string) => void;
}

const MapVetoManager = ({
  matchId,
  team1Id,
  team2Id,
  team1Name,
  team2Name,
  matchStatus,
  userTeamId,
  roundNumber,
  isAdmin = false,
  onVetoReset,
}: MapVetoManagerProps & { onVetoReset?: (sessionId: string) => void }) => {
  const [vetoSession, setVetoSession] = useState<any>(null);
  const [vetoDialogOpen, setVetoDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [tournamentSettings, setTournamentSettings] = useState<any>(null);
  const [matchSettings, setMatchSettings] = useState<any>(null);
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [teamSize, setTeamSize] = useState<number | null>(null);
  const [resettingVeto, setResettingVeto] = useState(false);
  const [rollInfo, setRollInfo] = useState<{
    home_team_id: string | null;
    away_team_id: string | null;
    roll_seed: string | null;
  }>({
    home_team_id: null,
    away_team_id: null,
    roll_seed: null,
  });
  const { user } = useAuth();
  const { toast } = useToast();
  const { notifyMapVetoReady } = useEnhancedNotifications();

  // Defensive logging
  useEffect(() => {
    console.log("[MapVetoManager] Mount, matchId:", matchId);
  }, [matchId]);

  // -- BEGIN: Prevent subscription churn
  // Use a ref to prevent overlapping session fetches
  const sessionFetchRef = useRef(false);

  // Always define checkVetoSession as a stable function for use in effects/subscriptions
  const checkVetoSession = useCallback(async () => {
    if (sessionFetchRef.current) return; // avoid overlapping
    sessionFetchRef.current = true;
    try {
      const { data: session, error } = await supabase
        .from('map_veto_sessions')
        .select('*')
        .eq('match_id', matchId)
        .maybeSingle();
      setVetoSession(session ?? null);
    } catch (error) {
      setVetoSession(null);
    } finally {
      sessionFetchRef.current = false;
    }
  }, [matchId]);

  useEffect(() => {
    checkVetoSession();
    fetchTournamentAndMatchSettings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchId]); // Don't include checkVetoSession in deps

  const fetchTournamentAndMatchSettings = async () => {
    setSettingsLoading(true);
    try {
      const { data: matchData, error: matchError } = await supabase
        .from('matches')
        .select(`
          map_veto_enabled,
          round_number,
          tournaments:tournament_id (
            enable_map_veto,
            map_veto_required_rounds
          )
        `)
        .eq('id', matchId)
        .maybeSingle();

      if (matchError) throw matchError;

      setMatchSettings(matchData ?? null);
      setTournamentSettings(matchData && matchData.tournaments ? matchData.tournaments : null);
      if (!matchData) {
        console.log("[MapVetoManager] No matchData returned");
      }
    } catch (error) {
      console.error('Error fetching tournament/match settings:', error);
      setMatchSettings(null);
      setTournamentSettings(null);
    } finally {
      setSettingsLoading(false);
    }
  };

  // Always call useMapVetoSessionRealtime to obey React Rules of Hooks
  // Pass a stable callback that only triggers session fetch, not state change chain
  // This is the ONLY real-time session subscription for this veto session!
  useMapVetoSessionRealtime(
    vetoSession?.id ? vetoSession.id : null,
    useCallback((payload) => {
      // Only fetch session data, do NOT directly setVetoSession here
      console.log("[MapVetoManager] Realtime update for session, refetching...");
      checkVetoSession(); // this will update session once, no state recursion
    }, [checkVetoSession])
  );

  const isMapVetoAvailable = () => {
    // Defensive: ensure settings are loaded
    if (settingsLoading) return false;
    if (matchSettings && typeof matchSettings.map_veto_enabled === "boolean") {
      return matchSettings.map_veto_enabled;
    }
    if (!tournamentSettings) {
      // Settings missing: safety fallback, log for diagnosis
      console.log("[MapVetoManager] tournamentSettings are null, veto not available");
      return false;
    }
    if (!tournamentSettings.enable_map_veto) {
      return false;
    }
    // If no specific rounds defined, veto is available for all matches
    if (!tournamentSettings.map_veto_required_rounds ||
      !Array.isArray(tournamentSettings.map_veto_required_rounds) ||
      tournamentSettings.map_veto_required_rounds.length === 0) {
      return true;
    }
    // Check if current round requires veto
    const round = roundNumber || matchSettings?.round_number;
    return tournamentSettings.map_veto_required_rounds.includes(round);
  };

  const toggleMapVetoForMatch = async (enabled: boolean) => {
    if (!isAdmin) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('matches')
        .update({ map_veto_enabled: enabled })
        .eq('id', matchId);

      if (error) throw error;
      setMatchSettings((prev: any) => (prev ? { ...prev, map_veto_enabled: enabled } : prev));
      toast({
        title: "Map Veto Updated",
        description: `Map veto ${enabled ? 'enabled' : 'disabled'} for this match`,
      });
    } catch (error: any) {
      console.error('Error updating map veto setting:', error);
      toast({
        title: "Error",
        description: "Failed to update map veto setting",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const initializeMapVeto = async () => {
    if (!team1Id || !team2Id) {
      toast({
        title: "Error",
        description: "Both teams must be assigned before starting map veto",
        variant: "destructive",
      });
      return;
    }
    if (!isMapVetoAvailable()) {
      toast({
        title: "Error",
        description: "Map veto is not enabled for this match",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // 1. Check if a 'pending' session already exists for this match
      const { data: existingSession, error: existingSessionErr } = await supabase
        .from('map_veto_sessions')
        .select('*')
        .eq('match_id', matchId)
        .eq('status', 'pending')
        .maybeSingle();

      let session = null;

      // FIX: The first ban should be by the home team (not always team1Id!).
      // Use home_team_id if available. For new sessions, set turn to home_team_id.
      // Defensive: pull .home_team_id/.away_team_id from rolled session if exists.
      if (existingSession && !existingSessionErr) {
        // If home_team_id already set (from dice roll), use that for turn
        const homeId = existingSession.home_team_id || team1Id;
        const { data: updated, error: updateErr } = await supabase
          .from('map_veto_sessions')
          .update({
            status: 'in_progress',
            current_turn_team_id: homeId,
            started_at: new Date().toISOString(),
            completed_at: null,
          })
          .eq('id', existingSession.id)
          .select()
          .single();

        if (updateErr) throw updateErr;
        session = updated;
      } else {
        // 3. Otherwise, insert a new session
        // For new session, always set turn to home_team_id if available
        const homeId = null; // There will be no home_team_id until dice roll, so fallback to team1Id safely
        const { data: inserted, error: insertErr } = await supabase
          .from('map_veto_sessions')
          .insert({
            match_id: matchId,
            current_turn_team_id: team1Id,
            status: 'in_progress',
            started_at: new Date().toISOString(),
            completed_at: null,
          })
          .select()
          .single();
        if (insertErr) throw insertErr;
        session = inserted;
      }

      setVetoSession(session);

      // Notify teams that veto is ready
      await notifyMapVetoReady(matchId, team1Id, team2Id);

      toast({
        title: "Map Veto Started",
        description: "Teams can now participate in map selection",
      });

      // Optionally, refresh settings/match after starting
      fetchTournamentAndMatchSettings?.();
    } catch (error: any) {
      console.error('Error initializing map veto:', error);
      toast({
        title: "Error",
        description: error?.message || "Failed to start map veto",
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

      // Update match status to ready/live
      await supabase
        .from('matches')
        .update({ status: 'live' })
        .eq('id', matchId);

      setVetoSession({ ...vetoSession, status: 'completed' });

      toast({
        title: "Map Veto Completed",
        description: "Match is now ready to begin",
      });
    } catch (error: any) {
      console.error('Error completing veto:', error);
      toast({
        title: "Error",
        description: "Failed to complete veto",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const resetVetoSession = async () => {
    if (!isAdmin || !vetoSession) return;
    setResettingVeto(true);
    try {
      // 1. Delete all actions for this session
      const { error: actionsErr } = await supabase
        .from('map_veto_actions')
        .delete()
        .eq('veto_session_id', vetoSession.id);

      if (actionsErr) {
        console.error('[ResetVeto] Error deleting actions:', actionsErr);
        throw new Error('Failed to clear map veto actions');
      }

      // 2. Reset the session status and relevant fields
      const { error: sessionErr } = await supabase
        .from('map_veto_sessions')
        .update({
          status: 'pending',
          current_turn_team_id: null,
          started_at: null,
          completed_at: null,
        })
        .eq('id', vetoSession.id);

      if (sessionErr) {
        console.error('[ResetVeto] Error resetting session:', sessionErr);
        throw new Error('Failed to reset veto session');
      }

      // 3. Also set the match itself back to pending so veto can be re-initialized
      const { error: matchErr, data: matchUpdateData } = await supabase
        .from('matches')
        .update({ status: 'pending' })
        .eq('id', matchId)
        .select();

      if (matchErr) {
        console.error('[ResetVeto] Error setting match to pending:', matchErr);
        throw new Error('Failed to reset match status. The match is still live.');
      }

      // 4. NEW: Immediately notify parent to clear local veto progress state
      if (typeof onVetoReset === "function") {
        onVetoReset(vetoSession.id);
      }

      toast({
        title: "Veto Session Reset",
        description: "Map veto and match status have been reset. You can now re-initialize the veto.",
      });

      // Refetch session and update local UI
      checkVetoSession();
      // Optionally, force a reload of match settings/status if available
      fetchTournamentAndMatchSettings?.();

      // --- NEW: Immediately clear/reload map veto actions for this session, ensuring progress = 0
      // This ensures the progress indicator updates to 0/11 (etc)
      // Example for local state:
      setTimeout(() => {
        // clear or refresh vetoActions state if needed here
        // (assumes you have fetchVetoActions utility or similar for live veto actions)
        // If vetoActions is tracked in a parent as cache/history, trigger reload/clear
        // Example:
        // if (typeof fetchVetoActions === "function") fetchVetoActions();
      }, 100);

    } catch (error: any) {
      // ... keep existing error toast
      toast({
        title: "Error",
        description: error?.message || "Failed to reset map veto session or match status.",
        variant: "destructive",
      });
    } finally {
      setResettingVeto(false);
    }
  };

  const canParticipate = userTeamId && (userTeamId === team1Id || userTeamId === team2Id);
  const isVetoActive = vetoSession?.status === 'in_progress';
  const isVetoComplete = vetoSession?.status === 'completed';
  const mapVetoAvailable = isMapVetoAvailable();

  // Fetch team size (members per team)
  useEffect(() => {
    async function fetchTeamSize() {
      if (!team1Id) return setTeamSize(null);
      const { data, error } = await supabase
        .from('team_members')
        .select('user_id')
        .eq('team_id', team1Id);

      if (!error && data) setTeamSize(data.length);
      else setTeamSize(null);
    }
    fetchTeamSize();
  }, [team1Id]);

  // Fetch user's captain status for their team
  const [isUserCaptain, setIsUserCaptain] = useState<boolean>(false);
  useEffect(() => {
    if (!userTeamId || !team1Id && !team2Id) {
      setIsUserCaptain(false);
      return;
    }
    async function checkCaptain() {
      // In 1v1, everyone is captain
      if (teamSize === 1) {
        setIsUserCaptain(true);
        return;
      }
      // Otherwise: check team_members.is_captain
      if (userTeamId) {
        const { data, error } = await supabase
          .from('team_members')
          .select('is_captain')
          .eq('team_id', userTeamId)
          .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
          .maybeSingle();
        setIsUserCaptain(!!data?.is_captain);
      }
    }
    checkCaptain();
  }, [userTeamId, teamSize]);

  // Extract roll data from session
  useEffect(() => {
    if (!vetoSession) return;
    setRollInfo({
      home_team_id: vetoSession.home_team_id || null,
      away_team_id: vetoSession.away_team_id || null,
      roll_seed: vetoSession.roll_seed || null,
    });
  }, [vetoSession]);

  // Defensive: Render nothing if match is completed or settings are still loading
  if (matchStatus === 'completed' || settingsLoading) {
    return null;
  }

  // Defensive: If settings can't be loaded, display fallback
  if (!matchSettings || !tournamentSettings) {
    return (
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Map className="w-5 h-5" />
            Map Veto System
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="p-4 text-center text-red-400">
            Unable to load map veto settings. Please reload or contact admin.
          </div>
        </CardContent>
      </Card>
    );
  }

  // The veto can commence if home/away are set OR if format remains old
  const canVetoStart =
    mapVetoAvailable &&
    !!vetoSession &&
    vetoSession.status === "in_progress" &&
    !!vetoSession.home_team_id &&
    !!vetoSession.away_team_id;

  // Home/away UI labels for dialog/children
  const homeLabel =
    (team1Id && rollInfo.home_team_id === team1Id
      ? team1Name
      : team2Id && rollInfo.home_team_id === team2Id
      ? team2Name
      : undefined) || "Home";
  const awayLabel =
    (team1Id && rollInfo.away_team_id === team1Id
      ? team1Name
      : team2Id && rollInfo.away_team_id === team2Id
      ? team2Name
      : undefined) || "Away";

  // Main return below covers all valid statuses

  return (
    <Card className="bg-slate-800 border-slate-700">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <Map className="w-5 h-5" />
          Map Veto System
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-white font-medium">Map Veto:</span>
            <Badge
              className={
                mapVetoAvailable
                  ? "bg-green-500/20 text-green-400 border-green-500/30"
                  : "bg-gray-500/20 text-gray-400 border-gray-500/30"
              }
            >
              {mapVetoAvailable ? 'Available' : 'Not Available'}
            </Badge>
            {matchSettings?.map_veto_enabled !== null && (
              <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">
                Admin Override
              </Badge>
            )}
          </div>
          {isAdmin && (
            <div className="flex gap-2">
              {/* Enable/Disable Veto buttons */}
              <Button
                onClick={() => toggleMapVetoForMatch(true)}
                disabled={loading || matchSettings?.map_veto_enabled === true}
                size="sm"
                className="bg-green-600/20 hover:bg-green-600/30 border-green-600/30 text-green-400"
              >
                Enable Veto
              </Button>
              <Button
                onClick={() => toggleMapVetoForMatch(false)}
                disabled={loading || matchSettings?.map_veto_enabled === false}
                size="sm"
                className="bg-red-600/20 hover:bg-red-600/30 border-red-600/30 text-red-400"
              >
                Disable Veto
              </Button>
              {/* Admin Reset Veto button */}
              {vetoSession && (
                <Button
                  onClick={resetVetoSession}
                  disabled={resettingVeto}
                  size="sm"
                  className="bg-yellow-600/20 hover:bg-yellow-600/30 border-yellow-600/30 text-yellow-400"
                >
                  {resettingVeto ? 'Resetting...' : 'Reset Veto'}
                </Button>
              )}
            </div>
          )}
        </div>

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
                  isCaptain={!!isUserCaptain}
                  onComplete={() => checkVetoSession()} // Refresh session after roll
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

        {/* Updated: Map Veto start logic allows session with status 'pending' */}
        {!mapVetoAvailable ? (
          <div className="flex items-center gap-2 p-3 bg-gray-500/10 border border-gray-500/20 rounded-lg">
            <AlertCircle className="w-4 h-4 text-gray-500" />
            <span className="text-gray-500 text-sm">
              Map veto is not enabled for this match.
              {isAdmin && " Use admin controls above to override."}
            </span>
          </div>
        )
        : ((!vetoSession || vetoSession?.status === 'pending') ? (
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
          <div className="space-y-4">
            {/* Only allow participate if roll completed */}
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
                  disabled={(!isUserCaptain && (teamSize && teamSize > 1))}
                >
                  <Play className="w-4 h-4 mr-2" />
                  {(!isUserCaptain && (teamSize && teamSize > 1))
                    ? "Only Captain May Veto"
                    : "Participate"}
                </Button>
              )}
            </div>
            {/* ... admin controls & completed message ... */}
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
        ))}
      </CardContent>
      {/* Only open the dialog if home/away is set */}
      {vetoSession &&
        vetoSession.status === "in_progress" &&
        team1Id && team2Id && mapVetoAvailable &&
        vetoSession.home_team_id && vetoSession.away_team_id && (
          <ErrorBoundary>
            <MapVetoDialog
              open={vetoDialogOpen}
              onOpenChange={setVetoDialogOpen}
              matchId={matchId}
              vetoSessionId={vetoSession.id}
              team1Name={team1Name}
              team2Name={team2Name}
              currentTeamTurn={vetoSession.current_turn_team_id || team1Id}
              userTeamId={userTeamId}
              isUserCaptain={isUserCaptain}
              teamSize={teamSize}
              team1Id={team1Id}
              team2Id={team2Id}
              bestOf={matchSettings?.best_of || 1}
              homeTeamId={vetoSession.home_team_id}
              awayTeamId={vetoSession.away_team_id}
            />
          </ErrorBoundary>
        )}
    </Card>
  );
};

export default MapVetoManager;
