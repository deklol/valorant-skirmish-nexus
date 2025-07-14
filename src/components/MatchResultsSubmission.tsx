import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Trophy, AlertTriangle, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface MatchResultsSubmissionProps {
  matchId: string;
  team1: { id: string; name: string; };
  team2: { id: string; name: string; };
  userTeamId: string | null;
  isUserCaptain: boolean;
  currentScore: { team1: number; team2: number; };
  onResultsSubmitted: () => void;
  tournamentId: string;
}

const MatchResultsSubmission = ({ 
  matchId, 
  team1, 
  team2, 
  userTeamId, 
  isUserCaptain,
  currentScore,
  onResultsSubmitted,
  tournamentId
}: MatchResultsSubmissionProps) => {
  const [scores, setScores] = useState({ 
    team1: currentScore.team1, 
    team2: currentScore.team2 
  });
  const [submitting, setSubmitting] = useState(false);
  const [pendingResults, setPendingResults] = useState<any>(null);
  const { user, isAdmin } = useAuth();
  const { toast } = useToast();

  const canSubmitResults = isUserCaptain || isAdmin;

  const submitResults = async () => {
    if (!canSubmitResults) return;

    setSubmitting(true);
    try {
      let winnerId = null;
      if (scores.team1 > scores.team2) {
        winnerId = team1.id;
      } else if (scores.team2 > scores.team1) {
        winnerId = team2.id;
      }
      let loserId = null;
      if (scores.team1 > scores.team2) {
        loserId = team2.id;
      } else if (scores.team2 > scores.team1) {
        loserId = team1.id;
      }

      // Confirmed: Use ONLY processMatchResults for final completion!
      if (winnerId && loserId && scores.team1 !== scores.team2) {
        const processor = (await import('./MatchResultsProcessor')).processMatchResults;
        await processor({
          matchId,
          winnerId,
          loserId,
          tournamentId,
          scoreTeam1: scores.team1,
          scoreTeam2: scores.team2,
          onComplete: onResultsSubmitted,
        });

        toast({
          title: "Results Submitted",
          description: "Match is complete and bracket progress updated.",
        });
        setPendingResults(null);
      } else {
        // Classic workflow (pending confirmation or data mismatch)
        const { data: existingPending } = await supabase
          .from('match_result_submissions')
          .select('*')
          .eq('match_id', matchId)
          .eq('status', 'pending')
          .single();

        if (existingPending && existingPending.submitted_by !== user?.id) {
          // Confirm the existing submission
          await supabase
            .from('match_result_submissions')
            .update({ 
              status: 'confirmed',
              confirmed_by: user?.id,
              confirmed_at: new Date().toISOString()
            })
            .eq('id', existingPending.id);

          // Update the actual match
          await supabase
            .from('matches')
            .update({
              score_team1: existingPending.score_team1,
              score_team2: existingPending.score_team2,
              winner_id: existingPending.winner_id,
              status: 'completed',
              completed_at: new Date().toISOString()
            })
            .eq('id', matchId);

          toast({
            title: "Results Confirmed",
            description: "Match results have been confirmed and the winner has advanced",
          });

          onResultsSubmitted();
        } else {
          // Submit new results for confirmation
          await supabase
            .from('match_result_submissions')
            .insert({
              match_id: matchId,
              score_team1: scores.team1,
              score_team2: scores.team2,
              winner_id: winnerId,
              submitted_by: user?.id,
              status: 'pending'
            });

          toast({
            title: "Results Submitted",
            description: "Results submitted and awaiting confirmation from the other team captain or admin",
          });

          setPendingResults({ scores, winnerId });
        }
      }
    } catch (error) {
      console.error('Error submitting results:', error);
      toast({
        title: "Error",
        description: "Failed to submit match results",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (!canSubmitResults) {
    return (
      <Card className="bg-slate-800 border-slate-700">
        <CardContent className="p-4 text-center">
          <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-yellow-500" />
          <p className="text-slate-400">Only team captains or admins can submit match results</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-slate-800 border-slate-700">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <Trophy className="w-5 h-5" />
          Submit Match Results
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-4 items-center">
          <div className="text-center">
            <div className="text-white font-medium mb-2">{team1.name}</div>
            <Input
              type="number"
              min="0"
              value={scores.team1}
              onChange={(e) => setScores(prev => ({
                ...prev,
                team1: parseInt(e.target.value) || 0
              }))}
              className="text-center"
            />
          </div>
          
          <div className="text-center text-white font-bold text-xl">VS</div>
          
          <div className="text-center">
            <div className="text-white font-medium mb-2">{team2.name}</div>
            <Input
              type="number"
              min="0"
              value={scores.team2}
              onChange={(e) => setScores(prev => ({
                ...prev,
                team2: parseInt(e.target.value) || 0
              }))}
              className="text-center"
            />
          </div>
        </div>

        {pendingResults && (
          <div className="bg-yellow-500/20 p-3 rounded-lg border border-yellow-500/30">
            <div className="flex items-center gap-2 text-yellow-400 mb-2">
              <AlertTriangle className="w-4 h-4" />
              <span className="font-medium">Results Pending Confirmation</span>
            </div>
            <p className="text-yellow-300 text-sm">
              Your results have been submitted and are awaiting confirmation from the other team captain or an admin.
            </p>
          </div>
        )}

        <Button
          onClick={submitResults}
          disabled={submitting || scores.team1 === scores.team2}
          className="w-full bg-blue-600 hover:bg-blue-700"
        >
          {submitting ? "Submitting..." : "Submit Results"}
        </Button>

        {scores.team1 === scores.team2 && (
          <p className="text-yellow-400 text-sm text-center">
            Match cannot end in a tie
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export default MatchResultsSubmission;
