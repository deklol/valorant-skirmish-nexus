
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
      // -- Accept any string for RPC name, don't restrict
      const { data, error } = await supabase.rpc('set_side_choice' as any, {
        p_veto_session_id: vetoSessionId,
        p_user_id: (await supabase.auth.getUser()).data.user?.id,
        p_side_choice: side
      });

      if (error) throw error;

      // Defensive: treat only string "OK" as OK, otherwise throw/handle errors
      if (typeof data === "string" && data === 'OK') {
        toast({
          title: "Side Selected",
          description: `You selected ${side} side for the map.`,
        });
        onSideSelected?.();
      } else if (typeof data === "string") {
        throw new Error(data);
      } else {
        throw new Error("Failed to select side (no message)");
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error?.message || "Failed to select side",
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
