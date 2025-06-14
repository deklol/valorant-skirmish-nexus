
import React, { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { History, XCircle } from "lucide-react";

interface VetoMedicHistoryProps {
  sessionId: string;
  actions: any[];
  status: string | null;
  loading: boolean;
  onExpand: (expand: boolean) => void;
  onRollback: () => void;
}

const VetoMedicHistory: React.FC<VetoMedicHistoryProps> = ({
  sessionId,
  actions,
  status,
  loading,
  onExpand,
  onRollback
}) => {
  const [expanded, setExpanded] = useState(false);

  const handleExpandToggle = () => {
    setExpanded(exp => {
      const next = !exp;
      onExpand(next);
      return next;
    });
  };

  if (!actions.length && !expanded) {
    // Don't show the expand link until the history is loaded
    return (
      <button
        className="text-xs text-slate-400 hover:underline mt-1"
        onClick={handleExpandToggle}
        type="button"
        disabled={loading}
      >
        <History className="w-3 h-3 mr-1 inline" />
        Show veto history
      </button>
    );
  }

  return (
    <div className="mt-2">
      <button
        className="text-xs text-slate-400 hover:underline"
        onClick={handleExpandToggle}
        type="button"
        disabled={loading}
      >
        <History className="w-3 h-3 mr-1 inline" />
        {expanded ? "Hide veto history" : "Show veto history"}
      </button>
      {expanded && (
        <div className="mt-1 overflow-x-auto">
          <Table className="w-full text-xs">
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Map</TableHead>
                <TableHead>Team</TableHead>
                <TableHead>At</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {actions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-muted-foreground">No actions yet.</TableCell>
                </TableRow>
              ) : actions.map((action, i) => (
                <TableRow key={action.id}>
                  <TableCell>{i + 1}</TableCell>
                  <TableCell>
                    <Badge
                      className={
                        action.action === "ban" ? "bg-yellow-800/60 text-yellow-400 border-yellow-600/40"
                          : "bg-blue-800/60 text-blue-300 border-blue-600/40"
                      }
                    >
                      {action.action}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span className="font-mono">{action.map_id?.slice?.(0, 8) || "?"}...</span>
                  </TableCell>
                  <TableCell>
                    <span className="font-mono">{action.team_id?.slice?.(0, 8) || "-"}</span>
                  </TableCell>
                  <TableCell>
                    {action.performed_at ?
                      new Date(action.performed_at).toLocaleTimeString() :
                      "?"}
                  </TableCell>
                  <TableCell>
                    {i === actions.length - 1 && status === "in_progress" && (
                      <Button size="xs" variant="outline" className="border border-red-500/40 text-red-400 px-2 py-1"
                        onClick={onRollback} disabled={loading}>
                        <XCircle className="w-3 h-3 mr-1" />
                        Rollback
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
};

export default VetoMedicHistory;

