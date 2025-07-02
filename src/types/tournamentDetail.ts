
/**
 * IMPORTANT: Keep these types consistent with the main Tournament interface
 * Use Tournament interface from types/tournament.ts where possible
 */

export type Team = {
  id: string;
  name: string;
  seed?: number;
  total_rank_points: number;
  team_members: TeamMember[];
  status?: "pending" | "active" | "eliminated" | "winner" | "disqualified" | "withdrawn" | "forfeited" | "confirmed";
  created_at?: string;
  updated_at?: string;
  captain_id?: string | null;
};

export type TeamMember = {
  id?: string;
  user_id: string;
  team_id?: string;
  is_captain: boolean;
  joined_at?: string;
  users: User;
};

export type User = {
  id?: string;
  discord_username: string;
  discord_avatar_url: string | null;
  current_rank: string;
  riot_id: string;
  rank_points?: number;
  weight_rating?: number;
  peak_rank?: string;
  manual_rank_override?: string | null;
  manual_weight_override?: number | null;
  use_manual_override?: boolean;
  rank_override_reason?: string | null;
};

export type Match = {
  id: string;
  tournament_id: string;
  round_number: number;
  match_number: number;
  team1_id: string | null;
  team2_id: string | null;
  winner_id: string | null;
  status: "pending" | "live" | "completed";
  score_team1: number;
  score_team2: number;
  best_of: number;
  map_veto_enabled: boolean;
  scheduled_time?: string;
  started_at?: string;
  completed_at?: string;
  created_at?: string;
  updated_at?: string;
  notes?: string | null;
  bracket_position?: string | null;
  stream_url?: string | null;
  team1: { name: string };
  team2: { name: string };
  winner: { name: string } | null;
};
