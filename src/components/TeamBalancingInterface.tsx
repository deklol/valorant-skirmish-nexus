import { useState, useEffect } from 'react';
import { DndContext, closestCenter, DragEndEvent, DragOverlay, useDraggable, useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Users, Shuffle, Save, Plus, GripVertical, Zap, TrendingUp, Settings } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { getRankPointsWithFallback, calculateTeamBalance } from "@/utils/rankingSystem";
import { getRankPointsWithManualOverride } from "@/utils/rankingSystemWithOverrides";
import { useEnhancedNotifications } from "@/hooks/useEnhancedNotifications";
import PeakRankFallbackAlert from "@/components/team-balancing/PeakRankFallbackAlert";
import EnhancedRankFallbackAlert from "@/components/team-balancing/EnhancedRankFallbackAlert";
import TeamCleanupTools from "@/components/team-balancing/TeamCleanupTools";
import ErrorBoundary from "@/components/ErrorBoundary";
import { Username } from "@/components/Username";
import { enhancedSnakeDraft, type EnhancedTeamResult, type BalanceStep } from "@/components/team-balancing/EnhancedSnakeDraft";
import { AutobalanceProgress } from "@/components/team-balancing/AutobalanceProgress";

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
  peak_rank?: string;
  riot_id?: string;
  manual_rank_override?: string | null;
  manual_weight_override?: number | null;
  use_manual_override?: boolean;
  rank_override_reason?: string | null;
}

interface Team {
  id: string;
  name: string;
  members: Player[];
  totalWeight: number;
  isPlaceholder?: boolean;
}

// Enhanced Draggable Player Component with manual override and peak rank indicators
const DraggablePlayer = ({ player }: { player: Player }) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: player.id,
  });

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
  } : undefined;

  // Use enhanced ranking system that supports manual overrides
  const rankResult = getRankPointsWithManualOverride(player);
  const fallbackResult = getRankPointsWithFallback(player.current_rank, player.peak_rank);

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
          <div className="flex items-center gap-2">
            <Username username={player.discord_username} userId={player.id} size="sm" className="text-white font-medium" />
            {rankResult.source === 'manual_override' && (
              <Badge className="bg-purple-600 text-white text-xs flex items-center gap-1">
                <Settings className="w-3 h-3" />
                Override: {rankResult.rank}
              </Badge>
            )}
            {rankResult.source === 'peak_rank' && (
              <Badge className="bg-amber-600 text-white text-xs flex items-center gap-1">
                <TrendingUp className="w-3 h-3" />
                Peak: {rankResult.rank}
              </Badge>
            )}
          </div>
          <div className="text-xs text-slate-400">
            {rankResult.source === 'manual_override' ? (
              <span>
                Override: {rankResult.rank} ({rankResult.points} pts) • {rankResult.overrideReason || 'Admin set'}
              </span>
            ) : rankResult.source === 'peak_rank' ? (
              <span>
                {player.current_rank || 'Unrated'} → Using {rankResult.rank} ({rankResult.points} pts)
              </span>
            ) : (
              <span>
                {player.current_rank} • {player.weight_rating || rankResult.points} pts
              </span>
            )}
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
  const [autobalancing, setAutobalancing] = useState(false);
  const [balanceAnalysis, setBalanceAnalysis] = useState<EnhancedTeamResult | null>(null);
  const [showProgress, setShowProgress] = useState(false);
  const [progressStep, setProgressStep] = useState(0);
  const [lastProgressStep, setLastProgressStep] = useState<BalanceStep | undefined>();
  const { toast } = useToast();
  const notifications = useEnhancedNotifications();
  const [tournamentName, setTournamentName] = useState<string>("");

useEffect(() => {
fetchTeamsAndPlayers();
    fetchTournamentName();
    // eslint-disable-next-line
}, [tournamentId]);

  const fetchTournamentName = async () => {
    try {
      const { data, error } = await supabase
        .from('tournaments')
        .select('name')
        .eq('id', tournamentId)
        .single();
      if (!error && data?.name) {
        setTournamentName(data.name);
      }
    } catch (e) {
      // Fallback: just blank
      setTournamentName("");
    }
  };

