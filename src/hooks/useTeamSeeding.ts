/**
 * useTeamSeeding Hook
 * 
 * Manages team seeding for team tournaments:
 * - Fetch registered teams with seeds
 * - Update individual seeds
 * - Auto-seed by rank points or randomly
 * - Validate seeding before bracket generation
 */

import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { TeamSeedData, SeedValidation } from '@/types/teamV2';

interface UseTeamSeedingProps {
  tournamentId: string;
}

interface UseTeamSeedingReturn {
  teams: TeamSeedData[];
  loading: boolean;
  updating: boolean;
  fetchTeams: () => Promise<void>;
  updateSeed: (registrationId: string, seed: number | null) => Promise<boolean>;
  autoSeedByRankPoints: () => Promise<boolean>;
  autoSeedRandom: () => Promise<boolean>;
  clearAllSeeds: () => Promise<boolean>;
  validateSeeding: () => SeedValidation;
  swapSeeds: (regId1: string, regId2: string) => Promise<boolean>;
}

export function useTeamSeeding({ tournamentId }: UseTeamSeedingProps): UseTeamSeedingReturn {
  const [teams, setTeams] = useState<TeamSeedData[]>([]);
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
          seed,
          seeded_at,
          status,
          persistent_teams!inner (
            id,
            name,
            total_rank_points,
            avg_rank_points,
            persistent_team_members (
              id
            )
          )
        `)
        .eq('tournament_id', tournamentId)
        .eq('status', 'registered')
        .order('seed', { ascending: true, nullsFirst: false });

      if (error) throw error;

      const mapped: TeamSeedData[] = (data || []).map((reg: any) => ({
        registrationId: reg.id,
        teamId: reg.team_id,
        teamName: reg.persistent_teams?.name || 'Unknown Team',
        seed: reg.seed,
        totalRankPoints: reg.persistent_teams?.total_rank_points || 0,
        avgRankPoints: reg.persistent_teams?.avg_rank_points || 0,
        memberCount: reg.persistent_teams?.persistent_team_members?.length || 0,
        seededAt: reg.seeded_at,
      }));

      // Sort: seeded teams first (by seed), then unseeded
      mapped.sort((a, b) => {
        if (a.seed === null && b.seed === null) return 0;
        if (a.seed === null) return 1;
        if (b.seed === null) return -1;
        return a.seed - b.seed;
      });

      setTeams(mapped);
    } catch (error) {
      console.error('Error fetching teams for seeding:', error);
      toast({
        title: 'Error',
        description: 'Failed to load teams',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [tournamentId, toast]);

  useEffect(() => {
    fetchTeams();
  }, [fetchTeams]);

  const updateSeed = useCallback(async (registrationId: string, seed: number | null): Promise<boolean> => {
    setUpdating(true);
    try {
      const { data, error } = await supabase.rpc('set_team_seed', {
        p_registration_id: registrationId,
        p_seed: seed,
      });

      if (error) throw error;
      
      const result = data as { success: boolean; error?: string };
      if (!result.success) {
        throw new Error(result.error || 'Failed to set seed');
      }

      // Update local state
      setTeams(prev => prev.map(t => 
        t.registrationId === registrationId 
          ? { ...t, seed, seededAt: new Date().toISOString() }
          : t
      ));

      return true;
    } catch (error: any) {
      console.error('Error updating seed:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to update seed',
        variant: 'destructive',
      });
      return false;
    } finally {
      setUpdating(false);
    }
  }, [toast]);

  const autoSeedByRankPoints = useCallback(async (): Promise<boolean> => {
    setUpdating(true);
    try {
      const { data, error } = await supabase.rpc('auto_seed_by_rank_points', {
        p_tournament_id: tournamentId,
      });

      if (error) throw error;
      
      const result = data as { success: boolean; teams_seeded?: number; error?: string };
      if (!result.success) {
        throw new Error(result.error || 'Failed to auto-seed');
      }

      toast({
        title: 'Seeding Complete',
        description: `${result.teams_seeded} teams seeded by rank points`,
      });

      await fetchTeams();
      return true;
    } catch (error: any) {
      console.error('Error auto-seeding:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to auto-seed',
        variant: 'destructive',
      });
      return false;
    } finally {
      setUpdating(false);
    }
  }, [tournamentId, fetchTeams, toast]);

  const autoSeedRandom = useCallback(async (): Promise<boolean> => {
    setUpdating(true);
    try {
      // Shuffle teams randomly and assign seeds
      const shuffled = [...teams].sort(() => Math.random() - 0.5);
      
      for (let i = 0; i < shuffled.length; i++) {
        const { error } = await supabase
          .from('team_tournament_registrations')
          .update({ 
            seed: i + 1, 
            seeded_at: new Date().toISOString(),
          })
          .eq('id', shuffled[i].registrationId);
        
        if (error) throw error;
      }

      toast({
        title: 'Random Seeding Complete',
        description: `${shuffled.length} teams seeded randomly`,
      });

      await fetchTeams();
      return true;
    } catch (error: any) {
      console.error('Error random seeding:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to random seed',
        variant: 'destructive',
      });
      return false;
    } finally {
      setUpdating(false);
    }
  }, [teams, fetchTeams, toast]);

  const clearAllSeeds = useCallback(async (): Promise<boolean> => {
    setUpdating(true);
    try {
      const { error } = await supabase
        .from('team_tournament_registrations')
        .update({ seed: null, seeded_at: null, seeded_by: null })
        .eq('tournament_id', tournamentId)
        .eq('status', 'registered');

      if (error) throw error;

      toast({
        title: 'Seeds Cleared',
        description: 'All team seeds have been reset',
      });

      await fetchTeams();
      return true;
    } catch (error: any) {
      console.error('Error clearing seeds:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to clear seeds',
        variant: 'destructive',
      });
      return false;
    } finally {
      setUpdating(false);
    }
  }, [tournamentId, fetchTeams, toast]);

  const swapSeeds = useCallback(async (regId1: string, regId2: string): Promise<boolean> => {
    const team1 = teams.find(t => t.registrationId === regId1);
    const team2 = teams.find(t => t.registrationId === regId2);
    
    if (!team1 || !team2) return false;

    setUpdating(true);
    try {
      // Swap seeds atomically
      const updates = [
        supabase
          .from('team_tournament_registrations')
          .update({ seed: team2.seed, seeded_at: new Date().toISOString() })
          .eq('id', regId1),
        supabase
          .from('team_tournament_registrations')
          .update({ seed: team1.seed, seeded_at: new Date().toISOString() })
          .eq('id', regId2),
      ];

      const results = await Promise.all(updates);
      const errors = results.filter(r => r.error);
      
      if (errors.length > 0) throw errors[0].error;

      // Update local state
      setTeams(prev => prev.map(t => {
        if (t.registrationId === regId1) return { ...t, seed: team2.seed };
        if (t.registrationId === regId2) return { ...t, seed: team1.seed };
        return t;
      }));

      return true;
    } catch (error: any) {
      console.error('Error swapping seeds:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to swap seeds',
        variant: 'destructive',
      });
      return false;
    } finally {
      setUpdating(false);
    }
  }, [teams, toast]);

  const validateSeeding = useCallback((): SeedValidation => {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    const seededTeams = teams.filter(t => t.seed !== null);
    const unseededTeams = teams.filter(t => t.seed === null);

    // Check if all teams are seeded
    if (unseededTeams.length > 0) {
      errors.push(`${unseededTeams.length} team(s) have not been seeded`);
    }

    // Check for duplicate seeds
    const seedCounts = new Map<number, number>();
    seededTeams.forEach(t => {
      if (t.seed !== null) {
        seedCounts.set(t.seed, (seedCounts.get(t.seed) || 0) + 1);
      }
    });
    
    const duplicates = Array.from(seedCounts.entries()).filter(([_, count]) => count > 1);
    if (duplicates.length > 0) {
      errors.push(`Duplicate seeds found: ${duplicates.map(([seed]) => seed).join(', ')}`);
    }

    // Check for gaps in seeding
    if (seededTeams.length > 0) {
      const seeds = seededTeams.map(t => t.seed!).sort((a, b) => a - b);
      const expectedSeeds = Array.from({ length: seeds.length }, (_, i) => i + 1);
      const missingSeeds = expectedSeeds.filter(s => !seeds.includes(s));
      
      if (missingSeeds.length > 0) {
        warnings.push(`Gap in seeding: missing seeds ${missingSeeds.join(', ')}`);
      }
    }

    // Check team count is power of 2 (for single/double elim)
    const totalTeams = teams.length;
    const isPowerOf2 = totalTeams > 0 && (totalTeams & (totalTeams - 1)) === 0;
    if (!isPowerOf2 && totalTeams > 0) {
      warnings.push(`Team count (${totalTeams}) is not a power of 2 - byes may be needed`);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }, [teams]);

  return {
    teams,
    loading,
    updating,
    fetchTeams,
    updateSeed,
    autoSeedByRankPoints,
    autoSeedRandom,
    clearAllSeeds,
    validateSeeding,
    swapSeeds,
  };
}
