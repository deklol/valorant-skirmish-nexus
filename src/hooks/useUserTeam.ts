import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { TeamWithMembers } from "@/types/team";

export const useUserTeam = (userId?: string) => {
  const [userTeam, setUserTeam] = useState<TeamWithMembers | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userId) {
      fetchUserTeam();
    } else {
      setUserTeam(null);
      setLoading(false);
    }
  }, [userId]);

  const fetchUserTeam = async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    try {
      // Get user's team membership
      const { data: membership } = await supabase
        .from('persistent_team_members')
        .select(`
          team_id,
          persistent_teams!inner (
            id,
            name,
            captain_id,
            description,
            invite_code,
            is_active,
            max_members,
            created_at,
            updated_at,
            wins,
            losses,
            tournaments_played,
            tournaments_won,
            total_rank_points,
            avg_rank_points
          )
        `)
        .eq('user_id', userId)
        .eq('persistent_teams.is_active', true)
        .single();

      if (membership) {
        const team = membership.persistent_teams;
        
        // Get all team members
        const { data: members } = await supabase
          .from('persistent_team_members')
          .select(`
            id,
            team_id,
            user_id,
            is_captain,
            joined_at,
            users!inner (
              id,
              discord_username,
              current_rank,
              riot_id,
              rank_points
            )
          `)
          .eq('team_id', team.id);

        setUserTeam({
          ...team,
          members: members || [],
          member_count: members?.length || 0,
          is_user_captain: team.captain_id === userId,
          is_user_member: true,
        });
      } else {
        setUserTeam(null);
      }
    } catch (error) {
      console.error('Error fetching user team:', error);
      setUserTeam(null);
    } finally {
      setLoading(false);
    }
  };

  return { userTeam, loading, refetch: fetchUserTeam };
};