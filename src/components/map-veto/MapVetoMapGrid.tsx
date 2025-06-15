import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Map, Ban, CheckCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { MapData, MapStatus, MapActionType } from "./types";

// Added userTeamId and teamNames for context-aware attribution
interface MapVetoMapGridProps {
  maps: MapData[];
  canAct: boolean;
  currentAction: MapActionType;
  bestOf: number;
  remainingMaps: MapData[];
  vetoActions: any[];
  onMapAction: (mapId: string) => void;
  currentTeamTurn: string;
  getMapStatus: (mapId: string) => MapStatus | null;
  isMapAvailable: (mapId: string) => boolean;
  userTeamId?: string | null; // new optional, for context
  teamNames?: Record<string, string>; // { [teamId]: teamName }
}

const MapVetoMapGrid = ({
  maps,
  canAct,
  currentAction,
  bestOf,
  remainingMaps,
  vetoActions,
  onMapAction,
  currentTeamTurn,
  getMapStatus,
  isMapAvailable,
  userTeamId,
  teamNames = {},
}: MapVetoMapGridProps) => {
  // Calculate the number of bans needed
  const totalBansNeeded = maps.length - (bestOf === 1 ? 1 : bestOf);

  // Attribution Helper based on status data ONLY
  const getActionAttribution = (status: MapStatus | null) => {
    if (!status) return { display: "", byYourTeam: false, actorName: "" };
    // status.team is always "Your Team" or "Opponent" as returned by getMapStatus
    const byYourTeam = status.team === "Your Team";
    // With no user info, fallback to generic team label
    const actorName = byYourTeam ? "You" : (teamNames[currentTeamTurn] || "Opponent");
    return {
      display:
        status.action === "ban"
          ? `${byYourTeam ? "You" : actorName} banned`
          : `${byYourTeam ? "You" : actorName} picked`,
      byYourTeam,
      actorName,
    };
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {maps.map((map) => {
        const status = getMapStatus(map.id);
        const available = isMapAvailable(map.id);

        const canClick =
          canAct &&
          available &&
          (!bestOf ||
            bestOf !== 1 ||
            remainingMaps.length === 1 ||
            totalBansNeeded > 0);

        const attribution = getActionAttribution(status);

        return (
          <Card
            key={map.id}
            className={`border-slate-600 transition-all cursor-pointer ${
              !available
                ? "bg-slate-700 opacity-50"
                : canClick
                ? "bg-slate-800 hover:bg-slate-700 hover:border-slate-500"
                : "bg-slate-800"
            }`}
            onClick={() => available && canClick && onMapAction(map.id)}
          >
            <CardContent className="p-4">
              <div className="space-y-3">
                <div className="aspect-video bg-slate-600 rounded-lg flex items-center justify-center">
                  {map.thumbnail_url ? (
                    <img
                      src={map.thumbnail_url}
                      alt={map.display_name}
                      className="w-full h-full object-cover rounded-lg"
                    />
                  ) : (
                    <Map className="w-8 h-8 text-slate-400" />
                  )}
                </div>
                <div className="text-center">
                  <h3 className="text-white font-medium">
                    {map.display_name}
                  </h3>
                </div>
                <div className="text-center">
                  {status ? (
                    <Badge
                      className={status.action === "ban"
                        ? "bg-red-500/20 text-red-400 border-red-500/30"
                        : "bg-green-500/20 text-green-400 border-green-500/30"
                      }
                    >
                      {attribution.display} {map.display_name}
                    </Badge>
                  ) : canClick && bestOf === 1 && remainingMaps.length === 1 ? (
                    <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                      Click to PICK
                    </Badge>
                  ) : canClick ? (
                    <Badge className="bg-red-500/20 text-red-400 border-red-500/30">
                      Click to BAN
                    </Badge>
                  ) : (
                    <Badge className="bg-slate-500/20 text-slate-400 border-slate-500/30">
                      Available
                    </Badge>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

export default MapVetoMapGrid;
