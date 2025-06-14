
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface Player {
  user_id: string;
  discord_username: string;
  current_rank?: string;
  rank_points?: number;
  is_captain?: boolean;
  weight_rating?: number;
}

export function useTeamPlayers(teamId?: string | null) {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    if (!teamId) {
      setPlayers([]);
      return;
    }
    setLoading(true);

    supabase
      .from("team_members")
      .select(`
        user_id,
        is_captain,
        users:user_id (
          discord_username,
          current_rank,
          rank_points,
          weight_rating
        )
      `)
      .eq("team_id", teamId)
      .order("is_captain", { ascending: false })
      .then(({ data, error }) => {
        if (error || !data) {
          setPlayers([]);
        } else {
          setPlayers(
            data.map((row: any) => ({
              user_id: row.user_id,
              is_captain: row.is_captain,
              discord_username: row.users?.discord_username ?? "Unknown",
              current_rank: row.users?.current_rank ?? "Unranked",
              rank_points: row.users?.rank_points,
              weight_rating: row.users?.weight_rating,
            }))
          );
        }
        setLoading(false);
      });
  }, [teamId]);

  return { players, loading };
}
