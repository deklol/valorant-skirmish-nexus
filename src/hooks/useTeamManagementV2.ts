/**
 * useTeamManagementV2 Hook
 * 
 * Enhanced team management with:
 * - Role management (owner, manager, captain, player, etc.)
 * - Ownership transfer
 * - Join code regeneration
 * - Team disband
 * - Lock/unlock (admin)
 */

import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { 
  PersistentTeamV2, 
  PersistentTeamMemberV2, 
  TeamMemberRole,
  TeamLifecycleStatus,
  hasPermission,
  canManageRole,
} from '@/types/teamV2';

interface UseTeamManagementV2Return {
  team: PersistentTeamV2 | null;
  members: PersistentTeamMemberV2[];
  userRole: TeamMemberRole | null;
  loading: boolean;
  updating: boolean;
  // Team info
  fetchTeam: (teamId: string) => Promise<void>;
  updateTeamInfo: (updates: { name?: string; description?: string }) => Promise<boolean>;
  // Roster management
  removeMember: (memberId: string) => Promise<boolean>;
  updateMemberRole: (memberId: string, role: TeamMemberRole) => Promise<boolean>;
  leaveTeam: () => Promise<boolean>;
  // Owner actions
  transferOwnership: (newOwnerId: string) => Promise<boolean>;
  disbandTeam: () => Promise<boolean>;
  regenerateJoinCode: () => Promise<string | null>;
  // Permission checks
  canPerform: (action: string) => boolean;
}

