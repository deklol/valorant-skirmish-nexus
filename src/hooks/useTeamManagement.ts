import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useToast } from "./use-toast";
import type { PersistentTeam, PersistentTeamMember, TeamWithMembers } from "@/types/team";

export const useTeamManagement = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [userTeam, setUserTeam] = useState<TeamWithMembers | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch user's current team
  const fetchUserTeam = async () => {
    if (!user) {
      setUserTeam(null);
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
            updated_at
          )
        `)
        .eq('user_id', user.id)
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
          is_user_captain: team.captain_id === user.id,
          is_user_member: true,
        });
      } else {
        setUserTeam(null);
      }
    } catch (error) {
      console.error('Error fetching user team:', error);
      toast({
        title: "Error",
        description: "Failed to load team information",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Create a new team
  const createTeam = async (name: string, description?: string) => {
    if (!user) return false;

    try {
      const { data, error } = await supabase
        .from('persistent_teams')
        .insert({
          name,
          description,
          captain_id: user.id,
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Success",
        description: `Team "${name}" created successfully!`,
      });

      await fetchUserTeam();
      return true;
    } catch (error: any) {
      console.error('Error creating team:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create team",
        variant: "destructive",
      });
      return false;
    }
  };

  // Join team by invite code
  const joinTeamByCode = async (inviteCode: string) => {
    if (!user) return false;

    try {
      // First, find the team by invite code
      const { data: team, error: teamError } = await supabase
        .from('persistent_teams')
        .select('id, name, max_members')
        .eq('invite_code', inviteCode)
        .eq('is_active', true)
        .single();

      if (teamError || !team) {
        toast({
          title: "Error",
          description: "Invalid invite code or team not found",
          variant: "destructive",
        });
        return false;
      }

      // Check if team is full
      const { count } = await supabase
        .from('persistent_team_members')
        .select('*', { count: 'exact', head: true })
        .eq('team_id', team.id);

      if (count && count >= team.max_members) {
        toast({
          title: "Error",
          description: "Team is full",
          variant: "destructive",
        });
        return false;
      }

      // Join the team
      const { error: joinError } = await supabase
        .from('persistent_team_members')
        .insert({
          team_id: team.id,
          user_id: user.id,
          is_captain: false,
        });

      if (joinError) throw joinError;

      toast({
        title: "Success",
        description: `Successfully joined team "${team.name}"!`,
      });

      await fetchUserTeam();
      return true;
    } catch (error: any) {
      console.error('Error joining team:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to join team",
        variant: "destructive",
      });
      return false;
    }
  };

  // Leave current team
  const leaveTeam = async () => {
    if (!user || !userTeam) return false;

    try {
      const { error } = await supabase
        .from('persistent_team_members')
        .delete()
        .eq('team_id', userTeam.id)
        .eq('user_id', user.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Successfully left the team",
      });

      await fetchUserTeam();
      return true;
    } catch (error: any) {
      console.error('Error leaving team:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to leave team",
        variant: "destructive",
      });
      return false;
    }
  };

  // Remove team member (captain only)
  const removeMember = async (memberId: string) => {
    if (!user || !userTeam || !userTeam.is_user_captain) return false;

    try {
      const { error } = await supabase
        .from('persistent_team_members')
        .delete()
        .eq('id', memberId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Member removed from team",
      });

      await fetchUserTeam();
      return true;
    } catch (error: any) {
      console.error('Error removing member:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to remove member",
        variant: "destructive",
      });
      return false;
    }
  };

  // Update team details (captain only)
  const updateTeam = async (updates: Partial<Pick<PersistentTeam, 'name' | 'description'>>) => {
    if (!user || !userTeam || !userTeam.is_user_captain) return false;

    try {
      const { error } = await supabase
        .from('persistent_teams')
        .update(updates)
        .eq('id', userTeam.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Team updated successfully",
      });

      await fetchUserTeam();
      return true;
    } catch (error: any) {
      console.error('Error updating team:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update team",
        variant: "destructive",
      });
      return false;
    }
  };

  // Delete team (captain only)
  const deleteTeam = async () => {
    if (!user || !userTeam || !userTeam.is_user_captain) return false;

    try {
      const { error } = await supabase
        .from('persistent_teams')
        .delete()
        .eq('id', userTeam.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Team deleted successfully",
      });

      await fetchUserTeam();
      return true;
    } catch (error: any) {
      console.error('Error deleting team:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete team",
        variant: "destructive",
      });
      return false;
    }
  };

  useEffect(() => {
    fetchUserTeam();
  }, [user]);

  return {
    userTeam,
    loading,
    createTeam,
    joinTeamByCode,
    leaveTeam,
    removeMember,
    updateTeam,
    deleteTeam,
    refreshTeam: fetchUserTeam,
  };
};