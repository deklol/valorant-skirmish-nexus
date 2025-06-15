
/**
 * Corrected veto flow utils for VCT.
 * Veto steps for BO1/BO3/BO5, with side pick logic as per official formats.
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
  // ---- BO1: Home starts, alternate bans, last map is played, home picks side
  if (bestOf === 1) {
    // N maps: home, away, home, away, ... until 1 left; then home team picks starting side
    let nBans = maps.length - 1;
    let steps: { teamId: string, action: "ban" | "side_pick" }[] = [];
    for (let i = 0; i < nBans; i++) {
      steps.push({ teamId: i % 2 === 0 ? homeTeamId : awayTeamId, action: "ban" });
    }
    // After the last ban, home picks side
    steps.push({ teamId: homeTeamId, action: "side_pick" });
    return steps.map((s, idx) => ({ ...s, mapOrder: idx }));
  }

  // ---- BO3: Official Valorant VCT
  // 1. Home bans, 2. Away bans, 3. Home picks Map1, 4. Away picks side for M1, 5. Away picks Map2, 6. Home picks side for M2,
  // 7. Home bans, 8. Away bans, 9. Last map is Map3, 10. Home picks side for M3.
  if (bestOf === 3) {
    let flow = [
      { teamId: homeTeamId, action: "ban" },        // 1
      { teamId: awayTeamId, action: "ban" },        // 2
      { teamId: homeTeamId, action: "pick" },       // 3 (Map 1)
      { teamId: awayTeamId, action: "side_pick" },  // 4 (side on Map 1)
      { teamId: awayTeamId, action: "pick" },       // 5 (Map 2)
      { teamId: homeTeamId, action: "side_pick" },  // 6 (side on Map 2)
      { teamId: homeTeamId, action: "ban" },        // 7
      { teamId: awayTeamId, action: "ban" },        // 8
      { teamId: null as any, action: "pick" },      // 9 (Map 3 = remaining map)
      { teamId: homeTeamId, action: "side_pick" }   // 10 (side on Map 3)
    ];
    return flow.map((s, idx) => ({ ...s, mapOrder: idx }));
  }

  // ---- BO5: (Grand Finals, as per example above)
  if (bestOf === 5) {
    let flow = [
      { teamId: homeTeamId, action: "ban" },         // 1 (ban 1)
      { teamId: awayTeamId, action: "ban" },         // 2 (ban 2)
      { teamId: homeTeamId, action: "pick" },        // 3 (pick 1)
      { teamId: awayTeamId, action: "side_pick" },   // 4 (side on 1)
      { teamId: awayTeamId, action: "pick" },        // 5 (pick 2)
      { teamId: homeTeamId, action: "side_pick" },   // 6 (side on 2)
      { teamId: homeTeamId, action: "pick" },        // 7 (pick 3)
      { teamId: awayTeamId, action: "side_pick" },   // 8 (side on 3)
      { teamId: awayTeamId, action: "pick" },        // 9 (pick 4)
      { teamId: homeTeamId, action: "side_pick" },   // 10 (side on 4)
      { teamId: homeTeamId, action: "ban" },         // 11 (ban 3-of-3 left)
      { teamId: awayTeamId, action: "ban" },         // 12 (ban 2-of-2 left)
      { teamId: null as any, action: "pick" },       // 13 (remaining final map)
      { teamId: awayTeamId, action: "side_pick" },   // 14 (side for Map 5)
    ];
    return flow.map((s, idx) => ({ ...s, mapOrder: idx }));
  }

  // ---- Fallback: alternate bans
  let steps: { teamId: string, action: "ban" | "pick" }[] = [];
  for (let i = 0; i < maps.length; i++) {
    steps.push({ teamId: i % 2 === 0 ? homeTeamId : awayTeamId, action: "ban" });
  }
  return steps.map((s, i) => ({ ...s, mapOrder: i }));
}
