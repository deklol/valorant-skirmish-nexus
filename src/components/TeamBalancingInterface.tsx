import { useState, useEffect } from 'react';
import { DndContext, closestCenter, DragEndEvent, DragOverlay, useDraggable, useDroppable } from '@dnd-kit/core';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { atlasLogger } from "@/utils/atlasLogger";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertTriangle, Users, Shuffle, Save, Plus, GripVertical, Zap, TrendingUp, Settings } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { getRankPointsWithFallback, calculateTeamBalance } from "@/utils/rankingSystem";
import { getRankPointsWithManualOverride } from "@/utils/rankingSystemWithOverrides";
import EnhancedRankFallbackAlert from "@/components/team-balancing/EnhancedRankFallbackAlert";
import { getUnifiedPlayerWeight, getUnifiedPlayerWeightSync, validateRadiantDistribution, logWeightCalculation, hasRadiantHistory } from "@/utils/unifiedWeightSystem";
import { useEnhancedNotifications } from "@/hooks/useEnhancedNotifications";
import { enhancedSnakeDraft, type EnhancedTeamResult, type BalanceStep } from "@/components/team-balancing/EnhancedSnakeDraft";
import { evidenceBasedSnakeDraft, type EvidenceTeamResult, type EvidenceBalanceStep } from "@/components/team-balancing/EvidenceBasedSnakeDraft";
import { AutobalanceProgress } from "@/components/team-balancing/AutobalanceProgress";
import AtlasDecisionDisplay from "@/components/team-balancing/AtlasDecisionDisplay";
import BalancingControlPanel from "@/components/team-balancing/BalancingControlPanel";
import TeamCleanupTools from "@/components/team-balancing/TeamCleanupTools";
import ErrorBoundary from "@/components/ErrorBoundary";
import { Username } from "@/components/Username";

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
  calculatedWeight?: number;
  weightSource?: string;
  adaptiveReasoning?: string;
}

interface Team {
  id: string;
  name: string;
  members: Player[];
  totalWeight: number;
  isPlaceholder?: boolean;
}

