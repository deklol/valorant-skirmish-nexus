
import { supabase } from "@/integrations/supabase/client";
import { useEnhancedNotifications } from "@/hooks/useEnhancedNotifications";
import { getRankPointsWithManualOverride } from "@/utils/rankingSystemWithOverrides";
import { enhancedSnakeDraft } from "./EnhancedSnakeDraft";
import { calculateAdaptiveWeight, ExtendedUserRankData } from "@/utils/adaptiveWeightSystem";

interface UseTeamBalancingProps {
  tournamentId: string;
  maxTeams: number;
  onTeamsBalanced: () => void;
}

export const useTeamBalancingLogic = ({ tournamentId, maxTeams, onTeamsBalanced }: UseTeamBalancingProps) => {
  const { notifyTeamAssigned } = useEnhancedNotifications();

  const balanceTeams = async () => {
    // Get tournament details including team_size and adaptive weights setting
    const { data: tournament } = await supabase
      .from('tournaments')
      .select('name, match_format, team_size, enable_adaptive_weights')
      .eq('id', tournamentId)
      .single();

    if (!tournament) throw new Error('Tournament not found');

    const teamSize = tournament.team_size || 5; // Default to 5v5 if not set
    console.log(`Tournament team size: ${teamSize}v${teamSize}`);

    // Get all signups with user details including manual override fields and tournament wins
    const { data: signups } = await supabase
      .from('tournament_signups')
      .select(`
        user_id,
        is_checked_in,
        users:user_id (
          id,
          discord_username,
          rank_points,
          current_rank,
          peak_rank,
          weight_rating,
          manual_rank_override,
          manual_weight_override,
          use_manual_override,
          rank_override_reason,
          tournaments_won,
          tournaments_played,
          wins,
          losses
        )
      `)
      .eq('tournament_id', tournamentId)
      .eq('is_checked_in', true); // Only include checked-in players

    if (!signups || signups.length === 0) {
      throw new Error('No checked-in players found for this tournament');
    }

    const totalPlayers = signups.length;
    
    // Determine team configuration based on team size
    let teamsToCreate: number;
    let playersPerTeam: number;

    if (teamSize === 1) {
      // 1v1 format - each player gets their own team
      teamsToCreate = totalPlayers;
      playersPerTeam = 1;
      console.log(`Creating 1v1 format: ${teamsToCreate} teams with 1 player each`);
    } else {
      // Team format (2v2, 3v3, 4v4, 5v5)
      teamsToCreate = Math.min(maxTeams, Math.floor(totalPlayers / teamSize));
      playersPerTeam = teamSize;
      
      if (teamsToCreate < 2) {
        throw new Error(`Need at least ${teamSize * 2} checked-in players to form teams for ${teamSize}v${teamSize} format`);
      }
      
      console.log(`Creating ${teamSize}v${teamSize} format: ${teamsToCreate} teams with ${playersPerTeam} players each`);
    }

    // Clear existing teams
    await clearExistingTeams();

    // Sort players by enhanced ranking system with optional adaptive weights
    const sortedPlayers = signups
      .filter(signup => signup.users)
      .sort((a, b) => {
        let aRankResult, bRankResult;
        
        if (tournament.enable_adaptive_weights) {
          aRankResult = calculateAdaptiveWeight(a.users);
          bRankResult = calculateAdaptiveWeight(b.users);
        } else {
          aRankResult = getRankPointsWithManualOverride(a.users);
          bRankResult = getRankPointsWithManualOverride(b.users);
        }
        
        return bRankResult.points - aRankResult.points;
      });

    if (teamSize === 1) {
      await createIndividualTeams(sortedPlayers);
    } else {
      await createBalancedTeams(sortedPlayers, teamsToCreate, teamSize);
    }

    onTeamsBalanced();
  };

  const clearExistingTeams = async () => {
    await supabase
      .from('team_members')
      .delete()
      .in('team_id', 
        (await supabase
          .from('teams')
          .select('id')
          .eq('tournament_id', tournamentId)
        ).data?.map(t => t.id) || []
      );

    await supabase
      .from('teams')
      .delete()
      .eq('tournament_id', tournamentId);
  };

  const createIndividualTeams = async (sortedPlayers: any[]) => {
    // Get tournament settings for this function scope
    const { data: tournament } = await supabase
      .from('tournaments')
      .select('enable_adaptive_weights')
      .eq('id', tournamentId)
      .single();

    for (let i = 0; i < sortedPlayers.length; i++) {
      const player = sortedPlayers[i];
      const teamName = `${player.users?.discord_username || 'Player'} (Solo)`;
      const rankResult = tournament?.enable_adaptive_weights 
        ? calculateAdaptiveWeight(player.users)
        : getRankPointsWithManualOverride(player.users);
      
      // Create team
      const { data: newTeam, error: teamError } = await supabase
        .from('teams')
        .insert({
          name: teamName,
          tournament_id: tournamentId,
          total_rank_points: rankResult.points,
          seed: i + 1
        })
        .select()
        .single();

      if (teamError) throw teamError;

      // Add team member (player is automatically captain of their own team)
      await supabase
        .from('team_members')
        .insert({
          team_id: newTeam.id,
          user_id: player.user_id,
          is_captain: true
        });

      // Send notification to player
      try {
        await notifyTeamAssigned(newTeam.id, teamName, [player.user_id]);
      } catch (notificationError) {
        console.error('Failed to send notification:', notificationError);
      }
    }
  };

  const createBalancedTeams = async (sortedPlayers: any[], teamsToCreate: number, teamSize: number) => {
    // Get tournament settings for this function scope
    const { data: tournament } = await supabase
      .from('tournaments')
      .select('enable_adaptive_weights')
      .eq('id', tournamentId)
      .single();

    // Use enhanced snake draft with detailed logging
    const playerData = sortedPlayers.map(signup => signup.users);
    const result = enhancedSnakeDraft(playerData, teamsToCreate, teamSize);
    
    const { teams, balanceSteps, finalBalance } = result;

    // Helper to ensure unique team names
    const usedNames = new Set<string>();
    const createdTeams: any[] = [];

    // Create teams in database
    for (let i = 0; i < teams.length; i++) {
      if (teams[i].length === 0) continue;

      // Captain is ALWAYS first (highest rating), ensured by sorting before insertion
      const captainUser =
        teams[i][0]?.discord_username && typeof teams[i][0]?.discord_username === 'string'
          ? teams[i][0].discord_username.trim()
          : null;
      let baseName = captainUser ? `Team ${captainUser}` : `Team Unknown`;

      // Ensure uniqueness by adding counter if needed
      let teamName = baseName;
      let count = 2;
      while (usedNames.has(teamName)) {
        teamName = `${baseName} (${count})`;
        count += 1;
      }
      usedNames.add(teamName);

      // Calculate total weight using enhanced ranking system with optional adaptive weights
      const totalWeight = teams[i].reduce((sum, player) => {
        const rankResult = tournament?.enable_adaptive_weights 
          ? calculateAdaptiveWeight(player)
          : getRankPointsWithManualOverride(player);
        return sum + rankResult.points;
      }, 0);

      // Create team
      const { data: newTeam, error: teamError } = await supabase
        .from('teams')
        .insert({
          name: teamName,
          tournament_id: tournamentId,
          total_rank_points: totalWeight,
          seed: i + 1
        })
        .select()
        .single();

      if (teamError) throw teamError;
      createdTeams.push({ ...newTeam, players: teams[i] });

      // Add team members
      for (let j = 0; j < teams[i].length; j++) {
        const player = teams[i][j];
        const isCaptain = j === 0; // First player (highest weight) is captain

        // Find the original signup to get user_id
        const originalSignup = sortedPlayers.find(s => s.users?.id === player.id);
        if (originalSignup) {
          await supabase
            .from('team_members')
            .insert({
              team_id: newTeam.id,
              user_id: originalSignup.user_id,
              is_captain: isCaptain
            });
        }
      }

      // Send notifications to team members
      const teamUserIds = teams[i]
        .map(player => sortedPlayers.find(s => s.users?.id === player.id)?.user_id)
        .filter(Boolean);
      try {
        await notifyTeamAssigned(newTeam.id, teamName, teamUserIds);
      } catch (notificationError) {
        console.error('Failed to send notification:', notificationError);
      }
    }

    // Save balance analysis to tournament
    await saveBalanceAnalysis(balanceSteps, finalBalance, createdTeams, teamSize, tournament?.enable_adaptive_weights || false);
  };

  const saveBalanceAnalysis = async (balanceSteps: any[], finalBalance: any, createdTeams: any[], teamSize: number, adaptiveWeightsEnabled: boolean) => {
    const analysis = {
      qualityScore: Math.round(
        finalBalance.balanceQuality === 'ideal' ? 95 :
        finalBalance.balanceQuality === 'good' ? 80 :
        finalBalance.balanceQuality === 'warning' ? 65 : 45
      ),
      maxPointDifference: finalBalance.maxPointDifference,
      avgPointDifference: finalBalance.maxPointDifference / 2, // Approximate
      balanceSteps: balanceSteps.map(step => ({
        round: Math.floor(step.step / createdTeams.length) + 1,
        player: {
          name: step.player.discord_username,
          rank: step.player.rank,
          points: step.player.points
        },
        assignedTo: `Team ${step.assignedTeam + 1}`,
        reasoning: step.reasoning,
        teamStates: step.teamStatesAfter.map((state, index) => ({
          name: `Team ${index + 1}`,
          totalPoints: state.totalPoints,
          playerCount: state.playerCount
        }))
      })),
      finalTeamStats: createdTeams.map((team, index) => ({
        name: team.name,
        totalPoints: team.total_rank_points,
        playerCount: team.players.length,
        avgPoints: Math.round(team.total_rank_points / team.players.length)
      })),
      method: `Snake Draft (${teamSize}v${teamSize})${adaptiveWeightsEnabled ? ' with Adaptive Weights' : ''}`,
      timestamp: new Date().toISOString()
    };

    await supabase
      .from('tournaments')
      .update({ balance_analysis: analysis })
      .eq('id', tournamentId);
  };

  return { balanceTeams };
};
