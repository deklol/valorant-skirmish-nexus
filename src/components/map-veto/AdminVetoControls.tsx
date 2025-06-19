
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Settings, Play, RotateCcw, Ban } from "lucide-react";

interface AdminVetoControlsProps {
  matchId: string;
  onVetoAction: () => void;
}

export default function AdminVetoControls({ matchId, onVetoAction }: AdminVetoControlsProps) {
  const { toast } = useToast();

  const handleForceVeto = async () => {
    try {
      // Force create a veto session for this match
      const { data, error } = await supabase.rpc('force_create_veto_session' as any, {
        p_match_id: matchId
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Veto session forced for this match",
      });
      onVetoAction();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to force veto",
        variant: "destructive",
      });
    }
  };

  const handleStartVeto = async () => {
    try {
      // Start the veto process for this match
      const { data, error } = await supabase.rpc('start_veto_session' as any, {
        p_match_id: matchId
      });

      if (error) throw error;

      toast({
        title: "Success", 
        description: "Veto session started",
      });
      onVetoAction();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to start veto",
        variant: "destructive",
      });
    }
  };

  const handleResetVeto = async () => {
    try {
      // Reset the veto session for this match
      const { data, error } = await supabase.rpc('reset_veto_session' as any, {
        p_match_id: matchId
      });

      if (error) throw error;

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
    }
  };

  const handleDisableVeto = async () => {
    try {
      // Disable veto for this match
      const { data, error } = await supabase.rpc('disable_veto_session' as any, {
        p_match_id: matchId
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Veto disabled for this match",
      });
      onVetoAction();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to disable veto", 
        variant: "destructive",
      });
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
          <Button
            onClick={handleForceVeto}
            variant="outline"
            className="flex items-center gap-2"
          >
            <Settings className="w-4 h-4" />
            Force Veto
          </Button>
          <Button
            onClick={handleStartVeto}
            variant="outline"
            className="flex items-center gap-2"
          >
            <Play className="w-4 h-4" />
            Start Veto
          </Button>
          <Button
            onClick={handleResetVeto}
            variant="outline"
            className="flex items-center gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            Reset Veto
          </Button>
          <Button
            onClick={handleDisableVeto}
            variant="destructive"
            className="flex items-center gap-2"
          >
            <Ban className="w-4 h-4" />
            Disable Veto
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
