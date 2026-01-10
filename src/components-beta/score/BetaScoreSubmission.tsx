import { useState, useEffect } from "react";
import { GlassCard, BetaButton, BetaBadge } from "@/components-beta/ui-beta";
import { 
  Trophy, CheckCircle, Clock, AlertTriangle, 
  Send, Loader2, XCircle, Shield
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useEnhancedNotifications } from "@/hooks/useEnhancedNotifications";

interface BetaScoreSubmissionProps {
  matchId: string;
  team1Id: string;
  team2Id: string;
  team1Name: string;
  team2Name: string;
  currentScore1?: number;
  currentScore2?: number;
  matchStatus: string;
  userTeamId?: string;
  tournamentId?: string;
}

interface PendingSubmission {
  id: string;
  score_team1: number;
  score_team2: number;
  winner_id: string | null;
  submitted_by: string;
  status: string;
  created_at: string;
}

/**
 * BetaScoreSubmission - Captain-facing score reporting component
 * 
 * Allows team captains to:
 * - Submit match scores
 * - View pending submissions
 * - Confirm opponent's submission
 */
export const BetaScoreSubmission = ({
  matchId,
  team1Id,
  team2Id,
  team1Name,
  team2Name,
  currentScore1 = 0,
  currentScore2 = 0,
  matchStatus,
  userTeamId,
  tournamentId,
}: BetaScoreSubmissionProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { notifyScoreConfirmationNeeded, notifyMatchComplete } = useEnhancedNotifications();
  
  const [score1, setScore1] = useState(currentScore1);
  const [score2, setScore2] = useState(currentScore2);
  const [submitting, setSubmitting] = useState(false);
  const [pendingSubmission, setPendingSubmission] = useState<PendingSubmission | null>(null);
  const [loading, setLoading] = useState(true);

  const isTeam1 = userTeamId === team1Id;
  const isTeam2 = userTeamId === team2Id;
  const canSubmit = (isTeam1 || isTeam2) && matchStatus !== 'completed';

  // Fetch pending submissions
  useEffect(() => {
    const fetchPendingSubmission = async () => {
      try {
        const { data } = await supabase
          .from('match_result_submissions')
          .select('*')
          .eq('match_id', matchId)
          .eq('status', 'pending')
          .order('submitted_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        setPendingSubmission(data);
      } catch (error) {
        console.error('Error fetching pending submission:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPendingSubmission();

    // Subscribe to changes
    const channel = supabase
      .channel(`score-submissions:${matchId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'match_result_submissions',
          filter: `match_id=eq.${matchId}`,
        },
        () => {
          fetchPendingSubmission();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [matchId]);

  const handleSubmit = async () => {
    if (!user || !canSubmit) return;

    setSubmitting(true);
    try {
      const winnerId = score1 > score2 ? team1Id : score2 > score1 ? team2Id : null;

      const { error } = await supabase.from('match_result_submissions').insert({
        match_id: matchId,
        submitted_by: user.id,
        score_team1: score1,
        score_team2: score2,
        winner_id: winnerId,
        status: 'pending',
      });

      if (error) throw error;

      // Notify opponent team captain about score submission
      const opponentTeamId = isTeam1 ? team2Id : team1Id;
      const myTeamName = isTeam1 ? team1Name : team2Name;
      
      await notifyScoreConfirmationNeeded(matchId, opponentTeamId, myTeamName, tournamentId);

      toast({ 
        title: "Score Submitted", 
        description: "Waiting for opponent confirmation" 
      });
    } catch (error: any) {
      toast({ 
        title: "Submission Failed", 
        description: error.message, 
        variant: "destructive" 
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirm = async () => {
    if (!pendingSubmission || !user) return;

    setSubmitting(true);
    try {
      // Update submission status
      const { error: submissionError } = await supabase
        .from('match_result_submissions')
        .update({ 
          status: 'confirmed',
          confirmed_by: user.id,
          confirmed_at: new Date().toISOString(),
        })
        .eq('id', pendingSubmission.id);

      if (submissionError) throw submissionError;

      // Update match result
      const { error: matchError } = await supabase
        .from('matches')
        .update({
          score_team1: pendingSubmission.score_team1,
          score_team2: pendingSubmission.score_team2,
          winner_id: pendingSubmission.winner_id,
          status: 'completed',
          completed_at: new Date().toISOString(),
        })
        .eq('id', matchId);

      if (matchError) throw matchError;

      // Notify both teams about match completion
      if (pendingSubmission.winner_id) {
        const loserId = pendingSubmission.winner_id === team1Id ? team2Id : team1Id;
        await notifyMatchComplete(matchId, pendingSubmission.winner_id, loserId);
      }

      toast({ 
        title: "Score Confirmed", 
        description: "Match result has been recorded" 
      });
    } catch (error: any) {
      toast({ 
        title: "Confirmation Failed", 
        description: error.message, 
        variant: "destructive" 
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDispute = async () => {
    if (!pendingSubmission) return;

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('match_result_submissions')
        .update({ status: 'disputed' })
        .eq('id', pendingSubmission.id);

      if (error) throw error;

      toast({ 
        title: "Score Disputed", 
        description: "An admin will review the submission" 
      });
    } catch (error: any) {
      toast({ 
        title: "Error", 
        description: error.message, 
        variant: "destructive" 
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <GlassCard className="p-4">
        <div className="flex items-center gap-2 text-[hsl(var(--beta-text-muted))]">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Loading score submission...</span>
        </div>
      </GlassCard>
    );
  }

  if (matchStatus === 'completed') {
    return (
      <GlassCard className="p-4">
        <div className="flex items-center gap-3 text-[hsl(var(--beta-success))]">
          <CheckCircle className="w-5 h-5" />
          <span className="font-medium">Match Completed</span>
        </div>
        <div className="mt-3 flex items-center justify-center gap-4 text-2xl font-bold">
          <div className="text-center">
            <p className="text-sm text-[hsl(var(--beta-text-muted))] mb-1">{team1Name}</p>
            <span className="text-[hsl(var(--beta-text-primary))]">{currentScore1}</span>
          </div>
          <span className="text-[hsl(var(--beta-text-muted))]">-</span>
          <div className="text-center">
            <p className="text-sm text-[hsl(var(--beta-text-muted))] mb-1">{team2Name}</p>
            <span className="text-[hsl(var(--beta-text-primary))]">{currentScore2}</span>
          </div>
        </div>
      </GlassCard>
    );
  }

  // Show pending submission for confirmation
  if (pendingSubmission && pendingSubmission.submitted_by !== user?.id) {
    return (
      <GlassCard className="p-4">
        <div className="flex items-center gap-2 mb-4">
          <Clock className="w-5 h-5 text-[hsl(var(--beta-warning))]" />
          <h4 className="font-semibold text-[hsl(var(--beta-text-primary))]">
            Pending Score Confirmation
          </h4>
        </div>

        <div className="p-4 rounded-lg bg-[hsl(var(--beta-surface-3))] mb-4">
          <p className="text-sm text-[hsl(var(--beta-text-muted))] mb-2">
            Opponent submitted score:
          </p>
          <div className="flex items-center justify-center gap-4 text-xl font-bold">
            <div className="text-center">
              <p className="text-xs text-[hsl(var(--beta-text-muted))]">{team1Name}</p>
              <span className="text-[hsl(var(--beta-text-primary))]">{pendingSubmission.score_team1}</span>
            </div>
            <span className="text-[hsl(var(--beta-text-muted))]">-</span>
            <div className="text-center">
              <p className="text-xs text-[hsl(var(--beta-text-muted))]">{team2Name}</p>
              <span className="text-[hsl(var(--beta-text-primary))]">{pendingSubmission.score_team2}</span>
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          <BetaButton 
            onClick={handleConfirm} 
            disabled={submitting}
            className="flex-1"
          >
            <CheckCircle className="w-4 h-4 mr-2" />
            Confirm Score
          </BetaButton>
          <BetaButton 
            variant="outline" 
            onClick={handleDispute} 
            disabled={submitting}
            className="border-[hsl(var(--beta-error))] text-[hsl(var(--beta-error))]"
          >
            <XCircle className="w-4 h-4 mr-2" />
            Dispute
          </BetaButton>
        </div>
      </GlassCard>
    );
  }

  // Show waiting state if user already submitted
  if (pendingSubmission && pendingSubmission.submitted_by === user?.id) {
    return (
      <GlassCard className="p-4">
        <div className="flex items-center gap-2 mb-4">
          <Clock className="w-5 h-5 text-[hsl(var(--beta-warning))]" />
          <h4 className="font-semibold text-[hsl(var(--beta-text-primary))]">
            Awaiting Confirmation
          </h4>
        </div>

        <div className="p-4 rounded-lg bg-[hsl(var(--beta-surface-3))] mb-4">
          <p className="text-sm text-[hsl(var(--beta-text-muted))] mb-2">
            Your submitted score:
          </p>
          <div className="flex items-center justify-center gap-4 text-xl font-bold">
            <div className="text-center">
              <p className="text-xs text-[hsl(var(--beta-text-muted))]">{team1Name}</p>
              <span className="text-[hsl(var(--beta-text-primary))]">{pendingSubmission.score_team1}</span>
            </div>
            <span className="text-[hsl(var(--beta-text-muted))]">-</span>
            <div className="text-center">
              <p className="text-xs text-[hsl(var(--beta-text-muted))]">{team2Name}</p>
              <span className="text-[hsl(var(--beta-text-primary))]">{pendingSubmission.score_team2}</span>
            </div>
          </div>
        </div>

        <p className="text-sm text-[hsl(var(--beta-text-muted))] text-center">
          Waiting for opponent to confirm...
        </p>
      </GlassCard>
    );
  }

  // Show submission form
  if (!canSubmit) {
    return (
      <GlassCard className="p-4">
        <div className="flex items-center gap-2 text-[hsl(var(--beta-text-muted))]">
          <Shield className="w-5 h-5" />
          <span>Only team captains can submit scores</span>
        </div>
      </GlassCard>
    );
  }

  return (
    <GlassCard className="p-4">
      <div className="flex items-center gap-2 mb-4">
        <Trophy className="w-5 h-5 text-[hsl(var(--beta-accent))]" />
        <h4 className="font-semibold text-[hsl(var(--beta-text-primary))]">
          Submit Match Score
        </h4>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-sm text-[hsl(var(--beta-text-muted))] mb-2">
            {team1Name} {isTeam1 && <BetaBadge variant="accent" size="sm">Your Team</BetaBadge>}
          </label>
          <input
            type="number"
            min="0"
            max="99"
            value={score1}
            onChange={(e) => setScore1(Math.max(0, parseInt(e.target.value) || 0))}
            className="w-full px-4 py-3 rounded-lg bg-[hsl(var(--beta-surface-4))] border border-[hsl(var(--beta-border))] text-[hsl(var(--beta-text-primary))] text-center text-2xl font-bold focus:outline-none focus:ring-2 focus:ring-[hsl(var(--beta-accent))]"
          />
        </div>
        <div>
          <label className="block text-sm text-[hsl(var(--beta-text-muted))] mb-2">
            {team2Name} {isTeam2 && <BetaBadge variant="accent" size="sm">Your Team</BetaBadge>}
          </label>
          <input
            type="number"
            min="0"
            max="99"
            value={score2}
            onChange={(e) => setScore2(Math.max(0, parseInt(e.target.value) || 0))}
            className="w-full px-4 py-3 rounded-lg bg-[hsl(var(--beta-surface-4))] border border-[hsl(var(--beta-border))] text-[hsl(var(--beta-text-primary))] text-center text-2xl font-bold focus:outline-none focus:ring-2 focus:ring-[hsl(var(--beta-accent))]"
          />
        </div>
      </div>

      {score1 === score2 && (
        <div className="flex items-center gap-2 mb-4 p-2 rounded-lg bg-[hsl(var(--beta-warning)/0.2)] text-[hsl(var(--beta-warning))] text-sm">
          <AlertTriangle className="w-4 h-4" />
          <span>Draw scores are not typical - please verify</span>
        </div>
      )}

      <BetaButton 
        onClick={handleSubmit} 
        disabled={submitting}
        className="w-full"
      >
        {submitting ? (
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
        ) : (
          <Send className="w-4 h-4 mr-2" />
        )}
        Submit Score
      </BetaButton>

      <p className="text-xs text-[hsl(var(--beta-text-muted))] text-center mt-3">
        Opponent must confirm the score to finalize the result
      </p>
    </GlassCard>
  );
};