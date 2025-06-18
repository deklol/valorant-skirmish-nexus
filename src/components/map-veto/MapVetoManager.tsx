
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import MapVetoDialog from "./MapVetoDialog";
import MapVetoHistory from "./MapVetoHistory";
import { getTournamentMapPool } from "./vetoFlowUtils";

interface MapVetoManagerProps {
  matchId: string;
  team1Id?: string;
  team2Id?: string;
  team1Name?: string;
  team2Name?: string;
  matchStatus?: string;
  userTeamId?: string | null;
  isAdmin?: boolean;
  onVetoComplete?: () => void;
}

export default function MapVetoManager({ 
  matchId, 
  team1Id, 
  team2Id, 
  team1Name, 
  team2Name, 
  matchStatus, 
  userTeamId, 
  isAdmin = false,
  onVetoComplete 
}: MapVetoManagerProps) {
  const [match, setMatch] = useState<any>(null);
  const [vetoSession, setVetoSession] = useState<any>(null);
  const [vetoActions, setVetoActions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tournamentMapPool, setTournamentMapPool] = useState<any[]>([]);
  const { toast } = useToast();

  const loadMatchAndSession = useCallback(async () => {
    setLoading(true);
    try {
      // Load match data
      const { data: matchData, error: matchError } = await supabase
        .from("matches")
        .select(`
          *,
          tournament:tournament_id (
            id, name, map_pool, enable_map_veto
          ),
          team1:team1_id (id, name),
          team2:team2_id (id, name)
        `)
        .eq("id", matchId)
        .maybeSingle();

      if (matchError) throw matchError;
      if (!matchData) throw new Error("Match not found");
      
      setMatch(matchData);

      // Load tournament map pool
      if (matchData.tournament?.map_pool && Array.isArray(matchData.tournament.map_pool)) {
        const mapIds = matchData.tournament.map_pool;
        if (mapIds.length > 0) {
          // Convert JSON values to strings for the query
          const stringMapIds = mapIds.map(id => String(id));
          const { data: mapData } = await supabase
            .from('maps')
            .select('*')
            .in('id', stringMapIds)
            .eq('is_active', true);
          
          if (mapData) {
            setTournamentMapPool(mapData.sort((a, b) => a.display_name.localeCompare(b.display_name)));
          }
        }
      }

      // Load veto session
      const { data: sessionData } = await supabase
        .from("map_veto_sessions")
        .select("*")
        .eq("match_id", matchId)
        .maybeSingle();

      setVetoSession(sessionData);

      // Load veto actions if session exists
      if (sessionData) {
        const { data: actionsData } = await supabase
          .from("map_veto_actions")
          .select("*, maps:map_id(*), users:performed_by(discord_username)")
          .eq("veto_session_id", sessionData.id)
          .order("order_number");
        
        setVetoActions(actionsData || []);
      }
    } catch (error: any) {
      console.error("Error loading match and veto session:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to load match data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [matchId, toast]);

  useEffect(() => {
    loadMatchAndSession();
  }, [loadMatchAndSession]);

  if (loading) {
    return <div className="text-center py-4">Loading map veto...</div>;
  }

  if (!match) {
    return <div className="text-center py-4 text-red-400">Match not found</div>;
  }

  // Allow admins to bypass tournament veto settings
  if (!isAdmin && !match.tournament?.enable_map_veto) {
    return <div className="text-center py-4 text-slate-400">Map veto is not enabled for this tournament</div>;
  }

  if (!vetoSession) {
    return <div className="text-center py-4 text-yellow-400">No veto session found for this match</div>;
  }

  return (
    <div className="space-y-4">
      <MapVetoDialog
        matchId={matchId}
        vetoSession={vetoSession}
        tournamentMapPool={tournamentMapPool}
        onVetoComplete={() => {
          loadMatchAndSession();
          onVetoComplete?.();
        }}
      />
      <MapVetoHistory vetoActions={vetoActions} />
    </div>
  );
}