const fetchTeamsAndPlayers = async () => {
    setLoading(true);
try {
      console.log('Fetching teams and players for tournament:', tournamentId);
      
      // Fetch teams with their members including manual override fields
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
             peak_rank,
              riot_id,
              manual_rank_override,
              manual_weight_override,
              use_manual_override,
              rank_override_reason
           )
         )
       `)
        .eq('tournament_id', tournamentId);

      if (teamsError) throw teamsError;

      // Fetch tournament participants to find unassigned players including manual override fields
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
            peak_rank,
            riot_id,
            manual_rank_override,
            manual_weight_override,
            use_manual_override,
            rank_override_reason
          )
        `)
        .eq('tournament_id', tournamentId);

      if (participantsError) throw participantsError;

      // Process teams with enhanced ranking
      const processedTeams: Team[] = (teamsData || []).map(team => {
        const members = team.team_members
          .map(member => member.users)
          .filter(user => user)
          .map(user => {
            const rankResult = getRankPointsWithManualOverride(user);
            return {
              id: user.id,
              discord_username: user.discord_username || 'Unknown',
              rank_points: user.rank_points || 0,
              weight_rating: user.weight_rating || rankResult.points,
              current_rank: user.current_rank || 'Unranked',
              peak_rank: user.peak_rank,
              riot_id: user.riot_id,
              manual_rank_override: user.manual_rank_override,
              manual_weight_override: user.manual_weight_override,
              use_manual_override: user.use_manual_override,
              rank_override_reason: user.rank_override_reason
            };
          });

        const totalWeight = members.reduce((sum, member) => {
          const rankResult = getRankPointsWithManualOverride(member);
          return sum + rankResult.points;
        }, 0);

        return {
          id: team.id,
          name: team.name,
          members,
          totalWeight
        };
      });

      // Find unassigned players with enhanced ranking
      const allAssignedUserIds = new Set(
        processedTeams.flatMap(team => team.members.map(member => member.id))
      );

      const unassigned = (participantsData || [])
        .map(participant => participant.users)
        .filter(user => user && !allAssignedUserIds.has(user.id))
        .map(user => {
          const rankResult = getRankPointsWithManualOverride(user);
          return {
            id: user.id,
            discord_username: user.discord_username || 'Unknown',
            rank_points: user.rank_points || 0,
            weight_rating: user.weight_rating || rankResult.points,
            current_rank: user.current_rank || 'Unranked',
            peak_rank: user.peak_rank,
            riot_id: user.riot_id,
            manual_rank_override: user.manual_rank_override,
            manual_weight_override: user.manual_weight_override,
            use_manual_override: user.use_manual_override,
            rank_override_reason: user.rank_override_reason
          };
        });

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
            const totalWeight = newMembers.reduce((sum, member) => {
              const rankResult = getRankPointsWithManualOverride(member);
              return sum + rankResult.points;
            }, 0);
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
            const totalWeight = newMembers.reduce((sum, member) => {
              const rankResult = getRankPointsWithManualOverride(member);
              return sum + rankResult.points;
            }, 0);
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
          const totalWeight = newMembers.reduce((sum, member) => {
            const rankResult = getRankPointsWithManualOverride(member);
            return sum + rankResult.points;
          }, 0);
          return { ...team, members: newMembers, totalWeight };
        }
        return team;
      })
    );
  };

  // Enhanced Autobalance Algorithm with Snake Draft and detailed analysis
  async function autobalanceUnassignedPlayers() {
    setAutobalancing(true);
    
    try {
      // Get teams that have space for players
      const availableTeams = teams.filter(team => team.members.length < teamSize);
      const numTeams = availableTeams.length;
      
      if (numTeams === 0) {
        toast({
          title: "No Available Teams",
          description: "All teams are full. Cannot autobalance.",
          variant: "destructive",
        });
        setAutobalancing(false);
        return;
      }

      if (unassignedPlayers.length === 0) {
        toast({
          title: "No Players to Assign",
          description: "All players are already assigned to teams.",
        });
        setAutobalancing(false);
        return;
      }

      // Show progress for large player groups
      if (unassignedPlayers.length > 10) {
        setShowProgress(true);
        setProgressStep(0);
        setLastProgressStep(undefined);
      }

      // Use enhanced snake draft algorithm with progress tracking
      const snakeDraftResult = await new Promise<any>((resolve) => {
        const result = enhancedSnakeDraft(
          unassignedPlayers, 
          numTeams, 
          teamSize,
          async (step: BalanceStep, currentStep: number, totalSteps: number) => {
            if (unassignedPlayers.length > 10) {
              setProgressStep(currentStep);
              setLastProgressStep(step);
              // Small delay to show progress
              await new Promise(r => setTimeout(r, 150));
            }
          }
        );
        resolve(result);
      });
      
      // Store the balance analysis for later saving
      setBalanceAnalysis(snakeDraftResult);

      // Apply the snake draft results to our teams
      const updatedTeams = teams.map((team, index) => {
        const teamIndex = availableTeams.findIndex(t => t.id === team.id);
        if (teamIndex >= 0 && teamIndex < snakeDraftResult.teams.length) {
          const newMembers = [...team.members, ...snakeDraftResult.teams[teamIndex]];
          return {
            ...team,
            members: newMembers,
            totalWeight: newMembers.reduce((sum, m) => {
              const mRankResult = getRankPointsWithManualOverride(m);
              return sum + mRankResult.points;
            }, 0),
          };
        }
        return team;
      });

      // Clear unassigned players
      setUnassignedPlayers([]);
      setTeams(updatedTeams);

      toast({
        title: "Snake Draft Complete",
        description: `Players distributed using snake draft algorithm across ${numTeams} teams. Balance quality: ${snakeDraftResult.finalBalance.balanceQuality}. Review before saving.`,
      });
    } catch (e) {
      console.error('Snake draft autobalance error:', e);
      toast({
        title: "Autobalance Error",
        description: "Something went wrong during snake draft autobalance.",
        variant: "destructive",
      });
    }
    
    setAutobalancing(false);
    
    // Hide progress after a brief delay
    if (showProgress) {
      setTimeout(() => {
        setShowProgress(false);
        setProgressStep(0);
        setLastProgressStep(undefined);
      }, 1000);
    }
  }

  // Helper to generate team name based on captain for use in saveTeamChanges
  function getCaptainBasedTeamName(members: Player[], fallback: string = "Team Unknown") {
    if (members.length === 0) return fallback;
    // Captain is highest weight_rating (if equal, first in list wins)
    let sorted = [...members].sort((a, b) => {
      const aRankResult = getRankPointsWithManualOverride(a);
      const bRankResult = getRankPointsWithManualOverride(b);
      return bRankResult.points - aRankResult.points;
    });
    let captain = sorted[0];
    if (!captain || !captain.discord_username) return fallback;
    return teamSize === 1
      ? `${captain.discord_username} (Solo)`
      : `Team ${captain.discord_username}`;
  }

  // Check for duplicate team names and prevent creation
  function checkForDuplicateNames(teamsToCheck: Team[]): boolean {
    const nameMap = new Map<string, number>();
    
    teamsToCheck.forEach(team => {
      const normalizedName = team.name.toLowerCase().trim();
      nameMap.set(normalizedName, (nameMap.get(normalizedName) || 0) + 1);
    });
    
    return Array.from(nameMap.values()).some(count => count > 1);
  }

  // Sort team members by highest weight before saving (captain = first player highest rating)
  const saveTeamChanges = async () => {
    setSaving(true);
try {
      const usedNames = new Set<string>();
      let reorderedTeams = teams.map(team => {
        const sortedMembers = [...team.members].sort((a, b) => {
          const aRankResult = getRankPointsWithManualOverride(a);
          const bRankResult = getRankPointsWithManualOverride(b);
          return bRankResult.points - aRankResult.points;
        });
        let teamName = getCaptainBasedTeamName(sortedMembers, team.name);
        let uniqueName = teamName;
        let count = 2;
        while (usedNames.has(uniqueName)) {
          uniqueName = `${teamName} (${count})`;
          count++;
        }
        usedNames.add(uniqueName);
        return { ...team, members: sortedMembers, name: team.members.length ? uniqueName : team.name };
      });
      
      // Check for duplicates before saving
      if (checkForDuplicateNames(reorderedTeams.filter(team => team.members.length > 0))) {
        toast({
          title: "Duplicate Team Names Detected",
          description: "Multiple teams have the same name. Please use the cleanup tools to resolve this.",
          variant: "destructive"
        });
        setSaving(false);
        return;
      }
      
      const teamsWithMembers = reorderedTeams.filter(team => team.members.length > 0);

      for (const team of teamsWithMembers) {
        if (team.isPlaceholder) {
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
          const membersToInsert = team.members.map((member, index) => ({
            team_id: newTeam.id,
            user_id: member.id,
            is_captain: index === 0
          }));
          const { error: membersError } = await supabase
            .from('team_members')
            .insert(membersToInsert);
          if (membersError) throw membersError;

          await notifications.notifyTeamAssigned(
            newTeam.id,
            team.name,
            team.members.map(m => m.id),
            tournamentName
          );
        } else {
          await supabase
            .from('teams')
            .update({
              total_rank_points: team.totalWeight,
              name: team.name
            })
            .eq('id', team.id);
          await supabase
            .from('team_members')
            .delete()
            .eq('team_id', team.id);
          if (team.members.length > 0) {
            const membersToInsert = team.members.map((member, index) => ({
              team_id: team.id,
              user_id: member.id,
              is_captain: index === 0
            }));
            await supabase
              .from('team_members')
              .insert(membersToInsert);
          }

          await notifications.notifyTeamAssigned(
            team.id,
            team.name,
            team.members.map(m => m.id),
            tournamentName
          );
        }
      }

      // Save balance analysis if autobalance was used
      if (balanceAnalysis) {
        const balanceData = {
          timestamp: new Date().toISOString(),
          method: "Snake Draft Algorithm",
          tournament_info: {
            max_teams: maxTeams,
            team_size: teamSize,
            total_players: balanceAnalysis.balanceSteps.length,
            teams_balanced: teamsWithMembers.length
          },
          balance_steps: balanceAnalysis.balanceSteps.map(step => ({
            step: step.step,
            player: {
              id: step.player.id,
              discord_username: step.player.discord_username,
              points: step.player.points,
              rank: step.player.rank,
              source: step.player.source
            },
            assignedTeam: step.assignedTeam,
            reasoning: step.reasoning,
            teamStatesAfter: step.teamStatesAfter.map(state => ({
              teamIndex: state.teamIndex,
              totalPoints: state.totalPoints,
              playerCount: state.playerCount
            }))
          })),
          final_balance: {
            averageTeamPoints: balanceAnalysis.finalBalance.averageTeamPoints,
            minTeamPoints: balanceAnalysis.finalBalance.minTeamPoints,
            maxTeamPoints: balanceAnalysis.finalBalance.maxTeamPoints,
            maxPointDifference: balanceAnalysis.finalBalance.maxPointDifference,
            balanceQuality: balanceAnalysis.finalBalance.balanceQuality
          },
          teams_created: teamsWithMembers.map((team, index) => ({
            name: team.name,
            members: team.members.map(m => ({
              discord_username: m.discord_username,
              rank: getRankPointsWithManualOverride(m).rank,
              points: getRankPointsWithManualOverride(m).points,
              source: getRankPointsWithManualOverride(m).source
            })),
            total_points: team.totalWeight,
            seed: index + 1
          }))
        };

        // Update tournament with balance analysis
        const { error: balanceError } = await supabase
          .from('tournaments')
          .update({ balance_analysis: balanceData })
          .eq('id', tournamentId);

        if (balanceError) {
          console.error('Error saving balance analysis:', balanceError);
          // Don't fail the whole save for this
        }

        // Clear the analysis after saving
        setBalanceAnalysis(null);
      }

toast({
        title: "Teams Updated",
        description: balanceAnalysis 
          ? "Team assignments saved with detailed snake draft balance analysis."
          : "Team assignments have been saved successfully with enhanced rank balancing including manual overrides.",
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
  const allPlayers = [...unassignedPlayers, ...teams.flatMap(team => team.members)];

  return (
    <ErrorBoundary componentName="TeamBalancingInterface">
      <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <div className="space-y-6">
          {/* Enhanced Rank Fallback Alert */}
          <EnhancedRankFallbackAlert players={allPlayers} />

          {/* Team Cleanup Tools */}
          <TeamCleanupTools 
            tournamentId={tournamentId}
            teams={teams}
            onTeamsUpdated={fetchTeamsAndPlayers}
          />

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
  
          <div className="space-y-4">
            <AutobalanceProgress
              isVisible={showProgress}
              totalPlayers={unassignedPlayers.length}
              currentStep={progressStep}
              lastStep={lastProgressStep}
            />
  
            <div className="flex gap-2">
                <Button
                  onClick={autobalanceUnassignedPlayers}
                  disabled={autobalancing || hasPlaceholderTeams || unassignedPlayers.length === 0}
                  variant="secondary"
                  className="bg-yellow-600 hover:bg-yellow-700 text-white"
                >
                  <Zap className="w-4 h-4 mr-2" />
                  {autobalancing ? "Suggesting..." : "Autobalance"}
                </Button>
                
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
            </div>
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
    </ErrorBoundary>
  );
};

export default TeamBalancingInterface;
