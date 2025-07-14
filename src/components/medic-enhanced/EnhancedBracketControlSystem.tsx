import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogFooter, AlertDialogTitle, AlertDialogDescription, AlertDialogAction, AlertDialogCancel } from "@/components/ui/alert-dialog";
import { Settings, Calendar, Move, Shuffle, Target, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface EnhancedBracketControlSystemProps {
  tournamentId: string;
  matches: Array<{
    id: string;
    round_number: number;
    match_number: number;
    team1_id: string | null;
    team2_id: string | null;
    status: string;
    scheduled_time: string | null;
    notes?: string | null;
  }>;
  teams: Array<{ id: string; name: string; status: string }>;
  onUpdate: () => void;
}

export default function EnhancedBracketControlSystem({
  tournamentId,
  matches,
  teams,
  onUpdate
}: EnhancedBracketControlSystemProps) {
  const [selectedMatch, setSelectedMatch] = useState<string>("");
  const [newTeam1, setNewTeam1] = useState<string>("");
  const [newTeam2, setNewTeam2] = useState<string>("");
  const [scheduledTime, setScheduledTime] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [forceProgressionTeam, setForceProgressionTeam] = useState<string>("");
  const [targetRound, setTargetRound] = useState<number>(1);
  const [targetMatchNumber, setTargetMatchNumber] = useState<number>(1);
  const [progressionReason, setProgressionReason] = useState<string>("");
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingAction, setPendingAction] = useState<() => void>(() => {});
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const activeTeams = teams.filter(team => !['eliminated', 'disqualified', 'withdrawn'].includes(team.status));
  const maxRound = Math.max(...matches.map(m => m.round_number), 1);
  const selectedMatchData = matches.find(m => m.id === selectedMatch);

  useEffect(() => {
    if (selectedMatchData) {
      setNewTeam1(selectedMatchData.team1_id || "");
      setNewTeam2(selectedMatchData.team2_id || "");
      setScheduledTime(selectedMatchData.scheduled_time ? 
        new Date(selectedMatchData.scheduled_time).toISOString().slice(0, 16) : "");
    }
  }, [selectedMatchData]);

  const handleTeamAssignment = async () => {
    if (!selectedMatch) return;
    
    setLoading(true);
    try {
      const { error } = await supabase
        .from('matches')
        .update({
          team1_id: newTeam1 || null,
          team2_id: newTeam2 || null,
          notes: notes || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedMatch);

      if (error) throw error;

      toast({
        title: "Match Updated",
        description: "Team assignments have been updated successfully."
      });
      onUpdate();
    } catch (error: any) {
      toast({
        title: "Update Failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleScheduling = async () => {
    if (!selectedMatch || !scheduledTime) return;
    
    setLoading(true);
    try {
      const { error } = await supabase
        .from('matches')
        .update({
          scheduled_time: new Date(scheduledTime).toISOString()
        })
        .eq('id', selectedMatch);

      if (error) throw error;

      toast({
        title: "Match Scheduled",
        description: "Match scheduling has been updated successfully."
      });
      onUpdate();
    } catch (error: any) {
      toast({
        title: "Scheduling Failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleForcedProgression = async () => {
    if (!forceProgressionTeam || !targetRound || !targetMatchNumber || !progressionReason.trim()) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('manually_advance_team', {
        p_team_id: forceProgressionTeam,
        p_to_round: targetRound,
        p_to_match_number: targetMatchNumber,
        p_reason: progressionReason.trim()
      });

      if (error) throw error;

      const result = data as any;
      if (result?.success) {
        toast({
          title: "Forced Progression Complete",
          description: `${result.team_name} advanced to Round ${targetRound}, Match ${targetMatchNumber}`
        });
        onUpdate();
        setForceProgressionTeam("");
        setTargetRound(1);
        setTargetMatchNumber(1);
        setProgressionReason("");
      } else {
        throw new Error(result?.error || 'Unknown error');
      }
    } catch (error: any) {
      toast({
        title: "Forced Progression Failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleBracketShuffle = async () => {
    if (!window.confirm("This will randomly reassign all teams in Round 1. Continue?")) return;
    
    setLoading(true);
    try {
      const round1Matches = matches.filter(m => m.round_number === 1);
      const shuffledTeams = [...activeTeams].sort(() => Math.random() - 0.5);
      
      let teamIndex = 0;
      for (const match of round1Matches) {
        const team1 = shuffledTeams[teamIndex++];
        const team2 = shuffledTeams[teamIndex++];
        
        await supabase
          .from('matches')
          .update({
            team1_id: team1?.id || null,
            team2_id: team2?.id || null,
            notes: (match.notes || '') + ' | Bracket shuffled by admin'
          })
          .eq('id', match.id);
      }

      toast({
        title: "Bracket Shuffled",
        description: "All Round 1 teams have been randomly reassigned."
      });
      onUpdate();
    } catch (error: any) {
      toast({
        title: "Shuffle Failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const confirmActionHandler = (action: () => void) => {
    setPendingAction(() => action);
    setShowConfirmDialog(true);
  };

  return (
    <div className="space-y-6">
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Settings className="w-5 h-5 text-blue-400" />
            Enhanced Bracket Control System
            <span className="text-xs text-blue-300">(Phase 1)</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          
          {/* Advanced Match Management */}
          <div className="border border-blue-600/30 bg-blue-950/20 rounded-lg p-4">
            <h3 className="text-blue-400 font-medium mb-3 flex items-center gap-2">
              <Target className="w-4 h-4" />
              Advanced Match Management
            </h3>
            <div className="space-y-4">
              <div>
                <Label className="text-slate-300">Select Match</Label>
                <Select value={selectedMatch} onValueChange={setSelectedMatch}>
                  <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                    <SelectValue placeholder="Choose match to edit..." />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-700 border-slate-600">
                    {matches.map(match => (
                      <SelectItem key={match.id} value={match.id}>
                        Round {match.round_number}, Match {match.match_number} ({match.status})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {selectedMatch && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-slate-300">Team 1</Label>
                    <Select value={newTeam1} onValueChange={setNewTeam1}>
                      <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                        <SelectValue placeholder="Select Team 1..." />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-700 border-slate-600">
                        <SelectItem value="">No Team</SelectItem>
                        {activeTeams.map(team => (
                          <SelectItem key={team.id} value={team.id}>
                            {team.name} ({team.status})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label className="text-slate-300">Team 2</Label>
                    <Select value={newTeam2} onValueChange={setNewTeam2}>
                      <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                        <SelectValue placeholder="Select Team 2..." />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-700 border-slate-600">
                        <SelectItem value="">No Team</SelectItem>
                        {activeTeams.map(team => (
                          <SelectItem key={team.id} value={team.id}>
                            {team.name} ({team.status})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
              
              <div>
                <Label className="text-slate-300">Match Notes</Label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add notes about this match..."
                  className="bg-slate-700 border-slate-600 text-white"
                />
              </div>
              
              <Button
                onClick={() => confirmActionHandler(handleTeamAssignment)}
                disabled={!selectedMatch || loading}
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                <Move className="w-4 h-4 mr-2" />
                Update Match Teams
              </Button>
            </div>
          </div>

          {/* Match Scheduling */}
          <div className="border border-green-600/30 bg-green-950/20 rounded-lg p-4">
            <h3 className="text-green-400 font-medium mb-3 flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Match Scheduling
            </h3>
            <div className="space-y-4">
              <div>
                <Label className="text-slate-300">Scheduled Time</Label>
                <Input
                  type="datetime-local"
                  value={scheduledTime}
                  onChange={(e) => setScheduledTime(e.target.value)}
                  className="bg-slate-700 border-slate-600 text-white"
                />
              </div>
              
              <Button
                onClick={() => confirmActionHandler(handleScheduling)}
                disabled={!selectedMatch || !scheduledTime || loading}
                className="w-full bg-green-600 hover:bg-green-700"
              >
                <Clock className="w-4 h-4 mr-2" />
                Schedule Match
              </Button>
            </div>
          </div>

          {/* Forced Progression Controls */}
          <div className="border border-purple-600/30 bg-purple-950/20 rounded-lg p-4">
            <h3 className="text-purple-400 font-medium mb-3 flex items-center gap-2">
              <Target className="w-4 h-4" />
              Forced Progression Controls
            </h3>
            <div className="space-y-4">
              <div>
                <Label className="text-slate-300">Team to Advance</Label>
                <Select value={forceProgressionTeam} onValueChange={setForceProgressionTeam}>
                  <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                    <SelectValue placeholder="Select team to force advance..." />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-700 border-slate-600">
                    {activeTeams.map(team => (
                      <SelectItem key={team.id} value={team.id}>
                        {team.name} ({team.status})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-slate-300">Target Round</Label>
                  <Input
                    type="number"
                    min="1"
                    max={maxRound}
                    value={targetRound}
                    onChange={(e) => setTargetRound(parseInt(e.target.value) || 1)}
                    className="bg-slate-700 border-slate-600 text-white"
                  />
                </div>
                <div>
                  <Label className="text-slate-300">Target Match</Label>
                  <Input
                    type="number"
                    min="1"
                    value={targetMatchNumber}
                    onChange={(e) => setTargetMatchNumber(parseInt(e.target.value) || 1)}
                    className="bg-slate-700 border-slate-600 text-white"
                  />
                </div>
              </div>
              
              <div>
                <Label className="text-slate-300">Progression Reason</Label>
                <Textarea
                  value={progressionReason}
                  onChange={(e) => setProgressionReason(e.target.value)}
                  placeholder="Explain why this team is being advanced..."
                  className="bg-slate-700 border-slate-600 text-white"
                />
              </div>
              
              <Button
                onClick={() => confirmActionHandler(handleForcedProgression)}
                disabled={!forceProgressionTeam || !progressionReason.trim() || loading}
                className="w-full bg-purple-600 hover:bg-purple-700"
              >
                <Target className="w-4 h-4 mr-2" />
                Force Team Progression
              </Button>
            </div>
          </div>

          {/* Bracket Utilities */}
          <div className="border border-orange-600/30 bg-orange-950/20 rounded-lg p-4">
            <h3 className="text-orange-400 font-medium mb-3 flex items-center gap-2">
              <Shuffle className="w-4 h-4" />
              Bracket Utilities
            </h3>
            <Button
              onClick={() => confirmActionHandler(handleBracketShuffle)}
              disabled={loading}
              className="w-full bg-orange-600 hover:bg-orange-700"
            >
              <Shuffle className="w-4 h-4 mr-2" />
              Shuffle Round 1 Teams
            </Button>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent className="bg-slate-800 border-slate-700">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Confirm Action</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              Are you sure you want to perform this action? This will modify the tournament bracket structure.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-slate-700 border-slate-600 text-white hover:bg-slate-600">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => {
                pendingAction();
                setShowConfirmDialog(false);
              }}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}