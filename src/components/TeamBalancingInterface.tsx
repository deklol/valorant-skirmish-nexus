import { useState, useEffect } from 'react';
import { DndContext, closestCenter, DragEndEvent, DragOverlay, useDraggable, useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Users, Shuffle, Save, Plus, GripVertical } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { getRankPoints, calculateTeamBalance } from "@/utils/rankingSystem";

interface TeamBalancingInterfaceProps {
  tournamentId: string;
  maxTeams: number;
  teamSize: number;
  onTeamsUpdated?: () => void;
}

interface Player {
  id: string;
  discord_username: string;
  rank_points: number;
  weight_rating: number;
  current_rank: string;
  riot_id?: string;
}

interface Team {
  id: string;
  name: string;
  members: Player[];
  totalWeight: number;
  isPlaceholder?: boolean;
}

// Draggable Player Component
const DraggablePlayer = ({ player }: { player: Player }) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: player.id,
  });

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
  } : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`flex items-center justify-between p-2 bg-slate-700 rounded cursor-move transition-opacity ${
        isDragging ? 'opacity-50' : ''
      }`}
    >
      <div className="flex items-center gap-2">
        <GripVertical className="w-4 h-4 text-slate-400" />
        <div>
          <span className="text-white font-medium">{player.discord_username}</span>
          <div className="text-xs text-slate-400">
            {player.current_rank} • {player.weight_rating} pts
          </div>
        </div>
      </div>
    </div>
  );
};

