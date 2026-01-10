/**
 * useTeamCheckIn Hook
 * 
 * Manages team check-in for team tournaments:
 * - Fetch team check-in statuses
 * - Self-service check-in for captains
 * - Admin force check-in and no-show management
 */

import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { TeamCheckInData, TeamCheckInStatus } from '@/types/teamV2';

interface UseTeamCheckInProps {
  tournamentId: string;
}

interface UseTeamCheckInReturn {
  teams: TeamCheckInData[];
  loading: boolean;
  updating: boolean;
  fetchTeams: () => Promise<void>;
  checkIn: (teamId: string) => Promise<boolean>;
  forceCheckIn: (teamId: string) => Promise<boolean>;
  markNoShow: (teamId: string) => Promise<boolean>;
  bulkForceCheckIn: () => Promise<boolean>;
  bulkMarkNoShow: () => Promise<boolean>;
  getStats: () => { total: number; checkedIn: number; pending: number; noShow: number };
}

export function useTeamCheckIn({ tournamentId }: UseTeamCheckInProps): UseTeamCheckInReturn {
  const [teams, setTeams] = useState<TeamCheckInData[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const { toast } = useToast();

  const fetchTeams = useCallback(async () => {
    if (!tournamentId) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('team_tournament_registrations')
        .select(`
          id,
          team_id,
          check_in_status,
          checked_in_at,
          checked_in_by,
          roster_snapshot,
          persistent_teams!inner (
            id,
            name,
            persistent_team_members (
              id
            )
          )
        `)
        .eq('tournament_id', tournamentId)
        .eq('status', 'registered')
        .order('checked_in_at', { ascending: true, nullsFirst: false });

      if (error) throw error;

      const mapped: TeamCheckInData[] = (data || []).map((reg: any) => ({
        registrationId: reg.id,
        teamId: reg.team_id,
        teamName: reg.persistent_teams?.name || 'Unknown Team',
        status: (reg.check_in_status || 'pending') as TeamCheckInStatus,
        checkedInAt: reg.checked_in_at,
        checkedInBy: reg.checked_in_by,
        memberCount: reg.persistent_teams?.persistent_team_members?.length || 0,
        rosterSnapshot: reg.roster_snapshot,
      }));

      // Sort: checked in first, then pending, then no-show
      mapped.sort((a, b) => {
        const order: Record<TeamCheckInStatus, number> = { checked_in: 0, pending: 1, no_show: 2 };
        return order[a.status] - order[b.status];
      });

      setTeams(mapped);
    } catch (error) {
      console.error('Error fetching check-in data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load check-in data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [tournamentId, toast]);

  useEffect(() => {
    fetchTeams();

    // Set up real-time subscription for check-in updates
    const channel = supabase
      .channel(`check-in-${tournamentId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'team_tournament_registrations',
          filter: `tournament_id=eq.${tournamentId}`,
        },
        () => {
          fetchTeams();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchTeams, tournamentId]);

  const checkIn = useCallback(async (teamId: string): Promise<boolean> => {
    setUpdating(true);
    try {
      const { data, error } = await supabase.rpc('team_check_in', {
        p_tournament_id: tournamentId,
        p_team_id: teamId,
      });

      if (error) throw error;
      
      const result = data as { success: boolean; error?: string };
      if (!result.success) {
        throw new Error(result.error || 'Failed to check in');
      }

      toast({
        title: 'Checked In',
        description: 'Your team has been checked in successfully',
      });

      await fetchTeams();
      return true;
    } catch (error: any) {
      console.error('Error checking in:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to check in',
        variant: 'destructive',
      });
      return false;
    } finally {
      setUpdating(false);
    }
  }, [tournamentId, fetchTeams, toast]);

  const forceCheckIn = useCallback(async (teamId: string): Promise<boolean> => {
    setUpdating(true);
    try {
      const { data, error } = await supabase.rpc('admin_force_check_in', {
        p_tournament_id: tournamentId,
        p_team_id: teamId,
      });

      if (error) throw error;
      
      const result = data as { success: boolean; error?: string };
      if (!result.success) {
        throw new Error(result.error || 'Failed to force check-in');
      }

      toast({
        title: 'Force Check-In Complete',
        description: 'Team has been checked in by admin',
      });

      await fetchTeams();
      return true;
    } catch (error: any) {
      console.error('Error force checking in:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to force check-in',
        variant: 'destructive',
      });
      return false;
    } finally {
      setUpdating(false);
    }
  }, [tournamentId, fetchTeams, toast]);

  const markNoShow = useCallback(async (teamId: string): Promise<boolean> => {
    setUpdating(true);
    try {
      const { data, error } = await supabase.rpc('mark_team_no_show', {
        p_tournament_id: tournamentId,
        p_team_id: teamId,
      });

      if (error) throw error;
      
      const result = data as { success: boolean; error?: string };
      if (!result.success) {
        throw new Error(result.error || 'Failed to mark no-show');
      }

      toast({
        title: 'No-Show Marked',
        description: 'Team has been marked as no-show and withdrawn',
        variant: 'destructive',
      });

      await fetchTeams();
      return true;
    } catch (error: any) {
      console.error('Error marking no-show:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to mark no-show',
        variant: 'destructive',
      });
      return false;
    } finally {
      setUpdating(false);
    }
  }, [tournamentId, fetchTeams, toast]);

  const bulkForceCheckIn = useCallback(async (): Promise<boolean> => {
    const pendingTeams = teams.filter(t => t.status === 'pending');
    if (pendingTeams.length === 0) {
      toast({
        title: 'No Pending Teams',
        description: 'All teams are already checked in or marked as no-show',
      });
      return true;
    }

    setUpdating(true);
    try {
      const results = await Promise.all(
        pendingTeams.map(t => 
          supabase.rpc('admin_force_check_in', {
            p_tournament_id: tournamentId,
            p_team_id: t.teamId,
          })
        )
      );

      const failures = results.filter(r => r.error || !(r.data as any)?.success);
      
      if (failures.length > 0) {
        toast({
          title: 'Partial Success',
          description: `${pendingTeams.length - failures.length} of ${pendingTeams.length} teams checked in`,
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Bulk Check-In Complete',
          description: `${pendingTeams.length} teams checked in`,
        });
      }

      await fetchTeams();
      return failures.length === 0;
    } catch (error: any) {
      console.error('Error bulk checking in:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to bulk check-in',
        variant: 'destructive',
      });
      return false;
    } finally {
      setUpdating(false);
    }
  }, [teams, tournamentId, fetchTeams, toast]);

  const bulkMarkNoShow = useCallback(async (): Promise<boolean> => {
    const pendingTeams = teams.filter(t => t.status === 'pending');
    if (pendingTeams.length === 0) {
      toast({
        title: 'No Pending Teams',
        description: 'All teams are already checked in or marked as no-show',
      });
      return true;
    }

    setUpdating(true);
    try {
      const results = await Promise.all(
        pendingTeams.map(t => 
          supabase.rpc('mark_team_no_show', {
            p_tournament_id: tournamentId,
            p_team_id: t.teamId,
          })
        )
      );

      const failures = results.filter(r => r.error || !(r.data as any)?.success);
      
      if (failures.length > 0) {
        toast({
          title: 'Partial Success',
          description: `${pendingTeams.length - failures.length} of ${pendingTeams.length} teams marked as no-show`,
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'No-Shows Enforced',
          description: `${pendingTeams.length} teams marked as no-show and withdrawn`,
          variant: 'destructive',
        });
      }

      await fetchTeams();
      return failures.length === 0;
    } catch (error: any) {
      console.error('Error bulk marking no-show:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to bulk mark no-show',
        variant: 'destructive',
      });
      return false;
    } finally {
      setUpdating(false);
    }
  }, [teams, tournamentId, fetchTeams, toast]);

  const getStats = useCallback(() => {
    return {
      total: teams.length,
      checkedIn: teams.filter(t => t.status === 'checked_in').length,
      pending: teams.filter(t => t.status === 'pending').length,
      noShow: teams.filter(t => t.status === 'no_show').length,
    };
  }, [teams]);

  return {
    teams,
    loading,
    updating,
    fetchTeams,
    checkIn,
    forceCheckIn,
    markNoShow,
    bulkForceCheckIn,
    bulkMarkNoShow,
    getStats,
  };
}
