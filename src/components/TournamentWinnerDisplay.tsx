import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, Crown, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface TournamentWinnerDisplayProps {
  tournamentId: string;
  tournamentStatus: string;
}

interface WinnerInfo {
  teamId: string;
  teamName: string;
  members: Array<{
    id: string;
    discord_username: string;
    current_rank: string;
  }>;
}

const TournamentWinnerDisplay = ({ tournamentId, tournamentStatus }: TournamentWinnerDisplayProps) => {
  const [winner, setWinner] = useState<WinnerInfo | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (tournamentStatus === 'completed') {
      fetchTournamentWinner();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tournamentId, tournamentStatus]);

  const fetchTournamentWinner = async () => {
    setLoading(true);
    try {
      // Get the final match (highest round number) to find the winner
      const { data: finalMatch } = await supabase
        .from('matches')
        .select(`
          winner_id,
          round_number,
          teams!matches_winner_id_fkey (
            id,
            name
          )
        `)
        .eq('tournament_id', tournamentId)
        .eq('status', 'completed')
        .not('winner_id', 'is', null)
        .order('round_number', { ascending: false })
        .limit(1)
        .single();

      if (finalMatch?.winner_id && finalMatch.teams) {
        // Just fetch team members for display, do not run any mutations/rpc!
        const { data: teamMembers } = await supabase
          .from('team_members')
          .select(`
            user_id,
            users!team_members_user_id_fkey (
              id,
              discord_username,
              current_rank
            )
          `)
          .eq('team_id', finalMatch.winner_id);

        if (teamMembers) {
          setWinner({
            teamId: finalMatch.winner_id,
            teamName: finalMatch.teams.name,
            members: teamMembers.map(tm => ({
              id: tm.users?.id || '',
              discord_username: tm.users?.discord_username || 'Unknown',
              current_rank: tm.users?.current_rank || 'Unranked'
            }))
          });
        }
      } else {
        setWinner(null);
      }
    } catch (error) {
      console.error('Error fetching tournament winner:', error);
      setWinner(null);
    } finally {
      setLoading(false);
    }
  };

  if (tournamentStatus !== 'completed' || !winner) {
    return null;
  }

  return (
    <Card className="bg-gradient-to-r from-yellow-900/20 to-yellow-800/20 border-yellow-600/30">
      <CardHeader className="text-center">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Crown className="w-8 h-8 text-yellow-500" />
          <CardTitle className="text-2xl font-bold text-yellow-500">
            Tournament Champions
          </CardTitle>
          <Crown className="w-8 h-8 text-yellow-500" />
        </div>
        <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30 text-lg px-4 py-2">
          <Trophy className="w-4 h-4 mr-2" />
          {winner.teamName}
        </Badge>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center justify-center gap-2 text-slate-300">
            <Users className="w-4 h-4" />
            <span className="font-medium">Team Members</span>
          </div>
          {/* Change to a single column list with vertical spacing */}
          <div className="space-y-3">
            {winner.members.map((member) => (
              <div 
                key={member.id}
                className="bg-slate-700/50 rounded-lg p-3 flex items-center justify-between"
              >
                <span className="text-white font-medium">
                  {member.discord_username}
                </span>
                <Badge variant="outline" className="text-slate-300 border-slate-500">
                  {member.current_rank}
                </Badge>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default TournamentWinnerDisplay;
