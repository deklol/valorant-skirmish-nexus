import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Team } from "@/types/tournamentDetail";
import type { Tournament } from "@/types/tournament";
import { extractATLASWeightsFromBalanceAnalysis } from "@/utils/broadcastWeightUtils";
import { calculateBroadcastSeeds } from "@/utils/broadcastSeedingUtils";

export function useBroadcastData(tournamentId: string | undefined) {
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [atlasWeights, setAtlasWeights] = useState<Map<string, number>>(new Map());

  console.log('🎬 BROADCAST HOOK INIT:', { tournamentId, loading });

  useEffect(() => {
    if (!tournamentId) {
      console.log('❌ BROADCAST: No tournament ID provided');
      setError("No tournament ID provided");
      setLoading(false);
      return;
    }

    const fetchBroadcastData = async () => {
      try {
        console.log('🎬 BROADCAST: Starting data fetch for tournament:', tournamentId);
        setLoading(true);
        
        // Fetch tournament data with balance analysis
        const { data: tournamentData, error: tournamentError } = await supabase
          .from('tournaments')
          .select('*, balance_analysis')
        .eq('id', tournamentId)
        .maybeSingle();

        if (tournamentError) throw tournamentError;

        // Check if tournament is live or completed for broadcast
        if (!tournamentData.status || !['live', 'completed'].includes(tournamentData.status)) {
          setError("Tournament must be live or completed for broadcast");
          setLoading(false);
          return;
        }

        const tournamentWithBalanceAnalysis = {
          ...tournamentData,
          map_pool: Array.isArray(tournamentData.map_pool) ? tournamentData.map_pool : [],
          map_veto_required_rounds: Array.isArray(tournamentData.map_veto_required_rounds) ? tournamentData.map_veto_required_rounds : []
        } as Tournament;

        setTournament(tournamentWithBalanceAnalysis);

        // Extract ATLAS weights from stored balance analysis
        const storedATLASWeights = extractATLASWeightsFromBalanceAnalysis(
          tournamentData.balance_analysis as any
        );
        const atlasWeightMap = new Map<string, number>();
        storedATLASWeights.forEach(weight => {
          atlasWeightMap.set(weight.userId, weight.points);
        });
        setAtlasWeights(atlasWeightMap);

        console.log('🏛️ BROADCAST: Extracted ATLAS weights:', {
          total: storedATLASWeights.length,
          weights: Object.fromEntries(atlasWeightMap)
        });

        // Fetch teams with members and user data + tournament statistics
        const { data: teamsData, error: teamsError } = await supabase
          .from('teams')
          .select(`
            *,
            team_members (
              user_id,
              is_captain,
              users (
                discord_username,
                discord_avatar_url,
                current_rank,
                riot_id,
                rank_points,
                weight_rating,
                peak_rank,
                tournaments_won
              )
            )
          `)
          .eq('tournament_id', tournamentId)
          .order('total_rank_points', { ascending: false });

        if (teamsError) throw teamsError;

        // Fetch adaptive weights for this tournament
        const { data: adaptiveWeights } = await supabase
          .from('tournament_adaptive_weights')
          .select('*')
          .eq('tournament_id', tournamentId);

        // Fetch tournament statistics for each user
        const userIds = teamsData?.flatMap(team => 
          team.team_members.map(member => member.user_id)
        ) || [];
        
        const { data: userStats } = await supabase
          .from('users')
          .select('id, tournaments_won, tournaments_played')
          .in('id', userIds);

        // Fetch real matches for bracket
        const { data: matchesData } = await supabase
          .from('matches')
          .select(`
            *,
            team1:teams!matches_team1_id_fkey (name),
            team2:teams!matches_team2_id_fkey (name),
            winner:teams!matches_winner_id_fkey (name)
          `)
          .eq('tournament_id', tournamentId)
          .order('round_number', { ascending: true });

        // Calculate proper seeds based on team weights and merge ATLAS weights
        const teamsWithCalculatedSeeds = teamsData ? calculateBroadcastSeeds(teamsData) : [];
        const teamsWithATLASWeights = teamsWithCalculatedSeeds?.map(team => ({
          ...team,
          team_members: team.team_members.map(member => {
            const adaptiveWeight = adaptiveWeights?.find(w => w.user_id === member.user_id);
            const atlasWeight = atlasWeightMap.get(member.user_id);
            const userStat = userStats?.find(u => u.id === member.user_id);
            
            // Prefer ATLAS weight, then adaptive weight, then fallback
            const displayWeight = atlasWeight || adaptiveWeight?.calculated_adaptive_weight || 150;
            
            console.log(`🎯 BROADCAST USER ${member.user_id}:`, {
              username: member.users?.discord_username,
              atlasWeight,
              adaptiveWeight: adaptiveWeight?.calculated_adaptive_weight,
              finalDisplayWeight: displayWeight,
              tournamentsWon: userStat?.tournaments_won || member.users?.tournaments_won,
              hasUsers: !!member.users,
              userKeys: member.users ? Object.keys(member.users) : []
            });
            
            const enhancedUser = {
              ...member.users,
              adaptive_weight: adaptiveWeight?.calculated_adaptive_weight,
              atlas_weight: atlasWeight, // ATLAS weight from stored calculations
              display_weight: displayWeight, // Primary weight to display
              peak_rank_points: adaptiveWeight?.peak_rank_points,
              adaptive_factor: adaptiveWeight?.adaptive_factor,
              tournaments_won: userStat?.tournaments_won || member.users?.tournaments_won || 0,
              tournaments_played: userStat?.tournaments_played || 0
            };
            
            console.log(`💫 ENHANCED USER ${member.user_id}:`, {
              enhancedUserKeys: Object.keys(enhancedUser),
              display_weight: enhancedUser.display_weight,
              atlas_weight: enhancedUser.atlas_weight
            });
            
            return {
              ...member,
              users: enhancedUser
            };
          })
        })) || [];

        console.log('🎬 BROADCAST: Final teams data:', {
          totalTeams: teamsWithATLASWeights.length,
          firstTeamSample: teamsWithATLASWeights[0]?.team_members?.[0]?.users
        });

        setTeams(teamsWithATLASWeights);
        
        // Store matches for bracket view
        (window as any).broadcastMatches = matchesData || [];
        setError(null);
      } catch (err: any) {
        console.error('Error fetching broadcast data:', err);
        setError(err.message || 'Failed to load broadcast data');
      } finally {
        setLoading(false);
      }
    };

    fetchBroadcastData();
  }, [tournamentId]);

  return { tournament, teams, loading, error, atlasWeights };
}