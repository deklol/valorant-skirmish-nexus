import { createClient } from '@supabase/supabase-js';

let supabaseClient: any = null;

export function initializeSupabase() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase environment variables');
  }

  supabaseClient = createClient(supabaseUrl, supabaseServiceKey);
  console.log('✅ Supabase initialized successfully');
  return supabaseClient;
}

export function getSupabase() {
  if (!supabaseClient) {
    throw new Error('Supabase not initialized. Call initializeSupabase() first.');
  }
  return supabaseClient;
}

// Database helper object for legacy compatibility
export const db = {
  async getQuickMatchQueue() {
    return await getSupabase()
      .from('quick_match_queue')
      .select(`
        *,
        users!inner(
          id,
          discord_username, 
          discord_id, 
          current_rank, 
          peak_rank,
          weight_rating,
          manual_rank_override,
          manual_weight_override,
          use_manual_override,
          tournaments_won,
          last_tournament_win
        )
      `)
      .eq('is_active', true)
      .order('joined_at', { ascending: true });
  }
};