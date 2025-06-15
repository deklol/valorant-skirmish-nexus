
import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Trophy, Target, CheckCircle, Clock, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useEnhancedNotifications } from "@/hooks/useEnhancedNotifications";
import { processMatchResults } from "@/components/EnhancedMatchResultsProcessor";

interface Match {
  id: string;
  match_number: number;
  round_number: number;
  team1_id: string | null;
  team2_id: string | null;
  score_team1: number | null;
  score_team2: number | null;
  status: string;
  winner_id: string | null;
  tournament_id?: string;
  team1?: { name: string };
  team2?: { name: string };
}

interface ScoreReportingProps {
  match: Match;
  onScoreSubmitted: () => void;
}

const ScoreReporting = ({ match, onScoreSubmitted }: ScoreReportingProps) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [scores, setScores] = useState({
    team1: match.score_team1?.toString() || '',
    team2: match.score_team2?.toString() || ''
  });
  const { user } = useAuth();
  const { toast } = useToast();
  const notifications = useEnhancedNotifications();

  const handleSubmitScore = async () => {
    if (!user) return;

    const score1 = parseInt(scores.team1) || 0;
    const score2 = parseInt(scores.team2) || 0;

    if (score1 === score2) {
      toast({
        title: "Invalid Score",
        description: "Matches cannot end in a tie. Please enter a valid score.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      // Determine winner
      const winnerId = score1 > score2 ? match.team1_id : match.team2_id;
      const loserId = score1 > score2 ? match.team2_id : match.team1_id;

      // Check if this is an admin directly updating or needs approval
      const { data: userData } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single();

      const isAdmin = userData?.role === 'admin';

      if (isAdmin) {
        // Admin can directly update match results
        const { error: matchError } = await supabase
          .from('matches')
          .update({
            score_team1: score1,
            score_team2: score2,
            winner_id: winnerId,
            status: 'completed',
            completed_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', match.id);

        if (matchError) throw matchError;

        // Process match results to advance tournament
        if (winnerId && loserId && match.tournament_id) {
          await processMatchResults({
            matchId: match.id,
            winnerId,
            loserId,
            tournamentId: match.tournament_id,
            onComplete: () => {
              console.log('Tournament progression completed');
            },
            toast,
            notifyMatchComplete: notifications.notifyMatchComplete,
            notifyTournamentWinner: notifications.notifyTournamentWinner,
            notifyMatchReady: notifications.notifyMatchReady,
          });
        }

        toast({
          title: "Score Updated",
          description: "Match result has been recorded and tournament progressed",
        });
      } else {
        // Regular users submit for approval
        const { error: submissionError } = await supabase
          .from('match_result_submissions')
          .insert({
            match_id: match.id,
            score_team1: score1,
            score_team2: score2,
            winner_id: winnerId,
            submitted_by: user.id,
            status: 'pending'
          });

        if (submissionError) throw submissionError;

        toast({
          title: "Score Submitted",
          description: "Your score submission is pending approval from an admin",
        });
      }

      setOpen(false);
      onScoreSubmitted();
    } catch (error: any) {
      console.error('Error submitting score:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to submit score",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getMatchStatus = () => {
    if (match.status === 'completed') {
      return (
        <Badge className="bg-green-600">
          <CheckCircle className="w-3 h-3 mr-1" />
          Completed
        </Badge>
      );
    }
    if (match.status === 'live') {
      return (
        <Badge className="bg-orange-600">
          <Clock className="w-3 h-3 mr-1" />
          Live
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="border-slate-600 text-slate-300">
        <AlertTriangle className="w-3 h-3 mr-1" />
        Pending
      </Badge>
    );
  };

  return (
    <Card className="bg-slate-800 border-slate-700">
      <CardHeader>
        <CardTitle className="text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5" />
            Round {match.round_number} - Match {match.match_number}
          </div>
          {getMatchStatus()}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="text-center flex-1">
            <div className="text-lg font-semibold text-white">
              {match.team1?.name || 'TBA'}
            </div>
            {match.score_team1 !== null && (
              <div className="text-2xl font-bold text-green-400 mt-2">
                {match.score_team1}
              </div>
            )}
          </div>
          
          <div className="text-slate-400 text-xl font-bold px-4">
            VS
          </div>
          
          <div className="text-center flex-1">
            <div className="text-lg font-semibold text-white">
              {match.team2?.name || 'TBA'}
            </div>
            {match.score_team2 !== null && (
              <div className="text-2xl font-bold text-green-400 mt-2">
                {match.score_team2}
              </div>
            )}
          </div>
        </div>

        {match.team1_id && match.team2_id && match.status !== 'completed' && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="w-full bg-blue-600 hover:bg-blue-700">
                <Target className="w-4 h-4 mr-2" />
                Report Score
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-slate-800 border-slate-700">
              <DialogHeader>
                <DialogTitle className="text-white">Report Match Score</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="team1Score" className="text-slate-300">
                      {match.team1?.name || 'Team 1'} Score
                    </Label>
                    <Input
                      id="team1Score"
                      type="number"
                      min="0"
                      value={scores.team1}
                      onChange={(e) => setScores(prev => ({ ...prev, team1: e.target.value }))}
                      className="bg-slate-700 border-slate-600 text-white"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="team2Score" className="text-slate-300">
                      {match.team2?.name || 'Team 2'} Score
                    </Label>
                    <Input
                      id="team2Score"
                      type="number"
                      min="0"
                      value={scores.team2}
                      onChange={(e) => setScores(prev => ({ ...prev, team2: e.target.value }))}
                      className="bg-slate-700 border-slate-600 text-white"
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={handleSubmitScore}
                    disabled={loading || !scores.team1 || !scores.team2}
                    className="flex-1 bg-green-600 hover:bg-green-700"
                  >
                    {loading ? 'Submitting...' : 'Submit Score'}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setOpen(false)}
                    className="border-slate-600 text-slate-300 hover:bg-slate-700"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </CardContent>
    </Card>
  );
};

export default ScoreReporting;
