
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Minus, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface RankHistoryEntry {
  id: string;
  user_id: string;
  previous_rank: string | null;
  new_rank: string;
  rank_change_type: 'promotion' | 'demotion' | 'same';
  rank_points_change: number | null;
  updated_at: string;
}

const RankHistory = () => {
  const [rankHistory, setRankHistory] = useState<RankHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      fetchRankHistory();
    }
  }, [user]);

  const fetchRankHistory = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('rank_history')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setRankHistory(data || []);
    } catch (error) {
      console.error('Error fetching rank history:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRankChangeIcon = (changeType: string) => {
    switch (changeType) {
      case 'promotion':
        return <TrendingUp className="w-4 h-4 text-green-400" />;
      case 'demotion':
        return <TrendingDown className="w-4 h-4 text-red-400" />;
      default:
        return <Minus className="w-4 h-4 text-gray-400" />;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  if (loading) {
    return (
      <Card className="bg-slate-800 border-slate-700">
        <CardContent className="p-4">
          <p className="text-slate-400">Loading rank history...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-slate-800 border-slate-700">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <Calendar className="w-5 h-5" />
          Rank History
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {rankHistory.length === 0 ? (
          <p className="text-slate-400 text-sm">No rank changes recorded yet.</p>
        ) : (
          rankHistory.map((entry) => (
            <div key={entry.id} className="flex items-center justify-between bg-slate-700 p-3 rounded-lg">
              <div className="flex items-center gap-3">
                {getRankChangeIcon(entry.rank_change_type)}
                <div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="border-slate-600 text-slate-300">
                      {entry.previous_rank || 'Unranked'}
                    </Badge>
                    <span className="text-slate-400">→</span>
                    <Badge variant="outline" className="border-slate-600 text-slate-300">
                      {entry.new_rank}
                    </Badge>
                  </div>
                  {entry.rank_points_change !== null && entry.rank_points_change !== 0 && (
                    <div className="text-xs text-slate-400 mt-1">
                      {entry.rank_points_change > 0 ? '+' : ''}{entry.rank_points_change} points
                    </div>
                  )}
                </div>
              </div>
              <div className="text-xs text-slate-400">
                {formatDate(entry.updated_at)}
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
};

export default RankHistory;
