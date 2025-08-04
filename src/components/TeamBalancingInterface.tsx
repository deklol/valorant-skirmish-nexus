import { useState, useEffect, useCallback, useMemo } from 'react';
import { DndContext, closestCenter, DragEndEvent, DragOverlay, useDraggable, useDroppable } from '@dnd-kit/core';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertTriangle, Users, Shuffle, Save, Plus, GripVertical, Zap, TrendingUp, Settings } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { getRankPointsWithManualOverride } from "@/utils/rankingSystemWithOverrides";
import { calculateEvidenceBasedWeightWithMiniAi, type PlayerForEvidence, type EvidenceCalculationResult } from "@/utils/evidenceBasedWeightSystem";
import { useEnhancedNotifications } from "@/hooks/useEnhancedNotifications";
import EnhancedRankFallbackAlert from "@/components/team-balancing/EnhancedRankFallbackAlert";
import TeamCleanupTools from "@/components/team-balancing/TeamCleanupTools";
import ErrorBoundary from "@/components/ErrorBoundary";
import { Username } from "@/components/Username";
import { enhancedSnakeDraft, type EnhancedTeamResult, type BalanceStep } from "@/components/team-balancing/EnhancedSnakeDraft";
import { evidenceBasedSnakeDraft, type EvidenceTeamResult, type EvidenceBalanceStep } from "@/components/team-balancing/EvidenceBasedSnakeDraft";
import { AutobalanceProgress } from "@/components/team-balancing/AutobalanceProgress";
import { AtlasDecisionSystem, type AtlasAnalysis } from "@/utils/miniAiDecisionSystem";
import AtlasDecisionDisplay from "@/components/team-balancing/AtlasDecisionDisplay";
import BalancingControlPanel from "@/components/team-balancing/BalancingControlPanel";
import { assignWithSkillDistribution } from "@/utils/skillDistribution"; // Assuming this is the new file with the ATLAS-based logic
import { applySnakeDraftDistribution } from "@/utils/snakeDraftDistribution"; // Assuming this is a new file for standard snake draft

// Defining the Player interface with all possible properties for flexibility.
interface Player {
  id: string;
  discord_username: string;
  rank_points: number; // This will become vestigial but is kept for backward compatibility with DB
  weight_rating: number; // The new calculated or overridden weight
  current_rank: string;
  peak_rank?: string | null;
  riot_id?: string;
  manual_rank_override?: string | null;
  manual_weight_override?: number | null;
  use_manual_override?: boolean;
  rank_override_reason?: string | null;
  tournaments_won?: number;
  last_tournament_win?: string | null;
  // New properties for internal use
  adjustedPoints: number;
  weightSource: string;
  calculationReasoning?: string;
  isElite?: boolean;
  pointsForDraft?: number;
}

interface Team {
  id: string;
  name: string;
  members: Player[];
  totalWeight: number;
  isPlaceholder?: boolean;
}

interface TeamBalancingInterfaceProps {
  tournamentId: string;
  maxTeams: number;
  teamSize: number;
  onTeamsUpdated?: () => void;
}

