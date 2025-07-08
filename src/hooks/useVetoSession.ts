import { useState, useEffect, useCallback } from 'react';
import { VetoService } from '@/services/VetoService';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { cleanupRealtimeChannel, createRealtimeChannel } from '@/utils/realtimeUtils';

export interface VetoSessionData {
  id: string;
  match_id: string;
  home_team_id: string;
  away_team_id: string;
  home_team?: { id: string; name: string };
  away_team?: { id: string; name: string };
  status: 'pending' | 'in_progress' | 'completed';
  current_turn_team_id?: string;
  roll_seed?: string;
  roll_timestamp?: string;
  started_at?: string;
  completed_at?: string;
  actions: VetoAction[];
}

export interface VetoAction {
  id: string;
  action: 'ban' | 'pick';
  order_number: number;
  side_choice?: string;
  performed_at: string;
  map: {
    id: string;
    name: string;
    display_name: string;
    thumbnail_url?: string;
  };
  team?: {
    id: string;
    name: string;
  };
  performed_by_user?: {
    id: string;
    discord_username: string;
  };
}

export interface UseVetoSessionReturn {
  session: VetoSessionData | null;
  loading: boolean;
  error: string | null;
  isMyTurn: boolean;
  canAct: boolean;
  userTeamId: string | null;
  phase: 'dice_roll' | 'banning' | 'side_choice' | 'completed';
  refresh: () => Promise<void>;
}

export function useVetoSession(matchId: string): UseVetoSessionReturn {
  const { user } = useAuth();
  const [session, setSession] = useState<VetoSessionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userTeamId, setUserTeamId] = useState<string | null>(null);

  // Fetch session data
  const fetchSession = useCallback(async () => {
    if (!matchId) return;

    try {
      setLoading(true);
      setError(null);

      const { data, error: sessionError } = await VetoService.getVetoSession(matchId);
      
      if (sessionError) {
        setError(sessionError.message);
        return;
      }

      setSession(data);

      // Get user's team ID if logged in
      if (user && data) {
        console.log('VETO DEBUG: Checking user team membership', {
          userId: user.id,
          homeTeamId: data.home_team_id,
          awayTeamId: data.away_team_id
        });
        
        const { data: teamData, error: teamError } = await supabase
          .from('team_members')
          .select('team_id')
          .eq('user_id', user.id)
          .in('team_id', [data.home_team_id, data.away_team_id])
          .single();
        
        console.log('VETO DEBUG: Team membership query result', { teamData, teamError });
        setUserTeamId(teamData?.team_id || null);
      }
    } catch (err: any) {
      console.error('Error fetching veto session:', err);
      setError(err.message || 'Failed to load veto session');
    } finally {
      setLoading(false);
    }
  }, [matchId, user]);

  // Set up real-time subscriptions
  useEffect(() => {
    if (!matchId) return;

    // Initial fetch
    fetchSession();

    // Subscribe to session changes
    const sessionChannel = createRealtimeChannel(`veto-session-${matchId}`);
    const actionsChannel = createRealtimeChannel(`veto-actions-${matchId}`);

    if (sessionChannel) {
      sessionChannel
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'map_veto_sessions',
          filter: `match_id=eq.${matchId}`
        }, () => {
          fetchSession();
        })
        .subscribe();
    }

    if (actionsChannel) {
      actionsChannel
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'map_veto_actions',
          filter: `veto_session_id=eq.${session?.id || ''}`
        }, () => {
          fetchSession();
        })
        .subscribe();
    }

    return () => {
      cleanupRealtimeChannel(sessionChannel);
      cleanupRealtimeChannel(actionsChannel);
    };
  }, [matchId, fetchSession, session?.id]);

  // Computed properties
  const isMyTurn = Boolean(
    user && userTeamId && session?.current_turn_team_id === userTeamId
  );

  const canAct = Boolean(
    user && userTeamId && 
    (userTeamId === session?.home_team_id || userTeamId === session?.away_team_id) &&
    session?.status === 'in_progress'
  );

  console.log('VETO DEBUG: Computed properties', {
    user: !!user,
    userTeamId,
    sessionHomeTeam: session?.home_team_id,
    sessionAwayTeam: session?.away_team_id,
    sessionStatus: session?.status,
    isMyTurn,
    canAct
  });

  // Determine current phase
  const phase: 'dice_roll' | 'banning' | 'side_choice' | 'completed' = (() => {
    if (!session) return 'dice_roll';
    if (session.status === 'completed') return 'completed';
    if (session.status === 'pending') return 'dice_roll';
    
    // Check if we have any picks (means banning is done, need side choice)
    const hasPick = session.actions.some(action => action.action === 'pick');
    if (hasPick && !session.actions.some(action => action.side_choice)) {
      return 'side_choice';
    }
    
    return 'banning';
  })();

  return {
    session,
    loading,
    error,
    isMyTurn,
    canAct,
    userTeamId,
    phase,
    refresh: fetchSession
  };
}