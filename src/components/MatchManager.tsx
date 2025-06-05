
import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Trophy, Play, Square, Edit } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface Match {
  id: string;
  round_number: number;
  match_number: number;
  team1_id: string | null;
  team2_id: string | null;
  winner_id: string | null;
  status: string;
  score_team1: number;
  score_team2: number;
  team1?: { name: string; id: string } | null;
  team2?: { name: string; id: string } | null;
}

interface MatchManagerProps {
  tournamentId: string;
  onMatchUpdate: () => void;
}

const MatchManager = ({ tournamentId, onMatchUpdate }: MatchManagerProps) => {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingMatch, setEditingMatch] = useState<string | null>(null);
  const [scores, setScores] = useState<{ [key: string]: { team1: number; team2: number } }>({});
  const { toast } = useToast();

  useEffect(() => {
    fetchMatches();
  }, [tournamentId]);

  const fetchMatches = async () => {
    try {
      const { data, error } = await supabase
        .from('matches')
        .select(`
          *,
          team1:teams!matches_team1_id_fkey (name, id),
          team2:teams!matches_team2_id_fkey (name, id)
        `)
        .eq('tournament_id', tournamentId)
        .order('round_number', { ascending: true })
        .order('match_number', { ascending: true });

      if (error) throw error;
      setMatches(data || []);
    } catch (error) {
      console.error('Error fetching matches:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateMatchStatus = async (matchId: string, status: string) => {
    try {
      const updates: any = { status };
      
      if (status === 'live') {
        updates.started_at = new Date().toISOString();
      } else if (status === 'completed') {
        updates.completed_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('matches')
        .update(updates)
        .eq('id', matchId);

      if (error) throw error;

      await fetchMatches();
      onMatchUpdate();

      toast({
        title: "Match Updated",
        description: `Match status changed to ${status}`,
      });
    } catch (error: any) {
      console.error('Error updating match:', error);
      toast({
        title: "Error",
        description: "Failed to update match status",
        variant: "destructive",
      });
    }
  };

  const updateMatchScore = async (matchId: string) => {
    const matchScores = scores[matchId];
    if (!matchScores) return;

    try {
      const match = matches.find(m => m.id === matchId);
      if (!match) return;

      let winnerId = null;
      if (matchScores.team1 > matchScores.team2) {
        winnerId = match.team1_id;
      } else if (matchScores.team2 > matchScores.team1) {
        winnerId = match.team2_id;
      }

      const { error } = await supabase
        .from('matches')
        .update({
          score_team1: matchScores.team1,
          score_team2: matchScores.team2,
          winner_id: winnerId,
          status: winnerId ? 'completed' : 'live',
          completed_at: winnerId ? new Date().toISOString() : null
        })
        .eq('id', matchId);

      if (error) throw error;

      // If match is completed, advance winner to next round
      if (winnerId) {
        await advanceWinner(match, winnerId);
      }

      await fetchMatches();
      onMatchUpdate();
      setEditingMatch(null);

      toast({
        title: "Score Updated",
        description: "Match score has been updated successfully",
      });
    } catch (error: any) {
      console.error('Error updating score:', error);
      toast({
        title: "Error",
        description: "Failed to update match score",
        variant: "destructive",
      });
    }
  };

  const advanceWinner = async (match: Match, winnerId: string) => {
    try {
      // Find the next round match that this winner should advance to
      const nextRound = match.round_number + 1;
      const nextMatchNumber = Math.ceil(match.match_number / 2);

      const { data: nextMatch, error } = await supabase
        .from('matches')
        .select('*')
        .eq('tournament_id', tournamentId)
        .eq('round_number', nextRound)
        .eq('match_number', nextMatchNumber)
        .single();

      if (error || !nextMatch) return; // No next round (this was the final)

      // Determine if winner goes to team1 or team2 slot
      const isOddMatch = match.match_number % 2 === 1;
      const updateField = isOddMatch ? 'team1_id' : 'team2_id';

      await supabase
        .from('matches')
        .update({ [updateField]: winnerId })
        .eq('id', nextMatch.id);

    } catch (error) {
      console.error('Error advancing winner:', error);
    }
  };

  const handleScoreChange = (matchId: string, team: 'team1' | 'team2', value: number) => {
    setScores(prev => ({
      ...prev,
      [matchId]: {
        ...prev[matchId],
        [team]: value
      }
    }));
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      pending: "bg-gray-500/20 text-gray-400",
      live: "bg-red-500/20 text-red-400",
      completed: "bg-green-500/20 text-green-400"
    };

    return (
      <Badge className={variants[status] || variants.pending}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  if (loading) {
    return (
      <Card className="bg-slate-800 border-slate-700">
        <CardContent className="py-8 text-center">
          <p className="text-slate-400">Loading matches...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-slate-800 border-slate-700">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <Trophy className="w-5 h-5" />
          Match Management
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {matches.length === 0 ? (
          <p className="text-slate-400 text-center py-4">No matches found. Generate bracket first.</p>
        ) : (
          <div className="space-y-4">
            {matches.filter(m => m.team1_id && m.team2_id).map((match) => (
              <div key={match.id} className="bg-slate-700 p-4 rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-white font-medium">
                      Round {match.round_number} - Match {match.match_number}
                    </span>
                    {getStatusBadge(match.status)}
                  </div>
                  <div className="flex gap-2">
                    {match.status === 'pending' && (
                      <Button
                        size="sm"
                        onClick={() => updateMatchStatus(match.id, 'live')}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <Play className="w-3 h-3 mr-1" />
                        Start
                      </Button>
                    )}
                    {match.status === 'live' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setEditingMatch(editingMatch === match.id ? null : match.id)}
                      >
                        <Edit className="w-3 h-3 mr-1" />
                        Edit Score
                      </Button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 items-center">
                  <div className="text-white text-center">
                    {match.team1?.name || 'TBD'}
                  </div>
                  <div className="text-center">
                    <span className="text-2xl font-bold text-white">
                      {match.score_team1} - {match.score_team2}
                    </span>
                  </div>
                  <div className="text-white text-center">
                    {match.team2?.name || 'TBD'}
                  </div>
                </div>

                {editingMatch === match.id && (
                  <div className="mt-4 pt-4 border-t border-slate-600">
                    <div className="grid grid-cols-3 gap-4 items-center">
                      <Input
                        type="number"
                        min="0"
                        placeholder="Score"
                        value={scores[match.id]?.team1 ?? match.score_team1}
                        onChange={(e) => handleScoreChange(match.id, 'team1', parseInt(e.target.value) || 0)}
                      />
                      <Button
                        onClick={() => updateMatchScore(match.id)}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        Update
                      </Button>
                      <Input
                        type="number"
                        min="0"
                        placeholder="Score"
                        value={scores[match.id]?.team2 ?? match.score_team2}
                        onChange={(e) => handleScoreChange(match.id, 'team2', parseInt(e.target.value) || 0)}
                      />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default MatchManager;
