
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trophy, Target, Calendar } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface ProfileMatchHistoryProps {
  userId: string;
}

const ProfileMatchHistory = ({ userId }: ProfileMatchHistoryProps) => {
  const { data: matches, isLoading } = useQuery({
    queryKey: ['user-match-history', userId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_user_match_history', {
        profile_user_id: userId,
        match_limit: 20
      });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!userId
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-20 bg-slate-700 rounded animate-pulse"></div>
        ))}
      </div>
    );
  }

  if (!matches || matches.length === 0) {
    return (
      <div className="text-center py-8">
        <Target className="w-16 h-16 text-slate-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-white mb-2">No Match History</h3>
        <p className="text-slate-400">This player hasn't participated in any completed matches yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {matches.map((match) => (
        <Card key={match.match_id} className="bg-slate-700 border-slate-600">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={`w-3 h-3 rounded-full ${match.is_winner ? 'bg-green-400' : 'bg-red-400'}`}></div>
                <div>
                  <div className="font-semibold text-white">{match.tournament_name}</div>
                  <div className="text-sm text-slate-400 flex items-center gap-2">
                    <Calendar className="w-3 h-3" />
                    {match.match_date ? formatDistanceToNow(new Date(match.match_date), { addSuffix: true }) : 'Unknown date'}
                  </div>
                </div>
              </div>
              
              <div className="text-right">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-white font-medium">{match.team_name}</span>
                  <Badge variant={match.is_winner ? 'default' : 'destructive'} className={match.is_winner ? 'bg-green-600' : 'bg-red-600'}>
                    {match.is_winner ? 'W' : 'L'}
                  </Badge>
                </div>
                <div className="text-sm text-slate-400">
                  vs {match.opponent_team_name || 'Unknown Team'}
                </div>
                <div className="text-sm text-slate-300">
                  {match.user_team_score} - {match.opponent_team_score}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default ProfileMatchHistory;
