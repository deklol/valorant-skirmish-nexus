import { useState, useEffect, useCallback } from 'react';
import { vetoService, VetoState } from '@/services/vetoStateService';
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

  // Perform veto action and refresh state
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

    // Refresh state immediately after successful action
    await loadState();

    toast({
      title: "Action Successful",
      description: "Map veto action completed",
    });
    return true;
  }, [toast, loadState]);

  // Set up state listener and polling for updates
  useEffect(() => {
    if (!sessionId) return;

    // Subscribe to veto service state changes
    const unsubscribeService = vetoService.subscribe((newState) => {
      setState(newState);
    });

    // Load initial state
    loadState();

    // Set up polling every 2 seconds to check for updates
    const pollInterval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        loadState();
      }
    }, 2000);

    // Cleanup
    return () => {
      unsubscribeService();
      clearInterval(pollInterval);
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