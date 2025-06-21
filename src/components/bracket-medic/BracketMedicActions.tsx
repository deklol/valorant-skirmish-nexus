
import React from "react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { ArrowRightLeft, Redo2, Hammer, AlertCircle } from "lucide-react";

interface BracketMedicActionsProps {
  loading: boolean;
  selectedMatchId: string | null;
  onFixProgression: () => void;
  onDiagnoseProgression: () => void;
  onResetMatch: () => void;
  onSwapTeams: () => void;
  onRebuildBracket: () => void;
}

export default function BracketMedicActions({
  loading,
  selectedMatchId,
  onFixProgression,
  onDiagnoseProgression,
  onResetMatch,
  onSwapTeams,
  onRebuildBracket,
}: BracketMedicActionsProps) {
  
  return (
    <div className="flex flex-wrap gap-4 my-6">
      {/* Progression Diagnosis */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="border-purple-600/40 text-purple-300"
            disabled={loading}
            onClick={onDiagnoseProgression}
          >
            <AlertCircle className="w-4 h-4 mr-1" />
            Diagnose Progression
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          Analyze bracket progression and detect issues
        </TooltipContent>
      </Tooltip>

      {/* Fix progression */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="border-cyan-600/40 text-cyan-300"
            disabled={loading}
            onClick={onFixProgression}
          >
            <ArrowRightLeft className="w-4 h-4 mr-1" />
            Fix Progression
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          Automatically fix bracket progression issues using dynamic tournament logic
        </TooltipContent>
      </Tooltip>

      {/* Reset match */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="border-amber-600/40 text-amber-400"
            disabled={loading || !selectedMatchId}
            onClick={onResetMatch}
          >
            <Redo2 className="w-4 h-4 mr-1" />
            Reset Match
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          Clear teams & winner from selected match (not allowed on completed)
        </TooltipContent>
      </Tooltip>

      {/* Team Swap */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="border-blue-600/40 text-blue-400"
            disabled={loading || !selectedMatchId}
            onClick={onSwapTeams}
          >
            <ArrowRightLeft className="w-4 h-4 mr-1" />
            Swap Teams
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          Swap teams in selected match (only pending/live match)
        </TooltipContent>
      </Tooltip>

      {/* Rebuild Bracket */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="border-red-600/40 text-red-400"
            disabled={loading}
            onClick={onRebuildBracket}
          >
            <Hammer className="w-4 h-4 mr-1" />
            Rebuild Bracket
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          Regenerate bracket from remaining teams (resets all pending/live matches)
        </TooltipContent>
      </Tooltip>
    </div>
  );
}
