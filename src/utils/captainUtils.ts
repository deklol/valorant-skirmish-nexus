
import { supabase } from "@/integrations/supabase/client";

export interface CaptainInfo {
  userId: string;
  isCaptain: boolean;
  captainUserId: string | null;
  captainName: string | null;
}

/**
 * Check if a user is the captain of a specific team
 */
export const isUserTeamCaptain = async (userId: string, teamId: string): Promise<boolean> => {
  try {
    const { data, error } = await supabase
      .from('team_members')
      .select('is_captain')
      .eq('team_id', teamId)
      .eq('user_id', userId)
      .eq('is_captain', true)
      .single();

    if (error) {
      console.error('Error checking captain status:', error);
      return false;
    }

    return !!data;
  } catch (error) {
    console.error('Error in isUserTeamCaptain:', error);
    return false;
  }
};

/**
 * Get the captain information for a team
 */
export const getTeamCaptain = async (teamId: string): Promise<{ userId: string; name: string } | null> => {
  try {
    const { data, error } = await supabase
      .from('team_members')
      .select(`
        user_id,
        users:user_id (
          discord_username
        )
      `)
      .eq('team_id', teamId)
      .eq('is_captain', true)
      .single();

    if (error || !data || !data.users) {
      console.error('Error getting team captain:', error);
      return null;
    }

    return {
      userId: data.user_id,
      name: data.users.discord_username || 'Unknown'
    };
  } catch (error) {
    console.error('Error in getTeamCaptain:', error);
    return null;
  }
};

/**
 * Get captain information for a user in relation to a specific match
 */
export const getUserCaptainInfoForMatch = async (
  userId: string, 
  team1Id: string | null, 
  team2Id: string | null
): Promise<CaptainInfo> => {
  const defaultInfo: CaptainInfo = {
    userId,
    isCaptain: false,
    captainUserId: null,
    captainName: null
  };

  if (!userId || (!team1Id && !team2Id)) {
    return defaultInfo;
  }

  try {
    // Check if user is in team1
    if (team1Id) {
      const isTeam1Captain = await isUserTeamCaptain(userId, team1Id);
      if (isTeam1Captain) {
        const captainInfo = await getTeamCaptain(team1Id);
        return {
          userId,
          isCaptain: true,
          captainUserId: captainInfo?.userId || null,
          captainName: captainInfo?.name || null
        };
      }

      // Check if user is a member of team1 (to get captain info)
      const { data: team1Member } = await supabase
        .from('team_members')
        .select('user_id')
        .eq('team_id', team1Id)
        .eq('user_id', userId)
        .single();

      if (team1Member) {
        const captainInfo = await getTeamCaptain(team1Id);
        return {
          userId,
          isCaptain: false,
          captainUserId: captainInfo?.userId || null,
          captainName: captainInfo?.name || null
        };
      }
    }

    // Check if user is in team2
    if (team2Id) {
      const isTeam2Captain = await isUserTeamCaptain(userId, team2Id);
      if (isTeam2Captain) {
        const captainInfo = await getTeamCaptain(team2Id);
        return {
          userId,
          isCaptain: true,
          captainUserId: captainInfo?.userId || null,
          captainName: captainInfo?.name || null
        };
      }

      // Check if user is a member of team2 (to get captain info)
      const { data: team2Member } = await supabase
        .from('team_members')
        .select('user_id')
        .eq('team_id', team2Id)
        .eq('user_id', userId)
        .single();

      if (team2Member) {
        const captainInfo = await getTeamCaptain(team2Id);
        return {
          userId,
          isCaptain: false,
          captainUserId: captainInfo?.userId || null,
          captainName: captainInfo?.name || null
        };
      }
    }

    return defaultInfo;
  } catch (error) {
    console.error('Error in getUserCaptainInfoForMatch:', error);
    return defaultInfo;
  }
};

/**
 * Ensure proper captain assignment based on weight_rating
 */
export const ensureProperCaptain = async (teamId: string): Promise<void> => {
  try {
    // Get all team members with their weight ratings
    const { data: members, error } = await supabase
      .from('team_members')
      .select(`
        user_id,
        users:user_id (
          weight_rating,
          discord_username
        )
      `)
      .eq('team_id', teamId);

    if (error || !members || members.length === 0) {
      console.error('Error fetching team members:', error);
      return;
    }

    // Find the member with highest weight_rating
    const highestWeightMember = members.reduce((highest, current) => {
      const currentWeight = current.users?.weight_rating || 0;
      const highestWeight = highest.users?.weight_rating || 0;
      return currentWeight > highestWeight ? current : highest;
    });

    if (!highestWeightMember) return;

    // Clear all captain flags first
    await supabase
      .from('team_members')
      .update({ is_captain: false })
      .eq('team_id', teamId);

    // Set the highest weight member as captain
    await supabase
      .from('team_members')
      .update({ is_captain: true })
      .eq('team_id', teamId)
      .eq('user_id', highestWeightMember.user_id);

    console.log(`Set captain for team ${teamId}: ${highestWeightMember.users?.discord_username} (weight: ${highestWeightMember.users?.weight_rating})`);
  } catch (error) {
    console.error('Error ensuring proper captain:', error);
  }
};
