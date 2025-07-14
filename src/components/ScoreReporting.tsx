
import React, { useState, useMemo } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, Target, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useEnhancedNotifications } from "@/hooks/useEnhancedNotifications";
// Database RPC functions handle bracket progression now
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
  const { user } = useAuth();
  const { toast } = useToast();
  const notifications = useEnhancedNotifications();

  const [isCaptain, setIsCaptain] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  // Captain modal state
  const [openCap, setOpenCap] = useState(false);
  const [modalDataCap, setModalDataCap] = useState<any>(null);
  const [loadingCap, setLoadingCap] = useState(false);

  // Admin modal state
  const [openAdmin, setOpenAdmin] = useState(false);
  const [modalDataAdmin, setModalDataAdmin] = useState<any>(null);
  const [loadingAdmin, setLoadingAdmin] = useState(false);

  React.useEffect(() => {
    let ok = true;
    (async () => {
      if (!user || !match.id) return;
      if (match.team1_id || match.team2_id) {
        const { data } = await supabase.from('team_members')
          .select('is_captain')
          .eq('user_id', user.id)
          .in('team_id', [match.team1_id, match.team2_id].filter(Boolean))
          .maybeSingle();
        setIsCaptain(!!(data && data.is_captain));
      }
      const { data: adm } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .maybeSingle();
      setIsAdmin(adm?.role === "admin");
    })();
    return () => { ok = false; };
  }, [user, match.team1_id, match.team2_id, match.id]);

  const team1Name = match.team1?.name || "Team 1";
  const team2Name = match.team2?.name || "Team 2";

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

  // Captain submission handler using unified service
  async function handleCaptainSave({ status, score_team1, score_team2, winner_id }: any) {
    setLoadingCap(true);
    try {
      if (score_team1 === score_team2) {
        toast({
          title: "Score tie not allowed",
          description: "Scores cannot be tied.",
          variant: "destructive"
        });
        setLoadingCap(false); return;
      }
      let winnerId = winner_id;
      if (!winnerId) {
        winnerId = score_team1 > score_team2 ? match.team1_id : match.team2_id;
      }
      
      // Store submission for captain confirmation flow
      await supabase.from('match_result_submissions').insert({
        match_id: match.id,
        score_team1, score_team2,
        winner_id: winnerId,
        submitted_by: user.id,
        status: "pending"
      });
      
      // Check for matching submissions
      const { data: allSubs } = await supabase
        .from('match_result_submissions')
        .select('*')
        .eq('match_id', match.id)
        .order('submitted_at', { ascending: true });

      const matchingSubs = allSubs?.filter(
        sub => sub.score_team1 === score_team1
          && sub.score_team2 === score_team2
          && sub.winner_id === winnerId
          && sub.status === "pending"
      ) ?? [];
      
      if (matchingSubs.length >= 2) {
        // Both captains agree - confirm and process using unified service
        const subIds = matchingSubs.slice(0, 2).map(sub => sub.id);
        await supabase.from('match_result_submissions')
          .update({ status: "confirmed", confirmed_by: user.id, confirmed_at: new Date().toISOString() })
          .in('id', subIds);
          
        if (match.tournament_id) {
          console.log('🏆 Using database RPC for captain-confirmed result');
          const loserId = winnerId === match.team1_id ? match.team2_id : match.team1_id;
          
          const { data: advancementResult, error: advancementError } = await supabase.rpc('advance_match_winner_secure', {
            p_match_id: match.id,
            p_winner_id: winnerId,
            p_loser_id: loserId,
            p_tournament_id: match.tournament_id,
            p_score_team1: score_team1,
            p_score_team2: score_team2
          });

          if (advancementError) {
            throw new Error(`Match advancement failed: ${advancementError.message}`);
          }

          const result = advancementResult as { success: boolean; error?: string };
          if (!result.success) {
            throw new Error(result.error || 'Failed to advance match winner');
          }
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
      setOpenCap(false);
      setModalDataCap(null);
      onScoreSubmitted();
    } catch (err: any) {
      toast({
        title: "Error submitting score",
        description: err.message,
        variant: "destructive"
      });
    }
    setLoadingCap(false);
  }

  // Admin force-save handler using unified service
  async function handleAdminSave({ status, score_team1, score_team2, winner_id }: any) {
    setLoadingAdmin(true);
    try {
      if (score_team1 === score_team2) {
        toast({
          title: "Score tie not allowed",
          description: "Scores cannot be tied.",
          variant: "destructive"
        });
        setLoadingAdmin(false); return;
      }
      let winnerId = winner_id;
      if (!winnerId) {
        winnerId = score_team1 > score_team2 ? match.team1_id : match.team2_id;
      }
      
      // Admin override - store confirmed submission
      await supabase.from('match_result_submissions').insert({
        match_id: match.id,
        score_team1, score_team2,
        winner_id: winnerId,
        submitted_by: user.id,
        status: "confirmed",
        confirmed_by: user.id,
        confirmed_at: new Date().toISOString(),
      });
      
      if (match.tournament_id) {
        console.log('🏆 Using database RPC for admin override');
        const loserId = winnerId === match.team1_id ? match.team2_id : match.team1_id;
        
        const { data: advancementResult, error: advancementError } = await supabase.rpc('advance_match_winner_secure', {
          p_match_id: match.id,
          p_winner_id: winnerId,
          p_loser_id: loserId,
          p_tournament_id: match.tournament_id,
          p_score_team1: score_team1,
          p_score_team2: score_team2
        });

        if (advancementError) {
          throw new Error(`Match advancement failed: ${advancementError.message}`);
        }

        const result = advancementResult as { success: boolean; error?: string };
        if (!result.success) {
          throw new Error(result.error || 'Failed to advance match winner');
        }
      }
      
      toast({
        title: "Admin: Match Overridden & Finalized",
        description: "You forced this match result as admin. Audit record has been stored.",
      });
      setOpenAdmin(false);
      setModalDataAdmin(null);
      onScoreSubmitted();
    } catch (err: any) {
      toast({
        title: "Error forcing score",
        description: err.message,
        variant: "destructive"
      });
    }
    setLoadingAdmin(false);
  }

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
    <div className="space-y-6">
      {isCaptain && (
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Trophy className="w-5 h-5" />
              {isAdmin
                ? "Captain Submit Match Results (Normal Flow)"
                : "Submit Match Results"}
            </CardTitle>
            <div className="mt-1">
              <Badge className="bg-blue-800">{isAdmin ? "You are both captain & admin" : "Team Captain"}</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <Button
              className="w-full bg-amber-600 hover:bg-amber-700"
              onClick={() => setOpenCap(true)}
            >
              <Target className="w-4 h-4 mr-2" />
              Submit Result (Captain)
            </Button>
          </CardContent>
          <CardContent>
            <MatchResultHistory matchId={match.id} team1Name={team1Name} team2Name={team2Name} />
          </CardContent>
          <MatchEditModal
            open={openCap}
            match={modalDataCap || matchEditModalData}
            actionMatchId={loadingCap ? "pending" : null}
            onChange={data => setModalDataCap(data)}
            onCancel={() => { setOpenCap(false); setModalDataCap(null); }}
            onSave={handleCaptainSave}
          />
        </Card>
      )}

      {isAdmin && (
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Trophy className="w-5 h-5" />
              Admin Submit Match Results
            </CardTitle>
            {isCaptain && (
              <div className="mt-1">
                <Badge className="bg-green-800">Admin Override</Badge>
              </div>
            )}
          </CardHeader>
          <CardContent>
            <Button
              className="w-full bg-red-700 hover:bg-red-800"
              onClick={() => setOpenAdmin(true)}
            >
              <Target className="w-4 h-4 mr-2" />
              Submit Result (Admin Override)
            </Button>
          </CardContent>
          <CardContent>
            <MatchResultHistory matchId={match.id} team1Name={team1Name} team2Name={team2Name} />
          </CardContent>
          <MatchEditModal
            open={openAdmin}
            match={modalDataAdmin || matchEditModalData}
            actionMatchId={loadingAdmin ? "pending" : null}
            onChange={data => setModalDataAdmin(data)}
            onCancel={() => { setOpenAdmin(false); setModalDataAdmin(null); }}
            onSave={handleAdminSave}
          />
        </Card>
      )}
    </div>
  );
};

export default ScoreReporting;
