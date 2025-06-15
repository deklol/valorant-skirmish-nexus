
export type Team = {
  id: string;
  name: string;
  seed?: number;
  total_rank_points: number;
  team_members: TeamMember[];
};

export type TeamMember = {
  user_id: string;
  is_captain: boolean;
  users: User;
};

export type User = {
  discord_username: string;
  discord_avatar_url: string | null;
  current_rank: string;
  riot_id: string;
};

export type Match = {
  id: string;
  tournament_id: string;
  round_number: number;
  match_number: number;
  team1_id: string;
  team2_id: string;
  winner_id: string | null;
  status: string;
  score_team1: number;
  score_team2: number;
  best_of: number;
  map_veto_enabled: boolean;
  scheduled_time?: string;
  started_at?: string;
  completed_at?: string;
  team1: { name: string };
  team2: { name: string };
  winner: { name: string } | null;
};
