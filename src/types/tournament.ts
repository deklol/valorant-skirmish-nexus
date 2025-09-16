
/**
 * Centralized Tournament type for use across the codebase.
 * CRITICAL: This is the authoritative Tournament interface - do not duplicate!
 */
export interface Tournament {
  id: string;
  name: string;
  description: string | null;
  start_time: string | null;
  registration_opens_at: string | null;
  registration_closes_at: string | null;
  check_in_starts_at: string | null;
  check_in_ends_at: string | null;
  max_teams: number;
  max_players: number;
  team_size: number;
  prize_pool: string | null;
  banner_image_url?: string | null;
  status: "draft" | "open" | "balancing" | "live" | "completed" | "archived";
  match_format: "BO1" | "BO3" | "BO5" | null;
  bracket_type: string | null;
  check_in_required: boolean;
  registration_type: "solo" | "team";
  // Optional fields that may be included in some contexts
  created_at?: string;
  updated_at?: string;
  created_by?: string;
  map_pool?: string[] | null;
  enable_map_veto?: boolean;
  map_veto_required_rounds?: number[] | null;
  final_match_format?: "BO1" | "BO3" | "BO5" | null;
  semifinal_match_format?: "BO1" | "BO3" | "BO5" | null;
  // Add extension of this type in modules if more fields are needed, do not duplicate this type!
}

/**
 * Tournament substitute/waitlist player interface
 */
export interface TournamentSubstitute {
  id: string;
  tournament_id: string;
  user_id: string;
  is_substitute: boolean;
  signed_up_at: string;
  priority: number; // Lower number = higher priority
  available: boolean;
  notes?: string | null;
  user?: {
    id: string;
    discord_username: string;
    current_rank: string;
    riot_id?: string;
    rank_points?: number;
  };
}
