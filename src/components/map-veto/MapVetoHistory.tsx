import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Ban, CheckCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import ClickableUsername from "@/components/ClickableUsername";
import { VetoAction } from "./types";

function formatDateTime(dateStr: string) {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  return date.toLocaleString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

interface MapVetoHistoryProps {
  vetoActions: VetoAction[];
}

const MapVetoHistory = ({ vetoActions }: MapVetoHistoryProps) =>
  vetoActions.length === 0 ? null : (
    <Card className="bg-slate-800 border-slate-700">
      <CardContent className="p-4">
        <h3 className="text-white font-medium mb-3">Veto History</h3>
        <div className="space-y-2">
          {vetoActions.map((action, index) => (
            <div
              key={action.id}
              className="flex items-center justify-between bg-slate-700 p-2 rounded"
            >
              <div className="flex items-center gap-3">
                <span className="text-slate-400 text-sm">#{index + 1}</span>
                <div className="flex items-center gap-2">
                  {action.action === "ban" ? (
                    <Ban className="w-4 h-4 text-red-400" />
                  ) : (
                    <CheckCircle className="w-4 h-4 text-green-400" />
                  )}
                  <span className="text-white">{action.map?.display_name}</span>
                  {action.action === "pick" && action.side_choice && (
                    <span className={`ml-2 text-xs px-2 rounded 
                      ${action.side_choice === "attack"
                        ? "bg-red-500/20 text-red-400"
                        : "bg-blue-600/20 text-blue-300"
                      }`}>
                      {action.side_choice?.toUpperCase()} SIDE
                    </span>
                  )}
                  {action.users && action.users.discord_username && (
                    <span className="text-sm text-blue-300 ml-2">
                      by <ClickableUsername userId={action.performed_by} username={action.users.discord_username} />
                    </span>
                  )}
                  <span className="ml-2 text-xs text-slate-400">
                    {formatDateTime(action.performed_at)}
                  </span>
                </div>
              </div>
              <Badge
                className={action.action === "ban"
                  ? "bg-red-500/20 text-red-400 border-red-500/30"
                  : "bg-green-500/20 text-green-400 border-green-500/30"
                }
              >
                {action.action.toUpperCase()}
              </Badge>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );

export default MapVetoHistory;
