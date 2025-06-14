
import { VetoAction, MapData } from "./types";

/** Returns true if map has NOT been banned or picked yet. */
export function isMapAvailable(mapId: string, vetoActions: VetoAction[]) {
  return !vetoActions.some((action) => action.map_id === mapId);
}

/** Returns the next team's turn id (alternates between team1Id and team2Id) */
export function getNextTeamId(
  currentTurnTeamId: string,
  team1Id: string | null,
  team2Id: string | null
) {
  if (!team1Id || !team2Id) return null;
  return currentTurnTeamId === team1Id ? team2Id : team1Id;
}

/** Returns array of maps that have not been banned or picked */
export function getRemainingMaps(maps: MapData[], vetoActions: VetoAction[]) {
  return maps.filter(
    (map) => !vetoActions.some((action) => action.map_id === map.id)
  );
}
