import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useLiveMatches = () => {
  const [hasLiveMatches, setHasLiveMatches] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkLiveMatches = async () => {
      try {
        const { count, error } = await supabase
          .from('matches')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'live');

        if (error) throw error;
        setHasLiveMatches((count || 0) > 0);
      } catch (error) {
        console.error('Error checking live matches:', error);
        setHasLiveMatches(false);
      } finally {
        setLoading(false);
      }
    };

    checkLiveMatches();

    // Set up real-time subscription for match updates
    const channel = supabase
      .channel('live-matches-check')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'matches',
          filter: 'status=eq.live'
        },
        () => {
          checkLiveMatches();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return { hasLiveMatches, loading };
};