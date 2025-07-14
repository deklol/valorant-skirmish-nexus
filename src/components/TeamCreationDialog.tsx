
import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, UserPlus, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Username } from "@/components/Username";

interface TeamCreationDialogProps {
  tournamentId: string;
  onTeamCreated: () => void;
}

interface Player {
  id: string;
  discord_username: string;
  riot_id: string;
  current_rank: string;
}

const TeamCreationDialog = ({ tournamentId, onTeamCreated }: TeamCreationDialogProps) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [teamName, setTeamName] = useState('');
  const [availablePlayers, setAvailablePlayers] = useState<Player[]>([]);
  const [selectedPlayers, setSelectedPlayers] = useState<Player[]>([]);
  const [captainId, setCaptainId] = useState<string>('');
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      fetchAvailablePlayers();
    }
  }, [open, tournamentId]);

  const fetchAvailablePlayers = async () => {
    try {
      // Get players who signed up for this tournament but aren't in a team yet
      const { data: signupsData, error } = await supabase
        .from('tournament_signups')
        .select(`
          user_id,
          users:user_id (
            id,
            discord_username,
            riot_id,
            current_rank
          )
        `)
        .eq('tournament_id', tournamentId);

      if (error) throw error;

      // Get players who are already in teams for this tournament
      const { data: teamMembersData, error: teamMembersError } = await supabase
        .from('team_members')
        .select(`
          user_id,
          teams!inner (tournament_id)
        `)
        .eq('teams.tournament_id', tournamentId);

      if (teamMembersError) throw teamMembersError;

      const playersInTeams = new Set(teamMembersData?.map(tm => tm.user_id) || []);
      
      const available = signupsData
        ?.filter(signup => !playersInTeams.has(signup.user_id))
        .map(signup => signup.users)
        .filter(Boolean) as Player[];

      setAvailablePlayers(available || []);
    } catch (error: any) {
      console.error('Error fetching available players:', error);
      toast({
        title: "Error",
        description: "Failed to load available players",
        variant: "destructive",
      });
    }
  };

  const addPlayer = (player: Player) => {
    if (selectedPlayers.length >= 5) {
      toast({
        title: "Team Full",
        description: "Teams can have a maximum of 5 players",
        variant: "destructive",
      });
      return;
    }

    if (!selectedPlayers.find(p => p.id === player.id)) {
      setSelectedPlayers([...selectedPlayers, player]);
      if (selectedPlayers.length === 0) {
        setCaptainId(player.id);
      }
    }
  };

  const removePlayer = (playerId: string) => {
    setSelectedPlayers(selectedPlayers.filter(p => p.id !== playerId));
    if (captainId === playerId && selectedPlayers.length > 1) {
      setCaptainId(selectedPlayers.find(p => p.id !== playerId)?.id || '');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (selectedPlayers.length < 2) {
      toast({
        title: "Not Enough Players",
        description: "Teams must have at least 2 players",
        variant: "destructive",
      });
      return;
    }

    if (!captainId) {
      toast({
        title: "No Captain Selected",
        description: "Please select a team captain",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      // Create the team
      const { data: teamData, error: teamError } = await supabase
        .from('teams')
        .insert({
          name: teamName,
          tournament_id: tournamentId,
          captain_id: captainId,
          status: 'pending'
        })
        .select()
        .single();

      if (teamError) throw teamError;

      // Add team members
      const teamMembers = selectedPlayers.map(player => ({
        team_id: teamData.id,
        user_id: player.id,
        is_captain: player.id === captainId
      }));

      const { error: membersError } = await supabase
        .from('team_members')
        .insert(teamMembers);

      if (membersError) throw membersError;

      toast({
        title: "Team Created",
        description: `Team "${teamName}" has been created successfully`,
      });

      setOpen(false);
      onTeamCreated();
      
      // Reset form
      setTeamName('');
      setSelectedPlayers([]);
      setCaptainId('');

    } catch (error: any) {
      console.error('Error creating team:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create team",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-red-600 hover:bg-red-700 text-white">
          <UserPlus className="w-4 h-4 mr-2" />
          Create Team
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Team</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="teamName">Team Name</Label>
            <Input
              id="teamName"
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              placeholder="Enter team name..."
              required
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Available Players */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-white">Available Players</h3>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {availablePlayers.map((player) => (
                  <Card 
                    key={player.id} 
                    className="bg-slate-700 border-slate-600 hover:bg-slate-600 cursor-pointer transition-colors"
                    onClick={() => addPlayer(player)}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between">
                        <div>
                           <Username username={player.discord_username} userId={player.id} size="sm" className="text-white font-medium" />
                          <div className="text-slate-400 text-sm">{player.riot_id}</div>
                          <div className="text-slate-400 text-sm">{player.current_rank || 'Unranked'}</div>
                        </div>
                        <UserPlus className="w-4 h-4 text-slate-400" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* Selected Players */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-white">Team Members ({selectedPlayers.length}/5)</h3>
              <div className="space-y-2">
                {selectedPlayers.map((player) => (
                  <Card key={player.id} className="bg-slate-800 border-slate-600">
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <Username username={player.discord_username} userId={player.id} size="sm" className="text-white font-medium" />
                            {captainId === player.id && (
                              <Badge className="bg-yellow-500/20 text-yellow-400">Captain</Badge>
                            )}
                          </div>
                          <div className="text-slate-400 text-sm">{player.riot_id}</div>
                          <div className="text-slate-400 text-sm">{player.current_rank || 'Unranked'}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          {selectedPlayers.length > 1 && (
                            <Select
                              value={captainId === player.id ? player.id : ''}
                              onValueChange={(value) => setCaptainId(value)}
                            >
                              <SelectTrigger className="w-32">
                                <SelectValue placeholder="Set Captain" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value={player.id}>Make Captain</SelectItem>
                              </SelectContent>
                            </Select>
                          )}
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => removePlayer(player.id)}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={loading || selectedPlayers.length < 2 || !teamName.trim()}
              className="bg-red-600 hover:bg-red-700"
            >
              {loading ? "Creating..." : "Create Team"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default TeamCreationDialog;
