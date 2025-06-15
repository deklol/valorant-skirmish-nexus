import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Edit, Save, Calendar, Users, Trophy, Settings } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

// --- Export Tournament interface ---
export interface Tournament {
  id: string;
  name: string;
  description: string | null;
  start_time: string | null;
  registration_opens_at: string | null;
  registration_closes_at: string | null;
  check_in_starts_at: string | null;
  check_in_ends_at: string | null;
  max_teams: number;
  max_players: number;
  prize_pool: string | null;
  status: "draft" | "open" | "balancing" | "live" | "completed" | "archived";
  match_format: "BO1" | "BO3" | "BO5" | null;
  bracket_type: string | null;
}

interface ComprehensiveTournamentEditorProps {
  tournament: Tournament;
  onTournamentUpdated: () => void;
}

const ComprehensiveTournamentEditor = ({ tournament, onTournamentUpdated }: ComprehensiveTournamentEditorProps) => {
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: tournament.name,
    description: tournament.description || '',
    start_time: tournament.start_time ? new Date(tournament.start_time).toISOString().slice(0, 16) : '',
    registration_opens_at: tournament.registration_opens_at ? new Date(tournament.registration_opens_at).toISOString().slice(0, 16) : '',
    registration_closes_at: tournament.registration_closes_at ? new Date(tournament.registration_closes_at).toISOString().slice(0, 16) : '',
    check_in_starts_at: tournament.check_in_starts_at ? new Date(tournament.check_in_starts_at).toISOString().slice(0, 16) : '',
    check_in_ends_at: tournament.check_in_ends_at ? new Date(tournament.check_in_ends_at).toISOString().slice(0, 16) : '',
    max_teams: tournament.max_teams.toString(),
    max_players: tournament.max_players.toString(),
    prize_pool: tournament.prize_pool || '',
    status: tournament.status as "draft" | "open" | "balancing" | "live" | "completed" | "archived",
    match_format: (tournament.match_format || 'BO1') as "BO1" | "BO3" | "BO5",
    bracket_type: tournament.bracket_type || 'single_elimination'
  });
  const { toast } = useToast();

  const handleSave = async () => {
    setLoading(true);

    try {
      const updateData = {
        name: formData.name,
        description: formData.description || null,
        start_time: formData.start_time ? new Date(formData.start_time).toISOString() : null,
        registration_opens_at: formData.registration_opens_at ? new Date(formData.registration_opens_at).toISOString() : null,
        registration_closes_at: formData.registration_closes_at ? new Date(formData.registration_closes_at).toISOString() : null,
        check_in_starts_at: formData.check_in_starts_at ? new Date(formData.check_in_starts_at).toISOString() : null,
        check_in_ends_at: formData.check_in_ends_at ? new Date(formData.check_in_ends_at).toISOString() : null,
        max_teams: parseInt(formData.max_teams),
        max_players: parseInt(formData.max_players),
        prize_pool: formData.prize_pool || null,
        status: formData.status,
        match_format: formData.match_format,
        bracket_type: formData.bracket_type,
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('tournaments')
        .update(updateData)
        .eq('id', tournament.id);

      if (error) throw error;

      toast({
        title: "Tournament Updated",
        description: "All tournament details have been updated successfully",
      });

      setEditing(false);
      onTournamentUpdated();
    } catch (error: any) {
      console.error('Error updating tournament:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update tournament",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      name: tournament.name,
      description: tournament.description || '',
      start_time: tournament.start_time ? new Date(tournament.start_time).toISOString().slice(0, 16) : '',
      registration_opens_at: tournament.registration_opens_at ? new Date(tournament.registration_opens_at).toISOString().slice(0, 16) : '',
      registration_closes_at: tournament.registration_closes_at ? new Date(tournament.registration_closes_at).toISOString().slice(0, 16) : '',
      check_in_starts_at: tournament.check_in_starts_at ? new Date(tournament.check_in_starts_at).toISOString().slice(0, 16) : '',
      check_in_ends_at: tournament.check_in_ends_at ? new Date(tournament.check_in_ends_at).toISOString().slice(0, 16) : '',
      max_teams: tournament.max_teams.toString(),
      max_players: tournament.max_players.toString(),
      prize_pool: tournament.prize_pool || '',
      status: tournament.status as "draft" | "open" | "balancing" | "live" | "completed" | "archived",
      match_format: (tournament.match_format || 'BO1') as "BO1" | "BO3" | "BO5",
      bracket_type: tournament.bracket_type || 'single_elimination'
    });
    setEditing(false);
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      draft: "bg-gray-500/20 text-gray-400",
      open: "bg-green-500/20 text-green-400",
      balancing: "bg-yellow-500/20 text-yellow-400",
      live: "bg-blue-500/20 text-blue-400",
      completed: "bg-purple-500/20 text-purple-400",
      archived: "bg-slate-500/20 text-slate-400"
    };

    return (
      <Badge className={variants[status] || variants.draft}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  if (!editing) {
    return (
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Tournament Configuration
            </div>
            <Button
              onClick={() => setEditing(true)}
              variant="outline"
              className="border-slate-600 text-slate-300 hover:bg-slate-700"
            >
              <Edit className="w-4 h-4 mr-2" />
              Edit All Details
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Basic Info */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white">Basic Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-slate-300">Tournament Name</Label>
                <p className="text-white mt-1">{tournament.name}</p>
              </div>
              <div>
                <Label className="text-slate-300">Status</Label>
                <div className="mt-1">{getStatusBadge(tournament.status)}</div>
              </div>
              <div>
                <Label className="text-slate-300">Prize Pool</Label>
                <p className="text-white mt-1">{tournament.prize_pool || 'Not set'}</p>
              </div>
              <div>
                <Label className="text-slate-300">Format</Label>
                <p className="text-white mt-1">{tournament.match_format} / {tournament.bracket_type?.replace('_', ' ')}</p>
              </div>
            </div>
            <div>
              <Label className="text-slate-300">Description</Label>
              <p className="text-white mt-1">{tournament.description || 'No description provided'}</p>
            </div>
          </div>

          {/* Capacity */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white">Capacity</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-slate-300">Max Teams</Label>
                <p className="text-white mt-1">{tournament.max_teams}</p>
              </div>
              <div>
                <Label className="text-slate-300">Max Players</Label>
                <p className="text-white mt-1">{tournament.max_players}</p>
              </div>
            </div>
          </div>

          {/* Schedule */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white">Schedule</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-slate-300">Tournament Start</Label>
                <p className="text-white mt-1">
                  {tournament.start_time ? new Date(tournament.start_time).toLocaleString() : 'Not set'}
                </p>
              </div>
              <div>
                <Label className="text-slate-300">Registration Opens</Label>
                <p className="text-white mt-1">
                  {tournament.registration_opens_at ? new Date(tournament.registration_opens_at).toLocaleString() : 'Not set'}
                </p>
              </div>
              <div>
                <Label className="text-slate-300">Registration Closes</Label>
                <p className="text-white mt-1">
                  {tournament.registration_closes_at ? new Date(tournament.registration_closes_at).toLocaleString() : 'Not set'}
                </p>
              </div>
              <div>
                <Label className="text-slate-300">Check-in Starts</Label>
                <p className="text-white mt-1">
                  {tournament.check_in_starts_at ? new Date(tournament.check_in_starts_at).toLocaleString() : 'Not set'}
                </p>
              </div>
              <div>
                <Label className="text-slate-300">Check-in Ends</Label>
                <p className="text-white mt-1">
                  {tournament.check_in_ends_at ? new Date(tournament.check_in_ends_at).toLocaleString() : 'Not set'}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-slate-800 border-slate-700">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <Edit className="w-5 h-5" />
          Edit Tournament Details
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Basic Information */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-white">Basic Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-slate-300">Tournament Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="bg-slate-700 border-slate-600 text-white"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="status" className="text-slate-300">Status</Label>
              <Select value={formData.status} onValueChange={(value: "draft" | "open" | "balancing" | "live" | "completed" | "archived") => setFormData(prev => ({ ...prev, status: value }))}>
                <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-700 border-slate-600">
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="balancing">Balancing</SelectItem>
                  <SelectItem value="live">Live</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="prize_pool" className="text-slate-300">Prize Pool</Label>
              <Input
                id="prize_pool"
                value={formData.prize_pool}
                onChange={(e) => setFormData(prev => ({ ...prev, prize_pool: e.target.value }))}
                className="bg-slate-700 border-slate-600 text-white"
                placeholder="e.g., $500"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="description" className="text-slate-300">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              className="bg-slate-700 border-slate-600 text-white"
              rows={3}
            />
          </div>
        </div>

        {/* Tournament Settings */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-white">Tournament Settings</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="max_teams" className="text-slate-300">Max Teams</Label>
              <Input
                id="max_teams"
                type="number"
                value={formData.max_teams}
                onChange={(e) => setFormData(prev => ({ ...prev, max_teams: e.target.value }))}
                className="bg-slate-700 border-slate-600 text-white"
                min="2"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="max_players" className="text-slate-300">Max Players</Label>
              <Input
                id="max_players"
                type="number"
                value={formData.max_players}
                onChange={(e) => setFormData(prev => ({ ...prev, max_players: e.target.value }))}
                className="bg-slate-700 border-slate-600 text-white"
                min="2"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="match_format" className="text-slate-300">Match Format</Label>
              <Select value={formData.match_format} onValueChange={(value: "BO1" | "BO3" | "BO5") => setFormData(prev => ({ ...prev, match_format: value }))}>
                <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-700 border-slate-600">
                  <SelectItem value="BO1">Best of 1</SelectItem>
                  <SelectItem value="BO3">Best of 3</SelectItem>
                  <SelectItem value="BO5">Best of 5</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="bracket_type" className="text-slate-300">Bracket Type</Label>
              <Select value={formData.bracket_type} onValueChange={(value) => setFormData(prev => ({ ...prev, bracket_type: value }))}>
                <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-700 border-slate-600">
                  <SelectItem value="single_elimination">Single Elimination</SelectItem>
                  <SelectItem value="double_elimination">Double Elimination</SelectItem>
                  <SelectItem value="round_robin">Round Robin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Schedule */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-white">Schedule</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start_time" className="text-slate-300">Tournament Start</Label>
              <Input
                id="start_time"
                type="datetime-local"
                value={formData.start_time}
                onChange={(e) => setFormData(prev => ({ ...prev, start_time: e.target.value }))}
                className="bg-slate-700 border-slate-600 text-white"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="registration_opens_at" className="text-slate-300">Registration Opens</Label>
              <Input
                id="registration_opens_at"
                type="datetime-local"
                value={formData.registration_opens_at}
                onChange={(e) => setFormData(prev => ({ ...prev, registration_opens_at: e.target.value }))}
                className="bg-slate-700 border-slate-600 text-white"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="registration_closes_at" className="text-slate-300">Registration Closes</Label>
              <Input
                id="registration_closes_at"
                type="datetime-local"
                value={formData.registration_closes_at}
                onChange={(e) => setFormData(prev => ({ ...prev, registration_closes_at: e.target.value }))}
                className="bg-slate-700 border-slate-600 text-white"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="check_in_starts_at" className="text-slate-300">Check-in Starts</Label>
              <Input
                id="check_in_starts_at"
                type="datetime-local"
                value={formData.check_in_starts_at}
                onChange={(e) => setFormData(prev => ({ ...prev, check_in_starts_at: e.target.value }))}
                className="bg-slate-700 border-slate-600 text-white"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="check_in_ends_at" className="text-slate-300">Check-in Ends</Label>
              <Input
                id="check_in_ends_at"
                type="datetime-local"
                value={formData.check_in_ends_at}
                onChange={(e) => setFormData(prev => ({ ...prev, check_in_ends_at: e.target.value }))}
                className="bg-slate-700 border-slate-600 text-white"
              />
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 pt-4 border-t border-slate-600">
          <Button onClick={handleSave} disabled={loading} className="bg-green-600 hover:bg-green-700">
            {loading ? (
              "Saving..."
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save All Changes
              </>
            )}
          </Button>
          <Button type="button" variant="outline" onClick={handleCancel} className="border-slate-600 text-slate-300 hover:bg-slate-700">
            Cancel
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default ComprehensiveTournamentEditor;
