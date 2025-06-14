
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, Trophy, Map, Settings } from "lucide-react";
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
    semifinal_match_format: "",
    final_match_format: "",
    team_size: 5,
    max_players: 50,
    max_teams: 10,
    prize_pool: "",
    start_time: "",
    enable_map_veto: false,
    map_veto_all_matches: false,
    map_veto_final_rounds_only: false,
  });
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const calculatedMaxTeams = Math.floor(formData.max_players / formData.team_size);
      
      // Calculate map veto required rounds based on selection
      let mapVetoRequiredRounds: number[] = [];
      if (formData.enable_map_veto && formData.map_veto_final_rounds_only) {
        // For final rounds only, we'll calculate this during bracket generation
        // But we can estimate: if 8+ teams, then rounds 3,4 (semi+final)
        const estimatedRounds = Math.ceil(Math.log2(calculatedMaxTeams));
        if (estimatedRounds >= 2) {
          mapVetoRequiredRounds = [estimatedRounds - 1, estimatedRounds]; // Semi and Final
        } else {
          mapVetoRequiredRounds = [estimatedRounds]; // Just Final
        }
      }
      
      const tournamentData = {
        name: formData.name,
        description: formData.description,
        match_format: formData.match_format as "BO1" | "BO3" | "BO5",
        semifinal_match_format: formData.semifinal_match_format || null,
        final_match_format: formData.final_match_format || null,
        team_size: formData.team_size,
        max_players: formData.max_players,
        max_teams: calculatedMaxTeams,
        prize_pool: formData.prize_pool,
        start_time: formData.start_time,
        enable_map_veto: formData.enable_map_veto,
        map_veto_required_rounds: formData.map_veto_all_matches ? [] : mapVetoRequiredRounds,
        status: 'draft' as const
      };

      const { data, error } = await supabase
        .from('tournaments')
        .insert(tournamentData)
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
        semifinal_match_format: "",
        final_match_format: "",
        team_size: 5,
        max_players: 50,
        max_teams: 10,
        prize_pool: "",
        start_time: "",
        enable_map_veto: false,
        map_veto_all_matches: false,
        map_veto_final_rounds_only: false,
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
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto bg-slate-800 border-slate-700">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <Trophy className="w-5 h-5 text-yellow-500" />
            Create New Tournament
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <Card className="bg-slate-700 border-slate-600">
            <CardHeader>
              <CardTitle className="text-white text-lg">Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
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
              </div>

              <div className="grid grid-cols-2 gap-4">
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
              </div>
            </CardContent>
          </Card>

          {/* Match Format Settings */}
          <Card className="bg-slate-700 border-slate-600">
            <CardHeader>
              <CardTitle className="text-white text-lg flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Match Format Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="match_format" className="text-white">Standard Matches</Label>
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

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="semifinal_match_format" className="text-white">Semifinals (Optional Override)</Label>
                  <Select
                    value={formData.semifinal_match_format}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, semifinal_match_format: value }))}
                  >
                    <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                      <SelectValue placeholder="Same as standard" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Same as standard</SelectItem>
                      <SelectItem value="BO1">Best of 1</SelectItem>
                      <SelectItem value="BO3">Best of 3</SelectItem>
                      <SelectItem value="BO5">Best of 5</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="final_match_format" className="text-white">Finals (Optional Override)</Label>
                  <Select
                    value={formData.final_match_format}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, final_match_format: value }))}
                  >
                    <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                      <SelectValue placeholder="Same as standard" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Same as standard</SelectItem>
                      <SelectItem value="BO1">Best of 1</SelectItem>
                      <SelectItem value="BO3">Best of 3</SelectItem>
                      <SelectItem value="BO5">Best of 5</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Map Veto Settings */}
          <Card className="bg-slate-700 border-slate-600">
            <CardHeader>
              <CardTitle className="text-white text-lg flex items-center gap-2">
                <Map className="w-5 h-5" />
                Map Veto Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="enable_map_veto"
                  checked={formData.enable_map_veto}
                  onCheckedChange={(checked) => 
                    setFormData(prev => ({ 
                      ...prev, 
                      enable_map_veto: !!checked,
                      map_veto_all_matches: false,
                      map_veto_final_rounds_only: false
                    }))
                  }
                />
                <Label htmlFor="enable_map_veto" className="text-white">
                  Enable Map Veto System
                </Label>
              </div>

              {formData.enable_map_veto && (
                <div className="ml-6 space-y-3">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="map_veto_all_matches"
                      checked={formData.map_veto_all_matches}
                      onCheckedChange={(checked) => 
                        setFormData(prev => ({ 
                          ...prev, 
                          map_veto_all_matches: !!checked,
                          map_veto_final_rounds_only: checked ? false : prev.map_veto_final_rounds_only
                        }))
                      }
                    />
                    <Label htmlFor="map_veto_all_matches" className="text-white">
                      All matches require map veto
                    </Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="map_veto_final_rounds_only"
                      checked={formData.map_veto_final_rounds_only}
                      onCheckedChange={(checked) => 
                        setFormData(prev => ({ 
                          ...prev, 
                          map_veto_final_rounds_only: !!checked,
                          map_veto_all_matches: checked ? false : prev.map_veto_all_matches
                        }))
                      }
                    />
                    <Label htmlFor="map_veto_final_rounds_only" className="text-white">
                      Final rounds only (Semifinals + Finals)
                    </Label>
                  </div>

                  {!formData.map_veto_all_matches && !formData.map_veto_final_rounds_only && (
                    <p className="text-slate-400 text-sm ml-6">
                      Admins can enable map veto per match during tournament
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

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
