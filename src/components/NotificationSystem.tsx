
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

const NotificationSystem = () => {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    // Create default notification preferences if they don't exist
    const createDefaultPreferences = async () => {
      try {
        const { data: existing } = await supabase
          .from('user_notification_preferences')
          .select('id')
          .eq('user_id', user.id)
          .single();

        if (!existing) {
          await supabase
            .from('user_notification_preferences')
            .insert({
              user_id: user.id,
              new_tournament_posted: true,
              tournament_signups_open: true,
              tournament_checkin_time: true,
              team_assigned: true,
              match_assigned: true,
              match_ready: true,
              post_results: true,
            });
        }
      } catch (error) {
        console.error('Error creating default preferences:', error);
      }
    };

    createDefaultPreferences();
  }, [user?.id]);

  return null; // This component only handles setup, no UI
};

export default NotificationSystem;
