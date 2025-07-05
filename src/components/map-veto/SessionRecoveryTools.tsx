import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface SessionRecoveryToolsProps {
  sessionId: string;
  onRecovery: () => void;
}

export default function SessionRecoveryTools({ sessionId, onRecovery }: SessionRecoveryToolsProps) {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const resetSession = async () => {
    setLoading(true);
    try {
      // Delete all veto actions
      await supabase
        .from('map_veto_actions')
        .delete()
        .eq('veto_session_id', sessionId);

      // Reset session to pending state
      await supabase
        .from('map_veto_sessions')
        .update({
          status: 'pending',
          current_turn_team_id: null,
          home_team_id: null,
          away_team_id: null,
          completed_at: null
        })
        .eq('id', sessionId);

      toast({
        title: "Session Reset",
        description: "Veto session has been reset to start over",
      });
      
      onRecovery();
    } catch (error: any) {
      console.error("Failed to reset session:", error);
      toast({
        title: "Reset Failed",
        description: error.message || "Failed to reset veto session",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex gap-2 items-center p-3 bg-yellow-900/20 border border-yellow-700/30 rounded-lg">
      <AlertTriangle className="w-4 h-4 text-yellow-400" />
      <span className="text-yellow-300 text-sm flex-1">
        Session may be in an inconsistent state
      </span>
      <Button
        onClick={resetSession}
        disabled={loading}
        variant="outline"
        size="sm"
        className="bg-yellow-600/20 hover:bg-yellow-600/30 border-yellow-600/30 text-yellow-400"
      >
        <RefreshCw className="w-3 h-3 mr-1" />
        Reset Session
      </Button>
    </div>
  );
}