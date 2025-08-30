import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface BroadcastApiData {
  tournament: any;
  teams: any[];
  matches: any[];
  players: any[];
  stats: any;
}

// API endpoint component that returns JSON data for external integrations
export default function TournamentData() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<BroadcastApiData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;

    const fetchAllData = async () => {
      try {
        // Fetch tournament
        const { data: tournamentData } = await supabase
          .from('tournaments')
          .select('*')
          .eq('id', id)
          .single();

        // Fetch teams with members
        const { data: teamsData } = await supabase
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
                peak_rank
              )
            )
          `)
          .eq('tournament_id', id)
          .order('seed', { ascending: true });

        // Fetch matches
        const { data: matchesData } = await supabase
          .from('matches')
          .select(`
            *,
            team1:teams!matches_team1_id_fkey (name),
            team2:teams!matches_team2_id_fkey (name),
            winner:teams!matches_winner_id_fkey (name)
          `)
          .eq('tournament_id', id)
          .order('round_number', { ascending: true });

        // Fetch adaptive weights
        const { data: adaptiveWeights } = await supabase
          .from('tournament_adaptive_weights')
          .select('*')
          .eq('tournament_id', id);

        // Merge adaptive weights with team data
        const enhancedTeams = teamsData?.map(team => ({
          ...team,
          team_members: team.team_members.map(member => {
            const adaptiveWeight = adaptiveWeights?.find(w => w.user_id === member.user_id);
            return {
              ...member,
              users: {
                ...member.users,
                adaptive_weight: adaptiveWeight?.calculated_adaptive_weight,
                peak_rank_points: adaptiveWeight?.peak_rank_points,
                adaptive_factor: adaptiveWeight?.adaptive_factor
              }
            };
          })
        })) || [];

        // Create players array
        const players = enhancedTeams.flatMap(team => 
          team.team_members.map(member => ({
            ...member.users,
            team_id: team.id,
            team_name: team.name,
            is_captain: member.is_captain
          }))
        );

        // Calculate stats
        const totalPlayers = players.length;
        const totalTeams = enhancedTeams.length;
        const completedMatches = matchesData?.filter(m => m.status === 'completed').length || 0;
        const totalMatches = matchesData?.length || 0;
        
        const weights = players.map(p => p.adaptive_weight || p.weight_rating || 150);
        const averageWeight = weights.length > 0 
          ? Math.round(weights.reduce((a, b) => a + b, 0) / weights.length)
          : 150;

        const stats = {
          totalPlayers,
          totalTeams,
          completedMatches,
          totalMatches,
          averageWeight,
          tournamentProgress: totalMatches > 0 ? (completedMatches / totalMatches) * 100 : 0
        };

        setData({
          tournament: tournamentData,
          teams: enhancedTeams,
          matches: matchesData || [],
          players,
          stats
        });

      } catch (error) {
        console.error('Error fetching tournament data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAllData();
  }, [id]);

  if (loading) {
    return (
      <div style={{ 
        fontFamily: 'monospace', 
        padding: '20px', 
        backgroundColor: '#000', 
        color: '#0f0' 
      }}>
        Loading tournament data...
      </div>
    );
  }

  if (!data) {
    return (
      <div style={{ 
        fontFamily: 'monospace', 
        padding: '20px', 
        backgroundColor: '#000', 
        color: '#f00' 
      }}>
        Error loading tournament data
      </div>
    );
  }

  // Return JSON data with proper formatting
  return (
    <div style={{ 
      fontFamily: 'monospace', 
      padding: '20px', 
      backgroundColor: '#000', 
      color: '#0f0',
      whiteSpace: 'pre-wrap' 
    }}>
      {JSON.stringify(data, null, 2)}
    </div>
  );
}