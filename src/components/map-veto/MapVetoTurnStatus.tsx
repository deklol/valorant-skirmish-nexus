
import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface MapVetoTurnStatusProps {
  canAct: boolean;
  isUserTurn: boolean;
  teamSize: number | null;
  isUserCaptain: boolean;
  currentAction: "ban" | "pick";
}

const MapVetoTurnStatus = ({
  canAct,
  isUserTurn,
  teamSize,
  isUserCaptain,
  currentAction,
}: MapVetoTurnStatusProps) => (
  <Card className="bg-slate-800 border-slate-700">
    <CardContent className="p-4">
      <div className="flex items-center justify-between">
        <div className="text-white">
          <span className="font-medium">Current Turn: </span>
          <span className={isUserTurn ? "text-green-400" : "text-red-400"}>
            {isUserTurn
              ? canAct
                ? teamSize === 1
                  ? "Your Team"
                  : isUserCaptain
                  ? "Your Team Captain"
                  : "Not Captain"
                : "Not Captain"
              : "Opponent"}
          </span>
          {isUserTurn &&
            teamSize &&
            teamSize > 1 &&
            !isUserCaptain && (
              <span className="ml-2 text-xs text-yellow-400">(Only Captain can veto)</span>
            )}
        </div>
        <Badge
          className={
            currentAction === "ban"
              ? "bg-red-500/20 text-red-400 border-red-500/30"
              : "bg-green-500/20 text-green-400 border-green-500/30"
          }
        >
          {currentAction === "ban" ? "BAN" : "PICK"} Phase
        </Badge>
      </div>
    </CardContent>
  </Card>
);

export default MapVetoTurnStatus;
