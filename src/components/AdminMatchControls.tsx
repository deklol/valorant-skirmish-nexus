
import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertTriangle, Settings, Calendar, Trophy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

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

  const overrideResults = async () => {
    setLoading(true);
    try {
      const updateData: any = {
        score_team1: overrideScore1,
        score_team2: overrideScore2,
        status: 'completed'
      };

      if (overrideWinner) {
        updateData.winner_id = overrideWinner;
      }

      const { error } = await supabase
        .from('matches')
        .update(updateData)
        .eq('id', match.id);

      if (error) throw error;

      toast({
        title: "Match Results Overridden",
        description: "Match results have been forcefully updated",
      });

      onMatchUpdate();
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
        <CardTitle className="text-white flex items-center gap-2">
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
              <SelectTrigger className="bg-slate-700 border-slate-600">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="live">Live</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>
            <Button
              onClick={forceStatusChange}
              disabled={loading || newStatus === match.status}
              className="bg-orange-600 hover:bg-orange-700"
            >
              Force Update
            </Button>
          </div>
        </div>

        {/* Reschedule Control */}
        <div className="space-y-2">
          <Label className="text-slate-300">Reschedule Match</Label>
          <div className="flex gap-2">
            <Input
              type="datetime-local"
              value={newScheduledTime}
              onChange={(e) => setNewScheduledTime(e.target.value)}
              className="bg-slate-700 border-slate-600"
            />
            <Button
              onClick={rescheduleMatch}
              disabled={loading || !newScheduledTime}
              className="bg-blue-600 hover:bg-blue-700"
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
              <Input
                type="number"
                value={overrideScore1}
                onChange={(e) => setOverrideScore1(parseInt(e.target.value) || 0)}
                className="bg-slate-700 border-slate-600"
              />
            </div>
            <div>
              <Label className="text-xs text-slate-400">{match.team2?.name || 'Team 2'} Score</Label>
              <Input
                type="number"
                value={overrideScore2}
                onChange={(e) => setOverrideScore2(parseInt(e.target.value) || 0)}
                className="bg-slate-700 border-slate-600"
              />
            </div>
          </div>
          <Select value={overrideWinner} onValueChange={setOverrideWinner}>
            <SelectTrigger className="bg-slate-700 border-slate-600">
              <SelectValue placeholder="Select winner" />
            </SelectTrigger>
            <SelectContent>
              {match.team1 && (
                <SelectItem value={match.team1_id}>{match.team1.name}</SelectItem>
              )}
              {match.team2 && (
                <SelectItem value={match.team2_id}>{match.team2.name}</SelectItem>
              )}
            </SelectContent>
          </Select>
          <Button
            onClick={overrideResults}
            disabled={loading}
            className="w-full bg-red-600 hover:bg-red-700"
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
            className="w-full bg-purple-600 hover:bg-purple-700"
          >
            Initialize Map Veto
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default AdminMatchControls;