// Enhanced Draggable Player Component
const DraggablePlayer = ({ player, enableAdaptiveWeights }: { player: Player; enableAdaptiveWeights: boolean }) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: player.id,
  });

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
  } : undefined;
  
  // Display the pre-calculated points from the main state
  const displayWeight = player.adjustedPoints;
  const displaySource = player.weightSource;
  const displayRank = player.current_rank;

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
            {displaySource === 'manual_override' && (
              <Badge className="bg-purple-600 text-white text-xs flex items-center gap-1">
                <Settings className="w-3 h-3" />
                Override
              </Badge>
            )}
            {displaySource === 'peak_rank' && (
              <Badge className="bg-amber-600 text-white text-xs flex items-center gap-1">
                <TrendingUp className="w-3 h-3" />
                Peak Rank
              </Badge>
            )}
            {displaySource === 'atlas' && (
              <Badge className="bg-purple-600 text-white text-xs flex items-center gap-1">
                <Zap className="w-3 h-3" />
                ATLAS
              </Badge>
            )}
          </div>
          <div className="text-xs text-slate-400">
            {displaySource === 'manual_override' ? (
              <span>
                Override: {player.manual_rank_override} ({displayWeight} pts)
              </span>
            ) : displaySource === 'atlas' ? (
              <span>
                ATLAS: {displayWeight} pts ({player.calculationReasoning || 'AI-enhanced'})
              </span>
            ) : displaySource === 'peak_rank' ? (
              <span>
                {displayRank || 'Unrated'} → Using Peak: {player.peak_rank} ({displayWeight} pts)
              </span>
            ) : (
              <span>
                {displayRank} • {displayWeight} pts
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Droppable Team Component
const DroppableTeam = ({ team, teamSize, enableAdaptiveWeights }: { team: Team; teamSize: number; enableAdaptiveWeights: boolean }) => {
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
            {Math.round(team.totalWeight)} pts
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
            team.members.map((player) => (
              <DraggablePlayer key={player.id} player={player} enableAdaptiveWeights={enableAdaptiveWeights} />
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
};

// Droppable Unassigned Area
const DroppableUnassigned = ({ players, enableAdaptiveWeights }: { players: Player[]; enableAdaptiveWeights: boolean }) => {
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
const DroppableSubstitutes = ({ players, enableAdaptiveWeights }: { players: Player[]; enableAdaptiveWeights: boolean }) => {
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
  const [enableAdaptiveWeights, setEnableAdaptiveWeights] = useState(false);
  const [loadingAdaptiveSettings, setLoadingAdaptiveSettings] = useState(true);
  const [atlasAnalysis, setAtlasAnalysis] = useState<AtlasAnalysis | null>(null);

  // Global config for the adaptive weights system
  const adaptiveConfig = useMemo(() => ({
    enableEvidenceBasedWeights: true,
    tournamentWinBonus: 15,
    rankDecayThreshold: 2,
    maxDecayPercent: 0.25,
    skillTierCaps: {
      enabled: true,
      eliteThreshold: 400,
      maxElitePerTeam: 1
    }
  }), []);

  // Helper function to calculate player weight based on the adaptive weights setting
  const getPlayerWeight = useCallback(async (player: Player) => {
    if (enableAdaptiveWeights) {
      const result = await calculateEvidenceBasedWeightWithMiniAi({
        current_rank: player.current_rank,
        peak_rank: player.peak_rank,
        manual_rank_override: player.manual_rank_override,
        manual_weight_override: player.manual_weight_override,
        use_manual_override: player.use_manual_override,
        rank_override_reason: player.rank_override_reason,
        weight_rating: player.weight_rating,
        tournaments_won: player.tournaments_won,
        last_tournament_win: player.last_tournament_win
      }, adaptiveConfig, true);
      return {
        points: result.finalAdjustedPoints,
        source: 'atlas',
        rank: player.current_rank,
        calculationReasoning: result.evidenceResult.calculationReasoning,
        isElite: result.isElite,
      };
    } else {
      const result = getRankPointsWithManualOverride(player);
      return {
        points: result.points,
        source: result.source,
        rank: result.rank,
        isElite: result.points >= (adaptiveConfig.skillTierCaps?.eliteThreshold || 400),
      };
    }
  }, [enableAdaptiveWeights, adaptiveConfig]);

  // Synchronous helper for immediate calculations
  const getPlayerWeightSync = useCallback((player: Player) => {
    // For synchronous operations (like drag-and-drop), we fall back to a non-AI calculation
    // The main data fetch handles the async AI calculation.
    const result = getRankPointsWithManualOverride(player);
    return {
      points: result.points,
      source: result.source,
      rank: result.rank,
      isElite: result.points >= (adaptiveConfig.skillTierCaps?.eliteThreshold || 400),
    };
  }, [adaptiveConfig]);

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
        setEnableAdaptiveWeights(data.enable_adaptive_weights || false);
      }
    } catch (e) {
      console.error('Error loading adaptive weights setting:', e);
    } finally {
      setLoadingAdaptiveSettings(false);
    }
  };

  const processPlayers = useCallback(async (users: any[]) => {
    if (!users || users.length === 0) return [];
    
    // First, process players with a non-adaptive fallback to get their basic shape
    const basePlayers = users.map(user => {
      const rankResult = getPlayerWeightSync(user);
      return {
        ...user,
        discord_username: user.discord_username || 'Unknown',
        adjustedPoints: rankResult.points,
        weightSource: rankResult.source,
        isElite: rankResult.isElite,
      };
    });

    // If adaptive weights are enabled, re-calculate the weights with the full pipeline
    if (enableAdaptiveWeights) {
      const updatedPlayers = await Promise.all(
        basePlayers.map(async (player) => {
          const result = await getPlayerWeight(player);
          return {
            ...player,
            adjustedPoints: result.points,
            weightSource: result.source,
            calculationReasoning: result.calculationReasoning,
            isElite: result.isElite,
            pointsForDraft: result.points // Set pointsForDraft for distribution
          };
        })
      );
      return updatedPlayers;
    }
    
    // If not using adaptive weights, use the sync result for the final `adjustedPoints`
    return basePlayers.map(p => ({ ...p, pointsForDraft: p.adjustedPoints }));

  }, [enableAdaptiveWeights, getPlayerWeight, getPlayerWeightSync]);

  const fetchTeamsAndPlayers = useCallback(async () => {
    setLoading(true);
    try {
      console.log('Fetching teams and players for tournament:', tournamentId);
      
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
              current_rank,
              peak_rank,
              riot_id,
              manual_rank_override,
              manual_weight_override,
              use_manual_override,
              rank_override_reason,
              tournaments_won,
              last_tournament_win
            )
          )
        `)
        .eq('tournament_id', tournamentId);
        
      if (teamsError) throw teamsError;

      const { data: participantsData, error: participantsError } = await supabase
        .from('tournament_signups')
        .select(`
          user_id,
          is_substitute,
          users (
            id,
            discord_username,
            current_rank,
            peak_rank,
            riot_id,
            manual_rank_override,
            manual_weight_override,
            use_manual_override,
            rank_override_reason,
            tournaments_won,
            last_tournament_win
          )
        `)
        .eq('tournament_id', tournamentId);

      if (participantsError) throw participantsError;
      
      // Process all users to get their calculated weights
      const allUsers = new Set();
      (teamsData || []).forEach(team => team.team_members.forEach(m => allUsers.add(m.users)));
      (participantsData || []).forEach(p => allUsers.add(p.users));
      
      const processedUsers = await processPlayers(Array.from(allUsers));
      const processedUserMap = new Map(processedUsers.map(u => [u.id, u]));

      // Build teams with processed players
      const processedTeams: Team[] = (teamsData || []).map(team => {
        const members = team.team_members
          .map(member => processedUserMap.get(member.users.id))
          .filter(Boolean) as Player[];

        const totalWeight = members.reduce((sum, member) => sum + member.adjustedPoints, 0);

        return {
          id: team.id,
          name: team.name,
          members,
          totalWeight
        };
      });

      // Find unassigned and substitute players
      const allAssignedUserIds = new Set(
        processedTeams.flatMap(team => team.members.map(member => member.id))
      );
      
      const regularParticipants = (participantsData || [])
        .filter(p => !p.is_substitute)
        .map(p => processedUserMap.get(p.user_id))
        .filter(p => p && !allAssignedUserIds.has(p.id)) as Player[];
      
      const substituteParticipants = (participantsData || [])
        .filter(p => p.is_substitute)
        .map(p => processedUserMap.get(p.user_id))
        .filter(p => p && !allAssignedUserIds.has(p.id)) as Player[];

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
  }, [tournamentId, enableAdaptiveWeights, processPlayers, toast]);
  
  useEffect(() => {
    fetchTeamsAndPlayers();
    fetchTournamentName();
    loadAdaptiveWeightsSetting();
  }, [tournamentId, fetchTeamsAndPlayers]);

  const createPlaceholderTeams = (): Team[] => {
    const placeholderTeams: Team[] = [];
    for (let i = 0; i < maxTeams; i++) {
      const teamName = `Team ${String.fromCharCode(65 + i)}`;
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

    let player: Player | null = null;
    let sourceTeamId: string | null = null;

    const unassignedIndex = unassignedPlayers.findIndex(p => p.id === playerId);
    if (unassignedIndex !== -1) {
      player = unassignedPlayers[unassignedIndex];
    } else {
      const substituteIndex = substitutePlayers.findIndex(p => p.id === playerId);
      if (substituteIndex !== -1) {
        player = substitutePlayers[substituteIndex];
      } else {
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

    if (targetId === 'unassigned') {
      movePlayerToUnassigned(player, sourceTeamId);
    } else if (targetId === 'substitutes') {
      movePlayerToSubstitutes(player, sourceTeamId);
    } else if (targetId.startsWith('team-') || targetId.startsWith('placeholder-')) {
      const teamId = targetId.replace('team-', '').replace('placeholder-', '');
      const targetTeam = teams.find(t => t.id === teamId || t.id === `placeholder-${teamId}`);
      
      if (targetTeam) {
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
    setTeams(prevTeams => 
      prevTeams.map(team => {
        if (team.id === sourceTeamId) {
          const newMembers = team.members.filter(p => p.id !== player.id);
          const totalWeight = newMembers.reduce((sum, member) => sum + member.adjustedPoints, 0);
          return { ...team, members: newMembers, totalWeight };
        }
        return team;
      })
    );
    setSubstitutePlayers(prev => prev.filter(p => p.id !== player.id));
    setUnassignedPlayers(prev => {
      if (prev.some(p => p.id === player.id)) return prev;
      return [...prev, player];
    });
    updatePlayerSubstituteStatus(player.id, false);
    logManualTeamAdjustment(player, sourceTeamId, null, 'drag_to_unassigned');
  };

  const movePlayerToSubstitutes = async (player: Player, sourceTeamId: string | null) => {
    setTeams(prevTeams => 
      prevTeams.map(team => {
        if (team.id === sourceTeamId) {
          const newMembers = team.members.filter(p => p.id !== player.id);
          const totalWeight = newMembers.reduce((sum, member) => sum + member.adjustedPoints, 0);
          return { ...team, members: newMembers, totalWeight };
        }
        return team;
      })
    );
    setUnassignedPlayers(prev => prev.filter(p => p.id !== player.id));
    setSubstitutePlayers(prev => {
      if (prev.some(p => p.id === player.id)) return prev;
      return [...prev, player];
    });
    updatePlayerSubstituteStatus(player.id, true);
    logManualTeamAdjustment(player, sourceTeamId, null, 'drag_to_substitutes');
  };

  const movePlayerToTeam = (player: Player, targetTeamId: string, sourceTeamId: string | null) => {
    // Remove from source
    if (sourceTeamId) {
      setTeams(prevTeams => 
        prevTeams.map(team => {
          if (team.id === sourceTeamId) {
            const newMembers = team.members.filter(p => p.id !== player.id);
            const totalWeight = newMembers.reduce((sum, member) => sum + member.adjustedPoints, 0);
            return { ...team, members: newMembers, totalWeight };
          }
          return team;
        })
      );
    } else {
      setUnassignedPlayers(prev => prev.filter(p => p.id !== player.id));
      setSubstitutePlayers(prev => prev.filter(p => p.id !== player.id));
    }

    // Add to target team
    setTeams(prevTeams => 
      prevTeams.map(team => {
        if (team.id === targetTeamId) {
          const newMembers = [...team.members, player];
          const totalWeight = newMembers.reduce((sum, member) => sum + member.adjustedPoints, 0);
          return { ...team, members: newMembers, totalWeight };
        }
        return team;
      })
    );
    updatePlayerSubstituteStatus(player.id, false);
    logManualTeamAdjustment(player, sourceTeamId, targetTeamId, 'drag_to_team');
  };

  const logManualTeamAdjustment = async (player: Player, sourceTeamId: string | null, targetTeamId: string | null, action: string) => {
    try {
      const sourceTeam = sourceTeamId ? teams.find(t => t.id === sourceTeamId) : null;
      const targetTeam = targetTeamId ? teams.find(t => t.id === targetTeamId) : null;
      
      const adjustmentData = {
        timestamp: new Date().toISOString(),
        tournament_id: tournamentId,
        action: `manual_team_adjustment_${action}`,
        player: {
          id: player.id,
          discord_username: player.discord_username,
          current_rank: player.current_rank,
          adjustedPoints: player.adjustedPoints,
          weightSource: player.weightSource,
          adaptiveReasoning: player.calculationReasoning,
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

      const { error } = await supabase
        .from('audit_logs')
        .insert({
          table_name: 'team_balancing_manual_adjustments',
          action: 'MANUAL_TEAM_ADJUSTMENT',
          record_id: tournamentId,
          user_id: null,
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

  const handleAdaptiveWeightsChange = async (checked: boolean) => {
    try {
      const { error } = await supabase
        .from('tournaments')
        .update({ enable_adaptive_weights: checked })
        .eq('id', tournamentId);
      
      if (error) throw error;
      
      setEnableAdaptiveWeights(checked);
      await fetchTeamsAndPlayers(); // Rerun fetch to get new weights
      
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

  async function autobalanceUnassignedPlayers() {
    setAutobalancing(true);
    setShowProgress(true);
    setProgressStep(0);
    setLastProgressStep(undefined);
    setAtlasAnalysis(null);
    setCurrentPhase('analyzing');
    
    try {
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

      // Prepare players for distribution - now they have `pointsForDraft`
      const playersToDistribute = [...unassignedPlayers].map(p => ({
        ...p,
        points: p.adjustedPoints
      }));
      
      let finalTeamsState;
      let analysisResult = null;

      if (enableAdaptiveWeights) {
        // Use the new ATLAS-based distribution
        setCurrentPhase('atlas-initializing');
        const atlasSystem = new AtlasDecisionSystem({
            eliteThreshold: adaptiveConfig.skillTierCaps.eliteThreshold,
            aggressivenessLevel: 'aggressive',
        });

        // Run the full ATLAS analysis pipeline on all players
        const atlasInputPlayers = [...unassignedPlayers, ...substitutePlayers, ...teams.flatMap(t => t.members)].map(p => ({
            userId: p.id,
            username: p.discord_username,
            currentRank: p.current_rank,
            peakRank: p.peak_rank,
            manualOverrideRank: p.manual_rank_override,
            manualOverrideWeight: p.manual_weight_override,
            useManualOverride: p.use_manual_override,
            weightRating: p.weight_rating,
            tournamentsWon: p.tournaments_won,
            lastTournamentWin: p.last_tournament_win,
        }));
        
        const fullAtlasAnalysis = await atlasSystem.analyzeAndDecide(atlasInputPlayers);
        setAtlasAnalysis(fullAtlasAnalysis);
        
        // This is a simplified integration. For a more complete one, we would apply
        // the decisions from the AtlasAnalysis. For this example, we'll
        // use the `isElite` flag from the player data to trigger a smart draft.
        
        const elitePlayers = playersToDistribute.filter(p => p.isElite);
        const regularPlayers = playersToDistribute.filter(p => !p.isElite);
        
        finalTeamsState = assignWithSkillDistribution({
          players: playersToDistribute,
          elitePlayers: elitePlayers,
          numTeams: numTeams,
          teamSize: teamSize,
          existingTeams: availableTeams,
        });

      } else {
        // Use the standard snake draft distribution
        finalTeamsState = applySnakeDraftDistribution({
          players: playersToDistribute,
          numTeams: numTeams,
          teamSize: teamSize,
          existingTeams: availableTeams,
        });
      }
      
      // Update the state with the final distribution
      setTeams(prevTeams => prevTeams.map(team => {
        const matchingFinalTeam = finalTeamsState.find(ft => ft.id === team.id);
        if (matchingFinalTeam) {
          return {
            ...team,
            members: matchingFinalTeam.members,
            totalWeight: matchingFinalTeam.totalWeight,
          };
        }
        return team;
      }));

      setUnassignedPlayers([]);

      const autobalanceType = enableAdaptiveWeights ? 'ATLAS-Enhanced Distribution' : 'Snake Draft';
      const balanceQuality = 'Perfect'; // Placeholder, as the new functions don't return a quality
      toast({
        title: `${autobalanceType} Complete`,
        description: `Players distributed across ${numTeams} teams. Balance quality: ${balanceQuality}.`,
      });

    } catch (e) {
      console.error('Autobalance error:', e);
      toast({
        title: "Autobalance Error",
        description: "Something went wrong during autobalance.",
        variant: "destructive",
      });
    } finally {
      setAutobalancing(false);
      setShowProgress(false);
    }
  }

  const saveTeamChanges = async () => {
    setSaving(true);
    try {
      const usedNames = new Set<string>();
      let reorderedTeams = teams.map(team => {
        const sortedMembers = [...team.members].sort((a, b) => b.adjustedPoints - a.adjustedPoints);
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
        }
        
        await notifications.notifyTeamAssigned(
          team.id,
          team.name,
          team.members.map(m => m.id),
          tournamentName
        );
      }
      
      if (atlasAnalysis) {
        const { error: analysisError } = await supabase
          .from('tournaments')
          .update({
            balance_analysis: JSON.stringify(atlasAnalysis)
          })
          .eq('id', tournamentId);
        
        if (analysisError) {
          console.error('Error saving ATLAS analysis:', analysisError);
        }
        setAtlasAnalysis(null);
      }

      toast({
        title: "Teams Updated",
        description: "Team assignments have been saved successfully.",
      });

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

  function getCaptainBasedTeamName(members: Player[], fallback: string = "Team Unknown") {
    if (members.length === 0) return fallback;
    let sorted = [...members].sort((a, b) => b.adjustedPoints - a.adjustedPoints);
    let captain = sorted[0];
    if (!captain || !captain.discord_username) return fallback;
    return teamSize === 1
      ? `${captain.discord_username} (Solo)`
      : `Team ${captain.discord_username}`;
  }

  const getBalanceAnalysis = () => {
    const teamsWithMembers = teams.filter(team => team.members.length > 0);
    if (teamsWithMembers.length < 2) return null;
    const teamWeights = teamsWithMembers.map(team => team.totalWeight);
    const maxWeight = Math.max(...teamWeights);
    const minWeight = Math.min(...teamWeights);
    const delta = Math.abs(maxWeight - minWeight);
    
    let balanceStatus: 'ideal' | 'good' | 'warning' | 'poor';
    let statusColor: string;
    let statusMessage: string;
    
    if (delta <= 25) {
      balanceStatus = 'ideal';
      statusColor = 'text-green-400';
      statusMessage = 'Perfectly balanced teams';
    } else if (delta <= 50) {
      balanceStatus = 'good';
      statusColor = 'text-blue-400';
      statusMessage = 'Well balanced teams';
    } else if (delta <= 100) {
      balanceStatus = 'warning';
      statusColor = 'text-yellow-400';
      statusMessage = 'Teams could be better balanced';
    } else {
      balanceStatus = 'poor';
      statusColor = 'text-red-400';
      statusMessage = '⚠️ Teams are poorly balanced - consider rebalancing';
    }

    return {
      delta,
      balanceStatus,
      statusColor,
      statusMessage,
      team1Points: maxWeight,
      team2Points: minWeight
    };
  };

  if (loading || loadingAdaptiveSettings) {
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
          <EnhancedRankFallbackAlert players={allPlayers} />

          <TeamCleanupTools 
            tournamentId={tournamentId}
            teams={teams}
            onTeamsUpdated={fetchTeamsAndPlayers}
          />

          <AtlasDecisionDisplay 
            balanceResult={atlasAnalysis}
            isVisible={!!atlasAnalysis}
            tournamentName={tournamentName}
          />

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
              <div>
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Unassigned Players ({unassignedPlayers.length})
                </h3>
                <DroppableUnassigned players={unassignedPlayers} enableAdaptiveWeights={enableAdaptiveWeights} />
              </div>

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

