import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

export type DisputeStatus = 'open' | 'under_review' | 'resolved' | 'rejected';

export interface MatchDispute {
  id: string;
  match_id: string;
  tournament_id: string;
  raised_by: string;
  raised_by_team: string;
  reason: string;
  evidence_urls: string[];
  status: DisputeStatus;
  admin_notes: string | null;
  resolved_by: string | null;
  resolved_at: string | null;
  resolution: string | null;
  created_at: string;
  // Joined data
  matches?: {
    id: string;
    match_number: number;
    round_number: number;
    team1_id: string;
    team2_id: string;
    score_team1: number;
    score_team2: number;
    status: string;
  };
  users?: {
    discord_username: string;
  };
  persistent_teams?: {
    name: string;
  };
}

export interface RaiseDisputeParams {
  matchId: string;
  tournamentId: string;
  teamId: string;
  reason: string;
  evidenceUrls?: string[];
}

export interface ResolveDisputeParams {
  disputeId: string;
  resolution: string;
  status: 'resolved' | 'rejected';
  adminNotes?: string;
}

export const useMatchDisputes = (tournamentId?: string, matchId?: string) => {
  const { user, isAdmin } = useAuth();
  const { toast } = useToast();
  const [disputes, setDisputes] = useState<MatchDispute[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const fetchDisputes = useCallback(async () => {
    if (!tournamentId && !matchId) {
      setLoading(false);
      return;
    }

    try {
      let query = supabase
        .from('match_disputes')
        .select(`
          *,
          matches (
            id,
            match_number,
            round_number,
            team1_id,
            team2_id,
            score_team1,
            score_team2,
            status
          )
        `)
        .order('created_at', { ascending: false });

      if (tournamentId) {
        query = query.eq('tournament_id', tournamentId);
      }
      if (matchId) {
        query = query.eq('match_id', matchId);
      }

      const { data, error } = await query;
      
      if (error) throw error;
      setDisputes((data || []) as MatchDispute[]);
    } catch (error) {
      console.error('Error fetching disputes:', error);
      setDisputes([]);
    } finally {
      setLoading(false);
    }
  }, [tournamentId, matchId]);

  useEffect(() => {
    fetchDisputes();
  }, [fetchDisputes]);

  // Real-time subscription
  useEffect(() => {
    if (!tournamentId && !matchId) return;

    const channel = supabase
      .channel(`disputes:${tournamentId || matchId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'match_disputes',
          filter: tournamentId ? `tournament_id=eq.${tournamentId}` : `match_id=eq.${matchId}`,
        },
        () => {
          fetchDisputes();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tournamentId, matchId, fetchDisputes]);

  const raiseDispute = async (params: RaiseDisputeParams): Promise<boolean> => {
    if (!user) {
      toast({ title: "Error", description: "You must be logged in", variant: "destructive" });
      return false;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.from('match_disputes').insert({
        match_id: params.matchId,
        tournament_id: params.tournamentId,
        raised_by: user.id,
        raised_by_team: params.teamId,
        reason: params.reason,
        evidence_urls: params.evidenceUrls || [],
        status: 'open',
      });

      if (error) throw error;

      toast({ title: "Dispute Raised", description: "Your dispute has been submitted for review" });
      await fetchDisputes();
      return true;
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return false;
    } finally {
      setSubmitting(false);
    }
  };

  const updateDisputeStatus = async (disputeId: string, status: DisputeStatus): Promise<boolean> => {
    if (!isAdmin) {
      toast({ title: "Error", description: "Only admins can update dispute status", variant: "destructive" });
      return false;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('match_disputes')
        .update({ status })
        .eq('id', disputeId);

      if (error) throw error;

      toast({ title: "Success", description: `Dispute marked as ${status}` });
      await fetchDisputes();
      return true;
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return false;
    } finally {
      setSubmitting(false);
    }
  };

  const resolveDispute = async (params: ResolveDisputeParams): Promise<boolean> => {
    if (!isAdmin || !user) {
      toast({ title: "Error", description: "Only admins can resolve disputes", variant: "destructive" });
      return false;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('match_disputes')
        .update({
          status: params.status,
          resolution: params.resolution,
          admin_notes: params.adminNotes || null,
          resolved_by: user.id,
          resolved_at: new Date().toISOString(),
        })
        .eq('id', params.disputeId);

      if (error) throw error;

      toast({ 
        title: "Dispute Resolved", 
        description: `The dispute has been ${params.status}` 
      });
      await fetchDisputes();
      return true;
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return false;
    } finally {
      setSubmitting(false);
    }
  };

  const getDisputesForMatch = (matchId: string) => {
    return disputes.filter(d => d.match_id === matchId);
  };

  const getOpenDisputes = () => {
    return disputes.filter(d => d.status === 'open' || d.status === 'under_review');
  };

  return {
    disputes,
    loading,
    submitting,
    raiseDispute,
    updateDisputeStatus,
    resolveDispute,
    getDisputesForMatch,
    getOpenDisputes,
    refetch: fetchDisputes,
  };
};
