
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useParams } from "react-router-dom";
import { parseMapVetoRounds } from "./useTournamentUtils";
import type { Team, Match } from "@/types/tournamentDetail";
import type { Database } from "@/integrations/supabase/types";

export type UseTournamentDataResult = {
  tournament: Database["public"]["Tables"]["tournaments"]["Row"] | null;
  parsedMapVetoRounds: number[];
  teams: Team[];
  matches: Match[];
  signups: any[];
  loading: boolean;
  handleRefresh: () => void;
};

export function useTournamentData(): UseTournamentDataResult {
  const { id } = useParams<{ id: string }>();
  const [tournament, setTournament] = useState<Database["public"]["Tables"]["tournaments"]["Row"] | null>(null);
  const [parsedMapVetoRounds, setParsedMapVetoRounds] = useState<number[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [signups, setSignups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const { toast } = useToast();

  useEffect(() => {
    if (id) fetchTournamentDetails();
    // eslint-disable-next-line
  }, [id, refreshKey]);

  const fetchTournamentDetails = async () => {
    try {
      setLoading(true);
      const { data: tournamentData, error: tournamentError } = await supabase
        .from('tournaments')
        .select(`
          *,
          teams (
            *,
            team_members (
              user_id,
              is_captain,
              users (
                discord_username,
                discord_avatar_url,
                current_rank,
                riot_id
              )
            )
          ),
          matches (
            *,
            team1:teams!matches_team1_id_fkey (name),
            team2:teams!matches_team2_id_fkey (name),
            winner:teams!matches_winner_id_fkey (name)
          )
        `)
        .eq('id', id)
        .single();

      if (tournamentError) throw tournamentError;

      const vetoRoundsParsed = parseMapVetoRounds(tournamentData.map_veto_required_rounds);

      setTournament({
        ...tournamentData,
        enable_map_veto: tournamentData.enable_map_veto || false,
        check_in_required: tournamentData.check_in_required ?? true,
        registration_opens_at: tournamentData.registration_opens_at || tournamentData.start_time,
        registration_closes_at: tournamentData.registration_closes_at || tournamentData.start_time,
        check_in_starts_at: tournamentData.check_in_starts_at || tournamentData.start_time,
        check_in_ends_at: tournamentData.check_in_ends_at || tournamentData.start_time
      } as Database["public"]["Tables"]["tournaments"]["Row"]);
      setParsedMapVetoRounds(vetoRoundsParsed);
      setTeams(tournamentData.teams || []);
      setMatches(tournamentData.matches || []);

      const { data: signupsData, error: signupsError } = await supabase
        .from('tournament_signups')
        .select(`
          *,
          users (
            id,
            discord_username,
            current_rank,
            rank_points,
            weight_rating,
            discord_avatar_url,
            riot_id
          )
        `)
        .eq('tournament_id', id);

      if (signupsError) throw signupsError;

      setSignups(signupsData || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to load tournament details",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  function handleRefresh() {
    setRefreshKey(prev => prev + 1);
  }

  return {
    tournament,
    parsedMapVetoRounds,
    teams,
    matches,
    signups,
    loading,
    handleRefresh
  };
}
