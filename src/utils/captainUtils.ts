
import { supabase } from "@/integrations/supabase/client";

export interface CaptainInfo {
  userId: string;
  teamId: string;
  isCaptain: boolean;
  teamName: string;
}

// Check if a user is captain of a specific team
export const getUserTeamCaptainStatus = async (userId: string, teamId: string): Promise<boolean> => {
  try {
    const { data, error } = await supabase
      .from('team_members')
      .select('is_captain')
      .eq('user_id', userId)
      .eq('team_id', teamId)
      .single();

    if (error) {
      console.error('Error checking captain status:', error);
      return false;
    }

    return data?.is_captain || false;
  } catch (error) {
    console.error('Error in getUserTeamCaptainStatus:', error);
    return false;
  }
};

// Get the captain of a team
export const getTeamCaptain = async (teamId: string): Promise<string | null> => {
  try {
    const { data, error } = await supabase
      .from('team_members')
      .select('user_id')
      .eq('team_id', teamId)
      .eq('is_captain', true)
      .single();

    if (error) {
      console.error('Error getting team captain:', error);
      return null;
    }

    return data?.user_id || null;
  } catch (error) {
    console.error('Error in getTeamCaptain:', error);
    return null;
  }
};

// Comprehensive check for veto permissions
export const canUserPerformVeto = async (
  userId: string, 
  teamId: string, 
  tournamentId: string
): Promise<{ canVeto: boolean; reason?: string; captainId?: string }> => {
  try {
    // Check if user is a member of the team
    const { data: membership, error: memberError } = await supabase
      .from('team_members')
      .select('is_captain')
      .eq('user_id', userId)
      .eq('team_id', teamId)
      .single();

    if (memberError || !membership) {
      return { canVeto: false, reason: 'You are not a member of this team' };
    }

    // If user is captain, they can perform veto
    if (membership.is_captain) {
      return { canVeto: true };
    }

    // If not captain, get the captain info for error message
    const captainId = await getTeamCaptain(teamId);
    
    return { 
      canVeto: false, 
      reason: 'Only team captains can perform map veto',
      captainId: captainId || undefined
    };
  } catch (error) {
    console.error('Error in canUserPerformVeto:', error);
    return { canVeto: false, reason: 'Error checking veto permissions' };
  }
};

// Get captain display name for UI
export const getCaptainDisplayName = async (teamId: string): Promise<string | null> => {
  try {
    const { data, error } = await supabase
      .from('team_members')
      .select(`
        users:user_id (
          discord_username
        )
      `)
      .eq('team_id', teamId)
      .eq('is_captain', true)
      .single();

    if (error || !data?.users) {
      return null;
    }

    return (data.users as any)?.discord_username || null;
  } catch (error) {
    console.error('Error getting captain display name:', error);
    return null;
  }
};
