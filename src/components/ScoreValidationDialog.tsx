import React from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Trophy } from 'lucide-react';

interface ScoreValidationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  team1Name: string;
  team2Name: string;
  score1: number;
  score2: number;
  selectedWinnerId: string | null;
  team1Id: string;
  team2Id: string;
}

export const ScoreValidationDialog: React.FC<ScoreValidationDialogProps> = ({
  open,
  onOpenChange,
  onConfirm,
  team1Name,
  team2Name,
  score1,
  score2,
  selectedWinnerId,
  team1Id,
  team2Id,
}) => {
  const expectedWinnerId = score1 > score2 ? team1Id : score2 > score1 ? team2Id : null;
  const hasInconsistency = expectedWinnerId && selectedWinnerId !== expectedWinnerId;
  
  const expectedWinnerName = expectedWinnerId === team1Id ? team1Name : 
                           expectedWinnerId === team2Id ? team2Name : "No one (tie)";
  const selectedWinnerName = selectedWinnerId === team1Id ? team1Name :
                           selectedWinnerId === team2Id ? team2Name : "No winner selected";

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="bg-slate-900 border-slate-700 max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-white flex items-center gap-2">
            {hasInconsistency ? (
              <>
                <AlertTriangle className="w-5 h-5 text-yellow-400" />
                Score Inconsistency Warning
              </>
            ) : (
              <>
                <Trophy className="w-5 h-5 text-green-400" />
                Confirm Score Submission
              </>
            )}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-slate-300">
            Please review the match result before submitting.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-4">
          {/* Score Summary */}
          <div className="bg-slate-800 p-4 rounded-lg">
            <h4 className="text-white font-medium mb-2">Score Summary</h4>
            <div className="flex items-center justify-between">
              <span className="text-slate-300">{team1Name}</span>
              <Badge variant="outline" className="bg-slate-700 text-white">
                {score1}
              </Badge>
            </div>
            <div className="flex items-center justify-between mt-1">
              <span className="text-slate-300">{team2Name}</span>
              <Badge variant="outline" className="bg-slate-700 text-white">
                {score2}
              </Badge>
            </div>
          </div>

          {/* Winner Analysis */}
          <div className="bg-slate-800 p-4 rounded-lg">
            <h4 className="text-white font-medium mb-2">Winner Analysis</h4>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-400">Based on scores:</span>
                <span className="text-white font-medium">{expectedWinnerName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">You selected:</span>
                <span className={hasInconsistency ? "text-red-400 font-medium" : "text-white font-medium"}>
                  {selectedWinnerName}
                </span>
              </div>
            </div>
          </div>

          {/* Warning Message */}
          {hasInconsistency && (
            <div className="bg-red-900/20 border border-red-500/30 p-3 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
                <div className="text-sm">
                  <p className="text-red-400 font-medium">Inconsistency Detected</p>
                  <p className="text-red-300 mt-1">
                    The score indicates <strong>{expectedWinnerName}</strong> should win, but you selected <strong>{selectedWinnerName}</strong> as the winner.
                  </p>
                  <p className="text-red-200 mt-1">
                    This will advance <strong>{selectedWinnerName}</strong> to the next round despite the score.
                  </p>
                </div>
              </div>
            </div>
          )}

          {!hasInconsistency && (
            <div className="bg-green-900/20 border border-green-500/30 p-3 rounded-lg">
              <div className="flex items-start gap-2">
                <Trophy className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                <div className="text-sm">
                  <p className="text-green-400 font-medium">Score Looks Good</p>
                  <p className="text-green-300 mt-1">
                    The scores and selected winner are consistent.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel 
            className="bg-slate-700 text-white border-slate-600 hover:bg-slate-600"
          >
            Go Back & Fix
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className={hasInconsistency 
              ? "bg-red-600 hover:bg-red-700 text-white" 
              : "bg-green-600 hover:bg-green-700 text-white"
            }
          >
            {hasInconsistency ? "Force Submit Anyway" : "Confirm Submit"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default ScoreValidationDialog;