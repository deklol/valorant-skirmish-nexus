import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  points: number;
  rarity: string;
}

export function useAchievements() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [userAchievements, setUserAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchAchievements = async () => {
      try {
        // Fetch all achievements
        const { data: allAchievements } = await supabase
          .from('achievements')
          .select('*')
          .eq('is_active', true);

        // Fetch user's achievements
        const { data: userAchievementData } = await supabase
          .from('user_achievements')
          .select(`
            earned_at,
            achievements (*)
          `)
          .eq('user_id', user.id);

        setAchievements(allAchievements || []);
        setUserAchievements(
          userAchievementData?.map(ua => ua.achievements).filter(Boolean) || []
        );
      } catch (error) {
        console.error('Error fetching achievements:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAchievements();

    // Set up real-time subscription for new achievements
    const channel = supabase
      .channel('user-achievements')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'user_achievements',
          filter: `user_id=eq.${user.id}`,
        },
        async (payload) => {
          // Fetch the achievement details
          const { data: achievement } = await supabase
            .from('achievements')
            .select('*')
            .eq('id', payload.new.achievement_id)
            .single();

          if (achievement) {
            setUserAchievements(prev => [...prev, achievement]);
            
            // Show achievement notification
            toast({
              title: "🏆 Achievement Unlocked!",
              description: `${achievement.name}: ${achievement.description}`,
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, toast]);

  const checkAchievements = async () => {
    if (!user) return;

    try {
      // Trigger the achievement check function
      await supabase.rpc('check_and_award_achievements', {
        p_user_id: user.id
      });
    } catch (error) {
      console.error('Error checking achievements:', error);
    }
  };

  return {
    achievements,
    userAchievements,
    loading,
    checkAchievements,
    hasAchievement: (achievementId: string) => 
      userAchievements.some(a => a.id === achievementId),
  };
}