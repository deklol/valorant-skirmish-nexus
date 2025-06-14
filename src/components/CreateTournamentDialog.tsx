
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Calendar, Trophy } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface CreateTournamentDialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onTournamentCreated?: () => void;
}

const CreateTournamentDialog = ({ open, onOpenChange, onTournamentCreated }: CreateTournamentDialogProps) => {
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    match_format: "BO3",
    team_size: 5, // Default to 5v5
    max_players: 50,
    max_teams: 10,
    prize_pool: "",
    start_time: "",
  });
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Calculate max_teams based on team_size and max_players
      const calculatedMaxTeams = Math.floor(formData.max_players / formData.team_size);
      
      const { data, error } = await supabase
        .from('tournaments')
        .insert({
          ...formData,
          max_teams: calculatedMaxTeams,
          team_size: formData.team_size,
          status: 'draft'
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Tournament Created",
        description: `${formData.name} has been created successfully`,
      });

      // Reset form
      setFormData({
        name: "",
        description: "",
        match_format: "BO3",
        team_size: 5,
        max_players: 50,
        max_teams: 10,
        prize_pool: "",
        start_time: "",
      });

      onOpenChange?.(false);
      onTournamentCreated?.();
    } catch (error: any) {
      console.error('Error creating tournament:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create tournament",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleTeamSizeChange = (teamSize: number) => {
    setFormData(prev => ({
      ...prev,
      team_size: teamSize,
      max_teams: Math.floor(prev.max_players / teamSize)
    }));
  };

  const triggerButton = (
    <Button className="bg-red-600 hover:bg-red-700 text-white">
      <Trophy className="w-4 h-4 mr-2" />
      Create Tournament
    </Button>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {!open && !onOpenChange && <DialogTrigger asChild>{triggerButton}</DialogTrigger>}
      <DialogContent className="sm:max-w-[500px] bg-slate-800 border-slate-700">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <Trophy className="w-5 h-5 text-yellow-500" />
            Create New Tournament
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name" className="text-white">Tournament Name</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              className="bg-slate-700 border-slate-600 text-white"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description" className="text-white">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              className="bg-slate-700 border-slate-600 text-white"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="match_format" className="text-white">Match Format</Label>
              <Select
                value={formData.match_format}
                onValueChange={(value) => setFormData(prev => ({ ...prev, match_format: value }))}
              >
                <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="BO1">Best of 1</SelectItem>
                  <SelectItem value="BO3">Best of 3</SelectItem>
                  <SelectItem value="BO5">Best of 5</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="team_size" className="text-white">Team Size</Label>
              <Select
                value={formData.team_size.toString()}
                onValueChange={(value) => handleTeamSizeChange(parseInt(value))}
              >
                <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1v1 (Solo)</SelectItem>
                  <SelectItem value="2">2v2 (Duo)</SelectItem>
                  <SelectItem value="3">3v3 (Trio)</SelectItem>
                  <SelectItem value="4">4v4 (Squad)</SelectItem>
                  <SelectItem value="5">5v5 (Full Team)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="max_players" className="text-white">Max Players</Label>
              <Input
                id="max_players"
                type="number"
                value={formData.max_players}
                onChange={(e) => {
                  const maxPlayers = parseInt(e.target.value);
                  setFormData(prev => ({
                    ...prev,
                    max_players: maxPlayers,
                    max_teams: Math.floor(maxPlayers / prev.team_size)
                  }));
                }}
                className="bg-slate-700 border-slate-600 text-white"
                min="1"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="max_teams" className="text-white">Max Teams</Label>
              <Input
                id="max_teams"
                type="number"
                value={formData.max_teams}
                className="bg-slate-700 border-slate-600 text-white"
                disabled
                title="Automatically calculated based on max players and team size"
              />
              <p className="text-xs text-slate-400">Auto-calculated: {formData.max_players} ÷ {formData.team_size}</p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="prize_pool" className="text-white">Prize Pool</Label>
            <Input
              id="prize_pool"
              value={formData.prize_pool}
              onChange={(e) => setFormData(prev => ({ ...prev, prize_pool: e.target.value }))}
              className="bg-slate-700 border-slate-600 text-white"
              placeholder="e.g., $500 or RP 5000"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="start_time" className="text-white">Start Time</Label>
            <Input
              id="start_time"
              type="datetime-local"
              value={formData.start_time}
              onChange={(e) => setFormData(prev => ({ ...prev, start_time: e.target.value }))}
              className="bg-slate-700 border-slate-600 text-white"
              required
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange?.(false)}
              className="border-slate-600 text-slate-300 hover:bg-slate-700"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              <Calendar className="w-4 h-4 mr-2" />
              {loading ? "Creating..." : "Create Tournament"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateTournamentDialog;
