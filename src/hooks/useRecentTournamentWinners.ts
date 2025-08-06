import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useRecentTournamentWinners = () => {
  const [recentWinnerIds, setRecentWinnerIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRecentWinners = async () => {
      try {
        setLoading(true);
        
        // Get the most recent completed tournament
        const { data: tournament } = await supabase
          .from('tournaments')
          .select('id')
          .eq('status', 'completed')
          .order('start_time', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (!tournament) {
          setRecentWinnerIds(new Set());
          setLoading(false);
          return;
        }

        // Get the winning team for that tournament
        const { data: winningTeam } = await supabase
          .from('teams')
          .select('id')
          .eq('tournament_id', tournament.id)
          .eq('status', 'winner')
          .maybeSingle();

        if (!winningTeam) {
          setRecentWinnerIds(new Set());
          setLoading(false);
          return;
        }

        // Get all members of the winning team
        const { data: teamMembers } = await supabase
          .from('team_members')
          .select('user_id')
          .eq('team_id', winningTeam.id);

        if (teamMembers) {
          const winnerIds = new Set(teamMembers.map(member => member.user_id));
          setRecentWinnerIds(winnerIds);
        } else {
          setRecentWinnerIds(new Set());
        }
        
        setLoading(false);
      } catch (error) {
        console.error('Error fetching recent tournament winners:', error);
        setRecentWinnerIds(new Set());
        setLoading(false);
      }
    };

    fetchRecentWinners();
  }, []);

  return { recentWinnerIds, loading };
};