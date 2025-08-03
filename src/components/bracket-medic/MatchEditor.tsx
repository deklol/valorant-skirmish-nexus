import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Edit, Save, X } from "lucide-react";

interface MatchEditorProps {
  match: any;
  teams: any[];
  onMatchUpdated: () => void;
}

export const MatchEditor: React.FC<MatchEditorProps> = ({
  match,
  teams,
  onMatchUpdated
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editData, setEditData] = useState({
    team1_id: match.team1_id,
    team2_id: match.team2_id,
    score_team1: match.score_team1,
    score_team2: match.score_team2,
    status: match.status,
    winner_id: match.winner_id
  });
  const { toast } = useToast();

  const handleEdit = () => {
    setEditData({
      team1_id: match.team1_id,
      team2_id: match.team2_id,
      score_team1: match.score_team1,
      score_team2: match.score_team2,
      status: match.status,
      winner_id: match.winner_id
    });
    setIsEditing(true);
  };

  const handleCancel = () => {
    setIsEditing(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('matches')
        .update({
          team1_id: editData.team1_id,
          team2_id: editData.team2_id,
          score_team1: editData.score_team1,
          score_team2: editData.score_team2,
          status: editData.status,
          winner_id: editData.winner_id
        })
        .eq('id', match.id);

      if (error) throw error;

      toast({
        title: "Match Updated",
        description: "Match details have been updated successfully."
      });

      setIsEditing(false);
      onMatchUpdated();
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

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      pending: "outline",
      live: "default",
      completed: "secondary"
    };
    return <Badge variant={variants[status] || "outline"}>{status}</Badge>;
  };

  if (isEditing) {
    return (
      <Card className="border-dashed">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Editing Match {match.match_number}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Team 1</label>
              <Select
                value={editData.team1_id || ""}
                onValueChange={(value) => setEditData(prev => ({ ...prev, team1_id: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select team..." />
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
              <label className="text-sm font-medium">Team 2</label>
              <Select
                value={editData.team2_id || ""}
                onValueChange={(value) => setEditData(prev => ({ ...prev, team2_id: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select team..." />
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

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Score Team 1</label>
              <Input
                type="number"
                value={editData.score_team1}
                onChange={(e) => setEditData(prev => ({ ...prev, score_team1: parseInt(e.target.value) || 0 }))}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Score Team 2</label>
              <Input
                type="number"
                value={editData.score_team2}
                onChange={(e) => setEditData(prev => ({ ...prev, score_team2: parseInt(e.target.value) || 0 }))}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Status</label>
              <Select
                value={editData.status}
                onValueChange={(value) => setEditData(prev => ({ ...prev, status: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="live">Live</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Winner</label>
              <Select
                value={editData.winner_id || ""}
                onValueChange={(value) => setEditData(prev => ({ ...prev, winner_id: value || null }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select winner..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">No winner</SelectItem>
                  {teams.filter(team => team.id === editData.team1_id || team.id === editData.team2_id).map((team) => (
                    <SelectItem key={team.id} value={team.id}>
                      {team.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex gap-2">
            <Button onClick={handleSave} disabled={saving} size="sm">
              <Save className="h-4 w-4 mr-2" />
              {saving ? "Saving..." : "Save"}
            </Button>
            <Button onClick={handleCancel} variant="outline" size="sm">
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="font-medium">
              Round {match.round_number}, Match {match.match_number}
            </div>
            <div className="text-sm text-muted-foreground">
              {match.team1?.name || "TBD"} vs {match.team2?.name || "TBD"}
            </div>
            <div className="text-sm">
              Score: {match.score_team1} - {match.score_team2}
              {match.winner && (
                <span className="ml-2 font-medium">
                  Winner: {match.winner.name}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {getStatusBadge(match.status)}
            <Button onClick={handleEdit} size="sm" variant="outline">
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};