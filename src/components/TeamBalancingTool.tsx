import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Users, UserPlus, Shuffle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import DraggablePlayer from "./DraggablePlayer";
import DroppableTeam from "./DroppableTeam";
import PhantomPlayerDialog from "./PhantomPlayerDialog";
import { getRankPoints, autoBalanceTeams, calculateTeamBalance } from "@/utils/rankingSystem";

interface Player {
  id: string;
  discord_username: string;
  riot_id: string;
  current_rank: string;
  weight_rating: number;
  is_phantom: boolean;
  name?: string;
}

interface Team {
  id: string;
  name: string;
  players: Player[];
  totalPoints: number;
}

interface TeamBalancingToolProps {
  tournamentId: string;
  maxTeams: number;
  onTeamsBalanced: () => void;
}

const TeamBalancingTool = ({ tournamentId, maxTeams, onTeamsBalanced }: TeamBalancingToolProps) => {
  const [open, setOpen] = useState(false);
  const [availablePlayers, setAvailablePlayers] = useState<Player[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [activePlayer, setActivePlayer] = useState<Player | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      fetchPlayersAndTeams();
    }
  }, [open, tournamentId]);

  const fetchPlayersAndTeams = async () => {
    try {
      console.log('Fetching players and teams for tournament:', tournamentId);
      
      // Get signed up players
      const { data: signupsData, error: signupsError } = await supabase
        .from('tournament_signups')
        .select(`
          user_id,
          users!inner (
            id,
            discord_username,
            riot_id,
            current_rank,
            weight_rating,
            is_phantom
          )
        `)
        .eq('tournament_id', tournamentId);

      if (signupsError) throw signupsError;

      // Get phantom players for this tournament
      const { data: phantomData, error: phantomError } = await supabase
        .from('phantom_players')
        .select('*')
        .eq('tournament_id', tournamentId);

      if (phantomError) throw phantomError;

      // Get existing teams
      const { data: teamsData, error: teamsError } = await supabase
        .from('teams')
        .select(`
          id,
          name,
          team_members (
            user_id,
            users!inner (
              id,
              discord_username,
              riot_id,
              current_rank,
              weight_rating,
              is_phantom
            )
          )
        `)
        .eq('tournament_id', tournamentId);

      if (teamsError) throw teamsError;

      // Process real players
      const realPlayers: Player[] = signupsData
        ?.map(signup => {
          const user = signup.users;
          if (!user || user.is_phantom) return null;
          return {
            id: user.id,
            discord_username: user.discord_username || '',
            riot_id: user.riot_id || '',
            current_rank: user.current_rank || 'Unranked',
            weight_rating: user.weight_rating || getRankPoints('Unranked'),
            is_phantom: false
          };
        })
        .filter(Boolean) as Player[];

      // Process phantom players
      const phantomPlayers: Player[] = phantomData?.map(phantom => ({
        id: phantom.id,
        discord_username: phantom.name,
        riot_id: phantom.name,
        current_rank: 'Phantom',
        weight_rating: phantom.weight_rating || getRankPoints('Phantom'),
        is_phantom: true,
        name: phantom.name
      })) || [];

      const allPlayers = [...realPlayers, ...phantomPlayers];

      // Get players already in teams
      const playersInTeams = new Set();
      const processedTeams: Team[] = teamsData?.map(team => {
        const teamPlayers: Player[] = team.team_members
          .map(member => {
            const user = member.users;
            if (!user) return null;
            playersInTeams.add(user.id);
            return {
              id: user.id,
              discord_username: user.discord_username || '',
              riot_id: user.riot_id || '',
              current_rank: user.current_rank || 'Unranked',
              weight_rating: user.weight_rating || getRankPoints('Unranked'),
              is_phantom: user.is_phantom || false
            };
          })
          .filter(Boolean) as Player[];
        
        const totalPoints = teamPlayers.reduce((sum, p) => 
          sum + getRankPoints(p.current_rank || 'Unranked'), 0
        );
        
        return {
          id: team.id,
          name: team.name,
          players: teamPlayers,
          totalPoints
        };
      }) || [];

      // Available players are those not in teams
      const available = allPlayers.filter(player => !playersInTeams.has(player.id));

      setAvailablePlayers(available);
      setTeams(processedTeams);

    } catch (error: any) {
      console.error('Error fetching data:', error);
      toast({
        title: "Error",
        description: "Failed to load players and teams",
        variant: "destructive",
      });
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const player = findPlayer(active.id as string);
    setActivePlayer(player);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (!over) {
      setActivePlayer(null);
      return;
    }

    const playerId = active.id as string;
    const targetId = over.id as string;

    // Moving to available players pool
    if (targetId === 'available') {
      movePlayerToAvailable(playerId);
    }
    // Moving to a team
    else if (targetId.startsWith('team-')) {
      const teamId = targetId.replace('team-', '');
      const targetTeam = teams.find(t => t.id === teamId);
      
      // Check if team is already full before allowing the move
      if (targetTeam && targetTeam.players.length >= 5) {
        toast({
          title: "Team Full",
          description: "Teams can have a maximum of 5 players",
          variant: "destructive",
        });
        setActivePlayer(null);
        return;
      }
      
      movePlayerToTeam(playerId, teamId);
    }

    setActivePlayer(null);
  };

  const findPlayer = (playerId: string): Player | null => {
    // Check available players
    const availablePlayer = availablePlayers.find(p => p.id === playerId);
    if (availablePlayer) return availablePlayer;

    // Check teams
    for (const team of teams) {
      const teamPlayer = team.players.find(p => p.id === playerId);
      if (teamPlayer) return teamPlayer;
    }

    return null;
  };

  const movePlayerToAvailable = (playerId: string) => {
    const player = findPlayer(playerId);
    if (!player) return;

    // Remove from team if exists
    setTeams(prevTeams => 
      prevTeams.map(team => {
        const newPlayers = team.players.filter(p => p.id !== playerId);
        return {
          ...team,
          players: newPlayers,
          totalPoints: newPlayers.reduce((sum, p) => 
            sum + getRankPoints(p.current_rank || 'Unranked'), 0
          )
        };
      })
    );

    // Add to available if not already there
    setAvailablePlayers(prev => {
      if (prev.find(p => p.id === playerId)) return prev;
      return [...prev, player];
    });
  };

  const movePlayerToTeam = (playerId: string, teamId: string) => {
    const player = findPlayer(playerId);
    if (!player) return;

    const targetTeam = teams.find(t => t.id === teamId);
    if (!targetTeam) return;

    // Double-check team capacity
    if (targetTeam.players.length >= 5) {
      toast({
        title: "Team Full",
        description: "Teams can have a maximum of 5 players",
        variant: "destructive",
      });
      return;
    }

    // Remove from available players
    setAvailablePlayers(prev => prev.filter(p => p.id !== playerId));

    // Remove from other teams and add to target team
    setTeams(prevTeams => 
      prevTeams.map(team => {
        if (team.id === teamId) {
          // Add to target team
          const newPlayers = [...team.players.filter(p => p.id !== playerId), player];
          return {
            ...team,
            players: newPlayers,
            totalPoints: newPlayers.reduce((sum, p) => 
              sum + getRankPoints(p.current_rank || 'Unranked'), 0
            )
          };
        } else {
          // Remove from other teams
          const newPlayers = team.players.filter(p => p.id !== playerId);
          return {
            ...team,
            players: newPlayers,
            totalPoints: newPlayers.reduce((sum, p) => 
              sum + getRankPoints(p.current_rank || 'Unranked'), 0
            )
          };
        }
      })
    );
  };

  const createEmptyTeams = () => {
    const newTeams: Team[] = [];
    for (let i = 1; i <= maxTeams; i++) {
      newTeams.push({
        id: `temp-${i}`,
        name: `Team ${i}`,
        players: [],
        totalPoints: 0
      });
    }
    setTeams(newTeams);
  };

  const autoBalance = () => {
    if (availablePlayers.length === 0) return;

    const balancedTeams = autoBalanceTeams(availablePlayers, maxTeams);
    setTeams(balancedTeams);
    setAvailablePlayers([]);
  };

  const fillWithPhantoms = async () => {
    const playersNeeded = (maxTeams * 5) - availablePlayers.length - teams.reduce((sum, team) => sum + team.players.length, 0);
    
    if (playersNeeded <= 0) {
      toast({
        title: "Tournament Full",
        description: "Tournament already has enough players",
      });
      return;
    }

    setLoading(true);
    try {
      const phantoms = [];
      for (let i = 1; i <= playersNeeded; i++) {
        phantoms.push({
          name: `Phantom ${i}`,
          weight_rating: getRankPoints('Phantom'),
          tournament_id: tournamentId
        });
      }

      const { data, error } = await supabase
        .from('phantom_players')
        .insert(phantoms)
        .select();

      if (error) throw error;

      // Refresh the players list to include new phantoms
      await fetchPlayersAndTeams();

      toast({
        title: "Phantom Players Added",
        description: `Added ${playersNeeded} phantom players to fill the tournament`,
      });

    } catch (error: any) {
      console.error('Error adding phantom players:', error);
      toast({
        title: "Error",
        description: "Failed to add phantom players",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const saveTeams = async () => {
    setLoading(true);
    try {
      // Delete existing teams for this tournament
      await supabase
        .from('teams')
        .delete()
        .eq('tournament_id', tournamentId);

      // Create new teams
      for (const team of teams) {
        if (team.players.length === 0) continue;

        const { data: teamData, error: teamError } = await supabase
          .from('teams')
          .insert({
            name: team.name,
            tournament_id: tournamentId,
            captain_id: team.players[0]?.id,
            status: 'confirmed',
            total_rank_points: team.totalPoints
          })
          .select()
          .single();

        if (teamError) throw teamError;

        // Add team members
        const teamMembers = team.players.map((player, index) => ({
          team_id: teamData.id,
          user_id: player.id,
          is_captain: index === 0
        }));

        const { error: membersError } = await supabase
          .from('team_members')
          .insert(teamMembers);

        if (membersError) throw membersError;
      }

      toast({
        title: "Teams Saved",
        description: "Team balancing has been saved successfully",
      });

      setOpen(false);
      onTeamsBalanced();

    } catch (error: any) {
      console.error('Error saving teams:', error);
      toast({
        title: "Error",
        description: "Failed to save teams",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Calculate balance metrics for teams with players
  const teamsWithPlayers = teams.filter(team => team.players.length > 0);
  const balanceMetrics = teamsWithPlayers.length >= 2 ? 
    calculateTeamBalance(teamsWithPlayers[0]?.totalPoints || 0, teamsWithPlayers[1]?.totalPoints || 0) : null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-blue-600 hover:bg-blue-700 text-white">
          <Shuffle className="w-4 h-4 mr-2" />
          Balance Teams
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-7xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Team Balancing Tool - TGH Skirmish Ranking System</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex gap-2 flex-wrap">
            <Button onClick={createEmptyTeams} variant="outline">
              <Users className="w-4 h-4 mr-2" />
              Create {maxTeams} Teams
            </Button>
            <Button onClick={autoBalance} variant="outline">
              <Shuffle className="w-4 h-4 mr-2" />
              Auto Balance
            </Button>
            <Button onClick={fillWithPhantoms} variant="outline" disabled={loading}>
              <UserPlus className="w-4 h-4 mr-2" />
              Fill with Phantoms
            </Button>
            <PhantomPlayerDialog 
              tournamentId={tournamentId} 
              onPhantomAdded={fetchPlayersAndTeams}
            />
          </div>

          {balanceMetrics && (
            <div className="p-4 bg-slate-700 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-slate-300">Team Balance Analysis</span>
                <Badge variant={
                  balanceMetrics.balanceStatus === 'ideal' ? 'default' :
                  balanceMetrics.balanceStatus === 'good' ? 'secondary' :
                  balanceMetrics.balanceStatus === 'warning' ? 'outline' : 'destructive'
                }>
                  {balanceMetrics.balanceStatus === 'ideal' && '🎯 Ideal'}
                  {balanceMetrics.balanceStatus === 'good' && '✅ Good'}
                  {balanceMetrics.balanceStatus === 'warning' && '⚠️ Warning'}
                  {balanceMetrics.balanceStatus === 'poor' && '🚨 Poor'}
                </Badge>
              </div>
              <div className="text-sm text-slate-400 mt-1">
                Point Delta: {balanceMetrics.delta} 
                {balanceMetrics.delta <= 25 && ' (Ideal: 0-25)'}
                {balanceMetrics.delta > 25 && balanceMetrics.delta <= 50 && ' (Good: 26-50)'}
                {balanceMetrics.delta > 50 && ' (⚠️ Above 50 - Consider rebalancing)'}
              </div>
            </div>
          )}

          <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              {/* Available Players */}
              <div className="lg:col-span-1">
                <Card>
                  <CardHeader>
                    <CardTitle>Available Players ({availablePlayers.length})</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <SortableContext 
                      items={availablePlayers.map(p => p.id)} 
                      strategy={verticalListSortingStrategy}
                      id="available"
                    >
                      <div className="space-y-2 min-h-[400px] border-2 border-dashed border-slate-600 rounded p-2">
                        {availablePlayers.map((player) => (
                          <DraggablePlayer key={player.id} player={player} />
                        ))}
                      </div>
                    </SortableContext>
                  </CardContent>
                </Card>
              </div>

              {/* Teams */}
              <div className="lg:col-span-3">
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {teams.map((team) => (
                    <DroppableTeam key={team.id} team={team} />
                  ))}
                </div>
              </div>
            </div>

            <DragOverlay>
              {activePlayer ? <DraggablePlayer player={activePlayer} /> : null}
            </DragOverlay>
          </DndContext>

          <div className="flex justify-end space-x-2 pt-4">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={saveTeams}
              disabled={loading || teams.every(team => team.players.length === 0)}
              className="bg-green-600 hover:bg-green-700"
            >
              {loading ? "Saving..." : "Save Teams"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TeamBalancingTool;
