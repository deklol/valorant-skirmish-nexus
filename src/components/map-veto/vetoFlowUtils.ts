
/**
 * Given home/away, bestOf, and tournament map pool, produce a full VCT veto flow.
 * For BO1: uses competitive ban sequence from tournament map pool
 * Returns [{ teamId, action: "ban"|"pick"|"side_pick", mapOrder }]
 */
import { generateBO1VetoFlow } from "./vetoFlowBO1";

export function getVctVetoFlow({
  homeTeamId,
  awayTeamId,
  bestOf,
  tournamentMapPool,
}: {
  homeTeamId: string,
  awayTeamId: string,
  bestOf: number,
  tournamentMapPool: Array<{ id: string, name: string }>
}) {
  const numMaps = tournamentMapPool.length;

  if (bestOf === 1) {
    // Use competitive BO1 flow with tournament map pool
    return generateBO1VetoFlow({ homeTeamId, awayTeamId, tournamentMapPool });
  }

  // VCT BO3 (using tournament map pool)
  if (bestOf === 3 && homeTeamId && awayTeamId && numMaps >= 5) {
    return [
      { teamId: homeTeamId, action: "ban", mapOrder: 0 },
      { teamId: awayTeamId, action: "ban", mapOrder: 1 },
      { teamId: homeTeamId, action: "pick", mapOrder: 2 },
      { teamId: awayTeamId, action: "side_pick", mapOrder: 3 },
      { teamId: awayTeamId, action: "pick", mapOrder: 4 },
      { teamId: homeTeamId, action: "side_pick", mapOrder: 5 },
      { teamId: homeTeamId, action: "ban", mapOrder: 6 },
      { teamId: awayTeamId, action: "ban", mapOrder: 7 },
      { teamId: homeTeamId, action: "pick", mapOrder: 8 },
      { teamId: homeTeamId, action: "side_pick", mapOrder: 9 },
    ];
  }

  // VCT BO5 (Grand Finals style)
  if (bestOf === 5 && homeTeamId && awayTeamId && numMaps >= 7) {
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
      { teamId: homeTeamId, action: "pick", mapOrder: 12 },
      { teamId: awayTeamId, action: "side_pick", mapOrder: 13 }
    ];
  }

  // Fallback: alternate bans from tournament pool then pick last
  let steps: { teamId: string, action: "ban" | "pick" }[] = [];
  for (let i = 0; i < numMaps - 1; i++) {
    steps.push({ teamId: i % 2 === 0 ? homeTeamId : awayTeamId, action: "ban" });
  }
  steps.push({ teamId: homeTeamId, action: "pick" }); // Last map pick
  return steps.map((s, i) => ({ ...s, mapOrder: i }));
}

/**
 * Get tournament map pool for a specific tournament
 */
export async function getTournamentMapPool(tournamentId: string) {
  const { supabase } = await import("@/integrations/supabase/client");
  
  const { data, error } = await supabase
    .rpc('get_tournament_map_pool', { p_tournament_id: tournamentId });
    
  if (error) {
    console.error('Error fetching tournament map pool:', error);
    return [];
  }
  
  return data || [];
}