// Enhanced Draggable Player Component with manual override, peak rank, and adaptive weight indicators
const DraggablePlayer = ({ player, enableAdaptiveWeights }: { player: Player, enableAdaptiveWeights?: boolean }) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: player.id,
  });

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
  } : undefined;

  // Use UNIFIED weight system for consistency
  const [displayWeight, setDisplayWeight] = useState<number>(150);
  const [displaySource, setDisplaySource] = useState<string>('loading');
  
  // Calculate weight using unified system
  useEffect(() => {
    getUnifiedPlayerWeight(player, {
      enableATLAS: enableAdaptiveWeights,
      username: player.discord_username,
      forceValidation: true
    }).then(result => {
      setDisplayWeight(result.points);
      setDisplaySource(result.source);
      
      // Log for transparency
      logWeightCalculation(player.discord_username, result, 'UI Display');
    }).catch(error => {
      console.error('Failed to calculate unified weight for display:', error);
      // Fallback
      const fallbackResult = getUnifiedPlayerWeightSync(player, enableAdaptiveWeights);
      setDisplayWeight(fallbackResult.points);
      setDisplaySource(fallbackResult.source);
    });
  }, [enableAdaptiveWeights, player]);

  const rankResult = {
    points: displayWeight,
    source: displaySource,
    rank: player.current_rank || 'Unranked'
  };
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
            {rankResult.source === 'atlas_evidence' && (
              <Badge className="bg-purple-600 text-white text-xs flex items-center gap-1">
                <Zap className="w-3 h-3" />
                ATLAS: {rankResult.points}pts
              </Badge>
            )}
          </div>
          <div className="text-xs text-slate-400">
            {rankResult.source === 'manual_override' ? (
              <span>
                Override: {rankResult.rank} ({rankResult.points} pts) • Admin set
              </span>
            ) : rankResult.source === 'atlas_evidence' ? (
              <span>
                ATLAS: {rankResult.points} pts (AI-enhanced calculation)
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
const DroppableTeam = ({ team, teamSize, enableAdaptiveWeights }: { team: Team; teamSize: number; enableAdaptiveWeights?: boolean }) => {
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
              <DraggablePlayer key={player.id} player={player} enableAdaptiveWeights={enableAdaptiveWeights} />
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
};

// Droppable Unassigned Area
const DroppableUnassigned = ({ players, enableAdaptiveWeights }: { players: Player[]; enableAdaptiveWeights?: boolean }) => {
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
              <DraggablePlayer key={player.id} player={player} enableAdaptiveWeights={enableAdaptiveWeights} />
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
};

// Droppable Substitutes Area
const DroppableSubstitutes = ({ players, enableAdaptiveWeights }: { players: Player[]; enableAdaptiveWeights?: boolean }) => {
  const { isOver, setNodeRef } = useDroppable({
    id: 'substitutes',
  });

  return (
    <Card className="bg-slate-800 border-slate-700 min-h-[200px]">
      <CardContent className="p-4">
        <div 
          ref={setNodeRef}
          className={`space-y-2 min-h-[150px] border-2 border-dashed rounded-lg p-4 transition-colors ${
            isOver ? 'border-amber-400 bg-amber-900/20' : 'border-slate-600'
          }`}
        >
          {players.length === 0 ? (
            <p className="text-slate-400 text-center py-8">
              No substitute players
            </p>
          ) : (
            players.map(player => (
              <DraggablePlayer key={player.id} player={player} enableAdaptiveWeights={enableAdaptiveWeights} />
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
};

// Helper function to introduce a delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// UNIFIED helper function to get consistent player weight - SINGLE SOURCE OF TRUTH
const getPlayerWeight = async (userData: any, tournament?: any) => {
  return await getUnifiedPlayerWeight(userData, {
    enableATLAS: tournament?.enable_adaptive_weights || false,
    username: userData.discord_username,
    forceValidation: true
  });
};

// Synchronous helper for immediate calculations - SINGLE SOURCE OF TRUTH
const getPlayerWeightSync = (userData: any, enableAtlas: boolean) => {
  return getUnifiedPlayerWeightSync(userData, enableAtlas);
};

const TeamBalancingInterface = ({ tournamentId, maxTeams, teamSize, onTeamsUpdated }: TeamBalancingInterfaceProps) => {
  const [teams, setTeams] = useState<Team[]>([]);
  const [unassignedPlayers, setUnassignedPlayers] = useState<Player[]>([]);
  const [substitutePlayers, setSubstitutePlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [creatingTeams, setCreatingTeams] = useState(false);
  const [autobalancing, setAutobalancing] = useState(false);
  const [balanceAnalysis, setBalanceAnalysis] = useState<EnhancedTeamResult | EvidenceTeamResult | null>(null);
  const [showProgress, setShowProgress] = useState(false);
  const [progressStep, setProgressStep] = useState(0);
  const [lastProgressStep, setLastProgressStep] = useState<BalanceStep | EvidenceBalanceStep | undefined>();
  const [currentPhase, setCurrentPhase] = useState<'analyzing' | 'validating' | 'complete' | 'atlas-initializing' | 'atlas-analyzing' | 'atlas-validating' | 'atlas-distributing' | 'atlas-calculating'>('analyzing');
  const { toast } = useToast();
  const notifications = useEnhancedNotifications();
  const [tournamentName, setTournamentName] = useState<string>("");
  const [tournament, setTournament] = useState<any>(null);
  
  // Adaptive weights state
  const [enableAdaptiveWeights, setEnableAdaptiveWeights] = useState(false);
  const [loadingAdaptiveSettings, setLoadingAdaptiveSettings] = useState(true);

useEffect(() => {
fetchTeamsAndPlayers();
    fetchTournamentName();
    loadAdaptiveWeightsSetting();
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

  const loadAdaptiveWeightsSetting = async () => {
    try {
      const { data, error } = await supabase
        .from('tournaments')
        .select('enable_adaptive_weights')
        .eq('id', tournamentId)
        .single();
      
      if (!error && data) {
        setTournament(data);
        setEnableAdaptiveWeights(data.enable_adaptive_weights || false);
      }
    } catch (e) {
      console.error('Error loading adaptive weights setting:', e);
    } finally {
      setLoadingAdaptiveSettings(false);
    }
  };

  const handleAdaptiveWeightsChange = async (checked: boolean) => {
    try {
      // First update the database
      const { error } = await supabase
        .from('tournaments')
        .update({ enable_adaptive_weights: checked })
        .eq('id', tournamentId);
      
      if (error) throw error;
      
      // Only update state and recalculate after successful database update
      setEnableAdaptiveWeights(checked);
      
      console.log(`Adaptive weights ${checked ? 'enabled' : 'disabled'}, recalculating team totals...`);
      
      // Force immediate recalculation with the new setting
      await recalculateTeamTotals(checked);
      
      toast({
        title: checked ? "Adaptive Weights Enabled" : "Adaptive Weights Disabled",
        description: checked 
          ? "Team balancing will now use enhanced adaptive weight calculation"
          : "Team balancing will use standard rank-based weights",
      });
    } catch (error: any) {
      console.error('Error updating adaptive weights setting:', error);
      toast({
        title: "Error",
        description: "Failed to update adaptive weights setting",
        variant: "destructive",
      });
    }
  };

  const recalculateTeamTotals = async (useAdaptiveWeights: boolean) => {
    atlasLogger.debug(`Recalculating team totals with UNIFIED ATLAS: ${useAdaptiveWeights}`);
    
    // Use UNIFIED weight system for ALL calculations
    const newTeams = await Promise.all(
      teams.map(async (team, teamIndex) => {
        let totalWeight = 0;
        for (const member of team.members) {
          const result = await getUnifiedPlayerWeight(member, {
            enableATLAS: useAdaptiveWeights,
            username: member.discord_username,
            forceValidation: true
          });
          
          totalWeight += result.points;
          
          // Enhanced logging with validation
          console.log(`Team ${teamIndex + 1} - ${member.discord_username}: ${result.points} pts (${result.source}${!result.isValid ? ' - INVALID, FORCED TO 150' : ''})`);
          
          if (!result.isValid) {
            console.error(`⚠️ INVALID WEIGHT DETECTED for ${member.discord_username}:`, result);
          }
        }
        console.log(`Team ${teamIndex + 1} total: ${totalWeight} pts`);
        return { ...team, totalWeight };
      })
    );
    
    // Validate Radiant distribution
    const validation = validateRadiantDistribution(newTeams.map(team => team.members));
    if (!validation.isValid) {
      console.warn('🚨 RADIANT DISTRIBUTION VIOLATION:', validation.violations);
      toast({
        title: "Radiant Distribution Warning",
        description: validation.violations[0]?.reason || "Radiant player on strongest team detected",
        variant: "destructive",
      });
    }
    
    setTeams(newTeams);
    
    // Also update unassigned and substitute player calculations for consistency
    setUnassignedPlayers(prevPlayers => [...prevPlayers]); // Trigger re-render
    setSubstitutePlayers(prevPlayers => [...prevPlayers]); // Trigger re-render
  };

const fetchTeamsAndPlayers = async () => {
    setLoading(true);
try {
      console.log('Fetching teams and players for tournament:', tournamentId);
      
      // Fetch teams with their members including manual override fields and tournament win data
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
            rank_override_reason,
            tournaments_won
          )
        )
      `)
        .eq('tournament_id', tournamentId);

      if (teamsError) throw teamsError;

      // Fetch tournament participants to find unassigned players including manual override fields and tournament win data
      const { data: participantsData, error: participantsError } = await supabase
        .from('tournament_signups')
        .select(`
          user_id,
          is_substitute,
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
            rank_override_reason,
            tournaments_won
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
              rank_override_reason: user.rank_override_reason,
              tournaments_won: user.tournaments_won
            };
          });

        const totalWeight = members.reduce((sum, member) => {
          const rankResult = getPlayerWeightSync(member, enableAdaptiveWeights);
          return sum + rankResult.points;
        }, 0);

        return {
          id: team.id,
          name: team.name,
          members,
          totalWeight
        };
      });

      // Find unassigned players with enhanced ranking (exclude substitutes)
      const allAssignedUserIds = new Set(
        processedTeams.flatMap(team => team.members.map(member => member.id))
      );

      
      const regularParticipants = (participantsData || [])
        .filter(participant => !participant.is_substitute)
        .map(participant => participant.users)
        .filter(user => user && !allAssignedUserIds.has(user.id))
        .map(user => {
          const rankResult = getPlayerWeightSync(user, enableAdaptiveWeights);
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
            rank_override_reason: user.rank_override_reason,
            tournaments_won: user.tournaments_won
          };
        });

      // Find substitute players (separate from regular participants)
      const substituteParticipants = (participantsData || [])
        .filter(participant => participant.is_substitute)
        .map(participant => participant.users)
        .filter(user => user && !allAssignedUserIds.has(user.id))
        .map(user => {
          const rankResult = getPlayerWeightSync(user, enableAdaptiveWeights);
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
            rank_override_reason: user.rank_override_reason,
            tournaments_won: user.tournaments_won
          };
        });

      // If no teams exist, create placeholder teams
      let finalTeams = processedTeams;
      if (processedTeams.length === 0) {
        finalTeams = createPlaceholderTeams();
}

      setTeams(finalTeams);
      setUnassignedPlayers(regularParticipants);
      setSubstitutePlayers(substituteParticipants);
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
      // Check substitute players
      const substituteIndex = substitutePlayers.findIndex(p => p.id === playerId);
      if (substituteIndex !== -1) {
        player = substitutePlayers[substituteIndex];
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
    }

    if (!player) return;

    // Handle movement
    if (targetId === 'unassigned') {
      movePlayerToUnassigned(player, sourceTeamId);
    } else if (targetId === 'substitutes') {
      movePlayerToSubstitutes(player, sourceTeamId);
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

  const movePlayerToUnassigned = async (player: Player, sourceTeamId: string | null) => {
    if (sourceTeamId) {
      setTeams(prevTeams => 
        prevTeams.map(team => {
          if (team.id === sourceTeamId) {
            const newMembers = team.members.filter(p => p.id !== player.id);
            const totalWeight = newMembers.reduce((sum, member) => {
              const rankResult = getPlayerWeightSync(member, tournament?.enable_adaptive_weights);
              return sum + rankResult.points;
            }, 0);
            return { ...team, members: newMembers, totalWeight };
          }
          return team;
        })
      );
    }
    
    // Remove from substitutes if present
    setSubstitutePlayers(prev => prev.filter(p => p.id !== player.id));
    
    // Add to unassigned
    setUnassignedPlayers(prev => {
      if (prev.some(p => p.id === player.id)) return prev;
      return [...prev, player];
    });

    // Update database to mark as non-substitute
    updatePlayerSubstituteStatus(player.id, false);
    
    // Log manual adjustment
    logManualTeamAdjustment(player, sourceTeamId, null, 'drag_to_unassigned');
  };

  const movePlayerToSubstitutes = async (player: Player, sourceTeamId: string | null) => {
    if (sourceTeamId) {
      setTeams(prevTeams => 
        prevTeams.map(team => {
          if (team.id === sourceTeamId) {
            const newMembers = team.members.filter(p => p.id !== player.id);
            const totalWeight = newMembers.reduce((sum, member) => {
              const rankResult = getPlayerWeightSync(member, tournament?.enable_adaptive_weights);
              return sum + rankResult.points;
            }, 0);
            return { ...team, members: newMembers, totalWeight };
          }
          return team;
        })
      );
    }
    
    // Remove from unassigned if present
    setUnassignedPlayers(prev => prev.filter(p => p.id !== player.id));
    
    // Add to substitutes
    setSubstitutePlayers(prev => {
      if (prev.some(p => p.id === player.id)) return prev;
      return [...prev, player];
    });

    // Update database to mark as substitute
    updatePlayerSubstituteStatus(player.id, true);
    
    // Log manual adjustment
    logManualTeamAdjustment(player, sourceTeamId, null, 'drag_to_substitutes');
  };

  const movePlayerToTeam = async (player: Player, targetTeamId: string, sourceTeamId: string | null) => {
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
      // Remove from both unassigned and substitutes
      setUnassignedPlayers(prev => prev.filter(p => p.id !== player.id));
      setSubstitutePlayers(prev => prev.filter(p => p.id !== player.id));
    }

    // Add to target team
    setTeams(prevTeams => 
      prevTeams.map(team => {
        if (team.id === targetTeamId) {
          const newMembers = [...team.members, player];
          const totalWeight = newMembers.reduce((sum, member) => {
            const rankResult = getPlayerWeightSync(member, tournament?.enable_adaptive_weights);
            return sum + rankResult.points;
          }, 0);
      return { ...team, members: newMembers, totalWeight };
        }
        return team;
      })
    );

    // Update database to mark as non-substitute when moving to team
    updatePlayerSubstituteStatus(player.id, false);
    
    // Log manual team adjustment
    logManualTeamAdjustment(player, sourceTeamId, targetTeamId, 'drag_to_team');
  };

  const logManualTeamAdjustment = async (player: Player, sourceTeamId: string | null, targetTeamId: string | null, action: string) => {
    try {
      const sourceTeam = sourceTeamId ? teams.find(t => t.id === sourceTeamId) : null;
      const targetTeam = targetTeamId ? teams.find(t => t.id === targetTeamId) : null;
      
      const rankResult = getPlayerWeightSync(player, tournament?.enable_adaptive_weights);

      const adjustmentData = {
        timestamp: new Date().toISOString(),
        tournament_id: tournamentId,
        action: `manual_team_adjustment_${action}`,
        player: {
          id: player.id,
          discord_username: player.discord_username,
          current_rank: player.current_rank,
          rank_points: rankResult.points,
          weight_source: rankResult.source,
          adaptive_reasoning: (rankResult as any).adaptiveCalculation?.calculationReasoning,
          manual_override: player.use_manual_override ? {
            rank: player.manual_rank_override,
            weight: player.manual_weight_override,
            reason: player.rank_override_reason
          } : null
        },
        source_team: sourceTeam ? { id: sourceTeam.id, name: sourceTeam.name } : null,
        target_team: targetTeam ? { id: targetTeam.id, name: targetTeam.name } : null,
        reason: action === 'drag_to_team' ? `Player manually moved to ${targetTeam?.name}` :
                action === 'drag_to_unassigned' ? 'Player manually moved to unassigned' :
                action === 'drag_to_substitutes' ? 'Player manually moved to substitutes' : 'Manual adjustment'
      };

      // Insert audit log
      const { error } = await supabase
        .from('audit_logs')
        .insert({
          table_name: 'team_balancing_manual_adjustments',
          action: 'MANUAL_TEAM_ADJUSTMENT',
          record_id: tournamentId,
          user_id: null, // Will be filled by RLS if user is authenticated
          new_values: adjustmentData,
          created_at: new Date().toISOString()
        });

      if (error) {
        console.error('Error logging manual team adjustment:', error);
      }
    } catch (error) {
      console.error('Failed to log manual team adjustment:', error);
    }
  };

  const updatePlayerSubstituteStatus = async (userId: string, isSubstitute: boolean) => {
    try {
      const { error } = await supabase
        .from('tournament_signups')
        .update({ is_substitute: isSubstitute })
        .eq('tournament_id', tournamentId)
        .eq('user_id', userId);

      if (error) {
        console.error('Error updating substitute status:', error);
        toast({
          title: "Warning",
          description: "Failed to update substitute status in database",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error updating substitute status:', error);
    }
  };

  // Enhanced Autobalance Algorithm with Snake Draft, ATLAS, and detailed analysis
  async function autobalanceUnassignedPlayers() {
    setAutobalancing(true);
    
    try {
      // Get tournament adaptive weights setting
      const { data: tournament } = await supabase
        .from('tournaments')
        .select('enable_adaptive_weights')
        .eq('id', tournamentId)
        .single();

      // Get teams that have space for players
      const availableTeams = teams.filter(team => team.members.length < teamSize);
      const numTeams = availableTeams.length;
      
      if (numTeams === 0) {
        toast({
          title: "No Available Teams",
          description: "All teams are full. Cannot autobalance.",
          variant: "destructive",
        });
        return; 
      }

      if (unassignedPlayers.length === 0) {
        toast({
          title: "No Players to Assign",
          description: "All players are already assigned to teams.",
        });
        return; 
      }
      
      // ⭐ CORRECTED LOGIC: Calculate weights asynchronously for all players before sorting.
      // This ensures the full ATLAS logic is used for each player's weight.
      const playersWithWeights = await Promise.all(unassignedPlayers.map(async player => {
        const weightResult = await getUnifiedPlayerWeight(player, {
          enableATLAS: tournament?.enable_adaptive_weights,
          username: player.discord_username,
          forceValidation: true
        });
        return {
          ...player,
          calculatedWeight: weightResult.points,
          weightSource: weightResult.source,
          adaptiveReasoning: (weightResult as any).reasoning
        };
      }));

      // Sort the players based on the newly calculated weight, highest first.
      const sortedPlayers = playersWithWeights.sort((a, b) => b.calculatedWeight - a.calculatedWeight);

      // Choose between ATLAS-enhanced draft or standard draft
      let fullSnakeDraftResult: EnhancedTeamResult | EvidenceTeamResult;
      
      // ==================================================================
      // CORE LOGIC FIX: Use the correct draft function based on ATLAS setting
      // ==================================================================
      if (tournament?.enable_adaptive_weights) {
        // Use ATLAS-enhanced evidence-based snake draft
        atlasLogger.info("Executing evidenceBasedSnakeDraft (ATLAS is ON)");
        setCurrentPhase('atlas-initializing');
        
        fullSnakeDraftResult = await evidenceBasedSnakeDraft(
          sortedPlayers,
          numTeams,
          teamSize,
          (progress: number, stage: string) => {
            setProgressStep(Math.round(progress * 100));
            setCurrentPhase(stage.includes('atlas') ? 'atlas-analyzing' : 
                           stage.includes('validation') ? 'atlas-validating' : 'atlas-calculating');
          },
          () => {
            setCurrentPhase('atlas-validating');
          },
          (playerId: string, weight: number) => {
            setCurrentPhase('atlas-calculating');
          }
        );
      } else {
        // Use standard enhanced snake draft
        atlasLogger.info("Standard snake draft (ATLAS is OFF)");
        fullSnakeDraftResult = await enhancedSnakeDraft(
          sortedPlayers, 
          numTeams, 
          teamSize,
          (step: BalanceStep, currentStep: number, totalSteps: number) => {
            setProgressStep(currentStep);
            setLastProgressStep(step);
            setCurrentPhase('analyzing');
          },
          () => {
            setCurrentPhase('validating');
          },
          undefined,
          {
            enableEvidenceBasedWeights: false,
            tournamentWinBonus: 15,
            rankDecayThreshold: 2,
            maxDecayPercent: 0.25,
            skillTierCaps: {
              enabled: true,
              eliteThreshold: 400,
              maxElitePerTeam: 1
            }
          }
        );
      }
      
      // Store the balance analysis for later saving
      setBalanceAnalysis(fullSnakeDraftResult);

      // Initialize temporary teams and unassigned players for step-by-step UI updates
      let tempTeams = JSON.parse(JSON.stringify(teams)); // Deep copy to avoid direct state mutation
      let tempUnassignedPlayers = [...unassignedPlayers];

      // Show progress bar if there are enough players
      if (fullSnakeDraftResult.balanceSteps.length > 0) {
        setShowProgress(true);
        setProgressStep(0);
        setLastProgressStep(undefined);
        setCurrentPhase('analyzing');

        // Iterate through each step of the draft and update UI with delays
        for (let i = 0; i < fullSnakeDraftResult.balanceSteps.length; i++) {
          const step = fullSnakeDraftResult.balanceSteps[i];
          const currentStepIndex = i + 1;
          const totalSteps = fullSnakeDraftResult.balanceSteps.length;

          // Update progress bar
          setProgressStep(currentStepIndex);
          setLastProgressStep(step);
          setCurrentPhase('analyzing');

          // Find the player being assigned in this step using the original unsorted list with weights
          const playerToMove = playersWithWeights.find(p => p.id === step.player.id);
          if (playerToMove) {
            // Remove player from unassigned list
            tempUnassignedPlayers = tempUnassignedPlayers.filter(p => p.id !== playerToMove.id);

            // Find the target team (using team index from snake draft)
            const targetTeam = tempTeams[step.assignedTeam];
            if (targetTeam) {
              // Add player to the target team and update its total weight using the pre-calculated weight
              targetTeam.members.push(playerToMove);
              const newTotalWeight = await targetTeam.members.reduce(async (sumPromise, m) => {
                  const sum = await sumPromise;
                  const mRankResult = await getUnifiedPlayerWeight(m, { enableATLAS: tournament?.enable_adaptive_weights });
                  logWeightCalculation(m.discord_username, mRankResult, 'Autobalance Step');
                  return sum + mRankResult.points;
              }, Promise.resolve(0));
              targetTeam.totalWeight = newTotalWeight;
            }
          }

          // Update the React state for teams and unassigned players
          // This will trigger a re-render showing the player moving
          setUnassignedPlayers(tempUnassignedPlayers);
          setTeams([...tempTeams]); // Create new array reference to trigger re-render

          await delay(250); // Increased delay for a more noticeable step-by-step animation
        }
        
        // After all steps are processed, set phase to complete
        setCurrentPhase('complete');
        await delay(1000); // Short delay to show 'complete' before hiding
      }

      // Final state update (though the loop above should have already set the final state)
      // This ensures consistency and handles cases with very few players where the loop might not run.
      setUnassignedPlayers([]);
      // Note: substitutes are not affected by autobalance
      setTeams(await Promise.all(fullSnakeDraftResult.teams.map(async (draftedTeam, index) => {
        const originalTeam = availableTeams[index]; // Get the original team corresponding to this drafted team
        const newMembers = [...originalTeam.members, ...draftedTeam];

        const newTotalWeight = await newMembers.reduce(async (sumPromise, m) => {
          const sum = await sumPromise;
          const mRankResult = await getUnifiedPlayerWeight(m, { enableATLAS: tournament?.enable_adaptive_weights });
          return sum + mRankResult.points;
        }, Promise.resolve(0));

        return {
          ...originalTeam,
          members: newMembers,
          totalWeight: newTotalWeight,
        };
      })));


      // VALIDATE RADIANT DISTRIBUTION after autobalance
      const finalTeams = fullSnakeDraftResult.teams.map((draftedTeam, index) => {
        const originalTeam = availableTeams[index];
        return [...originalTeam.members, ...draftedTeam];
      });
      
      const radiantValidation = validateRadiantDistribution(finalTeams);
      if (!radiantValidation.isValid) {
        console.error('🚨 RADIANT DISTRIBUTION VIOLATION AFTER AUTOBALANCE:', radiantValidation.violations);
        
        // Show warning to user
        toast({
          title: "⚠️ Radiant Player Distribution Warning",
          description: `${radiantValidation.violations[0]?.reason} - Manual adjustment may be needed.`,
          variant: "destructive",
        });
        
        // Add notification for admin attention
        notifications.sendNotification({
          type: "warning",
          title: "Radiant Distribution Issue",
          message: `Tournament ${tournamentName}: ${radiantValidation.violations[0]?.reason}`,
          tournamentId
        });
      }

      // Show completion message based on draft type
      const draftType = tournament?.enable_adaptive_weights ? 'ATLAS-enhanced' : 'standard';
      const balanceQuality = 'finalBalance' in fullSnakeDraftResult 
        ? fullSnakeDraftResult.finalBalance.balanceQuality 
        : fullSnakeDraftResult.finalAnalysis.pointBalance.balanceQuality;
      const atlasInfo = (fullSnakeDraftResult as any).miniAiEnhancements ? 
        ` ATLAS made optimization decisions.` : '';
      
      toast({
        title: `${tournament?.enable_adaptive_weights ? 'ATLAS' : 'Snake'} Draft Complete`,
        description: `Players distributed using a ${draftType} snake draft algorithm across ${numTeams} teams. Balance quality: ${balanceQuality}.${atlasInfo} Review before saving.`,
      });
    } catch (e) {
      console.error('Snake draft autobalance error:', e);
      toast({
        title: "Autobalance Error",
        description: "Something went wrong during snake draft autobalance.",
        variant: "destructive",
      });
    } finally {
      setAutobalancing(false);
      // Ensure progress is hidden
      if (showProgress) {
        setShowProgress(false);
        setProgressStep(0);
        setLastProgressStep(undefined);
        setCurrentPhase('analyzing'); // Reset phase for next run
      }
    }
  }

  // Helper to generate team name based on captain for use in saveTeamChanges
  function getCaptainBasedTeamName(members: Player[], fallback: string = "Team Unknown") {
    if (members.length === 0) return fallback;
    // Captain is highest weight_rating (if equal, first in list wins)
    let sorted = [...members].sort((a, b) => {
      const aRankResult = getPlayerWeightSync(a, tournament?.enable_adaptive_weights);
      const bRankResult = getPlayerWeightSync(b, tournament?.enable_adaptive_weights);
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
          const aRankResult = getPlayerWeightSync(a, tournament?.enable_adaptive_weights);
          const bRankResult = getPlayerWeightSync(b, tournament?.enable_adaptive_weights);
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

        // Save balance analysis and adaptive weight calculations if autobalance was used
        if (balanceAnalysis) {
          const balanceData = {
            timestamp: new Date().toISOString(),
            method: `Snake Draft Algorithm${enableAdaptiveWeights ? ' with Adaptive Weights' : ''}`,
            tournament_info: {
              max_teams: maxTeams,
              team_size: teamSize,
              total_players: balanceAnalysis.balanceSteps.length,
              teams_balanced: teamsWithMembers.length,
              adaptive_weights_enabled: enableAdaptiveWeights
            },
            balance_steps: balanceAnalysis.balanceSteps.map(step => ({
              step: step.step,
              player: {
                id: step.player.id,
                discord_username: step.player.discord_username,
                points: step.player.points,
                rank: step.player.rank,
                source: step.player.source,
                adaptiveWeight: step.player.adaptiveWeight,
                weightSource: step.player.weightSource,
                adaptiveReasoning: step.player.adaptiveReasoning
              },
              assignedTeam: step.assignedTeam,
              reasoning: step.reasoning,
              teamStatesAfter: step.teamStatesAfter.map(state => ({
                teamIndex: state.teamIndex,
                totalPoints: state.totalPoints,
                playerCount: state.playerCount
              }))
            })),
            final_balance: 'finalBalance' in balanceAnalysis ? {
              averageTeamPoints: balanceAnalysis.finalBalance.averageTeamPoints,
              minTeamPoints: balanceAnalysis.finalBalance.minTeamPoints,
              maxTeamPoints: balanceAnalysis.finalBalance.maxTeamPoints,
              maxPointDifference: balanceAnalysis.finalBalance.maxPointDifference,
              balanceQuality: balanceAnalysis.finalBalance.balanceQuality
            } : {
              averageTeamPoints: balanceAnalysis.finalAnalysis.pointBalance.averageTeamPoints,
              minTeamPoints: balanceAnalysis.finalAnalysis.pointBalance.minTeamPoints,
              maxTeamPoints: balanceAnalysis.finalAnalysis.pointBalance.maxTeamPoints,
              maxPointDifference: balanceAnalysis.finalAnalysis.pointBalance.maxPointDifference,
              balanceQuality: balanceAnalysis.finalAnalysis.pointBalance.balanceQuality
            },
            teams_created: teamsWithMembers.map((team, index) => ({
              name: team.name,
              members: team.members.map(m => {
                const rankResult = getPlayerWeightSync(m, enableAdaptiveWeights);
                return {
                  discord_username: m.discord_username,
                  rank: rankResult.rank,
                  points: rankResult.points,
                  source: rankResult.source,
                  adaptiveReasoning: (rankResult as any).adaptiveCalculation?.calculationReasoning
                };
              }),
              total_points: team.totalWeight,
              seed: index + 1
            })),
            adaptive_weight_calculations: ('adaptiveWeightCalculations' in balanceAnalysis) ? balanceAnalysis.adaptiveWeightCalculations || [] : []
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

          // Store adaptive weight calculations in database if available
          if (('adaptiveWeightCalculations' in balanceAnalysis) && balanceAnalysis.adaptiveWeightCalculations && balanceAnalysis.adaptiveWeightCalculations.length > 0) {
            const adaptiveWeightData = balanceAnalysis.adaptiveWeightCalculations.map(calc => ({
              tournament_id: tournamentId,
              user_id: calc.userId,
              current_rank_points: calc.calculation.currentRankPoints,
              peak_rank_points: calc.calculation.peakRankPoints,
              calculated_adaptive_weight: calc.calculation.points,
              adaptive_factor: calc.calculation.adaptiveFactor,
              rank_decay_factor: calc.calculation.rankDecayFactor,
              time_since_peak_days: calc.calculation.timeSincePeakDays,
              current_rank: calc.calculation.currentRank,
              peak_rank: calc.calculation.peakRank,
              weight_source: calc.calculation.source,
              calculation_reasoning: calc.calculation.calculationReasoning,
              manual_override_applied: calc.calculation.source === 'manual_override'
            }));

            try {
              const { error: adaptiveError } = await supabase
                .from('tournament_adaptive_weights')
                .insert(adaptiveWeightData);
              
              if (adaptiveError) {
                console.error('Error saving adaptive weight calculations:', adaptiveError);
              }
            } catch (err) {
              console.error('Failed to save adaptive weight calculations:', err);
            }
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

          {/* ATLAS Decision Display (Persistent for Admins) */}
          <AtlasDecisionDisplay 
            balanceResult={balanceAnalysis}
            isVisible={!!balanceAnalysis}
            tournamentName={tournament?.name}
          />

          {/* Simplified Control Panel */}
          <BalancingControlPanel
            enableAdaptiveWeights={enableAdaptiveWeights}
            onAdaptiveWeightsChange={handleAdaptiveWeightsChange}
            onAutobalance={autobalanceUnassignedPlayers}
            onSave={saveTeamChanges}
            onCreateTeams={createEmptyTeams}
            autobalancing={autobalancing}
            saving={saving}
            creatingTeams={creatingTeams}
            hasPlaceholderTeams={hasPlaceholderTeams}
            unassignedPlayersCount={unassignedPlayers.length}
            maxTeams={maxTeams}
            balance={balance}
            loadingAdaptiveSettings={loadingAdaptiveSettings}
          />

          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Users className="w-5 h-5" />
                Manual Team Assignment
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-slate-300 text-sm">
                <p>Drag and drop players between teams for fine-tuning.</p>
                <p className="mt-1">
                  Tournament setup: {maxTeams} teams, {teamSize}v{teamSize} format
                  {teamSize === 1 ? ' (1v1 - each player gets their own team)' : ` (${teamSize} players per team)`}
                </p>
              </div>

              {/* Enhanced Progress Display */}
              <AutobalanceProgress
                isVisible={showProgress}
                totalPlayers={unassignedPlayers.length}
                currentStep={progressStep}
                lastStep={lastProgressStep}
                phase={currentPhase}
                atlasEnabled={enableAdaptiveWeights}
              />
            </CardContent>
          </Card>
      
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h3 className="text-white font-medium flex items-center gap-2">
                <Shuffle className="w-4 h-4" />
                Teams ({teams.length}/{maxTeams})
              </h3>
              {teams.map((team) => (
                <DroppableTeam key={team.id} team={team} teamSize={teamSize} enableAdaptiveWeights={enableAdaptiveWeights} />
              ))}
            </div>
      
            <div className="space-y-4">
              {/* Unassigned Players Section */}
              <div>
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Unassigned Players ({unassignedPlayers.length})
                </h3>
                <DroppableUnassigned players={unassignedPlayers} enableAdaptiveWeights={enableAdaptiveWeights} />
              </div>

              {/* Substitute Players Section - Always show even if empty */}
              <div>
                <h3 className="text-lg font-semibold text-amber-300 mb-4 flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Substitute Players ({substitutePlayers.length})
                </h3>
                <DroppableSubstitutes players={substitutePlayers} enableAdaptiveWeights={enableAdaptiveWeights} />
              </div>
            </div>
          </div>
        </div>
      </DndContext>
    </ErrorBoundary>
  );
};

export default TeamBalancingInterface;
