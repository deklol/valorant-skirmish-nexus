
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { MapData, VetoAction } from "./types";

interface UseVetoMapActionProps {
  vetoSessionId: string;
  team1Id: string | null;
  team2Id: string | null;
  currentTurnTeamId: string;
  userTeamId: string | null;
  bestOf: number;
  vetoActions: VetoAction[];
  maps: MapData[];
  onActionComplete: () => void;
  checkPermissions: () => string | null;
  setLoading: (loading: boolean) => void;
  toast: (options: any) => void;
}

export function useVetoMapAction({
  vetoSessionId,
  userTeamId,
  onActionComplete,
  checkPermissions,
  setLoading,
  toast,
}: UseVetoMapActionProps) {

  const handleMapAction = async (mapId: string, action: "ban" | "pick") => {
    // Check permissions first
    const permissionError = checkPermissions();
    if (permissionError) {
      toast({
        title: "Permission Denied",
        description: permissionError,
        variant: "destructive",
      });
      return;
    }

    if (!userTeamId) {
      toast({
        title: "Error",
        description: "User team not found",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error("User not authenticated");

      // Use the database function for atomic veto operations
      const { data, error } = await supabase.rpc('perform_veto_action', {
        p_veto_session_id: vetoSessionId,
        p_user_id: user.user.id,
        p_team_id: userTeamId,
        p_map_id: mapId
      });

      if (error) throw error;

      if (data === 'OK') {
        toast({
          title: "Action Successful",
          description: `Map ${action === 'ban' ? 'banned' : 'picked'} successfully`,
        });
        onActionComplete();
      } else {
        // Server returned an error message
        throw new Error(data);
      }

    } catch (error: any) {
      console.error('Veto action error:', error);
      toast({
        title: "Error",
        description: error.message || `Failed to ${action} map`,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return {
    handleMapAction,
  };
}
