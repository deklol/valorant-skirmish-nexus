import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Map, Play, Settings, AlertCircle, Crown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useEnhancedNotifications } from "@/hooks/useEnhancedNotifications";
import { getUserCaptainInfoForMatch, ensureProperCaptain } from "@/utils/captainUtils";
import MapVetoDialog from "./MapVetoDialog";

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
  isAdmin = false
}: MapVetoManagerProps) => {
  const [vetoSession, setVetoSession] = useState<any>(null);
  const [vetoDialogOpen, setVetoDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [tournamentSettings, setTournamentSettings] = useState<any>(null);
  const [matchSettings, setMatchSettings] = useState<any>(null);
  const [captainInfo, setCaptainInfo] = useState<any>(null);
  const { user } = useAuth();
  const { toast } = useToast();
  const { notifyMapVetoReady } = useEnhancedNotifications();

  useEffect(() => {
    checkVetoSession();
    fetchTournamentAndMatchSettings();
    if (user?.id) {
      fetchCaptainInfo();
    }
  }, [matchId, user?.id]);

  const fetchCaptainInfo = async () => {
    if (!user?.id) return;
    
    try {
      const info = await getUserCaptainInfoForMatch(user.id, team1Id, team2Id);
      setCaptainInfo(info);
    } catch (error) {
      console.error('Error fetching captain info:', error);
    }
  };

  const fetchTournamentAndMatchSettings = async () => {
    try {
      // Get match details including tournament settings
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
        .single();

      if (matchError) throw matchError;

      setMatchSettings(matchData);
      setTournamentSettings(matchData.tournaments);
    } catch (error) {
      console.error('Error fetching tournament/match settings:', error);
    }
  };

  const checkVetoSession = async () => {
    try {
      const { data: session } = await supabase
        .from('map_veto_sessions')
        .select('*')
        .eq('match_id', matchId)
        .single();

      setVetoSession(session);
    } catch (error) {
      // No veto session exists yet
      setVetoSession(null);
    }
  };

  const isMapVetoAvailable = () => {
    // Admin override takes precedence
    if (matchSettings?.map_veto_enabled !== null) {
      return matchSettings.map_veto_enabled;
    }

    // Check tournament settings
    if (!tournamentSettings?.enable_map_veto) {
      return false;
    }

    // If no specific rounds defined, veto is available for all matches
    if (!tournamentSettings.map_veto_required_rounds || 
        tournamentSettings.map_veto_required_rounds.length === 0) {
      return true;
    }

    // Check if current round requires veto
    const currentRound = roundNumber || matchSettings?.round_number;
    return tournamentSettings.map_veto_required_rounds.includes(currentRound);
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

      setMatchSettings(prev => ({ ...prev, map_veto_enabled: enabled }));
      
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

    // Ensure proper captains are assigned before veto
    try {
      await ensureProperCaptain(team1Id);
      await ensureProperCaptain(team2Id);
    } catch (error) {
      console.error('Error ensuring captains:', error);
    }

    setLoading(true);
    try {
      // Create veto session
      const { data: session, error } = await supabase
        .from('map_veto_sessions')
        .insert({
          match_id: matchId,
          current_turn_team_id: team1Id, // Team 1 starts
          status: 'in_progress',
          started_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;

      setVetoSession(session);
      
      // Notify teams that veto is ready
      await notifyMapVetoReady(matchId, team1Id, team2Id);
      
      toast({
        title: "Map Veto Started",
        description: "Team captains can now participate in map selection",
      });
    } catch (error: any) {
      console.error('Error initializing map veto:', error);
      toast({
        title: "Error",
        description: "Failed to start map veto",
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

  const canParticipateInVeto = captainInfo?.isCaptain || false;
  const isVetoActive = vetoSession?.status === 'in_progress';
  const isVetoComplete = vetoSession?.status === 'completed';
  const mapVetoAvailable = isMapVetoAvailable();

  if (matchStatus === 'completed') {
    return null; // Don't show veto for completed matches
  }

  return (
    <Card className="bg-slate-800 border-slate-700">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <Map className="w-5 h-5" />
          Map Veto System
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Map Veto Availability Status */}
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
          
          {/* Admin Controls for Map Veto */}
          {isAdmin && (
            <div className="flex gap-2">
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
            </div>
          )}
        </div>

        {/* Captain Information */}
        {captainInfo && userTeamId && (
          <div className="flex items-center gap-2 p-3 bg-slate-700/50 border border-slate-600/50 rounded-lg">
            <Crown className="w-4 h-4 text-yellow-500" />
            <span className="text-slate-300 text-sm">
              {captainInfo.isCaptain ? (
                <span className="text-green-400 font-medium">You are the team captain</span>
              ) : (
                <span>
                  Team Captain: <span className="text-yellow-400 font-medium">{captainInfo.captainName || 'Unknown'}</span>
                </span>
              )}
            </span>
          </div>
        )}

        {!mapVetoAvailable ? (
          <div className="flex items-center gap-2 p-3 bg-gray-500/10 border border-gray-500/20 rounded-lg">
            <AlertCircle className="w-4 h-4 text-gray-500" />
            <span className="text-gray-500 text-sm">
              Map veto is not enabled for this match. 
              {isAdmin && " Use admin controls above to override."}
            </span>
          </div>
        ) : !vetoSession ? (
          <div className="text-center space-y-4">
            <p className="text-slate-400">
              Map veto has not been started for this match yet
            </p>
            {(isAdmin || canParticipateInVeto) && (
              <Button
                onClick={initializeMapVeto}
                disabled={loading || !team1Id || !team2Id}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Map className="w-4 h-4 mr-2" />
                {loading ? 'Starting...' : 'Start Map Veto'}
              </Button>
            )}
            {!canParticipateInVeto && !isAdmin && userTeamId && (
              <p className="text-yellow-400 text-sm">
                Only team captains can start the map veto process
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-4">
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
              
              {isVetoActive && canParticipateInVeto && (
                <Button
                  onClick={() => setVetoDialogOpen(true)}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <Play className="w-4 h-4 mr-2" />
                  Participate
                </Button>
              )}
            </div>

            {isVetoActive && !canParticipateInVeto && !isAdmin && userTeamId && (
              <div className="flex items-center gap-2 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                <AlertCircle className="w-4 h-4 text-yellow-500" />
                <span className="text-yellow-400 text-sm">
                  Only team captains can participate in map veto
                </span>
              </div>
            )}

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
        )}
      </CardContent>

      {/* Map Veto Dialog */}
      {vetoSession && team1Id && team2Id && mapVetoAvailable && (
        <MapVetoDialog
          open={vetoDialogOpen}
          onOpenChange={setVetoDialogOpen}
          matchId={matchId}
          team1Name={team1Name}
          team2Name={team2Name}
          currentTeamTurn={vetoSession.current_turn_team_id || team1Id}
          userTeamId={userTeamId}
          isCaptain={canParticipateInVeto}
        />
      )}
    </Card>
  );
};

export default MapVetoManager;
