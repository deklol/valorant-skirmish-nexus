
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trophy, Calendar } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface ProfileTournamentHistoryProps {
  userId: string;
}

const ProfileTournamentHistory = ({ userId }: ProfileTournamentHistoryProps) => {
  const { data: tournaments, isLoading } = useQuery({
    queryKey: ['user-tournament-history', userId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_user_tournament_history', {
        profile_user_id: userId
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

  if (!tournaments || tournaments.length === 0) {
    return (
      <div className="text-center py-8">
        <Trophy className="w-16 h-16 text-slate-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-white mb-2">No Tournament History</h3>
        <p className="text-slate-400">This player hasn't participated in any tournaments yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {tournaments.map((tournament) => (
        <Card key={tournament.tournament_id} className="bg-slate-700 border-slate-600">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Trophy className={`w-5 h-5 ${tournament.placement === '1st Place' ? 'text-yellow-400' : 'text-slate-400'}`} />
                <div>
                  <div className="font-semibold text-white">{tournament.tournament_name}</div>
                  <div className="text-sm text-slate-400 flex items-center gap-2">
                    <Calendar className="w-3 h-3" />
                    {tournament.tournament_date ? formatDistanceToNow(new Date(tournament.tournament_date), { addSuffix: true }) : 'Unknown date'}
                  </div>
                </div>
              </div>
              
              <div className="text-right">
                <div className="text-white font-medium mb-1">{tournament.team_name}</div>
                <Badge 
                  variant={tournament.placement === '1st Place' ? 'default' : 'secondary'}
                  className={tournament.placement === '1st Place' ? 'bg-yellow-600' : 'bg-slate-600'}
                >
                  {tournament.placement}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default ProfileTournamentHistory;
