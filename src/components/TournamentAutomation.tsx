
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useNotifications } from '@/hooks/useNotifications';
import { useAuth } from '@/hooks/useAuth';

const TournamentAutomation = () => {
  const { notifySignupsOpen, notifyCheckinTime, notifyTeamAssigned } = useNotifications();
  const { isAdmin } = useAuth();
  const [automationEnabled, setAutomationEnabled] = useState(true);

  useEffect(() => {
    if (!automationEnabled) return;

    // Check for tournaments that should transition automatically
    const checkTournamentTransitions = async () => {
      const now = new Date().toISOString();

      // Check for tournaments that should open registration
      const { data: openingTournaments } = await supabase
        .from('tournaments')
        .select('*')
        .eq('status', 'draft')
        .lte('registration_opens_at', now);

      if (openingTournaments) {
        for (const tournament of openingTournaments) {
          await supabase
            .from('tournaments')
            .update({ status: 'open' })
            .eq('id', tournament.id);

          await notifySignupsOpen(tournament.id, tournament.name);
        }
      }

      // Check for tournaments that should start check-in
      const { data: checkinTournaments } = await supabase
        .from('tournaments')
        .select('*')
        .eq('status', 'open')
        .lte('check_in_starts_at', now)
        .eq('check_in_required', true);

      if (checkinTournaments) {
        for (const tournament of checkinTournaments) {
          await notifyCheckinTime(tournament.id, tournament.name);
        }
      }

      // Check for tournaments that should close registration
      const { data: closingTournaments } = await supabase
        .from('tournaments')
        .select('*')
        .eq('status', 'open')
        .lte('registration_closes_at', now);

      if (closingTournaments) {
        for (const tournament of closingTournaments) {
          await supabase
            .from('tournaments')
            .update({ status: 'balancing' })
            .eq('id', tournament.id);
        }
      }
    };

    // Check every minute only if automation is enabled
    const interval = setInterval(checkTournamentTransitions, 60000);
    checkTournamentTransitions(); // Initial check

    return () => clearInterval(interval);
  }, [notifySignupsOpen, notifyCheckinTime, automationEnabled]);

  // Listen for manual override events from admins
  useEffect(() => {
    if (!isAdmin) return;

    const channel = supabase
      .channel('tournament-automation')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'tournaments',
          filter: 'status=neq.draft'
        },
        (payload) => {
          console.log('Tournament status manually updated:', payload);
          // Admin manual intervention detected, could pause automation temporarily
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isAdmin]);

  return null; // This component only handles automation
};

export default TournamentAutomation;
