import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Edit2, Save, X, Trophy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

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
  const [editData, setEditData] = useState({
    team1_id: match.team1_id || '',
    team2_id: match.team2_id || '',
    score_team1: match.score_team1 || 0,
    score_team2: match.score_team2 || 0,
    winner_id: match.winner_id || '',
    status: match.status || 'pending'
  });
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const handleEdit = () => {
    setEditData({
      team1_id: match.team1_id || '',
      team2_id: match.team2_id || '',
      score_team1: match.score_team1 || 0,
      score_team2: match.score_team2 || 0,
      winner_id: match.winner_id || '',
      status: match.status || 'pending'
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
          team1_id: editData.team1_id || null,
          team2_id: editData.team2_id || null,
          score_team1: parseInt(editData.score_team1.toString()),
          score_team2: parseInt(editData.score_team2.toString()),
          winner_id: editData.winner_id || null,
          status: editData.status,
          completed_at: editData.status === 'completed' ? new Date().toISOString() : null
        })
        .eq('id', match.id);

      if (error) throw error;

      toast({
        title: "Match Updated",
        description: "Match details have been successfully updated.",
      });

      setIsEditing(false);
      onMatchUpdated();
    } catch (error) {
      console.error('Error updating match:', error);
      toast({
        title: "Error",
        description: "Failed to update match details.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      'pending': 'secondary',
      'live': 'default',
      'completed': 'default'
    } as const;
    
    return (
      <Badge variant={variants[status as keyof typeof variants] || 'secondary'}>
        {status}
      </Badge>
    );
  };

  if (isEditing) {
    return (
      <Card className="border-blue-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center justify-between">
            Editing Round {match.round_number}, Match {match.match_number}
            <div className="flex gap-2">
              <Button size="sm" onClick={handleSave} disabled={saving}>
                <Save className="h-4 w-4 mr-1" />
                Save
              </Button>
              <Button size="sm" variant="outline" onClick={handleCancel}>
                <X className="h-4 w-4 mr-1" />
                Cancel
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Team 1</label>
              <Select value={editData.team1_id} onValueChange={(value) => setEditData({...editData, team1_id: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="Select team..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">No team</SelectItem>
                  {teams.map(team => (
                    <SelectItem key={team.id} value={team.id}>{team.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Team 2</label>
              <Select value={editData.team2_id} onValueChange={(value) => setEditData({...editData, team2_id: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="Select team..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">No team</SelectItem>
                  {teams.map(team => (
                    <SelectItem key={team.id} value={team.id}>{team.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 items-end">
            <div>
              <label className="text-sm font-medium">Team 1 Score</label>
              <Input
                type="number"
                min="0"
                value={editData.score_team1}
                onChange={(e) => setEditData({...editData, score_team1: parseInt(e.target.value) || 0})}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Team 2 Score</label>
              <Input
                type="number"
                min="0"
                value={editData.score_team2}
                onChange={(e) => setEditData({...editData, score_team2: parseInt(e.target.value) || 0})}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Status</label>
              <Select value={editData.status} onValueChange={(value) => setEditData({...editData, status: value})}>
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
          </div>

          <div>
            <label className="text-sm font-medium">Winner</label>
            <Select value={editData.winner_id} onValueChange={(value) => setEditData({...editData, winner_id: value})}>
              <SelectTrigger>
                <SelectValue placeholder="Select winner..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">No winner</SelectItem>
                {editData.team1_id && (
                  <SelectItem value={editData.team1_id}>
                    {teams.find(t => t.id === editData.team1_id)?.name || 'Team 1'}
                  </SelectItem>
                )}
                {editData.team2_id && (
                  <SelectItem value={editData.team2_id}>
                    {teams.find(t => t.id === editData.team2_id)?.name || 'Team 2'}
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="hover:bg-muted/50 transition-colors">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="text-sm font-medium">
              Round {match.round_number}, Match {match.match_number}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm">
                {match.team1?.name || 'TBD'} vs {match.team2?.name || 'TBD'}
              </span>
              {match.status === 'completed' && (
                <span className="text-sm text-muted-foreground">
                  ({match.score_team1}-{match.score_team2})
                </span>
              )}
              {match.winner && (
                <div className="flex items-center gap-1">
                  <Trophy className="h-4 w-4 text-yellow-500" />
                  <span className="text-sm font-medium">{match.winner.name}</span>
                </div>
              )}
            </div>
            {getStatusBadge(match.status)}
          </div>
          <Button size="sm" variant="outline" onClick={handleEdit}>
            <Edit2 className="h-4 w-4 mr-1" />
            Edit
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};