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
                weight_rating,
                peak_rank
              )
            )
          `)
          .eq('tournament_id', tournamentId)
          .order('seed', { ascending: true });

        if (teamsError) throw teamsError;

        // Fetch adaptive weights for this tournament
        const { data: adaptiveWeights } = await supabase
          .from('tournament_adaptive_weights')
          .select('*')
          .eq('tournament_id', tournamentId);

        // Fetch real matches for bracket
        const { data: matchesData } = await supabase
          .from('matches')
          .select(`
            *,
            team1:teams!matches_team1_id_fkey (name),
            team2:teams!matches_team2_id_fkey (name),
            winner:teams!matches_winner_id_fkey (name)
          `)
          .eq('tournament_id', tournamentId)
          .order('round_number', { ascending: true });

        // Merge adaptive weights with team member data
        const teamsWithAdaptiveWeights = teamsData?.map(team => ({
          ...team,
          team_members: team.team_members.map(member => {
            const adaptiveWeight = adaptiveWeights?.find(w => w.user_id === member.user_id);
            return {
              ...member,
              users: {
                ...member.users,
                adaptive_weight: adaptiveWeight?.calculated_adaptive_weight,
                peak_rank_points: adaptiveWeight?.peak_rank_points,
                adaptive_factor: adaptiveWeight?.adaptive_factor
              }
            };
          })
        })) || [];

        setTeams(teamsWithAdaptiveWeights);
        
        // Store matches for bracket view
        (window as any).broadcastMatches = matchesData || [];
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