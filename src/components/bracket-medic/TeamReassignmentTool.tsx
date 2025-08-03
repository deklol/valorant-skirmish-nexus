import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Users, ArrowRight, Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface TeamReassignmentToolProps {
  matches: any[];
  teams: any[];
  onTeamsReassigned: () => void;
}

export const TeamReassignmentTool: React.FC<TeamReassignmentToolProps> = ({
  matches,
  teams,
  onTeamsReassigned
}) => {
  const [selectedMatch, setSelectedMatch] = useState<string>("");
  const [newTeam1, setNewTeam1] = useState<string>("");
  const [newTeam2, setNewTeam2] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const selectedMatchData = matches.find(m => m.id === selectedMatch);

  const handleReassign = async () => {
    if (!selectedMatch) {
      toast({
        title: "Error",
        description: "Please select a match to reassign teams.",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('matches')
        .update({
          team1_id: newTeam1 || null,
          team2_id: newTeam2 || null,
          // Reset match results when reassigning teams
          score_team1: 0,
          score_team2: 0,
          winner_id: null,
          status: 'pending',
          completed_at: null
        })
        .eq('id', selectedMatch);

      if (error) throw error;

      toast({
        title: "Teams Reassigned",
        description: "Teams have been successfully reassigned to the match.",
      });

      // Reset form
      setSelectedMatch("");
      setNewTeam1("");
      setNewTeam2("");
      onTeamsReassigned();
    } catch (error) {
      console.error('Error reassigning teams:', error);
      toast({
        title: "Error",
        description: "Failed to reassign teams.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleMatchSelection = (matchId: string) => {
    setSelectedMatch(matchId);
    const match = matches.find(m => m.id === matchId);
    if (match) {
      setNewTeam1(match.team1_id || "");
      setNewTeam2(match.team2_id || "");
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-sm text-muted-foreground">
        Select a match to reassign teams. This is useful when teams were incorrectly assigned during bracket generation or when teams need to be substituted.
      </div>

      <Alert>
        <Users className="h-4 w-4" />
        <AlertDescription>
          <strong>Warning:</strong> Reassigning teams will reset the match results (scores, winner, status) and set the match back to pending.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Select Match to Modify</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium">Match</label>
            <Select value={selectedMatch} onValueChange={handleMatchSelection}>
              <SelectTrigger>
                <SelectValue placeholder="Select a match to reassign..." />
              </SelectTrigger>
              <SelectContent>
                {matches.map(match => (
                  <SelectItem key={match.id} value={match.id}>
                    Round {match.round_number}, Match {match.match_number}: {' '}
                    {match.team1?.name || 'TBD'} vs {match.team2?.name || 'TBD'}
                    {match.status === 'completed' && ` (${match.score_team1}-${match.score_team2})`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedMatchData && (
            <div className="bg-muted/50 p-4 rounded-lg">
              <div className="text-sm font-medium mb-2">Current Assignment:</div>
              <div className="flex items-center gap-2 text-sm">
                <span>{selectedMatchData.team1?.name || 'TBD'}</span>
                <span>vs</span>
                <span>{selectedMatchData.team2?.name || 'TBD'}</span>
                <span className="text-muted-foreground">
                  (Round {selectedMatchData.round_number}, Match {selectedMatchData.match_number})
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {selectedMatch && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <ArrowRight className="h-5 w-5" />
              Reassign Teams
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">New Team 1</label>
                <Select value={newTeam1} onValueChange={setNewTeam1}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select team..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">No team (TBD)</SelectItem>
                    {teams.map(team => (
                      <SelectItem key={team.id} value={team.id}>
                        {team.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">New Team 2</label>
                <Select value={newTeam2} onValueChange={setNewTeam2}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select team..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">No team (TBD)</SelectItem>
                    {teams.map(team => (
                      <SelectItem key={team.id} value={team.id}>
                        {team.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex justify-end">
              <Button onClick={handleReassign} disabled={saving}>
                <Save className="h-4 w-4 mr-2" />
                {saving ? 'Reassigning...' : 'Reassign Teams'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {matches.length === 0 && (
        <Card>
          <CardContent className="p-6 text-center text-muted-foreground">
            No matches found for this tournament.
          </CardContent>
        </Card>
      )}
    </div>
  );
};