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
    const result = await vetoService.performAction(sessionId, userTeamId, mapId, userId);
    
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
  }, [sessionId, userTeamId, toast, loadState]);

  // Set up polling for updates (single source of truth)
  useEffect(() => {
    if (!sessionId) return;

    // Load initial state
    loadState();

    // Set up polling every 3 seconds to check for updates
    const pollInterval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        loadState();
      }
    }, 3000); // Increased to 3 seconds to reduce load

    // Cleanup
    return () => {
      clearInterval(pollInterval);
    };
  }, [sessionId, loadState]);

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

    // Refresh state after fix
    await loadState();

    toast({
      title: "Turn Sync Fixed",
      description: "Database turn updated to match sequence",
    });
    return true;
  }, [sessionId, userTeamId, toast, loadState]);

  return {
    state,
    loading,
    error,
    performAction,
    fixTurnSync,
    refreshState: loadState
  };
}