
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface SideSelectionHookProps {
  vetoSessionId: string;
  onSideSelected?: () => void;
}

export function useMapVetoSideSelection({ vetoSessionId, onSideSelected }: SideSelectionHookProps) {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const selectSide = async (side: "attack" | "defend") => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('set_side_choice', {
        p_veto_session_id: vetoSessionId,
        p_user_id: (await supabase.auth.getUser()).data.user?.id,
        p_side_choice: side
      });

      if (error) throw error;

      if (data === 'OK') {
        toast({
          title: "Side Selected",
          description: `You selected ${side} side for the map.`,
        });
        onSideSelected?.();
      } else {
        throw new Error(data || 'Failed to select side');
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to select side",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return {
    selectSide,
    loading,
  };
}
