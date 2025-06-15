
/**
 * Given home/away and bestOf, produce a full VCT BO3/BO5 veto flow.
 * Returns [{ teamId, action: "ban"|"pick"|"side_pick", mapOrder (0-based) }]
 * For BO1, override to ban/ban/pick; for BO5, build full VCT playoff order.
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
  const numMaps = maps.length;

  if (bestOf === 1) {
    // BO1: alternates bans; home starts, until one left, then home picks side
    let nBans = numMaps - 1;
    let steps: { teamId: string, action: "ban" | "pick" | "side_pick" }[] = [];
    for (let i = 0; i < nBans; i++) {
      steps.push({
        teamId: i % 2 === 0 ? homeTeamId : awayTeamId,
        action: "ban",
      });
    }
    steps.push({
      teamId: nBans % 2 === 0 ? homeTeamId : awayTeamId,
      action: "pick",
    });
    // Side pick by first banner (always home)
    steps.push({
      teamId: homeTeamId,
      action: "side_pick",
    });
    return steps.map((s, idx) => ({
      ...s,
      mapOrder: idx
    }));
  }

  // VCT BO3
  if (bestOf === 3 && homeTeamId && awayTeamId) {
    return [
      { teamId: homeTeamId, action: "ban", mapOrder: 0 },         // home bans
      { teamId: awayTeamId, action: "ban", mapOrder: 1 },         // away bans
      { teamId: homeTeamId, action: "pick", mapOrder: 2 },        // home picks M1
      { teamId: awayTeamId, action: "side_pick", mapOrder: 3 },   // away picks side M1
      { teamId: awayTeamId, action: "pick", mapOrder: 4 },        // away picks M2
      { teamId: homeTeamId, action: "side_pick", mapOrder: 5 },   // home picks side M2
      { teamId: homeTeamId, action: "ban", mapOrder: 6 },         // home bans
      { teamId: awayTeamId, action: "ban", mapOrder: 7 },         // away bans
      { teamId: null as any, action: "pick", mapOrder: 8 },       // remaining is Map3
      { teamId: homeTeamId, action: "side_pick", mapOrder: 9 },   // home picks side M3
    ];
  }

  // VCT BO5 (Grand Finals style)
  if (bestOf === 5 && homeTeamId && awayTeamId) {
    return [
      { teamId: homeTeamId, action: "ban", mapOrder: 0 },             // home bans
      { teamId: awayTeamId, action: "ban", mapOrder: 1 },             // away bans
      { teamId: homeTeamId, action: "pick", mapOrder: 2 },            // home picks Map1
      { teamId: awayTeamId, action: "side_pick", mapOrder: 3 },       // away side Map1
      { teamId: awayTeamId, action: "pick", mapOrder: 4 },            // away picks Map2
      { teamId: homeTeamId, action: "side_pick", mapOrder: 5 },       // home side Map2
      { teamId: homeTeamId, action: "pick", mapOrder: 6 },            // home picks Map3
      { teamId: awayTeamId, action: "side_pick", mapOrder: 7 },       // away side Map3
      { teamId: awayTeamId, action: "pick", mapOrder: 8 },            // away picks Map4
      { teamId: homeTeamId, action: "side_pick", mapOrder: 9 },       // home side Map4
      { teamId: homeTeamId, action: "ban", mapOrder: 10 },            // home bans from 3 left
      { teamId: awayTeamId, action: "ban", mapOrder: 11 },            // away bans from last 2 left
      { teamId: null as any, action: "pick", mapOrder: 12 },          // last = Map5
      { teamId: awayTeamId, action: "side_pick", mapOrder: 13 }       // away picks side Map5
    ];
  }

  // Fallback: alternate bans for #maps then pick last (legacy)
  let steps: { teamId: string, action: "ban" | "pick" }[] = [];
  for (let i = 0; i < maps.length; i++)
    steps.push({ teamId: i % 2 === 0 ? homeTeamId : awayTeamId, action: "ban" });
  return steps.map((s, i) => ({ ...s, mapOrder: i }));
}
