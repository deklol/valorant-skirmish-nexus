import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Users, AlertTriangle } from "lucide-react";

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

  const handleReassign = async () => {
    if (!selectedMatch || !newTeam1 || !newTeam2) {
      toast({
        title: "Error",
        description: "Please select a match and both teams.",
        variant: "destructive"
      });
      return;
    }

    if (newTeam1 === newTeam2) {
      toast({
        title: "Error",
        description: "Please select two different teams.",
        variant: "destructive"
      });
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('matches')
        .update({
          team1_id: newTeam1,
          team2_id: newTeam2,
          score_team1: 0,
          score_team2: 0,
          winner_id: null,
          status: 'pending'
        })
        .eq('id', selectedMatch);

      if (error) throw error;

      toast({
        title: "Teams Reassigned",
        description: "Match teams have been reassigned and results reset."
      });

      setSelectedMatch("");
      setNewTeam1("");
      setNewTeam2("");
      onTeamsReassigned();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
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

  const selectedMatchData = matches.find(m => m.id === selectedMatch);

  return (
    <div className="space-y-6">
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Reassigning teams will reset the match results (scores and winner) and set the status back to pending.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Select Match to Modify
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Match</label>
            <Select value={selectedMatch} onValueChange={handleMatchSelection}>
              <SelectTrigger>
                <SelectValue placeholder="Select a match to reassign teams..." />
              </SelectTrigger>
              <SelectContent>
                {matches.map((match) => (
                  <SelectItem key={match.id} value={match.id}>
                    Round {match.round_number}, Match {match.match_number}: {match.team1?.name || "TBD"} vs {match.team2?.name || "TBD"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedMatch && selectedMatchData && (
            <div className="mt-4 p-4 bg-muted rounded-lg">
              <div className="text-sm font-medium mb-2">Current Match Details:</div>
              <div className="text-sm text-muted-foreground space-y-1">
                <div>Round {selectedMatchData.round_number}, Match {selectedMatchData.match_number}</div>
                <div>Team 1: {selectedMatchData.team1?.name || "TBD"}</div>
                <div>Team 2: {selectedMatchData.team2?.name || "TBD"}</div>
                <div>Status: {selectedMatchData.status}</div>
                <div>Score: {selectedMatchData.score_team1} - {selectedMatchData.score_team2}</div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {selectedMatch && (
        <Card>
          <CardHeader>
            <CardTitle>Reassign Teams</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">New Team 1</label>
                <Select value={newTeam1} onValueChange={setNewTeam1}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select team 1..." />
                  </SelectTrigger>
                  <SelectContent>
                    {teams.map((team) => (
                      <SelectItem key={team.id} value={team.id}>
                        {team.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">New Team 2</label>
                <Select value={newTeam2} onValueChange={setNewTeam2}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select team 2..." />
                  </SelectTrigger>
                  <SelectContent>
                    {teams.map((team) => (
                      <SelectItem key={team.id} value={team.id}>
                        {team.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button 
              onClick={handleReassign} 
              disabled={saving || !newTeam1 || !newTeam2 || newTeam1 === newTeam2}
              className="w-full"
            >
              {saving ? "Reassigning..." : "Reassign Teams"}
            </Button>
          </CardContent>
        </Card>
      )}

      {(!matches || matches.length === 0) && (
        <div className="text-center text-muted-foreground py-8">
          No matches found for this tournament.
        </div>
      )}
    </div>
  );
};