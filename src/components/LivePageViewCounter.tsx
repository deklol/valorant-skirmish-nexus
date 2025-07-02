import { useState, useEffect } from 'react';
import { Eye } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface LivePageViewCounterProps {
  tournamentId: string;
}

const LivePageViewCounter = ({ tournamentId }: LivePageViewCounterProps) => {
  const [pageViews, setPageViews] = useState(0);

  useEffect(() => {
    const fetchPageViews = async () => {
      try {
        const { count } = await supabase
          .from('tournament_page_views')
          .select('*', { count: 'exact' })
          .eq('tournament_id', tournamentId);
        
        setPageViews(count || 0);
      } catch (error) {
        console.warn('Failed to fetch page views:', error);
      }
    };

    fetchPageViews();

    // Set up real-time subscription for live updates
    const channel = supabase
      .channel('page-views-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'tournament_page_views',
          filter: `tournament_id=eq.${tournamentId}`
        },
        () => {
          fetchPageViews(); // Refetch when new view is added
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tournamentId]);

  return (
    <div className="fixed top-4 right-4 z-50 bg-slate-800/90 backdrop-blur-sm border border-slate-700 rounded-lg px-3 py-2 shadow-lg">
      <div className="flex items-center gap-2 text-sm">
        <Eye className="h-4 w-4 text-red-500" />
        <span className="text-slate-300">Views:</span>
        <span className="text-white font-semibold animate-pulse">{pageViews}</span>
        <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
      </div>
    </div>
  );
};

export default LivePageViewCounter;