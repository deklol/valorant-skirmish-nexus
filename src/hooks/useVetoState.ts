import { useState, useEffect, useCallback } from 'react';
import { vetoService, VetoState } from '@/services/vetoStateService';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export function useVetoState(sessionId: string, userTeamId: string | null) {
  const [state, setState] = useState<VetoState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  // Load initial state
  const loadState = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const newState = await vetoService.loadState(sessionId, userTeamId);
      setState(newState);
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

  // Perform veto action
  const performAction = useCallback(async (mapId: string, userId: string) => {
    const result = await vetoService.performAction(mapId, userId);
    
    if (!result.success) {
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
  }, [toast]);

  // Set up realtime subscriptions and state listener
  useEffect(() => {
    if (!sessionId) return;

    // Subscribe to veto service state changes
    const unsubscribeService = vetoService.subscribe((newState) => {
      setState(newState);
    });

    // Subscribe to realtime database changes
    const actionsChannel = supabase
      .channel(`veto-actions-${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'map_veto_actions',
          filter: `veto_session_id=eq.${sessionId}`
        },
        (payload) => {
          console.log('🔄 Realtime: Veto action change', payload.eventType);
          vetoService.handleRealtimeUpdate(payload);
        }
      )
      .subscribe();

    const sessionChannel = supabase
      .channel(`veto-session-${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'map_veto_sessions',
          filter: `id=eq.${sessionId}`
        },
        (payload) => {
          console.log('🔄 Realtime: Session change', payload.eventType);
          vetoService.handleRealtimeUpdate(payload);
        }
      )
      .subscribe();

    // Load initial state
    loadState();

    // Cleanup
    return () => {
      unsubscribeService();
      supabase.removeChannel(actionsChannel);
      supabase.removeChannel(sessionChannel);
    };
  }, [sessionId, loadState]);

  // Fix turn sync issues
  const fixTurnSync = useCallback(async () => {
    const result = await vetoService.fixTurnSync();
    
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
  }, [toast]);

  return {
    state,
    loading,
    error,
    performAction,
    fixTurnSync,
    refreshState: loadState
  };
}