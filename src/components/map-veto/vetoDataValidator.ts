
/**
 * Comprehensive validation utilities for map veto system
 * Ensures data integrity and proper relationships
 */

import { MapData, VetoAction } from "./types";

export interface VetoSessionData {
  id: string;
  match_id: string | null;
  status: string | null;
  current_turn_team_id: string | null;
  home_team_id: string | null;
  away_team_id: string | null;
  started_at: string | null;
  completed_at: string | null;
}

export interface MatchData {
  id: string;
  team1_id: string | null;
  team2_id: string | null;
  best_of: number;
  tournament_id: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validates the complete veto session data for consistency
 */
export function validateVetoSession(
  session: VetoSessionData,
  match: MatchData | null,
  maps: MapData[],
  actions: VetoAction[]
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Required session data
  if (!session.id) errors.push("Session ID is missing");
  if (!session.match_id) errors.push("Match ID is missing");
  if (!session.status) errors.push("Session status is missing");

  // Match validation
  if (!match) {
    errors.push("Match data is missing");
  } else {
    if (!match.team1_id || !match.team2_id) {
      errors.push("Both teams must be assigned to the match");
    }
    if (!match.best_of || match.best_of < 1) {
      errors.push("Invalid best_of value");
    }
  }

  // Maps validation
  if (!maps || maps.length === 0) {
    errors.push("No maps available for veto");
  } else {
    const activeMaps = maps.filter(m => m.is_active);
    if (activeMaps.length < 3) {
      warnings.push("Less than 3 active maps available - veto may not work properly");
    }
  }

  // Home/Away team validation for BO1
  if (match?.best_of === 1) {
    if (!session.home_team_id || !session.away_team_id) {
      errors.push("Home and away teams must be set for BO1 matches");
    }
    if (session.home_team_id && session.away_team_id && session.home_team_id === session.away_team_id) {
      errors.push("Home and away teams cannot be the same");
    }
  }

  // Actions validation
  if (actions.length > 0) {
    // Check for duplicate map actions
    const mapCounts = new Map<string, number>();
    actions.forEach(action => {
      const count = mapCounts.get(action.map_id) || 0;
      mapCounts.set(action.map_id, count + 1);
    });

    mapCounts.forEach((count, mapId) => {
      if (count > 1) {
        errors.push(`Map ${mapId} has multiple actions`);
      }
    });

    // Check action order consistency
    const sortedActions = [...actions].sort((a, b) => a.order_number - b.order_number);
    sortedActions.forEach((action, index) => {
      if (action.order_number !== index + 1) {
        warnings.push(`Action order numbers are not sequential`);
      }
    });

    // Validate completed status
    if (session.status === 'completed') {
      const picks = actions.filter(a => a.action === 'pick');
      const bans = actions.filter(a => a.action === 'ban');
      
      if (match?.best_of === 1) {
        if (picks.length !== 1) {
          errors.push("BO1 should have exactly 1 pick when completed");
        }
        if (bans.length !== maps.length - 1) {
          errors.push(`BO1 should have ${maps.length - 1} bans when completed`);
        }
        
        // Check side selection for BO1
        const finalPick = picks[0];
        if (finalPick && !finalPick.side_choice) {
          errors.push("BO1 final pick must have side choice selected");
        }
      }
    }
  }

  // Current turn validation
  if (session.status === 'in_progress') {
    if (!session.current_turn_team_id) {
      errors.push("Current turn team must be set for in-progress session");
    }
    if (match && session.current_turn_team_id) {
      const validTeams = [match.team1_id, match.team2_id, session.home_team_id, session.away_team_id].filter(Boolean);
      if (!validTeams.includes(session.current_turn_team_id)) {
        errors.push("Current turn team is not valid for this match");
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Checks if a user can perform a veto action
 */
export function validateUserPermissions(
  userId: string | null,
  userTeamId: string | null,
  isUserCaptain: boolean,
  currentTurnTeamId: string | null,
  sessionStatus: string | null
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!userId) {
    errors.push("User must be authenticated");
    return { isValid: false, errors, warnings };
  }

  if (!userTeamId) {
    errors.push("User must be assigned to a team");
    return { isValid: false, errors, warnings };
  }

  if (!isUserCaptain) {
    errors.push("Only team captains can perform veto actions");
    return { isValid: false, errors, warnings };
  }

  if (sessionStatus !== 'in_progress') {
    errors.push("Veto session is not in progress");
    return { isValid: false, errors, warnings };
  }

  if (currentTurnTeamId !== userTeamId) {
    errors.push("It is not your team's turn");
    return { isValid: false, errors, warnings };
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Determines the expected next action in the veto flow
 */
export function getExpectedNextAction(
  maps: MapData[],
  actions: VetoAction[],
  bestOf: number
): { action: "ban" | "pick" | "side_pick" | "complete"; description: string } {
  const activeMaps = maps.filter(m => m.is_active);
  const bans = actions.filter(a => a.action === 'ban');
  const picks = actions.filter(a => a.action === 'pick');
  
  if (bestOf === 1) {
    const totalBansNeeded = activeMaps.length - 1;
    
    if (bans.length < totalBansNeeded) {
      return {
        action: "ban",
        description: `Ban ${totalBansNeeded - bans.length} more map(s)`
      };
    } else if (picks.length === 0) {
      return {
        action: "pick",
        description: "Map will be auto-picked"
      };
    } else if (picks.length === 1 && !picks[0].side_choice) {
      return {
        action: "side_pick",
        description: "Home team must select starting side"
      };
    } else {
      return {
        action: "complete",
        description: "Veto is complete"
      };
    }
  } else {
    // BO3/BO5 logic would go here
    return {
      action: "ban",
      description: "Continue veto process"
    };
  }
}
