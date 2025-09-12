import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useTwitchEmbed = () => {
  const [shouldShowTwitch, setShouldShowTwitch] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkTwitchStatus = async () => {
      try {
        // Fetch app settings and check for live tournaments concurrently
        const [settingsResult, liveTournamentResult] = await Promise.all([
          supabase
            .from("app_settings")
            .select("twitch_embed_enabled, twitch_channel")
            .limit(1)
            .maybeSingle(),
          supabase
            .from("tournaments")
            .select("status")
            .eq("status", "live")
            .limit(1),
        ]);

        const settingsData = settingsResult.data;
        const hasLiveTournament = liveTournamentResult.data && liveTournamentResult.data.length > 0;

        // Show twitch if enabled, has channel, and has live tournament
        const shouldShow = !!(settingsData?.twitch_embed_enabled && 
                            settingsData.twitch_channel && 
                            hasLiveTournament);
        
        setShouldShowTwitch(shouldShow);
      } catch (error) {
        console.error('Error checking Twitch status:', error);
        setShouldShowTwitch(false);
      } finally {
        setLoading(false);
      }
    };

    checkTwitchStatus();
  }, []);

  return { shouldShowTwitch, loading };
};