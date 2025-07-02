import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useTournamentPageViews = (tournamentId: string | undefined) => {
  const [pageViews, setPageViews] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPageViews = async () => {
      if (!tournamentId) {
        setLoading(false);
        return;
      }

      try {
        const { count } = await supabase
          .from('tournament_page_views')
          .select('*', { count: 'exact' })
          .eq('tournament_id', tournamentId);
        
        setPageViews(count || 0);
      } catch (error) {
        console.warn('Failed to fetch tournament page views:', error);
        setPageViews(0);
      } finally {
        setLoading(false);
      }
    };

    fetchPageViews();
  }, [tournamentId]);

  return { pageViews, loading };
};