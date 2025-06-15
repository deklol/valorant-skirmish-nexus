
import { generateBO1VetoFlow } from "./vetoFlowBO1";

/**
 * Checks the health status of a veto session.
 * Returns an object: { healthy: boolean, warnings: string[], fixable: boolean }
 */
export async function checkVetoSessionHealth({ session, actions, maps }: {
  session: any;
  actions: any[];
  maps: any[];
}) {
  const warnings: string[] = [];
  let fixable = false;

  // 1. Check actions order and step match
  if (!actions || !Array.isArray(actions)) {
    warnings.push("No veto actions found for this session.");
    fixable = true;
  }

  // 2. Check for duplicate map picks/bans
  const mapActionCounts: Record<string, number> = {};
  actions.forEach(a => {
    if (a.map_id) {
      mapActionCounts[a.map_id] = (mapActionCounts[a.map_id] || 0) + 1;
    }
  });
  const dupes = Object.entries(mapActionCounts).filter(([_, count]) => count > 1);
  if (dupes.length > 0) {
    warnings.push(
      "Some maps appear in multiple actions (duplicate bans/picks): " +
        dupes.map(([mid]) => mid).join(", ")
    );
    fixable = true;
  }

  // 3. Check for gaps in action order
  const orderNumbers = actions.map(a => a.order_number);
  const missingOrders = [];
  for (let i = 1; i <= actions.length; i++) {
    if (!orderNumbers.includes(i)) missingOrders.push(i);
  }
  if (missingOrders.length > 0) {
    warnings.push("Missing order numbers in veto actions: " + missingOrders.join(", "));
    fixable = true;
  }

  // 4. Compare actual to expected flow (client-side, rough check)
  if (session && maps && session.home_team_id && session.away_team_id && maps.length > 1) {
    try {
      const steps = generateBO1VetoFlow({
        homeTeamId: session.home_team_id,
        awayTeamId: session.away_team_id,
        maps: maps.map((m: any) => ({ id: m.id, name: m.display_name || m.name })),
      });
      if (actions.length > steps.length) {
        warnings.push(
          `More actions (${actions.length}) than expected steps (${steps.length}).`
        );
        fixable = true;
      }
    } catch (e) {
      warnings.push("Error during flow step comparison: " + (e.message || e));
    }
  } else {
    warnings.push("Session flow could not be validated (missing teams or maps).");
  }

  // 5. Status consistency
  if (session.status === "completed") {
    const picks = actions.filter(a => a.action === "pick");
    if (picks.length < 1) {
      warnings.push("Session marked completed, but no final pick found.");
      fixable = true;
    }
  }

  const healthy = warnings.length === 0;
  return { healthy, warnings, fixable };
}
