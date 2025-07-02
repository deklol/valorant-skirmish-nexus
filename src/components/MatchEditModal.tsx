import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Activity } from "lucide-react";
import ScoreValidationDialog from "./ScoreValidationDialog";

type TeamInfo = {
  id: string;
  name: string;
};
type WinnerInfo = {
  id: string;
  name: string;
};

type MatchStatus = "completed" | "pending" | "live";
export interface MatchEditModalProps {
  open: boolean;
  match: {
    id: string;
    match_number: number;
    team1: TeamInfo | null;
    team2: TeamInfo | null;
    winner: WinnerInfo | null;
    status: MatchStatus;
    score_team1: number;
    score_team2: number;
  } | null;
  actionMatchId?: string | null;
  onChange: (match: any) => void;
  onCancel: () => void;
  onSave: (args: { status: MatchStatus; score_team1: number; score_team2: number; winner_id: string | null }) => void;
}

export const parseStatus = (s: any): MatchStatus => {
  if (s === "completed" || s === "pending" || s === "live") return s;
  return "pending";
};

export default function MatchEditModal({
  open,
  match,
  actionMatchId = null,
  onChange,
  onCancel,
  onSave,
}: MatchEditModalProps) {
  const [showValidationDialog, setShowValidationDialog] = useState(false);
  const [pendingSaveArgs, setPendingSaveArgs] = useState<any>(null);

  if (!open || !match) return null;
  // Generate team label with fallback
  const team1Label = match.team1?.name ? `Score (${match.team1.name}):` : "Score (Team 1):";
  const team2Label = match.team2?.name ? `Score (${match.team2.name}):` : "Score (Team 2):";

  const handleSaveClick = (args: { status: any; score_team1: number; score_team2: number; winner_id: string | null }) => {
    // Check for score inconsistencies (only for admin overrides with completed status)
    if (args.status === 'completed' && args.score_team1 !== args.score_team2 && match.team1 && match.team2) {
      const expectedWinnerId = args.score_team1 > args.score_team2 ? match.team1.id : match.team2.id;
      const hasInconsistency = args.winner_id && args.winner_id !== expectedWinnerId;
      
      if (hasInconsistency) {
        setPendingSaveArgs(args);
        setShowValidationDialog(true);
        return;
      }
    }
    
    // No inconsistency, proceed directly
    onSave(args);
  };

  const handleConfirmSave = () => {
    if (pendingSaveArgs) {
      onSave(pendingSaveArgs);
      setPendingSaveArgs(null);
    }
    setShowValidationDialog(false);
  };
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-slate-900 p-6 rounded-lg shadow border border-amber-700 w-full max-w-md">
        <h3 className="text-lg font-bold mb-2 text-white flex items-center gap-2">
          <Activity className="w-5 h-5 text-amber-400" /> Edit Match #{match.match_number}
        </h3>
        <div className="space-y-2">
          <div>
            <label className="block text-amber-300 text-xs mb-1">Status:</label>
            <select
              className="w-full bg-slate-800 text-white border border-slate-700 rounded px-3 py-2"
              value={match.status}
              disabled={!!actionMatchId}
              onChange={e =>
                onChange({ ...match, status: parseStatus(e.target.value) })
              }
            >
              <option value="pending">Pending</option>
              <option value="live">Live</option>
              <option value="completed">Completed</option>
            </select>
          </div>
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="block text-amber-300 text-xs mb-1">{team1Label}</label>
              <input
                type="number"
                min={0}
                value={match.score_team1}
                className="w-full bg-slate-800 text-white border border-slate-700 rounded px-2 py-1"
                disabled={!!actionMatchId}
                onChange={e =>
                  onChange({ ...match, score_team1: Number(e.target.value) })
                }
              />
            </div>
            <div className="flex-1">
              <label className="block text-amber-300 text-xs mb-1">{team2Label}</label>
              <input
                type="number"
                min={0}
                value={match.score_team2}
                className="w-full bg-slate-800 text-white border border-slate-700 rounded px-2 py-1"
                disabled={!!actionMatchId}
                onChange={e =>
                  onChange({ ...match, score_team2: Number(e.target.value) })
                }
              />
            </div>
          </div>
          {(match.team1 || match.team2) && (
            <div>
              <label className="block text-amber-300 text-xs mb-1">Winner:</label>
              <select
                className="w-full bg-slate-800 text-white border border-slate-700 rounded px-3 py-2"
                disabled={!!actionMatchId}
                value={match.winner?.id || ""}
                onChange={e => {
                  let winnerObj = null;
                  if (e.target.value === match.team1?.id) {
                    winnerObj = match.team1;
                  } else if (e.target.value === match.team2?.id) {
                    winnerObj = match.team2;
                  }
                  onChange({
                    ...match,
                    winner: winnerObj,
                  });
                }}
              >
                <option value="">No winner</option>
                {match.team1 && <option value={match.team1.id}>{match.team1.name}</option>}
                {match.team2 && <option value={match.team2.id}>{match.team2.name}</option>}
              </select>
            </div>
          )}
        </div>
        <div className="flex gap-2 mt-4 justify-end">
          <Button
            size="sm"
            variant="outline"
            onClick={onCancel}
            disabled={!!actionMatchId}
          >
            Cancel
          </Button>
          <Button
            onClick={() =>
              handleSaveClick({
                status: match.status,
                score_team1: match.score_team1,
                score_team2: match.score_team2,
                winner_id: match.winner?.id ?? null,
              })
            }
            className="bg-amber-600 text-white"
            size="sm"
            disabled={!!actionMatchId}
          >
            {actionMatchId ? "Saving..." : "Save"}
          </Button>
        </div>
      </div>
      
      {/* Score Validation Dialog */}
      <ScoreValidationDialog
        open={showValidationDialog}
        onOpenChange={setShowValidationDialog}
        onConfirm={handleConfirmSave}
        team1Name={match.team1?.name || "Team 1"}
        team2Name={match.team2?.name || "Team 2"}
        score1={pendingSaveArgs?.score_team1 || 0}
        score2={pendingSaveArgs?.score_team2 || 0}
        selectedWinnerId={pendingSaveArgs?.winner_id || null}
        team1Id={match.team1?.id || ""}
        team2Id={match.team2?.id || ""}
      />
    </div>
  );
}
