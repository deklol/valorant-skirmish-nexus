
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useNotifications } from '@/hooks/useNotifications';

const TournamentAutomation = () => {
  const { notifySignupsOpen, notifyCheckinTime } = useNotifications();

  useEffect(() => {
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

    // Check every minute
    const interval = setInterval(checkTournamentTransitions, 60000);
    checkTournamentTransitions(); // Initial check

    return () => clearInterval(interval);
  }, [notifySignupsOpen, notifyCheckinTime]);

  return null; // This component only handles automation
};

export default TournamentAutomation;
