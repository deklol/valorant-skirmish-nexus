/**
 * Team-related types for the persistent team system
 * These are completely separate from the existing tournament teams
 */

export interface PersistentTeam {
  id: string;
  name: string;
  captain_id: string;
  description: string | null;
  invite_code: string;
  is_active: boolean;
  max_members: number;
  created_at: string;
  updated_at: string;
  wins?: number;
  losses?: number;
  tournaments_played?: number;
  tournaments_won?: number;
  total_rank_points?: number;
  avg_rank_points?: number;
}

export interface PersistentTeamMember {
  id: string;
  team_id: string;
  user_id: string;
  is_captain: boolean;
  joined_at: string;
  users: {
    id: string;
    discord_username: string;
    current_rank: string;
    riot_id: string;
    rank_points: number;
    wins?: number;
    losses?: number;
    tournaments_won?: number;
  };
}

export interface PersistentTeamInvite {
  id: string;
  team_id: string;
  invited_by: string;
  invite_code: string;
  expires_at: string;
  created_at: string;
}

export interface TeamTournamentRegistration {
  id: string;
  tournament_id: string;
  team_id: string;
  registered_at: string;
  status: string;
}

export interface TeamWithMembers extends PersistentTeam {
  members: PersistentTeamMember[];
  member_count: number;
  is_user_captain: boolean;
  is_user_member: boolean;
}