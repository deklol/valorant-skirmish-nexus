
/**
 * Generate a dynamic veto sequence for BO1 based on the number of active maps.
 * Competitive logic:
 * - Home bans 1 map
 * - Away bans 2 maps
 * - Alternate bans until 1 map left (always alternate: Home, Away, Home...)
 * - Last map = auto-pick (no team), Home picks side
 *
 * Returns steps: [{ teamId, action: "ban"|"pick"|"side_pick", step }]
 */
export function generateBO1VetoFlow({
  homeTeamId,
  awayTeamId,
  maps,
}: {
  homeTeamId: string;
  awayTeamId: string;
  maps: { id: string; name: string }[];
}) {
  const totalMaps = maps.length;
  if (!homeTeamId || !awayTeamId || totalMaps < 2) return [];

  let steps: { teamId: string | null; action: "ban" | "pick" | "side_pick"; step: number }[] = [];
  let step = 0;

  // 1. Home bans 1
  steps.push({ teamId: homeTeamId, action: "ban", step: step++ });

  // 2. Away bans 2 maps (or only 1 if 3 maps left)
  let awayDoubleBan = totalMaps > 3 ? 2 : 1; // For 3 maps, only one is needed
  for (let i = 0; i < awayDoubleBan; i++) {
    steps.push({ teamId: awayTeamId, action: "ban", step: step++ });
  }

  // 3. Alternate bans (Home, Away, Home, ...) until only 1 map left
  // Calculate how many more bans are needed
  // Already banned: 1 (home), 2 (away) => 3 bans if >3 maps, else less
  let mapsRemaining = totalMaps - steps.length;
  let currentTeam = homeTeamId;
  while (mapsRemaining > 1) {
    steps.push({ teamId: currentTeam, action: 'ban', step: step++ });
    mapsRemaining--;
    // Alternate team each ban
    currentTeam = currentTeam === homeTeamId ? awayTeamId : homeTeamId;
  }
  // 4. Last map = auto-pick (no team), then side pick by Home
  steps.push({ teamId: null, action: "pick", step: step++ });
  steps.push({ teamId: homeTeamId, action: "side_pick", step: step }); // Home chooses side
  return steps;
}
