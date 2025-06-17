
/**
 * Generate a dynamic veto sequence for BO1 based on tournament map pool.
 * Competitive logic, matching backend SQL (see perform_veto_action SQL):
 * - Home bans 1 map (step1)  
 * - Away bans 2 maps if >3 maps (step2/3), else only 1
 * - Alternate (Home, Away, Home...) until 1 map remains
 * - The final map is auto-picked; then Home chooses side via set_side_choice
 *
 * Returns steps: [{ teamId, action: "ban"|"pick"|"side_pick", step }]
 */
export function generateBO1VetoFlow({
  homeTeamId,
  awayTeamId,
  tournamentMapPool,
}: {
  homeTeamId: string;
  awayTeamId: string;
  tournamentMapPool: { id: string; name: string }[];
}) {
  const totalMaps = tournamentMapPool.length;
  if (!homeTeamId || !awayTeamId || totalMaps < 2) return [];

  let steps: { teamId: string | null; action: "ban" | "pick" | "side_pick"; step: number }[] = [];
  let step = 0;

  // Build competitive ban sequence: [home, away, away, home, away, home] for 7 maps
  const totalBans = totalMaps - 1;
  const banSequence: string[] = [];
  
  // Always start with home ban
  banSequence.push(homeTeamId);
  
  // Away team bans: 2 if >3 maps, 1 if ≤3 maps
  if (totalMaps >= 4) {
    banSequence.push(awayTeamId, awayTeamId);
  } else {
    banSequence.push(awayTeamId);
  }
  
  // Continue alternating until we have enough bans
  let nextTeam = homeTeamId; // Start alternating with home after away's double ban
  for (let i = banSequence.length; i < totalBans; i++) {
    banSequence.push(nextTeam);
    nextTeam = nextTeam === homeTeamId ? awayTeamId : homeTeamId;
  }

  // Add ban steps
  banSequence.forEach(teamId => {
    steps.push({ teamId, action: "ban", step: step++ });
  });

  // Auto-pick final map (no team assigned - handled by backend)
  steps.push({ teamId: null, action: "pick", step: step++ });
  
  // Home team picks side
  steps.push({ teamId: homeTeamId, action: "side_pick", step: step });

  return steps;
}

/**
 * Validate that a ban sequence matches the expected competitive flow
 */
export function validateBO1BanSequence(
  banSequence: string[],
  homeTeamId: string,
  awayTeamId: string,
  totalMaps: number
): boolean {
  const expectedSequence = generateBO1VetoFlow({
    homeTeamId,
    awayTeamId,
    tournamentMapPool: Array(totalMaps).fill(0).map((_, i) => ({ id: `map-${i}`, name: `Map ${i}` }))
  });
  
  const expectedBanTeams = expectedSequence
    .filter(step => step.action === "ban")
    .map(step => step.teamId);
  
  return JSON.stringify(banSequence) === JSON.stringify(expectedBanTeams);
}
