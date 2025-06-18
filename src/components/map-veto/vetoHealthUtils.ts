
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

  // Check expected flow for BO1
  if (session.match && session.home_team_id && session.away_team_id) {
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
  }

  return {
    healthy: warnings.length === 0,
    warnings,
    fixable
  };
}
