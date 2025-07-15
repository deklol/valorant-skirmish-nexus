
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Match {
  id: string;
  match_number: number;
  round_number: number;
  team1_id: string | null;
  team2_id: string | null;
  score_team1: number | null;
  score_team2: number | null;
  status: string;
  winner_id: string | null;
  scheduled_time: string | null;
  started_at: string | null;
  completed_at: string | null;
  tournament_id?: string;
  notes?: string | null;
  team1?: { 
    id: string;
    name: string; 
  } | null;
  team2?: { 
    id: string;
    name: string; 
  } | null;
  tournament?: {
    id: string;
    name: string;
  } | null;
}

export const useMatchData = (matchId: string | undefined, userId: string | undefined) => {
  const [match, setMatch] = useState<Match | null>(null);
  const [userTeamId, setUserTeamId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const { toast } = useToast();

  const fetchMatch = async () => {
    if (!matchId) {
      setMatch(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('matches')
        .select(`
          *,
          team1:teams!matches_team1_id_fkey (id, name),
          team2:teams!matches_team2_id_fkey (id, name),
          tournament:tournaments!matches_tournament_id_fkey (id, name)
        `)
        .eq('id', matchId)
        .maybeSingle();

      if (error) throw error;
      if (!data) {
        setMatch(null);
        return;
      }
      const matchWithTournamentId = {
        ...data,
        tournament_id: data.tournament?.id
      };
      setMatch(matchWithTournamentId);
    } catch (error: any) {
      console.error('Error fetching match:', error);
      setMatch(null);
      toast({
        title: "Error",
        description: "Failed to load match details",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const checkUserTeam = async () => {
    if (!userId || !matchId) return;

    try {
      const { data: matchData } = await supabase
        .from('matches')
        .select('team1_id, team2_id')
        .eq('id', matchId)
        .single();

      if (!matchData || (!matchData.team1_id && !matchData.team2_id)) return;

      const teamIds = [matchData.team1_id, matchData.team2_id].filter(Boolean);
      
      const { data: teamMember } = await supabase
        .from('team_members')
        .select('team_id')
        .eq('user_id', userId)
        .in('team_id', teamIds)
        .single();

      setUserTeamId(teamMember?.team_id || null);
    } catch (error) {
      setUserTeamId(null);
    }
  };

  const checkAdminStatus = async () => {
    if (!userId) return;

    try {
      const { data } = await supabase
        .from('users')
        .select('role')
        .eq('id', userId)
        .single();

      setIsAdmin(data?.role === 'admin');
    } catch (error) {
      setIsAdmin(false);
    }
  };

  useEffect(() => {
    if (matchId) {
      fetchMatch();
    }
  }, [matchId]);

  useEffect(() => {
    if (userId && matchId) {
      checkUserTeam();
      checkAdminStatus();
    }
  }, [userId, matchId]);

  return {
    match,
    userTeamId,
    loading,
    isAdmin,
    fetchMatch
  };
};
