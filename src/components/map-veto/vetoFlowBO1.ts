
/**
 * Generate a dynamic veto sequence for BO1 based on the number of active maps.
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

  // Ban sequence now matches backend definition exactly!
  steps.push({ teamId: homeTeamId, action: "ban", step: step++ }); // Home ban 1

  let awayDoubleBan = totalMaps > 3 ? 2 : 1;
  for (let i = 0; i < awayDoubleBan; i++) {
    steps.push({ teamId: awayTeamId, action: "ban", step: step++ }); // Away ban(s)
  }

  // Alternating bans: Home, Away, ... until only one map left
  let bansSoFar = steps.length;
  let currentTeam = homeTeamId;
  while (bansSoFar < totalMaps - 1) {
    steps.push({ teamId: currentTeam, action: "ban", step: step++ });
    bansSoFar++;
    currentTeam = currentTeam === homeTeamId ? awayTeamId : homeTeamId;
  }
  // Final auto-pick and side-pick
  steps.push({ teamId: null, action: "pick", step: step++ }); // auto-pick
  steps.push({ teamId: homeTeamId, action: "side_pick", step: step }); // home picks side

  return steps;
}
