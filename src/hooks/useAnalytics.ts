import { useEffect } from 'react';
import { useAuth } from './useAuth';
import { supabase } from '@/integrations/supabase/client';

export const useAnalytics = () => {
  const { user } = useAuth();

  const trackPageView = async (
    tournamentId: string,
    additionalData?: {
      referrer?: string;
      userAgent?: string;
    }
  ) => {
    try {
      await supabase.rpc('track_tournament_page_view', {
        p_tournament_id: tournamentId,
        p_user_id: user?.id || null,
        p_referrer: additionalData?.referrer || document.referrer || null,
        p_user_agent: additionalData?.userAgent || navigator.userAgent || null
      });
    } catch (error) {
      console.warn('Failed to track page view:', error);
    }
  };

  const trackEvent = async (
    tournamentId: string,
    eventType: string,
    value: number = 1,
    metadata: Record<string, any> = {}
  ) => {
    try {
      await supabase.rpc('record_tournament_metric', {
        p_tournament_id: tournamentId,
        p_metric_type: eventType,
        p_metric_value: value,
        p_metadata: metadata
      });
    } catch (error) {
      console.warn('Failed to track event:', error);
    }
  };

  const trackOnboardingStep = async (stepId: string, metadata: Record<string, any> = {}) => {
    if (!user) return;

    try {
      await supabase.rpc('update_onboarding_progress', {
        p_user_id: user.id,
        p_step_id: stepId,
        p_metadata: metadata
      });
    } catch (error) {
      console.warn('Failed to track onboarding step:', error);
    }
  };

  return {
    trackPageView,
    trackEvent,
    trackOnboardingStep
  };
};

// Hook for automatic page view tracking
export const useTournamentPageTracking = (tournamentId: string | undefined) => {
  const { trackPageView } = useAnalytics();

  useEffect(() => {
    if (tournamentId) {
      trackPageView(tournamentId);
    }
  }, [tournamentId, trackPageView]);
};