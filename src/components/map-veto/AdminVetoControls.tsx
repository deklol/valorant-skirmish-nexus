
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Settings, Play, RotateCcw } from "lucide-react";
import { useState } from "react";

interface AdminVetoControlsProps {
  matchId: string;
  onVetoAction: () => void;
  vetoSession?: any;
  matchSettings?: any;
}

export default function AdminVetoControls({ 
  matchId, 
  onVetoAction, 
  vetoSession, 
  matchSettings 
}: AdminVetoControlsProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [resettingVeto, setResettingVeto] = useState(false);

  const enableVetoForMatch = async () => {
    setLoading(true);
    try {
      // First enable veto on the match
      const { error: matchError } = await supabase
        .from('matches')
        .update({ map_veto_enabled: true })
        .eq('id', matchId);

      if (matchError) throw matchError;

      // If no veto session exists, create one in PENDING status so dice roll shows
      if (!vetoSession) {
        const { data: matchData } = await supabase
          .from('matches')
          .select('team1_id, team2_id')
          .eq('id', matchId)
          .single();

        if (matchData) {
          const { error: sessionError } = await supabase
            .from('map_veto_sessions')
            .insert({
              match_id: matchId,
              status: 'pending', // Start in pending so dice roll dialog appears
              current_turn_team_id: matchData.team1_id
            });

          if (sessionError) throw sessionError;
        }
      }

      toast({
        title: "Map Veto Enabled",
        description: "Map veto has been enabled for this match",
      });
      onVetoAction();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to enable veto",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const disableVetoForMatch = async () => {
    setLoading(true);
    try {
      // Disable veto on the match
      const { error: matchError } = await supabase
        .from('matches')
        .update({ map_veto_enabled: false })
        .eq('id', matchId);

      if (matchError) throw matchError;

      // Delete veto session and actions if they exist
      if (vetoSession) {
        await supabase
          .from('map_veto_actions')
          .delete()
          .eq('veto_session_id', vetoSession.id);

        await supabase
          .from('map_veto_sessions')
          .delete()
          .eq('id', vetoSession.id);
      }

      toast({
        title: "Map Veto Disabled",
        description: "Map veto has been disabled for this match",
      });
      onVetoAction();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to disable veto",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const startVetoSession = async () => {
    setLoading(true);
    try {
      const { data: matchData } = await supabase
        .from('matches')
        .select('team1_id, team2_id')
        .eq('id', matchId)
        .single();

      if (!matchData) throw new Error('Match not found');

      // Create veto session if it doesn't exist
      if (!vetoSession) {
        const { error } = await supabase
          .from('map_veto_sessions')
          .insert({
            match_id: matchId,
            status: 'in_progress',
            current_turn_team_id: matchData.team1_id,
            started_at: new Date().toISOString()
          });

        if (error) throw error;
      } else {
        // Update existing session to in_progress
        const { error } = await supabase
          .from('map_veto_sessions')
          .update({
            status: 'in_progress',
            started_at: new Date().toISOString()
          })
          .eq('id', vetoSession.id);

        if (error) throw error;
      }

      toast({
        title: "Veto Session Started",
        description: "Map veto session has been started",
      });
      onVetoAction();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to start veto session",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const resetVetoSession = async () => {
    if (!vetoSession) return;
    
    const sessionId = vetoSession.id;
    const shortId = sessionId.slice(0, 8);
    
    console.log(`🔄 AdminVetoControls: Starting complete reset of session ${shortId}`);
    setResettingVeto(true);
    
    try {
      // Step 1: Get current session data for logging
      const { data: currentSession } = await supabase
        .from('map_veto_sessions')
        .select('*')
        .eq('id', sessionId)
        .single();

      if (currentSession) {
        console.log(`📊 AdminVetoControls: Current session ${shortId} state:`, {
          status: currentSession.status,
          homeTeam: currentSession.home_team_id?.slice(0, 8),
          awayTeam: currentSession.away_team_id?.slice(0, 8),
          currentTurn: currentSession.current_turn_team_id?.slice(0, 8),
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
        console.warn(`⚠️ AdminVetoControls: Failed to count actions for ${shortId}:`, countError);
      } else {
        console.log(`📝 AdminVetoControls: Found ${existingActions?.length || 0} actions to delete for session ${shortId}`);
      }

      const { error: actionsError } = await supabase
        .from('map_veto_actions')
        .delete()
        .eq('veto_session_id', sessionId);

      if (actionsError) {
        console.error(`❌ AdminVetoControls: Failed to delete actions for ${shortId}:`, actionsError);
        throw new Error(`Failed to delete veto actions: ${actionsError.message}`);
      } else {
        console.log(`✅ AdminVetoControls: Successfully deleted ${existingActions?.length || 0} actions for session ${shortId}`);
      }

      // Step 3: Complete session reset with all fields nullified
      console.log(`🔄 AdminVetoControls: Resetting all session fields for ${shortId}`);
      const resetData = {
        status: 'pending',
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
        console.error(`❌ AdminVetoControls: Failed to reset session ${shortId}:`, sessionError);
        throw new Error(`Failed to reset session: ${sessionError.message}`);
      }

      console.log(`✅ AdminVetoControls: Successfully reset session ${shortId} to clean state:`, resetData);

      // Step 4: Verify reset was successful
      const { data: verifySession } = await supabase
        .from('map_veto_sessions')
        .select('status, current_turn_team_id, home_team_id, away_team_id, roll_seed')
        .eq('id', sessionId)
        .single();

      if (verifySession) {
        console.log(`🔍 AdminVetoControls: Post-reset verification for ${shortId}:`, {
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
          console.log(`🎉 AdminVetoControls: Session ${shortId} successfully reset to clean state`);
        } else {
          console.warn(`⚠️ AdminVetoControls: Session ${shortId} may not be completely clean after reset`);
        }
      }

      toast({
        title: "Veto Session Reset",
        description: `Session ${shortId} has been completely reset`,
      });
      
      // Trigger refresh
      onVetoAction();
      
    } catch (error: any) {
      console.error(`❌ AdminVetoControls: Reset failed for session ${shortId}:`, error);
      toast({
        title: "Reset Failed",
        description: error.message || "Failed to reset veto session",
        variant: "destructive",
      });
    } finally {
      setResettingVeto(false);
      console.log(`🏁 AdminVetoControls: Reset operation completed for session ${shortId}`);
    }
  };

  return (
    <Card className="bg-slate-800 border-slate-700">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <Settings className="w-5 h-5" />
          Admin Veto Controls
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2">
          {/* Enable/Disable Veto buttons */}
          <Button
            onClick={enableVetoForMatch}
            disabled={loading || matchSettings?.map_veto_enabled === true}
            size="sm"
            className="bg-green-600/20 hover:bg-green-600/30 border-green-600/30 text-green-400"
          >
            Enable Veto
          </Button>
          <Button
            onClick={disableVetoForMatch}
            disabled={loading || matchSettings?.map_veto_enabled === false}
            size="sm"
            className="bg-red-600/20 hover:bg-red-600/30 border-red-600/30 text-red-400"
          >
            Disable Veto
          </Button>

          {/* Start Veto button */}
          <Button
            onClick={startVetoSession}
            disabled={loading || (vetoSession && vetoSession.status === 'in_progress')}
            variant="outline"
            className="flex items-center gap-2"
          >
            <Play className="w-4 h-4" />
            Start Veto
          </Button>

          {/* Admin Reset Veto button */}
          {vetoSession && (
            <Button
              onClick={resetVetoSession}
              disabled={resettingVeto}
              size="sm"
              className="bg-yellow-600/20 hover:bg-yellow-600/30 border-yellow-600/30 text-yellow-400"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              {resettingVeto ? 'Resetting...' : 'Reset Veto'}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
