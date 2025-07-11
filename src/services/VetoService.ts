import { supabase } from "@/integrations/supabase/client";

export interface VetoResult {
  success: boolean;
  error?: string;
  [key: string]: any;
}

export class VetoService {
  /**
   * Roll dice to determine home/away teams and start veto process
   */
  static async rollDice(matchId: string, userId: string): Promise<VetoResult> {
    try {
      console.log('VetoService.rollDice called', { matchId, userId });
      
      const { data, error } = await supabase.rpc('roll_veto_dice', {
        p_match_id: matchId,
        p_initiator_user_id: userId
      });

      console.log('roll_veto_dice response', { data, error });

      if (error) {
        console.error('Roll dice error:', error);
        return { success: false, error: error.message };
      }

      return data as VetoResult;
    } catch (error: any) {
      console.error('Roll dice exception:', error);
      return { success: false, error: error.message || 'Failed to roll dice' };
    }
  }

  /**
   * Perform a ban action on a map
   */
  static async performBan(matchId: string, userId: string, mapId: string): Promise<VetoResult> {
    try {
      const { data, error } = await supabase.rpc('perform_veto_ban', {
        p_match_id: matchId,
        p_user_id: userId,
        p_map_id: mapId
      });

      if (error) {
        console.error('Perform ban error:', error);
        return { success: false, error: error.message };
      }

      return data as VetoResult;
    } catch (error: any) {
      console.error('Perform ban exception:', error);
      return { success: false, error: error.message || 'Failed to ban map' };
    }
  }

  /**
   * Choose side (Attack/Defense) for the selected map
   */
  static async chooseSide(vetoSessionId: string, userId: string, sideChoice: 'Attack' | 'Defense'): Promise<VetoResult> {
    try {
      const { data, error } = await supabase.rpc('set_side_choice', {
        p_veto_session_id: vetoSessionId,
        p_user_id: userId,
        p_side_choice: sideChoice
      });

      if (error) {
        console.error('Choose side error:', error);
        return { success: false, error: error.message };
      }

      return { success: data === 'OK', error: data !== 'OK' ? data : undefined };
    } catch (error: any) {
      console.error('Choose side exception:', error);
      return { success: false, error: error.message || 'Failed to choose side' };
    }
  }

  /**
   * Get current veto session for a match
   */
  static async getVetoSession(matchId: string) {
    try {
      const { data, error } = await supabase
        .from('map_veto_sessions')
        .select(`
          *,
          home_team:teams!map_veto_sessions_home_team_id_fkey(id, name),
          away_team:teams!map_veto_sessions_away_team_id_fkey(id, name),
          actions:map_veto_actions(
            *,
            map:maps(id, name, display_name, thumbnail_url),
            team:teams(id, name),
            performed_by_user:users(id, discord_username)
          )
        `)
        .eq('match_id', matchId)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Get veto session error:', error);
        return { data: null, error };
      }

      return { data, error: null };
    } catch (error: any) {
      console.error('Get veto session exception:', error);
      return { data: null, error };
    }
  }

  /**
   * Get tournament maps for veto
   */
  static async getTournamentMaps(tournamentId: string) {
    try {
      const { data, error } = await supabase.rpc('get_tournament_map_pool', {
        p_tournament_id: tournamentId
      });

      if (error) {
        console.error('Get tournament maps error:', error);
        return { data: [], error };
      }

      return { data: data || [], error: null };
    } catch (error: any) {
      console.error('Get tournament maps exception:', error);
      return { data: [], error };
    }
  }
}