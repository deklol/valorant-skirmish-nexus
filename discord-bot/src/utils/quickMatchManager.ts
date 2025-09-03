import { getSupabase } from './supabase';

export class QuickMatchManager {
  static async createSession(channelId: string, createdBy: string) {
    const { data, error } = await getSupabase()
      .from('quick_match_sessions')
      .insert({
        discord_channel_id: channelId,
        created_by: createdBy,
        status: 'waiting',
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create session: ${error.message}`);
    }

    return data;
  }

  static async getActiveSession(channelId: string) {
    const { data, error } = await getSupabase()
      .from('quick_match_sessions')
      .select('*')
      .eq('discord_channel_id', channelId)
      .eq('is_active', true)
      .maybeSingle();

    if (error) {
      console.error('Error getting active session:', error);
      return null;
    }

    return data;
  }

  static async updateSession(sessionId: string, updates: any) {
    const { data, error } = await getSupabase()
      .from('quick_match_sessions')
      .update(updates)
      .eq('id', sessionId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update session: ${error.message}`);
    }

    return data;
  }

  static async cancelSession(sessionId: string) {
    const { error } = await getSupabase()
      .from('quick_match_sessions')
      .update({ 
        is_active: false, 
        status: 'cancelled',
        ended_at: new Date().toISOString()
      })
      .eq('id', sessionId);

    if (error) {
      throw new Error(`Failed to cancel session: ${error.message}`);
    }

    // Also deactivate queue entries
    await getSupabase()
      .from('quick_match_queue')
      .update({ is_active: false })
      .eq('is_active', true);
  }
}