
/**
 * Centralized Tournament type for use across the codebase.
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
  team_size: number; // Ensure this is always included where needed!
  prize_pool: string | null;
  status: "draft" | "open" | "balancing" | "live" | "completed" | "archived";
  match_format: "BO1" | "BO3" | "BO5" | null;
  bracket_type: string | null;
  check_in_required: boolean; // <-- Added this missing property!
  // Add extension of this type in modules if more fields are needed, do not duplicate this type!
}
