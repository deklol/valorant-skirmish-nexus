
/**
 * Given home/away and bestOf, produce a full VCT BO3 veto flow.
 * Returns [{ teamId, action: "ban"|"pick"|"side_pick", mapOrder (0-based) }]
 * For BO1, override to ban/ban/pick.
 */
export function getVctVetoFlow({
  homeTeamId,
  awayTeamId,
  bestOf,
  maps,
}: {
  homeTeamId: string,
  awayTeamId: string,
  bestOf: number,
  maps: Array<{ id: string, name: string }>
}) {
  if (bestOf === 1) {
    // BO1: home ban, away ban, home ban, away ban... until one left; then pick.
    let nBans = maps.length - 1;
    let steps: { teamId: string, action: "ban" | "pick" }[] = [];
    // Alternating bans: home first
    let curr = homeTeamId, other = awayTeamId;
    for (let i = 0; i < nBans; i++) {
      steps.push({ teamId: i % 2 === 0 ? homeTeamId : awayTeamId, action: "ban" });
    }
    steps.push({ teamId: (nBans % 2 === 0 ? homeTeamId : awayTeamId), action: "pick" });
    return steps.map((s, idx) => ({
      ...s,
      mapOrder: idx
    }));
  }

  // VCT BO3: 1. Home bans, 2. Away bans, 3. Home picks Map1, 4. Away picks side (M1)
  //          5. Away picks Map2, 6. Home picks side (M2)
  //          7. Home bans, 8. Away bans, 9. Last = Map3, 10. Home picks side (M3)
  if (bestOf === 3 && homeTeamId && awayTeamId) {
    return [
      { teamId: homeTeamId, action: "ban", mapOrder: 0 },
      { teamId: awayTeamId, action: "ban", mapOrder: 1 },
      { teamId: homeTeamId, action: "pick", mapOrder: 2 },
      { teamId: awayTeamId, action: "side_pick", mapOrder: 3 },
      { teamId: awayTeamId, action: "pick", mapOrder: 4 },
      { teamId: homeTeamId, action: "side_pick", mapOrder: 5 },
      { teamId: homeTeamId, action: "ban", mapOrder: 6 },
      { teamId: awayTeamId, action: "ban", mapOrder: 7 },
      { teamId: null as any, action: "pick", mapOrder: 8 }, // remaining
      { teamId: homeTeamId, action: "side_pick", mapOrder: 9 }
    ];
  }
  // Fallback: normal alternating bans/picks
  let steps: { teamId: string, action: "ban" | "pick" }[] = [];
  let curr = homeTeamId, other = awayTeamId;
  for (let i = 0; i < maps.length; i++)
    steps.push({ teamId: i % 2 === 0 ? homeTeamId : awayTeamId, action: "ban" });
  return steps.map((s, i) => ({ ...s, mapOrder: i }));
}
