import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface NameEffect {
  color?: string;
  gradient?: string;
  weight?: string;
}

export function useNameEffects(userId: string | null) {
  const [nameEffect, setNameEffect] = useState<NameEffect | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setNameEffect(null);
      setLoading(false);
      return;
    }

    const fetchNameEffect = async () => {
      try {
        const { data } = await supabase
          .from('user_active_effects')
          .select('effect_data')
          .eq('user_id', userId)
          .eq('effect_type', 'name_effect')
          .maybeSingle();

        setNameEffect(data?.effect_data as NameEffect || null);
      } catch (error) {
        console.error('Error fetching name effect:', error);
        setNameEffect(null);
      } finally {
        setLoading(false);
      }
    };

    fetchNameEffect();

    // Set up real-time subscription for name effect changes
    const channel = supabase
      .channel('name-effects')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_active_effects',
          filter: `user_id=eq.${userId}`,
        },
        () => {
          fetchNameEffect();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const getNameStyle = () => {
    if (!nameEffect) return {};

    if (nameEffect.gradient) {
      return {
        background: nameEffect.gradient,
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        backgroundClip: 'text',
        fontWeight: nameEffect.weight || 'normal',
      };
    } else if (nameEffect.color) {
      return {
        color: nameEffect.color,
        fontWeight: nameEffect.weight || 'normal',
      };
    }

    return {};
  };

  return {
    nameEffect,
    loading,
    getNameStyle,
    hasEffect: !!nameEffect,
  };
}