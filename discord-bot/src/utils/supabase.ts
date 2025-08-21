import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing required Supabase environment variables');
}

// Create Supabase client with service role key for full access
export const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Database utility functions
export const db = {
  // User management
  async findUserByDiscordId(discordId: string) {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('discord_id', discordId)
      .single();
    
    return { data, error };
  },

  async createUser(userData: {
    discord_id: string;
    discord_username: string;
    discord_avatar_url?: string;
    riot_id?: string;
    current_rank?: string;
    peak_rank?: string;
  }) {
    const { data, error } = await supabase
      .from('users')
      .insert(userData)
      .select()
      .single();
    
    return { data, error };
  },

  async updateUser(discordId: string, updates: any) {
    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('discord_id', discordId)
      .select()
      .single();
    
    return { data, error };
  },

  // Tournament management
  async getActiveTournaments() {
    const { data, error } = await supabase
      .from('tournaments')
      .select('*')
      .in('status', ['open_registration', 'check_in', 'in_progress'])
      .order('start_time', { ascending: true });
    
    return { data, error };
  },

  async getTournamentById(id: string) {
    const { data, error } = await supabase
      .from('tournaments')
      .select('*')
      .eq('id', id)
      .single();
    
    return { data, error };
  },

  async getTournamentSignups(tournamentId: string) {
    const { data, error } = await supabase
      .from('tournament_signups')
      .select(`
        *,
        users!inner(discord_username, current_rank, riot_id)
      `)
      .eq('tournament_id', tournamentId);
    
    return { data, error };
  },

  async signupUserForTournament(userId: string, tournamentId: string) {
    const { data, error } = await supabase
      .from('tournament_signups')
      .insert({
        user_id: userId,
        tournament_id: tournamentId,
        signed_up_at: new Date().toISOString()
      })
      .select()
      .single();
    
    return { data, error };
  },

  async removeSignup(userId: string, tournamentId: string) {
    const { data, error } = await supabase
      .from('tournament_signups')
      .delete()
      .eq('user_id', userId)
      .eq('tournament_id', tournamentId);
    
    return { data, error };
  },

  // Quick match queue
  async addToQuickMatchQueue(userId: string) {
    const { data, error } = await supabase
      .from('quick_match_queue')
      .upsert({
        user_id: userId,
        joined_at: new Date().toISOString(),
        is_active: true
      })
      .select()
      .single();
    
    return { data, error };
  },

  async getQuickMatchQueue() {
    const { data, error } = await supabase
      .from('quick_match_queue')
      .select(`
        *,
        users!inner(discord_username, discord_id, current_rank, weight_rating)
      `)
      .eq('is_active', true)
      .order('joined_at', { ascending: true });
    
    return { data, error };
  },

  async removeFromQuickMatchQueue(userId: string) {
    const { data, error } = await supabase
      .from('quick_match_queue')
      .update({ is_active: false })
      .eq('user_id', userId);
    
    return { data, error };
  },

  // Statistics
  async getUserStats(userId: string) {
    const { data, error } = await supabase
      .from('users')
      .select('wins, losses, tournaments_played, tournaments_won, current_rank, peak_rank, weight_rating')
      .eq('id', userId)
      .single();
    
    return { data, error };
  },

  async getLeaderboard(limit: number = 10) {
    const { data, error } = await supabase
      .from('users')
      .select('discord_username, tournaments_won, wins, losses, current_rank, weight_rating')
      .order('tournaments_won', { ascending: false })
      .order('wins', { ascending: false })
      .limit(limit);
    
    return { data, error };
  }
};