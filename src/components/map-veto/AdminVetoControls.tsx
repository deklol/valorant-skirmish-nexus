
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Settings, Play, RotateCcw, Ban } from "lucide-react";
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

  const toggleMapVetoForMatch = async (enable: boolean) => {
    setLoading(true);
    try {
      if (enable) {
        // Enable veto and create session
        const { error: matchError } = await supabase
          .from('matches')
          .update({ map_veto_enabled: true })
          .eq('id', matchId);

        if (matchError) throw matchError;

        // Create veto session if it doesn't exist
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
                status: 'pending',
                current_turn_team_id: matchData.team1_id
              });

            if (sessionError) throw sessionError;
          }
        }

        toast({
          title: "Success",
          description: "Map veto enabled for this match",
        });
      } else {
        // Disable veto
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
          title: "Success",
          description: "Map veto disabled for this match",
        });
      }
      
      onVetoAction();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to toggle veto",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const initializeMapVeto = async () => {
    setLoading(true);
    try {
      const { data: matchData } = await supabase
        .from('matches')
        .select('team1_id, team2_id')
        .eq('id', matchId)
        .single();

      if (!matchData) throw new Error('Match not found');

      const { error } = await supabase
        .from('map_veto_sessions')
        .insert({
          match_id: matchId,
          status: 'in_progress',
          current_turn_team_id: matchData.team1_id,
          started_at: new Date().toISOString()
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Map veto session started",
      });
      onVetoAction();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to start veto",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const resetVetoSession = async () => {
    if (!vetoSession) return;
    
    setResettingVeto(true);
    try {
      // Delete all veto actions
      await supabase
        .from('map_veto_actions')
        .delete()
        .eq('veto_session_id', vetoSession.id);

      // Reset session
      const { data: matchData } = await supabase
        .from('matches')
        .select('team1_id')
        .eq('id', matchId)
        .single();

      await supabase
        .from('map_veto_sessions')
        .update({
          status: 'pending',
          current_turn_team_id: matchData?.team1_id,
          started_at: null,
          completed_at: null,
          home_team_id: null,
          away_team_id: null,
          roll_seed: null,
          roll_timestamp: null,
          roll_initiator_id: null
        })
        .eq('id', vetoSession.id);

      toast({
        title: "Success",
        description: "Veto session reset",
      });
      onVetoAction();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to reset veto",
        variant: "destructive",
      });
    } finally {
      setResettingVeto(false);
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

          {/* Start Veto button */}
          <Button
            onClick={initializeMapVeto}
            disabled={loading || !!vetoSession}
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
