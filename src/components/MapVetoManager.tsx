import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Map, Play, Settings } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useEnhancedNotifications } from "@/hooks/useEnhancedNotifications";
import MapVetoDialog from "./MapVetoDialog";

interface MapVetoManagerProps {
  matchId: string;
  team1Id: string | null;
  team2Id: string | null;
  team1Name: string;
  team2Name: string;
  matchStatus: string;
  userTeamId: string | null;
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
  isAdmin = false
}: MapVetoManagerProps) => {
  const [vetoSession, setVetoSession] = useState<any>(null);
  const [vetoDialogOpen, setVetoDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const { notifyMapVetoReady } = useEnhancedNotifications();

  useEffect(() => {
    checkVetoSession();
  }, [matchId]);

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

  const initializeMapVeto = async () => {
    if (!team1Id || !team2Id) {
      toast({
        title: "Error",
        description: "Both teams must be assigned before starting map veto",
        variant: "destructive",
      });
      return;
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
        description: "Teams can now participate in map selection",
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

  const canParticipate = userTeamId && (userTeamId === team1Id || userTeamId === team2Id);
  const isVetoActive = vetoSession?.status === 'in_progress';
  const isVetoComplete = vetoSession?.status === 'completed';

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
        {!vetoSession ? (
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
              
              {isVetoActive && canParticipate && (
                <Button
                  onClick={() => setVetoDialogOpen(true)}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <Play className="w-4 h-4 mr-2" />
                  Participate
                </Button>
              )}
            </div>

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
      {vetoSession && team1Id && team2Id && (
        <MapVetoDialog
          open={vetoDialogOpen}
          onOpenChange={setVetoDialogOpen}
          matchId={matchId}
          team1Name={team1Name}
          team2Name={team2Name}
          currentTeamTurn={vetoSession.current_turn_team_id || team1Id}
          userTeamId={userTeamId}
        />
      )}
    </Card>
  );
};

export default MapVetoManager;
