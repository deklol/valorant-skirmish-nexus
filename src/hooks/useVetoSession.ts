import { useState, useEffect, useCallback, useRef } from 'react';
import { VetoService } from '@/services/VetoService';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { cleanupRealtimeChannel, createRealtimeChannel, isRealtimeAvailable } from '@/utils/realtimeUtils';

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
  refreshAfterAction: () => Promise<void>;
  connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'error';
  lastUpdate: Date | null;
}

export function useVetoSession(matchId: string): UseVetoSessionReturn {
  const { user } = useAuth();
  const [session, setSession] = useState<VetoSessionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userTeamId, setUserTeamId] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('connecting');
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const subscriptionsRef = useRef<{ session?: any; actions?: any }>({});
  const refreshTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastConnectionStatusRef = useRef<string>('connecting');

  // Fetch session data - removed from dependency arrays to prevent circular updates
  const fetchSession = useCallback(async () => {
    if (!matchId) return;

    try {
      setLoading(true);
      setError(null);

      const { data, error: sessionError } = await VetoService.getVetoSession(matchId);
      
      if (sessionError) {
        setError(sessionError.message);
        setConnectionStatus('error');
        return;
      }

      setSession(data);
      setLastUpdate(new Date());
      setConnectionStatus('connected');

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
      } else if (user) {
        // If no veto session exists yet, check if user is on either match team
        console.log('VETO DEBUG: No veto session yet, checking match teams for matchId:', matchId);
        
        const { data: matchData } = await supabase
          .from('matches')
          .select('team1_id, team2_id')
          .eq('id', matchId)
          .single();
          
        if (matchData) {
          console.log('VETO DEBUG: Match teams', matchData);
          
          const { data: teamData, error: teamError } = await supabase
            .from('team_members')
            .select('team_id')
            .eq('user_id', user.id)
            .in('team_id', [matchData.team1_id, matchData.team2_id])
            .single();
            
          console.log('VETO DEBUG: Match team membership query result', { teamData, teamError });
          setUserTeamId(teamData?.team_id || null);
        }
      }
    } catch (err: any) {
      console.error('Error fetching veto session:', err);
      setError(err.message || 'Failed to load veto session');
      setConnectionStatus('error');
    } finally {
      setLoading(false);
    }
  }, [matchId, user]);

  // Enhanced refresh with action confirmation
  const refreshAfterAction = useCallback(async () => {
    console.log('VETO AUTO-REFRESH: Action-triggered refresh initiated');
    
    // Clear any existing timeout
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current);
    }
    
    // Refresh after a 2-second delay to allow server processing
    refreshTimeoutRef.current = setTimeout(async () => {
      await fetchSession();
      console.log('VETO AUTO-REFRESH: Action confirmation refresh completed');
    }, 2000);
  }, [fetchSession]);


  // Cleanup function for subscriptions
  const cleanupSubscriptions = useCallback(() => {
    console.log('VETO REALTIME: Cleaning up all subscriptions');
    if (subscriptionsRef.current.session) {
      cleanupRealtimeChannel(subscriptionsRef.current.session);
      subscriptionsRef.current.session = null;
    }
    if (subscriptionsRef.current.actions) {
      cleanupRealtimeChannel(subscriptionsRef.current.actions);
      subscriptionsRef.current.actions = null;
    }
  }, []);

  // Set up real-time subscriptions for session changes
  useEffect(() => {
    if (!matchId || !isRealtimeAvailable()) {
      console.log('VETO REALTIME: Skipping session subscription - realtime not available');
      setConnectionStatus('disconnected');
      return;
    }

    console.log('VETO REALTIME: Setting up session subscription for match', matchId);

    // Initial fetch
    fetchSession();

    // Clean up any existing subscription
    if (subscriptionsRef.current.session) {
      cleanupRealtimeChannel(subscriptionsRef.current.session);
    }

    // Subscribe to session changes
    const sessionChannel = createRealtimeChannel(`veto-session-${matchId}`);

    if (sessionChannel) {
      setConnectionStatus('connecting');
      
      subscriptionsRef.current.session = sessionChannel;
      
      sessionChannel
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'map_veto_sessions',
          filter: `match_id=eq.${matchId}`
        }, (payload) => {
          console.log('VETO REALTIME: Session change detected', payload);
          setLastUpdate(new Date());
          setConnectionStatus('connected');
          fetchSession();
        })
        .on('system', {}, (payload) => {
          console.log('VETO REALTIME: System message', payload);
          if (payload.status === 'SUBSCRIBED') {
            setConnectionStatus('connected');
          } else if (payload.status === 'CHANNEL_ERROR') {
            setConnectionStatus('error');
          }
        })
        .subscribe();
    } else {
      setConnectionStatus('error');
    }

    return cleanupSubscriptions;
  }, [matchId]);

  // Enhanced auto-refresh system with smart triggers
  useEffect(() => {
    // Track connection status changes
    const prevStatus = lastConnectionStatusRef.current;
    lastConnectionStatusRef.current = connectionStatus;
    
    // Auto-refresh when connection recovers
    if (prevStatus === 'disconnected' && connectionStatus === 'connected') {
      console.log('VETO AUTO-REFRESH: Connection recovered, refreshing...');
      fetchSession();
    }
  }, [connectionStatus, fetchSession]);

  // Tab visibility auto-refresh
  useEffect(() => {
    let lastRefreshTime = 0;
    const REFRESH_COOLDOWN = 5000; // 5 seconds cooldown
    
    const handleVisibilityChange = () => {
      if (!document.hidden && session && session.status !== 'completed') {
        const now = Date.now();
        if (now - lastRefreshTime > REFRESH_COOLDOWN) {
          console.log('VETO AUTO-REFRESH: Tab became visible, refreshing...');
          lastRefreshTime = now;
          fetchSession();
        }
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [session, fetchSession]);

  // Network recovery auto-refresh
  useEffect(() => {
    let lastRefreshTime = 0;
    const REFRESH_COOLDOWN = 5000; // 5 seconds cooldown
    
    const handleOnline = () => {
      if (session && session.status !== 'completed') {
        const now = Date.now();
        if (now - lastRefreshTime > REFRESH_COOLDOWN) {
          console.log('VETO AUTO-REFRESH: Network came back online, refreshing...');
          lastRefreshTime = now;
          fetchSession();
        }
      }
    };
    
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [session, fetchSession]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
    };
  }, []);

  // Set up real-time subscriptions for veto actions (only when we have a session)
  useEffect(() => {
    if (!session?.id || !isRealtimeAvailable()) {
      console.log('VETO REALTIME: No session ID or realtime not available, skipping actions subscription');
      return;
    }

    console.log('VETO REALTIME: Setting up actions subscription for session', session.id);

    // Clean up any existing actions subscription
    if (subscriptionsRef.current.actions) {
      cleanupRealtimeChannel(subscriptionsRef.current.actions);
    }

    const actionsChannel = createRealtimeChannel(`veto-actions-${session.id}`);

    if (actionsChannel) {
      subscriptionsRef.current.actions = actionsChannel;
      
      actionsChannel
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'map_veto_actions',
          filter: `veto_session_id=eq.${session.id}`
        }, (payload) => {
          console.log('VETO REALTIME: Actions change detected', payload);
          setLastUpdate(new Date());
          fetchSession();
        })
        .subscribe();
    }

    return () => {
      if (subscriptionsRef.current.actions) {
        console.log('VETO REALTIME: Cleaning up actions subscription');
        cleanupRealtimeChannel(subscriptionsRef.current.actions);
        subscriptionsRef.current.actions = null;
      }
    };
  }, [session?.id]);

  // Computed properties
  const isMyTurn = Boolean(
    user && userTeamId && session?.current_turn_team_id === userTeamId
  );

  const canAct = Boolean(
    user && userTeamId && 
    (
      // If veto session exists, check session teams
      (session && (userTeamId === session.home_team_id || userTeamId === session.away_team_id)) ||
      // If no session exists yet (dice roll phase), just need to be on a team
      (!session && userTeamId)
    )
  );

  console.log('VETO DEBUG: Computed properties', {
    user: !!user,
    userTeamId,
    sessionExists: !!session,
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
    refresh: fetchSession,
    refreshAfterAction,
    connectionStatus,
    lastUpdate
  };
}