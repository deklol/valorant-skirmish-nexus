import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface NameEffect {
  style?: string;
  color?: string;
  pattern?: string;
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
      .channel(`name-effects-${userId}`)
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

  return {
    nameEffect,
    loading,
    hasEffect: !!nameEffect,
  };
}

export const getNameEffectStyles = (effect: any): string => {
  if (!effect?.effect_data) return "";
  
  const { style, color, pattern } = effect.effect_data;
  
  switch (style) {
    case 'bold':
      return 'font-bold';
    case 'italic':
      return 'italic';
    case 'glow':
      return `text-${color || 'blue'}-400 drop-shadow-[0_0_8px_rgba(59,130,246,0.8)]`;
    case 'galaxy':
      return 'bg-gradient-to-r from-blue-400 via-purple-500 to-indigo-600 bg-clip-text text-transparent font-semibold';
    case 'fire':
      return 'bg-gradient-to-r from-red-500 via-orange-500 to-yellow-500 bg-clip-text text-transparent font-semibold';
    case 'ice':
      return 'bg-gradient-to-r from-cyan-400 via-blue-500 to-blue-600 bg-clip-text text-transparent font-semibold';
    case 'neon':
      return 'text-green-400 drop-shadow-[0_0_10px_rgba(34,197,94,0.9)] font-bold';
    case 'royal':
      return 'bg-gradient-to-r from-purple-600 via-violet-600 to-purple-700 bg-clip-text text-transparent font-bold';
    case 'shadow':
      return 'text-gray-300 drop-shadow-[2px_2px_4px_rgba(0,0,0,0.8)] font-semibold';
    case 'electric':
      return 'bg-gradient-to-r from-yellow-400 via-blue-500 to-cyan-400 bg-clip-text text-transparent font-bold animate-pulse';
    default:
      return "";
  }
};