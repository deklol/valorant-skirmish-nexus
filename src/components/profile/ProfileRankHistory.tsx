
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Minus, Calendar } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface ProfileRankHistoryProps {
  userId: string;
}

const ProfileRankHistory = ({ userId }: ProfileRankHistoryProps) => {
  const { data: rankHistory, isLoading } = useQuery({
    queryKey: ['user-rank-history', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('rank_history')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(20);
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!userId
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-16 bg-slate-700 rounded animate-pulse"></div>
        ))}
      </div>
    );
  }

  if (!rankHistory || rankHistory.length === 0) {
    return (
      <div className="text-center py-8">
        <TrendingUp className="w-16 h-16 text-slate-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-white mb-2">No Rank History</h3>
        <p className="text-slate-400">This player's rank changes will appear here.</p>
      </div>
    );
  }

  const getChangeIcon = (changeType: string) => {
    switch (changeType) {
      case 'promotion':
        return <TrendingUp className="w-4 h-4 text-green-400" />;
      case 'demotion':
        return <TrendingDown className="w-4 h-4 text-red-400" />;
      default:
        return <Minus className="w-4 h-4 text-slate-400" />;
    }
  };

  const getChangeColor = (changeType: string) => {
    switch (changeType) {
      case 'promotion':
        return 'bg-green-600';
      case 'demotion':
        return 'bg-red-600';
      default:
        return 'bg-slate-600';
    }
  };

  return (
    <div className="space-y-4">
      {rankHistory.map((entry) => (
        <Card key={entry.id} className="bg-slate-700 border-slate-600">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                {getChangeIcon(entry.rank_change_type)}
                <div>
                  <div className="text-white">
                    {entry.previous_rank && (
                      <span className="text-slate-400">{entry.previous_rank} → </span>
                    )}
                    <span className="font-semibold">{entry.new_rank}</span>
                  </div>
                  <div className="text-sm text-slate-400 flex items-center gap-2">
                    <Calendar className="w-3 h-3" />
                    {formatDistanceToNow(new Date(entry.created_at), { addSuffix: true })}
                  </div>
                </div>
              </div>
              
              <div className="text-right">
                <Badge className={getChangeColor(entry.rank_change_type)}>
                  {entry.rank_change_type}
                </Badge>
                {entry.rank_points_change !== 0 && (
                  <div className="text-sm text-slate-400 mt-1">
                    {entry.rank_points_change > 0 ? '+' : ''}{entry.rank_points_change} RP
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default ProfileRankHistory;