// Droppable Team Component
const DroppableTeam = ({ team, teamSize }: { team: Team; teamSize: number }) => {
  const { isOver, setNodeRef } = useDroppable({
    id: team.isPlaceholder ? `placeholder-${team.id}` : `team-${team.id}`,
  });

  return (
    <Card className="bg-slate-800 border-slate-700">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-white text-lg flex items-center gap-2">
            {team.name}
            {team.isPlaceholder && (
              <Badge variant="outline" className="text-xs text-slate-400 border-slate-600">
                Placeholder
              </Badge>
            )}
          </CardTitle>
          <Badge className="bg-indigo-600 text-white">
            {team.totalWeight} pts
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div 
          ref={setNodeRef}
          className={`space-y-2 min-h-[100px] border-2 border-dashed rounded-lg p-4 transition-colors ${
            isOver ? 'border-blue-400 bg-blue-900/20' : 'border-slate-600'
          }`}
        >
          {team.members.length === 0 ? (
            <p className="text-slate-400 text-center py-4">
              Drop players here
              {teamSize > 1 && ` (max ${teamSize} players)`}
            </p>
          ) : (
            team.members.map((player, playerIndex) => (
              <DraggablePlayer key={player.id} player={player} />
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
};

// Droppable Unassigned Area
const DroppableUnassigned = ({ players }: { players: Player[] }) => {
  const { isOver, setNodeRef } = useDroppable({
    id: 'unassigned',
  });

  return (
    <Card className="bg-slate-800 border-slate-700 min-h-[200px]">
      <CardContent className="p-4">
        <div 
          ref={setNodeRef}
          className={`space-y-2 min-h-[150px] border-2 border-dashed rounded-lg p-4 transition-colors ${
            isOver ? 'border-blue-400 bg-blue-900/20' : 'border-slate-600'
          }`}
        >
          {players.length === 0 ? (
            <p className="text-slate-400 text-center py-8">
              All players assigned to teams
            </p>
          ) : (
            players.map(player => (
              <DraggablePlayer key={player.id} player={player} />
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
};

const TeamBalancingInterface = ({ tournamentId, maxTeams, teamSize, onTeamsUpdated }: TeamBalancingInterfaceProps) => {
  const [teams, setTeams] = useState<Team[]>([]);
  const [unassignedPlayers, setUnassignedPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [creatingTeams, setCreatingTeams] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchTeamsAndPlayers();
  }, [tournamentId]);

  const fetchTeamsAndPlayers = async () => {
    setLoading(true);
    try {
      console.log('Fetching teams and players for tournament:', tournamentId);
      
      // Fetch teams with their members
      const { data: teamsData, error: teamsError } = await supabase
        .from('teams')
        .select(`
          id,
          name,
          team_members (
            user_id,
            users (
              id,
              discord_username,
              rank_points,
              weight_rating,
              current_rank,
              riot_id
            )
          )
        `)
        .eq('tournament_id', tournamentId);

      if (teamsError) throw teamsError;

      // Fetch tournament participants to find unassigned players
      const { data: participantsData, error: participantsError } = await supabase
        .from('tournament_signups')
        .select(`
          user_id,
          users (
            id,
            discord_username,
            rank_points,
            weight_rating,
            current_rank,
            riot_id
          )
        `)
        .eq('tournament_id', tournamentId);

      if (participantsError) throw participantsError;

      // Process teams
      const processedTeams: Team[] = (teamsData || []).map(team => {
        const members = team.team_members
          .map(member => member.users)
          .filter(user => user)
          .map(user => ({
            id: user.id,
            discord_username: user.discord_username || 'Unknown',
            rank_points: user.rank_points || 0,
            weight_rating: user.weight_rating || getRankPoints(user.current_rank || 'Unranked'),
            current_rank: user.current_rank || 'Unranked',
            riot_id: user.riot_id
          }));

        const totalWeight = members.reduce((sum, member) => sum + member.weight_rating, 0);

        return {
          id: team.id,
          name: team.name,
          members,
          totalWeight
        };
      });

      // Find unassigned players
      const allAssignedUserIds = new Set(
        processedTeams.flatMap(team => team.members.map(member => member.id))
      );

      const unassigned = (participantsData || [])
        .map(participant => participant.users)
        .filter(user => user && !allAssignedUserIds.has(user.id))
        .map(user => ({
          id: user.id,
          discord_username: user.discord_username || 'Unknown',
          rank_points: user.rank_points || 0,
          weight_rating: user.weight_rating || getRankPoints(user.current_rank || 'Unranked'),
          current_rank: user.current_rank || 'Unranked',
          riot_id: user.riot_id
        }));

      // If no teams exist, create placeholder teams
      let finalTeams = processedTeams;
      if (processedTeams.length === 0) {
        finalTeams = createPlaceholderTeams();
      }

      setTeams(finalTeams);
      setUnassignedPlayers(unassigned);
    } catch (error: any) {
      console.error('Error fetching teams and players:', error);
      toast({
        title: "Error",
        description: "Failed to load teams and players",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const createPlaceholderTeams = (): Team[] => {
    const placeholderTeams: Team[] = [];
    
    for (let i = 0; i < maxTeams; i++) {
      const teamName = `Team ${String.fromCharCode(65 + i)}`; // Team A, Team B, etc.
      placeholderTeams.push({
        id: `placeholder-${i}`,
        name: teamName,
        members: [],
        totalWeight: 0,
        isPlaceholder: true
      });
    }
    
    return placeholderTeams;
  };

  const createEmptyTeams = async () => {
    setCreatingTeams(true);
    try {
      const teamsToCreate = [];
      
      for (let i = 0; i < maxTeams; i++) {
        const teamName = `Team ${String.fromCharCode(65 + i)}`;
        teamsToCreate.push({
          name: teamName,
          tournament_id: tournamentId,
          total_rank_points: 0,
          seed: i + 1
        });
      }

      const { data: createdTeams, error } = await supabase
        .from('teams')
        .insert(teamsToCreate)
        .select();

      if (error) throw error;

      toast({
        title: "Teams Created",
        description: `Created ${maxTeams} empty teams for manual balancing`,
      });

      // Refresh the data
      await fetchTeamsAndPlayers();
      onTeamsUpdated?.();
    } catch (error: any) {
      console.error('Error creating teams:', error);
      toast({
        title: "Error",
        description: "Failed to create teams",
        variant: "destructive",
      });
    } finally {
      setCreatingTeams(false);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (!over || active.id === over.id) return;

    const playerId = active.id as string;
    const targetId = over.id as string;

    // Find the player being moved
    let player: Player | null = null;
    let sourceTeamId: string | null = null;

    // Check unassigned players
    const unassignedIndex = unassignedPlayers.findIndex(p => p.id === playerId);
    if (unassignedIndex !== -1) {
      player = unassignedPlayers[unassignedIndex];
    } else {
      // Check teams
      for (const team of teams) {
        const memberIndex = team.members.findIndex(p => p.id === playerId);
        if (memberIndex !== -1) {
          player = team.members[memberIndex];
          sourceTeamId = team.id;
          break;
        }
      }
    }

    if (!player) return;

    // Handle movement
    if (targetId === 'unassigned') {
      movePlayerToUnassigned(player, sourceTeamId);
    } else if (targetId.startsWith('team-') || targetId.startsWith('placeholder-')) {
      const teamId = targetId.replace('team-', '').replace('placeholder-', '');
      const targetTeam = teams.find(t => t.id === teamId || t.id === `placeholder-${teamId}`);
      
      if (targetTeam) {
        // Check team capacity
        if (targetTeam.members.length >= teamSize) {
          toast({
            title: "Team Full",
            description: `Team ${targetTeam.name} is already at maximum capacity (${teamSize} players)`,
            variant: "destructive",
          });
          return;
        }
        
        movePlayerToTeam(player, targetTeam.id, sourceTeamId);
      }
    }
  };

  const movePlayerToUnassigned = (player: Player, sourceTeamId: string | null) => {
    if (sourceTeamId) {
      setTeams(prevTeams => 
        prevTeams.map(team => {
          if (team.id === sourceTeamId) {
            const newMembers = team.members.filter(p => p.id !== player.id);
            const totalWeight = newMembers.reduce((sum, member) => sum + member.weight_rating, 0);
            return { ...team, members: newMembers, totalWeight };
          }
          return team;
        })
      );
    }
    
    setUnassignedPlayers(prev => {
      if (prev.some(p => p.id === player.id)) return prev;
      return [...prev, player];
    });
  };

  const movePlayerToTeam = (player: Player, targetTeamId: string, sourceTeamId: string | null) => {
    // Remove from source
    if (sourceTeamId) {
      setTeams(prevTeams => 
        prevTeams.map(team => {
          if (team.id === sourceTeamId) {
            const newMembers = team.members.filter(p => p.id !== player.id);
            const totalWeight = newMembers.reduce((sum, member) => sum + member.weight_rating, 0);
            return { ...team, members: newMembers, totalWeight };
          }
          return team;
        })
      );
    } else {
      setUnassignedPlayers(prev => prev.filter(p => p.id !== player.id));
    }

    // Add to target team
    setTeams(prevTeams => 
      prevTeams.map(team => {
        if (team.id === targetTeamId) {
          const newMembers = [...team.members, player];
          const totalWeight = newMembers.reduce((sum, member) => sum + member.weight_rating, 0);
          return { ...team, members: newMembers, totalWeight };
        }
        return team;
      })
    );
  };

  // Sort team members by highest weight before saving (captain = first player highest rating)
  const saveTeamChanges = async () => {
    setSaving(true);
    try {
      // Re-sort members in each team by weight_rating descending
      let reorderedTeams = teams.map(team => {
        const sortedMembers = [...team.members].sort((a, b) => b.weight_rating - a.weight_rating);
        return { ...team, members: sortedMembers };
      });
      // First, create any placeholder teams that have members
      const teamsWithMembers = reorderedTeams.filter(team => team.members.length > 0);

      for (const team of teamsWithMembers) {
        if (team.isPlaceholder) {
          // Create the team in database
          const { data: newTeam, error: createError } = await supabase
            .from('teams')
            .insert({
              name: team.name,
              tournament_id: tournamentId,
              total_rank_points: team.totalWeight,
              seed: reorderedTeams.indexOf(team) + 1
            })
            .select()
            .single();

          if (createError) throw createError;

          // Add the team members (captain = highest weight)
          const membersToInsert = team.members.map((member, index) => ({
            team_id: newTeam.id,
            user_id: member.id,
            is_captain: index === 0 // First member is captain!
          }));

          const { error: membersError } = await supabase
            .from('team_members')
            .insert(membersToInsert);

          if (membersError) throw membersError;
        } else {
          // Update existing team
          await supabase
            .from('teams')
            .update({ total_rank_points: team.totalWeight })
            .eq('id', team.id);

          // Remove all current members
          await supabase
            .from('team_members')
            .delete()
            .eq('team_id', team.id);

          // Add the new members (captain = highest weight)
          if (team.members.length > 0) {
            const membersToInsert = team.members.map((member, index) => ({
              team_id: team.id,
              user_id: member.id,
              is_captain: index === 0 // First member is captain!
            }));

            await supabase
              .from('team_members')
              .insert(membersToInsert);
          }
        }
      }

      toast({
        title: "Teams Updated",
        description: "Team assignments have been saved successfully, with captains auto-assigned.",
      });

      // Refresh the data
      await fetchTeamsAndPlayers();
      onTeamsUpdated?.();
    } catch (error: any) {
      console.error('Error saving team changes:', error);
      toast({
        title: "Error",
        description: "Failed to save team changes",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const getBalanceAnalysis = () => {
    const teamsWithMembers = teams.filter(team => team.members.length > 0);
    if (teamsWithMembers.length < 2) return null;

    const teamWeights = teamsWithMembers.map(team => team.totalWeight);
    const maxWeight = Math.max(...teamWeights);
    const minWeight = Math.min(...teamWeights);
    
    return calculateTeamBalance(maxWeight, minWeight);
  };

  if (loading) {
    return (
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Users className="w-5 h-5" />
            Team Balancing
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center items-center h-40">
            <p className="text-slate-400">Loading teams...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const balance = getBalanceAnalysis();
  const hasPlaceholderTeams = teams.some(team => team.isPlaceholder);

  return (
    <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <div className="space-y-6">
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Users className="w-5 h-5" />
              Manual Team Balancing
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-slate-300 text-sm">
              <p>Drag and drop players between teams to manually balance them.</p>
              <p className="mt-1">
                Tournament setup: {maxTeams} teams, {teamSize}v{teamSize} format
                {teamSize === 1 ? ' (1v1 - each player gets their own team)' : ` (${teamSize} players per team)`}
              </p>
            </div>

            {balance && (
              <div className="flex items-center justify-between p-3 bg-slate-700 rounded-lg">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-yellow-400" />
                  <span className="text-white text-sm">Balance Status:</span>
                  <Badge className={`${balance.statusColor} bg-slate-600 border-slate-500`}>
                    {balance.balanceStatus.toUpperCase()}
                  </Badge>
                </div>
                <div className="text-right">
                  <span className="text-slate-300 text-sm">
                    Weight difference: {balance.delta} points
                  </span>
                  <p className={`text-xs ${balance.statusColor} mt-1`}>
                    {balance.statusMessage}
                  </p>
                </div>
              </div>
            )}

            <div className="flex gap-2">
              {hasPlaceholderTeams && (
                <Button
                  onClick={createEmptyTeams}
                  disabled={creatingTeams}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  {creatingTeams ? 'Creating...' : 'Create Team Slots'}
                </Button>
              )}
              
              <Button
                onClick={saveTeamChanges}
                disabled={saving || hasPlaceholderTeams}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                <Save className="w-4 h-4 mr-2" />
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>

            {hasPlaceholderTeams && (
              <div className="p-3 bg-blue-900/20 border border-blue-500/30 rounded-lg">
                <p className="text-blue-400 text-sm">
                  Click "Create Team Slots" to create {maxTeams} empty teams for manual player assignment.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            <h3 className="text-white font-medium flex items-center gap-2">
              <Shuffle className="w-4 h-4" />
              Teams ({teams.length}/{maxTeams})
            </h3>
            {teams.map((team) => (
              <DroppableTeam key={team.id} team={team} teamSize={teamSize} />
            ))}
          </div>

          <div className="space-y-4">
            <h3 className="text-white font-medium">Unassigned Players ({unassignedPlayers.length})</h3>
            <DroppableUnassigned players={unassignedPlayers} />
          </div>
        </div>
      </div>
    </DndContext>
  );
};

export default TeamBalancingInterface;
