import { supabase } from "@/integrations/supabase/client";

// Utility to safely clean up realtime channels
export function cleanupRealtimeChannel(channel: any) {
  if (channel) {
    try {
      supabase.removeChannel(channel);
    } catch (error) {
      console.warn('Failed to cleanup realtime channel:', error);
    }
  }
}

// Utility to create a realtime channel with proper error handling
export function createRealtimeChannel(channelName: string) {
  try {
    return supabase.channel(channelName);
  } catch (error) {
    console.error('Failed to create realtime channel:', error);
    return null;
  }
}

// Utility to check if realtime is available
export function isRealtimeAvailable(): boolean {
  try {
    return !!supabase.channel;
  } catch (error) {
    console.warn('Realtime not available:', error);
    return false;
  }
}