
import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Edit, Calendar, Clock, Users, Trophy } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface Tournament {
  id: string;
  name: string;
  description: string | null;
  start_time: string | null;
  end_time: string | null;
  registration_opens_at: string | null;
  registration_closes_at: string | null;
  check_in_starts_at: string | null;
  check_in_ends_at: string | null;
  max_teams: number;
  max_players: number;
  prize_pool: string | null;
  match_format: string | null;
  bracket_type: string | null;
}

interface TournamentEditDialogProps {
  tournament: Tournament;
  onTournamentUpdated: () => void;
}

const TournamentEditDialog = ({ tournament, onTournamentUpdated }: TournamentEditDialogProps) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: tournament.name,
    description: tournament.description || '',
    start_time: tournament.start_time ? new Date(tournament.start_time).toISOString().slice(0, 16) : '',
    end_time: tournament.end_time ? new Date(tournament.end_time).toISOString().slice(0, 16) : '',
    registration_opens_at: tournament.registration_opens_at ? new Date(tournament.registration_opens_at).toISOString().slice(0, 16) : '',
    registration_closes_at: tournament.registration_closes_at ? new Date(tournament.registration_closes_at).toISOString().slice(0, 16) : '',
    check_in_starts_at: tournament.check_in_starts_at ? new Date(tournament.check_in_starts_at).toISOString().slice(0, 16) : '',
    check_in_ends_at: tournament.check_in_ends_at ? new Date(tournament.check_in_ends_at).toISOString().slice(0, 16) : '',
    max_teams: tournament.max_teams.toString(),
    max_players: tournament.max_players.toString(),
    prize_pool: tournament.prize_pool || '',
    match_format: tournament.match_format || 'BO1',
    bracket_type: tournament.bracket_type || 'single_elimination'
  });
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const updateData = {
        name: formData.name,
        description: formData.description || null,
        start_time: formData.start_time ? new Date(formData.start_time).toISOString() : null,
        end_time: formData.end_time ? new Date(formData.end_time).toISOString() : null,
        registration_opens_at: formData.registration_opens_at ? new Date(formData.registration_opens_at).toISOString() : null,
        registration_closes_at: formData.registration_closes_at ? new Date(formData.registration_closes_at).toISOString() : null,
        check_in_starts_at: formData.check_in_starts_at ? new Date(formData.check_in_starts_at).toISOString() : null,
        check_in_ends_at: formData.check_in_ends_at ? new Date(formData.check_in_ends_at).toISOString() : null,
        max_teams: parseInt(formData.max_teams),
        max_players: parseInt(formData.max_players),
        prize_pool: formData.prize_pool || null,
        match_format: formData.match_format as 'BO1' | 'BO3' | 'BO5',
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
        description: "Tournament details have been updated successfully",
      });

      setOpen(false);
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

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="border-slate-600 text-slate-300 hover:bg-slate-700">
          <Edit className="w-4 h-4 mr-2" />
          Edit Tournament
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-slate-800 border-slate-700 max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-white">Edit Tournament</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start_time" className="text-slate-300">Start Time</Label>
              <Input
                id="start_time"
                type="datetime-local"
                value={formData.start_time}
                onChange={(e) => setFormData(prev => ({ ...prev, start_time: e.target.value }))}
                className="bg-slate-700 border-slate-600 text-white"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="end_time" className="text-slate-300">End Time</Label>
              <Input
                id="end_time"
                type="datetime-local"
                value={formData.end_time}
                onChange={(e) => setFormData(prev => ({ ...prev, end_time: e.target.value }))}
                className="bg-slate-700 border-slate-600 text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="match_format" className="text-slate-300">Match Format</Label>
              <Select value={formData.match_format} onValueChange={(value) => setFormData(prev => ({ ...prev, match_format: value }))}>
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

          <div className="flex gap-2 pt-4">
            <Button type="submit" disabled={loading} className="bg-red-600 hover:bg-red-700">
              {loading ? 'Updating...' : 'Update Tournament'}
            </Button>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} className="border-slate-600 text-slate-300 hover:bg-slate-700">
              Cancel
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default TournamentEditDialog;
