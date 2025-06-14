
import { useState, useEffect } from 'react';
import { DndContext, closestCenter, DragEndEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Users, Shuffle, Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import DraggablePlayer from './DraggablePlayer';
import DroppableTeam from './DroppableTeam';

interface TeamBalancingInterfaceProps {
  tournamentId: string;
  onTeamsUpdated?: () => void;
}

interface Player {
  id: string;
  discord_username: string;
  rank_points: number;
  riot_id?: string;
}

interface Team {
  id: string;
  name: string;
  members: Player[];
  avgRankScore: number;
}

const TeamBalancingInterface = ({ tournamentId, onTeamsUpdated }: TeamBalancingInterfaceProps) => {
  const [teams, setTeams] = useState<Team[]>([]);
  const [unassignedPlayers, setUnassignedPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
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
              riot_id
            )
          )
        `)
        .eq('tournament_id', tournamentId);

      if (teamsError) throw teamsError;

      console.log('Teams data:', teamsData);

      // Fetch tournament participants to find unassigned players
      const { data: participantsData, error: participantsError } = await supabase
        .from('tournament_signups')
        .select(`
          user_id,
          users (
            id,
            discord_username,
            rank_points,
            riot_id
          )
        `)
        .eq('tournament_id', tournamentId);

      if (participantsError) throw participantsError;

      console.log('Participants data:', participantsData);

      // Process teams
      const processedTeams: Team[] = (teamsData || []).map(team => {
        const members = team.team_members
          .map(member => member.users)
          .filter(user => user)
          .map(user => ({
            id: user.id,
            discord_username: user.discord_username || 'Unknown',
            rank_points: user.rank_points || 0,
            riot_id: user.riot_id
          }));

        const avgRankScore = members.length > 0 
          ? members.reduce((sum, member) => sum + member.rank_points, 0) / members.length
          : 0;

        return {
          id: team.id,
          name: team.name,
          members,
          avgRankScore
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
          riot_id: user.riot_id
        }));

      console.log('Processed teams:', processedTeams);
      console.log('Unassigned players:', unassigned);

      setTeams(processedTeams);
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

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (!over || active.id === over.id) return;

    const playerId = active.id as string;
    const targetId = over.id as string;

    console.log('Drag end - Player:', playerId, 'Target:', targetId);

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

    if (!player) {
      console.error('Player not found:', playerId);
      return;
    }

    // Handle movement
    if (targetId === 'unassigned') {
      // Moving to unassigned
      movePlayerToUnassigned(player, sourceTeamId);
    } else if (targetId.startsWith('team-')) {
      // Moving to a team
      const teamId = targetId.replace('team-', '');
      movePlayerToTeam(player, teamId, sourceTeamId);
    }
  };

  const movePlayerToUnassigned = (player: Player, sourceTeamId: string | null) => {
    console.log('Moving player to unassigned:', player, 'from team:', sourceTeamId);
    
    if (sourceTeamId) {
      // Remove from team
      setTeams(prevTeams => 
        prevTeams.map(team => {
          if (team.id === sourceTeamId) {
            const newMembers = team.members.filter(p => p.id !== player.id);
            const avgRankScore = newMembers.length > 0 
              ? newMembers.reduce((sum, member) => sum + member.rank_points, 0) / newMembers.length
              : 0;
            return { ...team, members: newMembers, avgRankScore };
          }
          return team;
        })
      );
    }
    
    // Add to unassigned (if not already there)
    setUnassignedPlayers(prev => {
      if (prev.some(p => p.id === player.id)) return prev;
      return [...prev, player];
    });
  };

  const movePlayerToTeam = (player: Player, targetTeamId: string, sourceTeamId: string | null) => {
    console.log('Moving player to team:', player, 'to team:', targetTeamId, 'from:', sourceTeamId);
    
    // Remove from source
    if (sourceTeamId) {
      setTeams(prevTeams => 
        prevTeams.map(team => {
          if (team.id === sourceTeamId) {
            const newMembers = team.members.filter(p => p.id !== player.id);
            const avgRankScore = newMembers.length > 0 
              ? newMembers.reduce((sum, member) => sum + member.rank_points, 0) / newMembers.length
              : 0;
            return { ...team, members: newMembers, avgRankScore };
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
          const avgRankScore = newMembers.reduce((sum, member) => sum + member.rank_points, 0) / newMembers.length;
          return { ...team, members: newMembers, avgRankScore };
        }
        return team;
      })
    );
  };

  const saveTeamChanges = async () => {
    setSaving(true);
    try {
      console.log('Saving team changes...');
      
      // For each team, update the team_members table
      for (const team of teams) {
        // First, remove all current members
        const { error: deleteError } = await supabase
          .from('team_members')
          .delete()
          .eq('team_id', team.id);

        if (deleteError) {
          console.error('Error removing team members:', deleteError);
          throw deleteError;
        }

        // Then add the new members
        if (team.members.length > 0) {
          const membersToInsert = team.members.map((member, index) => ({
            team_id: team.id,
            user_id: member.id,
            is_captain: index === 0 // First member is captain
          }));

          const { error: insertError } = await supabase
            .from('team_members')
            .insert(membersToInsert);

          if (insertError) {
            console.error('Error adding team members:', insertError);
            throw insertError;
          }
        }
      }

      toast({
        title: "Teams Updated",
        description: "Team assignments have been saved successfully",
      });

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
    if (teams.length === 0) return null;

    const avgScores = teams.map(team => team.avgRankScore);
    const maxScore = Math.max(...avgScores);
    const minScore = Math.min(...avgScores);
    const difference = maxScore - minScore;

    let status = 'excellent';
    let color = 'text-green-400';
    
    if (difference > 200) {
      status = 'poor';
      color = 'text-red-400';
    } else if (difference > 100) {
      status = 'fair';
      color = 'text-yellow-400';
    } else if (difference > 50) {
      status = 'good';
      color = 'text-blue-400';
    }

    return { difference: Math.round(difference), status, color };
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
            {balance && (
              <div className="flex items-center justify-between p-3 bg-slate-700 rounded-lg">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-yellow-400" />
                  <span className="text-white text-sm">Balance Status:</span>
                  <Badge className={`${balance.color} bg-slate-600 border-slate-500`}>
                    {balance.status.toUpperCase()}
                  </Badge>
                </div>
                <span className="text-slate-300 text-sm">
                  Rank difference: {balance.difference} points
                </span>
              </div>
            )}

            <div className="flex gap-2">
              <Button
                onClick={saveTeamChanges}
                disabled={saving}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                <Save className="w-4 h-4 mr-2" />
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            <h3 className="text-white font-medium flex items-center gap-2">
              <Shuffle className="w-4 h-4" />
              Teams
            </h3>
            {teams.map(team => (
              <DroppableTeam 
                key={team.id} 
                team={team}
              />
            ))}
          </div>

          <div className="space-y-4">
            <h3 className="text-white font-medium">Unassigned Players</h3>
            <Card className="bg-slate-800 border-slate-700 min-h-[200px]">
              <CardContent className="p-4">
                <SortableContext 
                  items={unassignedPlayers.map(p => p.id)} 
                  strategy={verticalListSortingStrategy}
                >
                  <div 
                    id="unassigned"
                    className="space-y-2 min-h-[150px] border-2 border-dashed border-slate-600 rounded-lg p-4"
                  >
                    {unassignedPlayers.length === 0 ? (
                      <p className="text-slate-400 text-center py-8">
                        All players assigned to teams
                      </p>
                    ) : (
                      unassignedPlayers.map(player => (
                        <DraggablePlayer key={player.id} player={player} />
                      ))
                    )}
                  </div>
                </SortableContext>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DndContext>
  );
};

export default TeamBalancingInterface;
