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

// Test realtime connectivity
export async function testRealtimeConnection(): Promise<boolean> {
  if (!isRealtimeAvailable()) return false;
  
  try {
    const testChannel = createRealtimeChannel('connectivity-test');
    if (!testChannel) return false;
    
    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        cleanupRealtimeChannel(testChannel);
        resolve(false);
      }, 5000);
      
      testChannel
        .on('system', {}, (payload) => {
          if (payload.status === 'SUBSCRIBED') {
            clearTimeout(timeout);
            cleanupRealtimeChannel(testChannel);
            resolve(true);
          }
        })
        .subscribe();
    });
  } catch (error) {
    console.error('Realtime connectivity test failed:', error);
    return false;
  }
}