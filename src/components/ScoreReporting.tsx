
import React, { useState, useMemo } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Trophy, Target, CheckCircle, Clock, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useEnhancedNotifications } from "@/hooks/useEnhancedNotifications";
import { processMatchResults } from "@/components/MatchResultsProcessor";
import MatchEditModal, { parseStatus } from "@/components/MatchEditModal";
import MatchResultHistory from "./match-details/MatchResultHistory";

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
  team1?: { id: string; name: string };
  team2?: { id: string; name: string };
}

interface ScoreReportingProps {
  match: Match;
  onScoreSubmitted: () => void;
}

const ScoreReporting = ({ match, onScoreSubmitted }: ScoreReportingProps) => {
  const [open, setOpen] = useState(false);
  const [modalData, setModalData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const notifications = useEnhancedNotifications();

  // Only show to captains or admins; combat via SQL in useMatchData or a prop in real life
  const [isCaptain, setIsCaptain] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  React.useEffect(() => {
    let ok = true;
    (async () => {
      if (!user || !match.id) return;
      // Check if captain for either team
      if (match.team1_id || match.team2_id) {
        const { data } = await supabase.from('team_members')
          .select('is_captain')
          .eq('user_id', user.id)
          .in('team_id', [match.team1_id, match.team2_id].filter(Boolean))
          .maybeSingle();
        setIsCaptain(!!(data && data.is_captain));
      }
      // Admin check (users table)
      const { data: adm } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .maybeSingle();
      setIsAdmin(adm?.role === "admin");
    })();
    return () => { ok = false; };
  }, [user, match.team1_id, match.team2_id, match.id]);

  // Use actual team names
  const team1Name = match.team1?.name || "Team 1";
  const team2Name = match.team2?.name || "Team 2";

  // Build modal "match" object (the minimum required for MatchEditModal)
  const matchEditModalData = useMemo(() => ({
    id: match.id,
    match_number: match.match_number,
    team1: match.team1 ? { id: match.team1.id, name: team1Name } : null,
    team2: match.team2 ? { id: match.team2.id, name: team2Name } : null,
    winner: match.winner_id
      ? (
        match.team1?.id === match.winner_id
          ? { id: match.winner_id, name: team1Name }
          : match.team2?.id === match.winner_id
            ? { id: match.winner_id, name: team2Name }
            : { id: match.winner_id, name: match.winner_id.slice(0, 8) }
      ) : null,
    status: parseStatus(match.status),
    score_team1: typeof match.score_team1 === "number" ? match.score_team1 : 0,
    score_team2: typeof match.score_team2 === "number" ? match.score_team2 : 0,
  }), [match, team1Name, team2Name]);

  async function handleModalSave({ status, score_team1, score_team2, winner_id }: any) {
    setLoading(true);
    try {
      // Only submit if not tied
      if (score_team1 === score_team2) {
        toast({
          title: "Score tie not allowed",
          description: "Scores cannot be tied.",
          variant: "destructive"
        });
        setLoading(false); return;
      }
      // Winner logic
      let winnerId = winner_id;
      if (!winnerId) {
        winnerId = score_team1 > score_team2 ? match.team1_id : match.team2_id;
      }
      // Insert submission (always, even for admin for transparency)
      await supabase.from('match_result_submissions').insert({
        match_id: match.id,
        score_team1, score_team2,
        winner_id: winnerId,
        submitted_by: user.id,
        status: "pending"
      });
      // Check for auto-complete logic:
      // Fetch all captain submissions for this match
      const { data: allSubs } = await supabase
        .from('match_result_submissions')
        .select('*')
        .eq('match_id', match.id)
        .order('submitted_at', { ascending: true });

      // Find two most recent submissions with same score/winner
      const matchingSubs = allSubs?.filter(
        sub => sub.score_team1 === score_team1
          && sub.score_team2 === score_team2
          && sub.winner_id === winnerId
          && sub.status === "pending"
      ) ?? [];
      if (matchingSubs.length >= 2) {
        // Confirm both; update status to confirmed
        const subIds = matchingSubs.slice(0, 2).map(sub => sub.id);
        await supabase.from('match_result_submissions')
          .update({ status: "confirmed", confirmed_by: user.id, confirmed_at: new Date().toISOString() })
          .in('id', subIds);
        // Finalize match (will update bracket with processMatchResults)
        if (match.tournament_id) {
          await processMatchResults(
            {
              matchId: match.id,
              winnerId,
              loserId: winnerId === match.team1_id ? match.team2_id : match.team1_id,
              tournamentId: match.tournament_id,
              scoreTeam1: score_team1,
              scoreTeam2: score_team2,
            }
          );
        }
        toast({
          title: "Score Confirmed and Match Finalized",
          description: "Both captains submitted the same result. The match is now complete and bracket advanced."
        });
      } else {
        toast({
          title: "Score Submitted",
          description: "Your result was recorded. Awaiting confirmation by opposing captain.",
        });
      }

      setOpen(false);
      onScoreSubmitted();
    } catch (err: any) {
      toast({
        title: "Error submitting score",
        description: err.message,
        variant: "destructive"
      });
    }
    setLoading(false);
  }

  // UI: Only captains or admins can submit
  if (!isCaptain && !isAdmin) {
    return (
      <Card className="bg-slate-800 border-slate-700">
        <CardContent className="p-4 text-center">
          <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-yellow-500" />
          <p className="text-slate-400">Only team captains or admins can submit match results</p>
        </CardContent>
        <CardContent>
          <MatchResultHistory matchId={match.id} team1Name={team1Name} team2Name={team2Name} />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Trophy className="w-5 h-5" />
            {isAdmin ? "Admin Submit Match Results" : "Submit Match Results"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Button
            className="w-full bg-amber-600 hover:bg-amber-700"
            onClick={() => setOpen(true)}
          >
            <Target className="w-4 h-4 mr-2" />
            {isAdmin ? "Submit Result (Admin)" : "Submit Result"}
          </Button>
        </CardContent>
        <CardContent>
          <MatchResultHistory matchId={match.id} team1Name={team1Name} team2Name={team2Name} />
        </CardContent>
      </Card>
      {/* Modal for result entry */}
      <MatchEditModal
        open={open}
        match={modalData || matchEditModalData}
        actionMatchId={loading ? "pending" : null}
        onChange={data => setModalData(data)}
        onCancel={() => { setOpen(false); setModalData(null); }}
        onSave={handleModalSave}
      />
    </div>
  );
};

export default ScoreReporting;
