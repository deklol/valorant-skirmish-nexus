
/**
 * Generate a dynamic veto sequence for BO1 based on the number of active maps.
 * Always alternates: Home starts, Away goes next, alternating until 1 map left.
 * Can handle any pool size.
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
  // Alternating, Home starts
  let steps: { teamId: string | null; action: "ban" | "pick" | "side_pick"; step: number }[] = [];
  // Bans: Home, Away, Home, Away, ...
  let nextTeam = homeTeamId;
  for (let i = 0; i < totalMaps - 1; i++) {
    steps.push({ teamId: nextTeam, action: "ban", step: i });
    nextTeam = nextTeam === homeTeamId ? awayTeamId : homeTeamId;
  }
  // Last map = auto-pick (no team), then side pick by Home
  steps.push({ teamId: null, action: "pick", step: totalMaps - 1 });
  steps.push({ teamId: homeTeamId, action: "side_pick", step: totalMaps }); // Home chooses side
  return steps;
}
