/**
 * Given home/away and bestOf, produce a full VCT BO3/BO5 veto flow.
 * For BO1: bans alternate (home starts) until 1 map left, which is auto-picked for final phase.
 * Returns [{ teamId, action: "ban"|"pick"|"side_pick", mapOrder }]
 */
import { generateBO1VetoFlow } from "./vetoFlowBO1";

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
    // Use new robust BO1 flow for any map count
    return generateBO1VetoFlow({ homeTeamId, awayTeamId, maps });
  }

  // VCT BO3
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
      { teamId: homeTeamId, action: "pick", mapOrder: 8 }, // assign to home or away, must not be null
      { teamId: homeTeamId, action: "side_pick", mapOrder: 9 },
    ];
  }

  // VCT BO5 (Grand Finals style)
  if (bestOf === 5 && homeTeamId && awayTeamId) {
    return [
      { teamId: homeTeamId, action: "ban", mapOrder: 0 },
      { teamId: awayTeamId, action: "ban", mapOrder: 1 },
      { teamId: homeTeamId, action: "pick", mapOrder: 2 },
      { teamId: awayTeamId, action: "side_pick", mapOrder: 3 },
      { teamId: awayTeamId, action: "pick", mapOrder: 4 },
      { teamId: homeTeamId, action: "side_pick", mapOrder: 5 },
      { teamId: homeTeamId, action: "pick", mapOrder: 6 },
      { teamId: awayTeamId, action: "side_pick", mapOrder: 7 },
      { teamId: awayTeamId, action: "pick", mapOrder: 8 },
      { teamId: homeTeamId, action: "side_pick", mapOrder: 9 },
      { teamId: homeTeamId, action: "ban", mapOrder: 10 },
      { teamId: awayTeamId, action: "ban", mapOrder: 11 },
      { teamId: homeTeamId, action: "pick", mapOrder: 12 }, // assign to home or away, must not be null
      { teamId: awayTeamId, action: "side_pick", mapOrder: 13 }
    ];
  }

  // Fallback: alternate bans for #maps then pick last (legacy)
  let steps: { teamId: string, action: "ban" | "pick" }[] = [];
  for (let i = 0; i < maps.length; i++)
    steps.push({ teamId: i % 2 === 0 ? homeTeamId : awayTeamId, action: "ban" });
  return steps.map((s, i) => ({ ...s, mapOrder: i }));
}
