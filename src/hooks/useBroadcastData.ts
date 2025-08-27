import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Team } from "@/types/tournamentDetail";
import type { Tournament } from "@/types/tournament";

export function useBroadcastData(tournamentId: string | undefined) {
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!tournamentId) {
      setError("No tournament ID provided");
      setLoading(false);
      return;
    }

    const fetchBroadcastData = async () => {
      try {
        setLoading(true);
        
        // Fetch tournament data
        const { data: tournamentData, error: tournamentError } = await supabase
          .from('tournaments')
          .select('*')
          .eq('id', tournamentId)
          .single();

        if (tournamentError) throw tournamentError;

        // Check if tournament is live or completed for broadcast
        if (!tournamentData.status || !['live', 'completed'].includes(tournamentData.status)) {
          setError("Tournament must be live or completed for broadcast");
          setLoading(false);
          return;
        }

        setTournament({
          ...tournamentData,
          map_pool: Array.isArray(tournamentData.map_pool) ? tournamentData.map_pool : [],
          map_veto_required_rounds: Array.isArray(tournamentData.map_veto_required_rounds) ? tournamentData.map_veto_required_rounds : []
        } as Tournament);

        // Fetch teams with members and user data
        const { data: teamsData, error: teamsError } = await supabase
          .from('teams')
          .select(`
            *,
            team_members (
              user_id,
              is_captain,
              users (
                discord_username,
                discord_avatar_url,
                current_rank,
                riot_id,
                rank_points,
                weight_rating
              )
            )
          `)
          .eq('tournament_id', tournamentId)
          .order('seed', { ascending: true });

        if (teamsError) throw teamsError;

        setTeams(teamsData || []);
        setError(null);
      } catch (err: any) {
        console.error('Error fetching broadcast data:', err);
        setError(err.message || 'Failed to load broadcast data');
      } finally {
        setLoading(false);
      }
    };

    fetchBroadcastData();
  }, [tournamentId]);

  return { tournament, teams, loading, error };
}