
import { supabase } from "@/integrations/supabase/client";
import { useEnhancedNotifications } from "@/hooks/useEnhancedNotifications";
import { getRankPoints } from "@/utils/rankingSystem";

interface UseTeamBalancingProps {
  tournamentId: string;
  maxTeams: number;
  onTeamsBalanced: () => void;
}

export const useTeamBalancingLogic = ({ tournamentId, maxTeams, onTeamsBalanced }: UseTeamBalancingProps) => {
  const { notifyTeamAssigned } = useEnhancedNotifications();

  const balanceTeams = async () => {
    // Get tournament details including team_size
    const { data: tournament } = await supabase
      .from('tournaments')
      .select('name, match_format, team_size')
      .eq('id', tournamentId)
      .single();

    if (!tournament) throw new Error('Tournament not found');

    const teamSize = tournament.team_size || 5; // Default to 5v5 if not set
    console.log(`Tournament team size: ${teamSize}v${teamSize}`);

    // Get all signups with user details and weight_rating (including checked-in players)
    const { data: signups } = await supabase
      .from('tournament_signups')
      .select(`
        user_id,
        is_checked_in,
        users:user_id (
          discord_username,
          rank_points,
          current_rank,
          weight_rating
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

    // Sort players by weight_rating (descending) with fallback to rank-based calculation
    const sortedPlayers = signups
      .filter(signup => signup.users)
      .sort((a, b) => {
        const aWeight = a.users?.weight_rating || getRankPoints(a.users?.current_rank || 'Unranked');
        const bWeight = b.users?.weight_rating || getRankPoints(b.users?.current_rank || 'Unranked');
        return bWeight - aWeight;
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
    for (let i = 0; i < sortedPlayers.length; i++) {
      const player = sortedPlayers[i];
      const teamName = `${player.users?.discord_username || 'Player'} (Solo)`;
      const playerWeight = player.users?.weight_rating || getRankPoints(player.users?.current_rank || 'Unranked');
      
      // Create team
      const { data: newTeam, error: teamError } = await supabase
        .from('teams')
        .insert({
          name: teamName,
          tournament_id: tournamentId,
          total_rank_points: playerWeight,
          seed: i + 1
        })
        .select()
        .single();

      if (teamError) throw teamError;

      // Add team member (player is automatically captain of their own team in 1v1)
      await supabase
        .from('team_members')
        .insert({
          team_id: newTeam.id,
          user_id: player.user_id,
          is_captain: true // In 1v1, every player is their own captain
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
    // Create teams using snake draft algorithm for optimal balance
    const teams: any[][] = Array(teamsToCreate).fill(null).map(() => []);
    let currentTeam = 0;
    let direction = 1; // 1 for forward, -1 for backward

    // Distribute players using snake draft for maximum balance
    for (const player of sortedPlayers) {
      if (teams[currentTeam].length < teamSize) {
        teams[currentTeam].push(player);
      }
      
      // Move to next team only if current team has room
      if (teams[currentTeam].length < teamSize) {
        continue; // Stay on current team until it's full
      }
      
      // Move to next team when current is full
      currentTeam += direction;
      
      // Reverse direction when we reach the end
      if (currentTeam === teamsToCreate) {
        currentTeam = teamsToCreate - 1;
        direction = -1;
      } else if (currentTeam === -1) {
        currentTeam = 0;
        direction = 1;
      }
      
      // If we've filled all teams to capacity, break
      const allTeamsFull = teams.every(team => team.length === teamSize);
      if (allTeamsFull) break;
    }

    // Create teams in database with proper captain assignment
    for (let i = 0; i < teams.length; i++) {
      if (teams[i].length === 0) continue;

      const teamName = `Team ${String.fromCharCode(65 + i)}`; // Team A, Team B, etc.
      
      // Calculate total weight_rating for the team
      const totalWeight = teams[i].reduce((sum, player) => {
        const weight = player.users?.weight_rating || getRankPoints(player.users?.current_rank || 'Unranked');
        return sum + weight;
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

      // Sort team members by weight_rating to assign captain to highest-ranked player
      const sortedTeamMembers = teams[i].sort((a, b) => {
        const aWeight = a.users?.weight_rating || getRankPoints(a.users?.current_rank || 'Unranked');
        const bWeight = b.users?.weight_rating || getRankPoints(b.users?.current_rank || 'Unranked');
        return bWeight - aWeight;
      });

      // Add team members with proper captain assignment
      for (let j = 0; j < sortedTeamMembers.length; j++) {
        const player = sortedTeamMembers[j];
        const isCaptain = j === 0; // First player (highest weight) is captain

        await supabase
          .from('team_members')
          .insert({
            team_id: newTeam.id,
            user_id: player.user_id,
            is_captain: isCaptain
          });
      }

      // Send notifications to team members
      const teamUserIds = teams[i].map(player => player.user_id);
      try {
        await notifyTeamAssigned(newTeam.id, teamName, teamUserIds);
      } catch (notificationError) {
        console.error('Failed to send notification:', notificationError);
      }
    }
  };

  return { balanceTeams };
};
