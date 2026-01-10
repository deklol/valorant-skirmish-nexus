import { useState, useEffect } from "react";
import { GlassCard, BetaButton, BetaBadge } from "@/components-beta/ui-beta";
import { 
  Wrench, Trophy, RotateCcw, ArrowRight, CheckCircle, AlertTriangle,
  ChevronRight, History, Undo, XCircle, Play, Shield
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Match {
  id: string;
  round_number: number;
  match_number: number;
  status: string;
  score_team1: number | null;
  score_team2: number | null;
  winner_id: string | null;
  team1: { id: string; name: string } | null;
  team2: { id: string; name: string } | null;
}

type RepairAction = 'change_winner' | 'reset_match' | 'force_advance' | 'dq_team';

interface BetaBracketRepairToolProps {
  tournamentId: string;
  onRepairComplete?: () => void;
}

export const BetaBracketRepairTool = ({ tournamentId, onRepairComplete }: BetaBracketRepairToolProps) => {
  const { toast } = useToast();
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [selectedAction, setSelectedAction] = useState<RepairAction | null>(null);
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [actionHistory, setActionHistory] = useState<{ action: string; match: string; time: Date }[]>([]);

  // Wizard steps
  const [step, setStep] = useState<1 | 2 | 3>(1);

  useEffect(() => {
    fetchMatches();
  }, [tournamentId]);

  const fetchMatches = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('matches')
        .select(`
          id, round_number, match_number, status, score_team1, score_team2, winner_id,
          team1:teams!matches_team1_id_fkey (id, name),
          team2:teams!matches_team2_id_fkey (id, name)
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

  const actions: { id: RepairAction; label: string; description: string; icon: React.ReactNode; variant: 'default' | 'warning' | 'danger' }[] = [
    { 
      id: 'change_winner', 
      label: 'Change Winner', 
      description: 'Select a different team as the winner',
      icon: <Trophy className="w-5 h-5" />,
      variant: 'default'
    },
    { 
      id: 'reset_match', 
      label: 'Reset Match', 
      description: 'Clear result and revert to pending',
      icon: <RotateCcw className="w-5 h-5" />,
      variant: 'warning'
    },
    { 
      id: 'force_advance', 
      label: 'Force Advance', 
      description: 'Manually push a team to the next round',
      icon: <ArrowRight className="w-5 h-5" />,
      variant: 'default'
    },
    { 
      id: 'dq_team', 
      label: 'DQ Team', 
      description: 'Disqualify team and advance opponent',
      icon: <XCircle className="w-5 h-5" />,
      variant: 'danger'
    },
  ];

  const handleSelectMatch = (match: Match) => {
    setSelectedMatch(match);
    setSelectedAction(null);
    setSelectedTeam(null);
    setStep(2);
  };

  const handleSelectAction = (action: RepairAction) => {
    setSelectedAction(action);
    setSelectedTeam(null);
    
    // For some actions, we need to pick a team
    if (action === 'change_winner' || action === 'force_advance' || action === 'dq_team') {
      setStep(3);
    } else {
      // Reset doesn't need team selection
      setShowConfirmDialog(true);
    }
  };

  const handleSelectTeam = (teamId: string) => {
    setSelectedTeam(teamId);
    setShowConfirmDialog(true);
  };

  const getConfirmationMessage = () => {
    if (!selectedMatch || !selectedAction) return '';
    
    const teamName = selectedTeam 
      ? (selectedMatch.team1?.id === selectedTeam ? selectedMatch.team1.name : selectedMatch.team2?.name)
      : null;

    switch (selectedAction) {
      case 'change_winner':
        return `Change winner of R${selectedMatch.round_number} M${selectedMatch.match_number} to ${teamName}. This will update bracket progression.`;
      case 'reset_match':
        return `Reset R${selectedMatch.round_number} M${selectedMatch.match_number} to pending. This will clear the result and may affect subsequent matches.`;
      case 'force_advance':
        return `Force ${teamName} to advance from R${selectedMatch.round_number} M${selectedMatch.match_number}.`;
      case 'dq_team':
        return `Disqualify ${teamName}. Their opponent will automatically advance.`;
      default:
        return '';
    }
  };

  const executeAction = async () => {
    if (!selectedMatch || !selectedAction) return;
    
    setProcessing(true);
    try {
      let result;
      
      const loserId = selectedTeam === selectedMatch.team1?.id ? selectedMatch.team2?.id : selectedMatch.team1?.id;
      
      switch (selectedAction) {
        case 'change_winner':
          if (!selectedTeam || !loserId) throw new Error('No team selected');
          result = await supabase.rpc('advance_match_winner_secure', {
            p_match_id: selectedMatch.id,
            p_tournament_id: tournamentId,
            p_winner_id: selectedTeam,
            p_loser_id: loserId,
            p_score_team1: selectedMatch.team1?.id === selectedTeam ? 1 : 0,
            p_score_team2: selectedMatch.team2?.id === selectedTeam ? 1 : 0,
          });
          break;
          
        case 'reset_match':
          result = await supabase.rpc('rollback_match_result', {
            p_match_id: selectedMatch.id,
          });
          break;
          
        case 'force_advance':
          if (!selectedTeam || !loserId) throw new Error('No team selected');
          result = await supabase.rpc('advance_match_winner_secure', {
            p_match_id: selectedMatch.id,
            p_tournament_id: tournamentId,
            p_winner_id: selectedTeam,
            p_loser_id: loserId,
            p_score_team1: 1,
            p_score_team2: 0,
          });
          break;
          
        case 'dq_team':
          if (!selectedTeam) throw new Error('No team selected');
          const winnerId = selectedMatch.team1?.id === selectedTeam 
            ? selectedMatch.team2?.id 
            : selectedMatch.team1?.id;
          const dqLoserId = selectedTeam;
          if (!winnerId) throw new Error('Cannot determine opponent');
          result = await supabase.rpc('advance_match_winner_secure', {
            p_match_id: selectedMatch.id,
            p_tournament_id: tournamentId,
            p_winner_id: winnerId,
            p_loser_id: dqLoserId,
            p_score_team1: selectedMatch.team1?.id === winnerId ? 1 : 0,
            p_score_team2: selectedMatch.team2?.id === winnerId ? 1 : 0,
          });
          break;
      }

      if (result?.error) throw result.error;

      // Log action
      setActionHistory([
        { 
          action: selectedAction, 
          match: `R${selectedMatch.round_number} M${selectedMatch.match_number}`,
          time: new Date() 
        },
        ...actionHistory.slice(0, 9)
      ]);

      toast({ title: "Action completed", description: "Bracket has been updated" });
      await fetchMatches();
      onRepairComplete?.();
      
      // Reset wizard
      setStep(1);
      setSelectedMatch(null);
      setSelectedAction(null);
      setSelectedTeam(null);
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setProcessing(false);
      setShowConfirmDialog(false);
    }
  };

  const resetWizard = () => {
    setStep(1);
    setSelectedMatch(null);
    setSelectedAction(null);
    setSelectedTeam(null);
  };

  const maxRounds = Math.max(...matches.map(m => m.round_number), 0);

  const getRoundName = (round: number) => {
    if (round === maxRounds) return "Final";
    if (round === maxRounds - 1) return "Semi-Final";
    if (round === maxRounds - 2) return "Quarter-Final";
    return `Round ${round}`;
  };

  if (loading) {
    return (
      <GlassCard className="p-8">
        <div className="flex items-center justify-center">
          <Wrench className="w-8 h-8 text-[hsl(var(--beta-accent))] animate-pulse" />
        </div>
      </GlassCard>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Main Wizard */}
      <div className="lg:col-span-2">
        <GlassCard className="p-6">
          {/* Progress Indicator */}
          <div className="flex items-center gap-2 mb-6">
            {[1, 2, 3].map((s) => (
              <div key={s} className="flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                  step >= s 
                    ? 'bg-[hsl(var(--beta-accent))] text-[hsl(var(--beta-surface-1))]' 
                    : 'bg-[hsl(var(--beta-surface-4))] text-[hsl(var(--beta-text-muted))]'
                }`}>
                  {s}
                </div>
                {s < 3 && (
                  <ChevronRight className={`w-4 h-4 mx-2 ${
                    step > s ? 'text-[hsl(var(--beta-accent))]' : 'text-[hsl(var(--beta-text-muted))]'
                  }`} />
                )}
              </div>
            ))}
            <div className="flex-1" />
            {step > 1 && (
              <BetaButton variant="ghost" size="sm" onClick={resetWizard}>
                <Undo className="w-4 h-4 mr-1" />
                Start Over
              </BetaButton>
            )}
          </div>

          {/* Step 1: Select Match */}
          {step === 1 && (
            <div>
              <h3 className="text-lg font-bold text-[hsl(var(--beta-text-primary))] mb-4">
                Step 1: Select a Match to Repair
              </h3>
              
              {matches.length === 0 ? (
                <div className="text-center py-8">
                  <Trophy className="w-12 h-12 text-[hsl(var(--beta-text-muted))] mx-auto mb-4" />
                  <p className="text-[hsl(var(--beta-text-muted))]">No matches in bracket yet</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {[...new Set(matches.map(m => m.round_number))].sort((a, b) => a - b).map(round => (
                    <div key={round}>
                      <h4 className="text-sm font-medium text-[hsl(var(--beta-text-muted))] mb-2">
                        {getRoundName(round)}
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {matches.filter(m => m.round_number === round).map(match => (
                          <button
                            key={match.id}
                            onClick={() => handleSelectMatch(match)}
                            className="p-4 rounded-lg bg-[hsl(var(--beta-surface-3))] border border-[hsl(var(--beta-border))] hover:border-[hsl(var(--beta-accent))] transition-all text-left"
                          >
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-xs text-[hsl(var(--beta-text-muted))]">Match {match.match_number}</span>
                              <BetaBadge 
                                variant={match.status === 'completed' ? 'success' : match.status === 'live' ? 'accent' : 'default'} 
                                size="sm"
                              >
                                {match.status}
                              </BetaBadge>
                            </div>
                            <div className="space-y-1">
                              <div className={`text-sm ${match.winner_id === match.team1?.id ? 'text-[hsl(var(--beta-accent))] font-bold' : 'text-[hsl(var(--beta-text-primary))]'}`}>
                                {match.team1?.name || 'TBD'} {match.score_team1 !== null ? `(${match.score_team1})` : ''}
                              </div>
                              <div className={`text-sm ${match.winner_id === match.team2?.id ? 'text-[hsl(var(--beta-accent))] font-bold' : 'text-[hsl(var(--beta-text-primary))]'}`}>
                                {match.team2?.name || 'TBD'} {match.score_team2 !== null ? `(${match.score_team2})` : ''}
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Step 2: Choose Action */}
          {step === 2 && selectedMatch && (
            <div>
              <h3 className="text-lg font-bold text-[hsl(var(--beta-text-primary))] mb-2">
                Step 2: Choose Repair Action
              </h3>
              <p className="text-sm text-[hsl(var(--beta-text-muted))] mb-4">
                Selected: R{selectedMatch.round_number} M{selectedMatch.match_number} - {selectedMatch.team1?.name || 'TBD'} vs {selectedMatch.team2?.name || 'TBD'}
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {actions.map(action => (
                  <button
                    key={action.id}
                    onClick={() => handleSelectAction(action.id)}
                    className={`p-4 rounded-lg border text-left transition-all hover:border-[hsl(var(--beta-accent))] ${
                      action.variant === 'danger' 
                        ? 'bg-[hsl(var(--beta-error)/0.05)] border-[hsl(var(--beta-error)/0.2)]'
                        : action.variant === 'warning'
                        ? 'bg-[hsl(var(--beta-warning)/0.05)] border-[hsl(var(--beta-warning)/0.2)]'
                        : 'bg-[hsl(var(--beta-surface-3))] border-[hsl(var(--beta-border))]'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${
                        action.variant === 'danger' 
                          ? 'bg-[hsl(var(--beta-error)/0.1)] text-[hsl(var(--beta-error))]'
                          : action.variant === 'warning'
                          ? 'bg-[hsl(var(--beta-warning)/0.1)] text-[hsl(var(--beta-warning))]'
                          : 'bg-[hsl(var(--beta-accent-subtle))] text-[hsl(var(--beta-accent))]'
                      }`}>
                        {action.icon}
                      </div>
                      <div>
                        <p className="font-medium text-[hsl(var(--beta-text-primary))]">{action.label}</p>
                        <p className="text-xs text-[hsl(var(--beta-text-muted))]">{action.description}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 3: Select Team (if needed) */}
          {step === 3 && selectedMatch && selectedAction && (
            <div>
              <h3 className="text-lg font-bold text-[hsl(var(--beta-text-primary))] mb-2">
                Step 3: Select Team
              </h3>
              <p className="text-sm text-[hsl(var(--beta-text-muted))] mb-4">
                {selectedAction === 'dq_team' ? 'Which team should be disqualified?' : 'Which team should advance?'}
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {selectedMatch.team1 && (
                  <button
                    onClick={() => handleSelectTeam(selectedMatch.team1!.id)}
                    className="p-6 rounded-lg bg-[hsl(var(--beta-surface-3))] border border-[hsl(var(--beta-border))] hover:border-[hsl(var(--beta-accent))] transition-all"
                  >
                    <Shield className="w-8 h-8 text-[hsl(var(--beta-accent))] mx-auto mb-2" />
                    <p className="font-bold text-[hsl(var(--beta-text-primary))] text-center">{selectedMatch.team1.name}</p>
                  </button>
                )}
                {selectedMatch.team2 && (
                  <button
                    onClick={() => handleSelectTeam(selectedMatch.team2!.id)}
                    className="p-6 rounded-lg bg-[hsl(var(--beta-surface-3))] border border-[hsl(var(--beta-border))] hover:border-[hsl(var(--beta-accent))] transition-all"
                  >
                    <Shield className="w-8 h-8 text-[hsl(var(--beta-secondary))] mx-auto mb-2" />
                    <p className="font-bold text-[hsl(var(--beta-text-primary))] text-center">{selectedMatch.team2.name}</p>
                  </button>
                )}
              </div>
            </div>
          )}
        </GlassCard>
      </div>

      {/* Action History Sidebar */}
      <div>
        <GlassCard className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <History className="w-5 h-5 text-[hsl(var(--beta-accent))]" />
            <h3 className="font-bold text-[hsl(var(--beta-text-primary))]">Recent Actions</h3>
          </div>
          
          {actionHistory.length === 0 ? (
            <p className="text-sm text-[hsl(var(--beta-text-muted))] text-center py-4">
              No actions taken yet
            </p>
          ) : (
            <div className="space-y-2">
              {actionHistory.map((action, idx) => (
                <div key={idx} className="p-3 rounded-lg bg-[hsl(var(--beta-surface-3))] text-sm">
                  <p className="font-medium text-[hsl(var(--beta-text-primary))] capitalize">
                    {action.action.replace('_', ' ')}
                  </p>
                  <p className="text-xs text-[hsl(var(--beta-text-muted))]">
                    {action.match} • {action.time.toLocaleTimeString()}
                  </p>
                </div>
              ))}
            </div>
          )}
        </GlassCard>
      </div>

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent className="bg-[hsl(var(--beta-surface-2))] border-[hsl(var(--beta-border))]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[hsl(var(--beta-text-primary))] flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-[hsl(var(--beta-warning))]" />
              Confirm Bracket Repair
            </AlertDialogTitle>
            <AlertDialogDescription className="text-[hsl(var(--beta-text-muted))]">
              {getConfirmationMessage()}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-[hsl(var(--beta-surface-3))] text-[hsl(var(--beta-text-primary))] border-[hsl(var(--beta-border))]">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={executeAction}
              disabled={processing}
              className="bg-[hsl(var(--beta-accent))] text-[hsl(var(--beta-surface-1))]"
            >
              {processing ? 'Processing...' : 'Confirm'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default BetaBracketRepairTool;