export function useTeamManagementV2(teamId?: string): UseTeamManagementV2Return {
  const [team, setTeam] = useState<PersistentTeamV2 | null>(null);
  const [members, setMembers] = useState<PersistentTeamMemberV2[]>([]);
  const [userRole, setUserRole] = useState<TeamMemberRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const fetchTeam = useCallback(async (id: string) => {
    setLoading(true);
    try {
      // Fetch team data
      const { data: teamData, error: teamError } = await supabase
        .from('persistent_teams')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (teamError) throw teamError;
      if (!teamData) {
        setTeam(null);
        setMembers([]);
        return;
      }

      setTeam(teamData as PersistentTeamV2);

      // Fetch members with user data
      const { data: membersData, error: membersError } = await supabase
        .from('persistent_team_members')
        .select(`
          *,
          users (
            id,
            discord_username,
            current_rank,
            riot_id,
            rank_points,
            weight_rating
          )
        `)
        .eq('team_id', id)
        .order('role', { ascending: true });

      if (membersError) throw membersError;

      const typedMembers = (membersData || []) as PersistentTeamMemberV2[];
      setMembers(typedMembers);

      // Set current user's role
      if (user) {
        const userMember = typedMembers.find(m => m.user_id === user.id);
        setUserRole(userMember?.role || null);
      }
    } catch (error) {
      console.error('Error fetching team:', error);
      toast({
        title: 'Error',
        description: 'Failed to load team data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [user, toast]);

  useEffect(() => {
    if (teamId) {
      fetchTeam(teamId);
    }
  }, [teamId, fetchTeam]);

  const updateTeamInfo = useCallback(async (updates: { name?: string; description?: string }): Promise<boolean> => {
    if (!team || !userRole) return false;
    
    if (!hasPermission(userRole, 'edit_team_info')) {
      toast({
        title: 'Permission Denied',
        description: 'You do not have permission to edit team info',
        variant: 'destructive',
      });
      return false;
    }

    setUpdating(true);
    try {
      const { error } = await supabase
        .from('persistent_teams')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', team.id);

      if (error) throw error;

      setTeam(prev => prev ? { ...prev, ...updates } : null);
      toast({ title: 'Team Updated', description: 'Team info has been updated' });
      return true;
    } catch (error: any) {
      console.error('Error updating team:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to update team',
        variant: 'destructive',
      });
      return false;
    } finally {
      setUpdating(false);
    }
  }, [team, userRole, toast]);

  const removeMember = useCallback(async (memberId: string): Promise<boolean> => {
    if (!team || !userRole) return false;

    const memberToRemove = members.find(m => m.id === memberId);
    if (!memberToRemove) return false;

    // Can't remove owner
    if (memberToRemove.role === 'owner') {
      toast({
        title: 'Cannot Remove Owner',
        description: 'Transfer ownership first before removing the owner',
        variant: 'destructive',
      });
      return false;
    }

    // Check permission
    if (!hasPermission(userRole, 'manage_roster') || !canManageRole(userRole, memberToRemove.role)) {
      toast({
        title: 'Permission Denied',
        description: 'You do not have permission to remove this member',
        variant: 'destructive',
      });
      return false;
    }

    setUpdating(true);
    try {
      const { error } = await supabase
        .from('persistent_team_members')
        .delete()
        .eq('id', memberId);

      if (error) throw error;

      setMembers(prev => prev.filter(m => m.id !== memberId));
      toast({ title: 'Member Removed', description: 'Team member has been removed' });
      return true;
    } catch (error: any) {
      console.error('Error removing member:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to remove member',
        variant: 'destructive',
      });
      return false;
    } finally {
      setUpdating(false);
    }
  }, [team, userRole, members, toast]);

  const updateMemberRole = useCallback(async (memberId: string, role: TeamMemberRole): Promise<boolean> => {
    if (!team || !userRole) return false;

    const memberToUpdate = members.find(m => m.id === memberId);
    if (!memberToUpdate) return false;

    // Can't change owner role directly (must transfer ownership)
    if (memberToUpdate.role === 'owner' || role === 'owner') {
      toast({
        title: 'Invalid Role Change',
        description: 'Use ownership transfer to change owner',
        variant: 'destructive',
      });
      return false;
    }

    // Check permission
    if (!hasPermission(userRole, 'manage_roles') || !canManageRole(userRole, memberToUpdate.role)) {
      toast({
        title: 'Permission Denied',
        description: 'You do not have permission to change this role',
        variant: 'destructive',
      });
      return false;
    }

    setUpdating(true);
    try {
      const { error } = await supabase
        .from('persistent_team_members')
        .update({ role })
        .eq('id', memberId);

      if (error) throw error;

      setMembers(prev => prev.map(m => m.id === memberId ? { ...m, role } : m));
      toast({ title: 'Role Updated', description: `Member role changed to ${role}` });
      return true;
    } catch (error: any) {
      console.error('Error updating role:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to update role',
        variant: 'destructive',
      });
      return false;
    } finally {
      setUpdating(false);
    }
  }, [team, userRole, members, toast]);

  const leaveTeam = useCallback(async (): Promise<boolean> => {
    if (!team || !user) return false;

    // Owner can't leave without transferring ownership
    if (userRole === 'owner') {
      toast({
        title: 'Cannot Leave',
        description: 'Transfer ownership before leaving, or disband the team',
        variant: 'destructive',
      });
      return false;
    }

    setUpdating(true);
    try {
      const { error } = await supabase
        .from('persistent_team_members')
        .delete()
        .eq('team_id', team.id)
        .eq('user_id', user.id);

      if (error) throw error;

      toast({ title: 'Left Team', description: 'You have left the team' });
      setTeam(null);
      setMembers([]);
      setUserRole(null);
      return true;
    } catch (error: any) {
      console.error('Error leaving team:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to leave team',
        variant: 'destructive',
      });
      return false;
    } finally {
      setUpdating(false);
    }
  }, [team, user, userRole, toast]);

  const transferOwnership = useCallback(async (newOwnerId: string): Promise<boolean> => {
    if (!team) return false;

    setUpdating(true);
    try {
      const { data, error } = await supabase.rpc('transfer_team_ownership', {
        p_team_id: team.id,
        p_new_owner_id: newOwnerId,
      });

      if (error) throw error;

      const result = data as { success: boolean; error?: string };
      if (!result.success) {
        throw new Error(result.error || 'Failed to transfer ownership');
      }

      toast({ title: 'Ownership Transferred', description: 'Team ownership has been transferred' });
      await fetchTeam(team.id);
      return true;
    } catch (error: any) {
      console.error('Error transferring ownership:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to transfer ownership',
        variant: 'destructive',
      });
      return false;
    } finally {
      setUpdating(false);
    }
  }, [team, fetchTeam, toast]);

  const disbandTeam = useCallback(async (): Promise<boolean> => {
    if (!team) return false;

    setUpdating(true);
    try {
      const { data, error } = await supabase.rpc('disband_team', {
        p_team_id: team.id,
      });

      if (error) throw error;

      const result = data as { success: boolean; error?: string };
      if (!result.success) {
        throw new Error(result.error || 'Failed to disband team');
      }

      toast({ title: 'Team Disbanded', description: 'The team has been disbanded', variant: 'destructive' });
      setTeam(null);
      setMembers([]);
      setUserRole(null);
      return true;
    } catch (error: any) {
      console.error('Error disbanding team:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to disband team',
        variant: 'destructive',
      });
      return false;
    } finally {
      setUpdating(false);
    }
  }, [team, toast]);

  const regenerateJoinCode = useCallback(async (): Promise<string | null> => {
    if (!team || !userRole) return null;

    if (!hasPermission(userRole, 'regenerate_invite_code')) {
      toast({
        title: 'Permission Denied',
        description: 'You do not have permission to regenerate the invite code',
        variant: 'destructive',
      });
      return null;
    }

    setUpdating(true);
    try {
      const { data, error } = await supabase.rpc('rotate_team_join_code', {
        p_team_id: team.id,
        p_trigger: 'manual',
      });

      if (error) throw error;

      const newCode = data as string;
      setTeam(prev => prev ? { ...prev, invite_code: newCode } : null);
      toast({ title: 'Code Regenerated', description: 'New invite code has been generated' });
      return newCode;
    } catch (error: any) {
      console.error('Error regenerating code:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to regenerate code',
        variant: 'destructive',
      });
      return null;
    } finally {
      setUpdating(false);
    }
  }, [team, userRole, toast]);

  const canPerform = useCallback((action: string): boolean => {
    if (!userRole) return false;
    return hasPermission(userRole, action as any);
  }, [userRole]);

  return {
    team,
    members,
    userRole,
    loading,
    updating,
    fetchTeam,
    updateTeamInfo,
    removeMember,
    updateMemberRole,
    leaveTeam,
    transferOwnership,
    disbandTeam,
    regenerateJoinCode,
    canPerform,
  };
}
