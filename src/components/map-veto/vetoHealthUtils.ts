
import { generateBO1VetoFlow } from "./vetoFlowBO1";

export interface VetoHealthCheckResult {
  healthy: boolean;
  warnings: string[];
  fixable: boolean;
}

export async function checkVetoSessionHealth({
  session,
  actions,
  maps,
}: {
  session: any;
  actions: any[];
  maps: any[];
}): Promise<VetoHealthCheckResult> {
  const warnings: string[] = [];
  let fixable = false;

  // Basic validation
  if (!session) {
    warnings.push("Session data is missing");
    return { healthy: false, warnings, fixable: false };
  }

  if (!actions || !Array.isArray(actions)) {
    warnings.push("Actions data is invalid");
    return { healthy: false, warnings, fixable: false };
  }

  if (!maps || !Array.isArray(maps) || maps.length === 0) {
    warnings.push("Maps data is missing or empty");
    return { healthy: false, warnings, fixable: false };
  }

  // Check for duplicate order numbers
  const orderNumbers = actions.map(a => a.order_number).filter(Boolean);
  const uniqueOrderNumbers = [...new Set(orderNumbers)];
  if (orderNumbers.length !== uniqueOrderNumbers.length) {
    warnings.push("Duplicate order numbers detected");
    fixable = true;
  }

  // Check for gaps in order numbers
  const sortedOrderNumbers = orderNumbers.sort((a, b) => a - b);
  for (let i = 0; i < sortedOrderNumbers.length - 1; i++) {
    if (sortedOrderNumbers[i + 1] - sortedOrderNumbers[i] > 1) {
      warnings.push("Gaps in order numbers detected");
      fixable = true;
      break;
    }
  }

  // Check for duplicate map actions
  const mapIds = actions.map(a => a.map_id).filter(Boolean);
  const uniqueMapIds = [...new Set(mapIds)];
  if (mapIds.length !== uniqueMapIds.length) {
    warnings.push("Duplicate map actions detected");
    fixable = true;
  }

  // CRITICAL: Check turn sequence validation for BO1 (the missing logic!)
  if (session.match && session.home_team_id && session.away_team_id && session.status === 'in_progress') {
    const expectedFlow = generateBO1VetoFlow({
      homeTeamId: session.home_team_id,
      awayTeamId: session.away_team_id,
      tournamentMapPool: maps.map(m => ({ id: m.id, name: m.display_name || m.name }))
    });

    const expectedBanCount = expectedFlow.filter(step => step.action === "ban").length;
    const actualBanCount = actions.filter(a => a.action === "ban").length;
    
    if (actualBanCount > expectedBanCount) {
      warnings.push(`Too many bans: expected ${expectedBanCount}, found ${actualBanCount}`);
    }

    const expectedPickCount = expectedFlow.filter(step => step.action === "pick").length;
    const actualPickCount = actions.filter(a => a.action === "pick").length;
    
    if (actualPickCount > expectedPickCount) {
      warnings.push(`Too many picks: expected ${expectedPickCount}, found ${actualPickCount}`);
    }

    // NEW: Validate each action follows the expected team sequence
    const banActions = actions.filter(a => a.action === "ban").sort((a, b) => a.order_number - b.order_number);
    const expectedBanSequence = expectedFlow.filter(step => step.action === "ban");
    
    for (let i = 0; i < banActions.length; i++) {
      const actualAction = banActions[i];
      const expectedStep = expectedBanSequence[i];
      
      if (expectedStep && actualAction.team_id !== expectedStep.teamId) {
        warnings.push(`Ban #${i + 1}: Expected team ${expectedStep.teamId?.slice(0, 8)}, got ${actualAction.team_id?.slice(0, 8)}`);
        fixable = true;
      }
    }

    // ENHANCED: Check if current turn matches expected next team with detailed context
    if (session.current_turn_team_id && actualBanCount < expectedBanCount) {
      const nextExpectedStep = expectedBanSequence[actualBanCount];
      if (nextExpectedStep && session.current_turn_team_id !== nextExpectedStep.teamId) {
        const currentTeamLabel = session.current_turn_team_id === session.home_team_id ? 'Home' : 'Away';
        const expectedTeamLabel = nextExpectedStep.teamId === session.home_team_id ? 'Home' : 'Away';
        warnings.push(`🚨 CRITICAL SYNC ERROR: Database shows ${currentTeamLabel} team (${session.current_turn_team_id?.slice(0, 8)}) turn, but BO1 sequence expects ${expectedTeamLabel} team (${nextExpectedStep.teamId?.slice(0, 8)}) for ban #${actualBanCount + 1}`);
        warnings.push(`Expected BO1 sequence: [Home, Away, Away, Home, Away, Home...] - Currently at position ${actualBanCount + 1}`);
        fixable = true;
      }
    }

    // NEW: Check for completed actions but session still in_progress
    if (session.status === 'in_progress' && actualBanCount === expectedBanCount && actualPickCount === expectedPickCount) {
      warnings.push(`Session should be completed but status is still 'in_progress' - ${actualBanCount} bans and ${actualPickCount} picks completed`);
      fixable = true;
    }

    // NEW: Validate last action order numbers are sequential
    if (actions.length > 1) {
      const sortedActions = actions.slice().sort((a, b) => a.order_number - b.order_number);
      for (let i = 0; i < sortedActions.length - 1; i++) {
        if (sortedActions[i + 1].order_number !== sortedActions[i].order_number + 1) {
          warnings.push(`Non-sequential order numbers detected: ${sortedActions[i].order_number} -> ${sortedActions[i + 1].order_number}`);
          fixable = true;
        }
      }
    }

    // NEW: Check for side choice requirements
    const pickActions = actions.filter(a => a.action === "pick");
    if (pickActions.length > 0 && !pickActions.some(a => a.side_choice)) {
      if (session.current_turn_team_id === session.home_team_id) {
        warnings.push("Home team should choose starting side");
        fixable = false; // This is a user action, not fixable by medic
      }
    }
  }

  return {
    healthy: warnings.length === 0,
    warnings,
    fixable
  };
}
