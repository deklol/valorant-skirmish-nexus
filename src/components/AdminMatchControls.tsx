
import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StandardInput } from "@/components/ui";
import { Label } from "@/components/ui/label";
import { AlertTriangle, Settings, Calendar, Trophy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import ScoreValidationDialog from "./ScoreValidationDialog";

interface AdminMatchControlsProps {
  match: any;
  onMatchUpdate: () => void;
}

const AdminMatchControls = ({ match, onMatchUpdate }: AdminMatchControlsProps) => {
  const [loading, setLoading] = useState(false);
  const [newStatus, setNewStatus] = useState(match.status);
  const [newScheduledTime, setNewScheduledTime] = useState(
    match.scheduled_time ? new Date(match.scheduled_time).toISOString().slice(0, 16) : ''
  );
  const [overrideScore1, setOverrideScore1] = useState(match.score_team1 || 0);
  const [overrideScore2, setOverrideScore2] = useState(match.score_team2 || 0);
  const [overrideWinner, setOverrideWinner] = useState(match.winner_id || '');
  const [showValidationDialog, setShowValidationDialog] = useState(false);
  const { toast } = useToast();

  const forceStatusChange = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('matches')
        .update({ status: newStatus })
        .eq('id', match.id);

      if (error) throw error;

      toast({
        title: "Match Status Updated",
        description: `Match status changed to ${newStatus}`,
      });

      onMatchUpdate();
    } catch (error) {
      console.error('Error updating match status:', error);
      toast({
        title: "Error",
        description: "Failed to update match status",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const rescheduleMatch = async () => {
    if (!newScheduledTime) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('matches')
        .update({ scheduled_time: new Date(newScheduledTime).toISOString() })
        .eq('id', match.id);

      if (error) throw error;

      toast({
        title: "Match Rescheduled",
        description: "Match time has been updated",
      });

      onMatchUpdate();
    } catch (error) {
      console.error('Error rescheduling match:', error);
      toast({
        title: "Error",
        description: "Failed to reschedule match",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleOverrideClick = () => {
    // Check for score inconsistencies before proceeding
    if (overrideScore1 !== overrideScore2 && match.team1 && match.team2) {
      const expectedWinnerId = overrideScore1 > overrideScore2 ? match.team1_id : match.team2_id;
      const hasInconsistency = overrideWinner && overrideWinner !== expectedWinnerId;
      
      if (hasInconsistency) {
        setShowValidationDialog(true);
        return;
      }
    }
    
    // No inconsistency, proceed directly
    overrideResults();
  };

  const overrideResults = async () => {
    setLoading(true);
    try {
      // If setting the match to 'completed', always use processMatchResults for bracket safety!
      const isWin = overrideWinner && overrideWinner.length > 0 && overrideScore1 !== overrideScore2;
      if (isWin && match.status !== 'completed') {
        // Infer which team lost by comparing against inputs
        let loserId = '';
        if (overrideWinner === match.team1_id) {
          loserId = match.team2_id;
        } else if (overrideWinner === match.team2_id) {
          loserId = match.team1_id;
        }
        // Use new processor (Bracket safe!)
        const processor = (await import('./MatchResultsProcessor')).processMatchResults;
        await processor({
          matchId: match.id,
          winnerId: overrideWinner,
          loserId,
          tournamentId: match.tournament_id,
          scoreTeam1: overrideScore1,
          scoreTeam2: overrideScore2,
          onComplete: onMatchUpdate,
        });
      } else {
        // Fallback: Just update scores (for ties or to clear winner)
        const updateData: any = {
          score_team1: overrideScore1,
          score_team2: overrideScore2,
          status: overrideScore1 !== overrideScore2 ? 'completed' : 'pending',
          winner_id: isWin ? overrideWinner : null,
        };
        await supabase
          .from('matches')
          .update(updateData)
          .eq('id', match.id);
        onMatchUpdate();
      }

      toast({
        title: "Match Results Overridden",
        description: "Match results have been updated (bracket-safely)",
      });
    } catch (error) {
      console.error('Error overriding match results:', error);
      toast({
        title: "Error",
        description: "Failed to override match results",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const initializeMapVeto = async () => {
    setLoading(true);
    try {
      // Create map veto session
      const { data: vetoSession, error: vetoError } = await supabase
        .from('map_veto_sessions')
        .insert({
          match_id: match.id,
          status: 'pending',
          current_turn_team_id: match.team1_id
        })
        .select()
        .single();

      if (vetoError) throw vetoError;

      toast({
        title: "Map Veto Initialized",
        description: "Map veto session has been created for this match",
      });

      onMatchUpdate();
    } catch (error) {
      console.error('Error initializing map veto:', error);
      toast({
        title: "Error",
        description: "Failed to initialize map veto",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="bg-red-900/20 border-red-500/30">
      <CardHeader>
        <CardTitle className="text-foreground flex items-center gap-2">
          <Settings className="w-5 h-5" />
          Admin Match Controls
          <AlertTriangle className="w-4 h-4 text-yellow-400" />
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status Control */}
        <div className="space-y-2">
          <Label className="text-slate-300">Force Status Change</Label>
          <div className="flex gap-2">
            <Select value={newStatus} onValueChange={setNewStatus}>
              <SelectTrigger className="bg-input border-input text-foreground">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-card border-input">
                <SelectItem value="pending" className="text-foreground hover:bg-muted">Pending</SelectItem>
                <SelectItem value="live" className="text-foreground hover:bg-muted">Live</SelectItem>
                <SelectItem value="completed" className="text-foreground hover:bg-muted">Completed</SelectItem>
              </SelectContent>
            </Select>
            <Button
              onClick={forceStatusChange}
              disabled={loading || newStatus === match.status}
              className="bg-orange-600 hover:bg-orange-700 text-white border-orange-500"
            >
              Force Update
            </Button>
          </div>
        </div>

        {/* Reschedule Control */}
        <div className="space-y-2">
          <Label className="text-slate-300">Reschedule Match</Label>
          <div className="flex gap-2">
            <StandardInput
              type="datetime-local"
              value={newScheduledTime}
              onChange={(e) => setNewScheduledTime(e.target.value)}
              className="bg-input border-input text-foreground"
            />
            <Button
              onClick={rescheduleMatch}
              disabled={loading || !newScheduledTime}
              className="bg-blue-600 hover:bg-blue-700 text-white border-blue-500"
            >
              <Calendar className="w-4 h-4 mr-2" />
              Reschedule
            </Button>
          </div>
        </div>

        {/* Results Override */}
        <div className="space-y-2">
          <Label className="text-slate-300">Override Results</Label>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs text-slate-400">{match.team1?.name || 'Team 1'} Score</Label>
              <StandardInput
                type="number"
                value={overrideScore1}
                onChange={(e) => setOverrideScore1(parseInt(e.target.value) || 0)}
                className="bg-input border-input text-foreground"
              />
            </div>
            <div>
              <Label className="text-xs text-slate-400">{match.team2?.name || 'Team 2'} Score</Label>
              <StandardInput
                type="number"
                value={overrideScore2}
                onChange={(e) => setOverrideScore2(parseInt(e.target.value) || 0)}
                className="bg-input border-input text-foreground"
              />
            </div>
          </div>
          <Select value={overrideWinner} onValueChange={setOverrideWinner}>
            <SelectTrigger className="bg-input border-input text-foreground">
              <SelectValue placeholder="Select winner" />
            </SelectTrigger>
            <SelectContent className="bg-card border-input">
              {match.team1 && (
                <SelectItem value={match.team1_id} className="text-foreground hover:bg-muted">{match.team1.name}</SelectItem>
              )}
              {match.team2 && (
                <SelectItem value={match.team2_id} className="text-foreground hover:bg-muted">{match.team2.name}</SelectItem>
              )}
            </SelectContent>
          </Select>
          <Button
            onClick={handleOverrideClick}
            disabled={loading}
            className="w-full bg-red-600 hover:bg-red-700 text-white border-red-500"
          >
            <Trophy className="w-4 h-4 mr-2" />
            Override Results
          </Button>
        </div>

        {/* Map Veto Control */}
        <div className="space-y-2">
          <Button
            onClick={initializeMapVeto}
            disabled={loading}
            className="w-full bg-purple-600 hover:bg-purple-700 text-white border-purple-500"
          >
            Initialize Map Veto
          </Button>
        </div>
      </CardContent>
      
      {/* Score Validation Dialog */}
      <ScoreValidationDialog
        open={showValidationDialog}
        onOpenChange={setShowValidationDialog}
        onConfirm={() => {
          setShowValidationDialog(false);
          overrideResults();
        }}
        team1Name={match.team1?.name || "Team 1"}
        team2Name={match.team2?.name || "Team 2"}
        score1={overrideScore1}
        score2={overrideScore2}
        selectedWinnerId={overrideWinner || null}
        team1Id={match.team1_id || ""}
        team2Id={match.team2_id || ""}
      />
    </Card>
  );
};

export default AdminMatchControls;
