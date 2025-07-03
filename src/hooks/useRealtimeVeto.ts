import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { vetoService, VetoState } from '@/services/vetoStateService';
import { cleanupRealtimeChannel, createRealtimeChannel, isRealtimeAvailable } from '@/utils/realtimeUtils';

interface OptimisticAction {
  id: string;
  mapId: string;
  action: 'ban' | 'pick';
  teamId: string | null;
  orderNumber: number;
  isOptimistic: boolean;
}

export function useRealtimeVeto(sessionId: string, userTeamId: string | null) {
  const [state, setState] = useState<VetoState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [optimisticActions, setOptimisticActions] = useState<OptimisticAction[]>([]);
  const channelRef = useRef<any>(null);
  const { toast } = useToast();

  // Load initial state
  const loadState = useCallback(async () => {
    if (!sessionId) return;
    
    try {
      setError(null);
      const newState = await vetoService.loadState(sessionId, userTeamId);
      setState(newState);
      
      // Clear any optimistic actions that are now confirmed
      setOptimisticActions(prev => 
        prev.filter(opt => !newState.actions.some(real => real.mapId === opt.mapId))
      );
    } catch (err: any) {
      console.error('Failed to load veto state:', err);
      setError(err.message);
      toast({
        title: "Failed to load veto state",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [sessionId, userTeamId, toast]);

  // Perform veto action with optimistic updates
  const performAction = useCallback(async (mapId: string, userId: string) => {
    if (!state) return false;

    // Optimistic update - show immediate feedback
    const optimisticAction: OptimisticAction = {
      id: `optimistic-${Date.now()}`,
      mapId,
      action: state.currentPosition <= state.banSequence.length ? 'ban' : 'pick',
      teamId: state.expectedTurnTeamId,
      orderNumber: state.currentPosition,
      isOptimistic: true
    };
    
    setOptimisticActions(prev => [...prev, optimisticAction]);

    try {
      const result = await vetoService.performAction(sessionId, userTeamId, mapId, userId);
      
      if (!result.success) {
        // Remove optimistic action on failure
        setOptimisticActions(prev => prev.filter(a => a.id !== optimisticAction.id));
        toast({
          title: "Action Failed",
          description: result.error,
          variant: "destructive",
        });
        return false;
      }

      toast({
        title: "Action Successful",
        description: "Map veto action completed",
      });
      
      return true;
    } catch (error: any) {
      // Remove optimistic action on error
      setOptimisticActions(prev => prev.filter(a => a.id !== optimisticAction.id));
      toast({
        title: "Action Failed",
        description: error.message,
        variant: "destructive",
      });
      return false;
    }
  }, [sessionId, userTeamId, state, toast]);

  // Fix turn sync issues
  const fixTurnSync = useCallback(async () => {
    const result = await vetoService.fixTurnSync(sessionId, userTeamId);
    
    if (!result.success) {
      toast({
        title: "Fix Failed",
        description: result.error,
        variant: "destructive",
      });
      return false;
    }

    toast({
      title: "Turn Sync Fixed",
      description: "Database turn updated to match sequence",
    });
    return true;
  }, [sessionId, userTeamId, toast]);

  // Set up realtime subscription
  useEffect(() => {
    if (!sessionId) return;

    console.log('🔄 Setting up realtime subscription for session:', sessionId.slice(0, 8));

    // Load initial state immediately
    const loadInitialState = async () => {
      try {
        setError(null);
        const newState = await vetoService.loadState(sessionId, userTeamId);
        setState(newState);
        setOptimisticActions(prev => 
          prev.filter(opt => !newState.actions.some(real => real.mapId === opt.mapId))
        );
      } catch (err: any) {
        console.error('Failed to load veto state:', err);
        setError(err.message);
        toast({
          title: "Failed to load veto state",
          description: err.message,
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    loadInitialState();

    // Check if realtime is available
    if (!isRealtimeAvailable()) {
      console.warn('⚠️ Realtime not available, falling back to manual refresh');
      return;
    }

    // Create realtime channel
    const channel = createRealtimeChannel(`veto-session-${sessionId}`);
    if (!channel) {
      console.error('❌ Failed to create realtime channel');
      return;
    }

    channel.on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'map_veto_actions',
          filter: `veto_session_id=eq.${sessionId}`
        },
        (payload) => {
          console.log('🎯 Realtime: New veto action inserted:', payload.new);
          // Refresh state when new action is added - use direct call to avoid dependency issues
          loadInitialState();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'map_veto_sessions',
          filter: `id=eq.${sessionId}`
        },
        (payload) => {
          console.log('🔄 Realtime: Veto session updated:', payload.new);
          // Refresh state when session is updated - use direct call to avoid dependency issues  
          loadInitialState();
        }
      )
      .subscribe((status) => {
        console.log('📡 Realtime subscription status:', status);
        if (status === 'SUBSCRIBED') {
          console.log('✅ Realtime subscription active for session:', sessionId.slice(0, 8));
        }
      });

    channelRef.current = channel;

    // Cleanup function
    return () => {
      console.log('🧹 Cleaning up realtime subscription for session:', sessionId.slice(0, 8));
      if (channelRef.current) {
        cleanupRealtimeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [sessionId, userTeamId, toast]); // Removed loadState dependency to prevent loops

  // Combine real actions with optimistic actions for UI
  const combinedState = state ? {
    ...state,
    actions: [
      ...state.actions,
      ...optimisticActions.map(opt => ({
        id: opt.id,
        action: opt.action,
        teamId: opt.teamId,
        mapId: opt.mapId,
        orderNumber: opt.orderNumber,
        mapName: undefined // Will be resolved by UI
      }))
    ]
  } : null;

  return {
    state: combinedState,
    loading,
    error,
    performAction,
    fixTurnSync,
    refreshState: loadState
  };
}