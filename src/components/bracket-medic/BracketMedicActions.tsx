import React from "react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { 
  ArrowRightLeft, 
  Redo2, 
  Hammer, 
  AlertCircle, 
  FastForward, 
  Rewind, 
  Crown, 
  ShieldCheck, 
  RotateCcw,
  Zap,
  Target
} from "lucide-react";

interface BracketMedicActionsProps {
  loading: boolean;
  selectedMatchId: string | null;
  selectedTournamentId: string | null;
  onFixProgression: () => void;
  onDiagnoseProgression: () => void;
  onResetMatch: () => void;
  onSwapTeams: () => void;
  onRebuildBracket: () => void;
  onForceAdvanceTeam: () => void;
  onReverseProgression: () => void;
  onSetManualWinner: () => void;
  onValidateAndRepair: () => void;
  onEmergencyRollback: () => void;
}

export default function BracketMedicActions({
  loading,
  selectedMatchId,
  selectedTournamentId,
  onFixProgression,
  onDiagnoseProgression,
  onResetMatch,
  onSwapTeams,
  onRebuildBracket,
  onForceAdvanceTeam,
  onReverseProgression,
  onSetManualWinner,
  onValidateAndRepair,
  onEmergencyRollback,
}: BracketMedicActionsProps) {
  
  return (
    <div className="space-y-6">
      {/* Basic Bracket Controls */}
      <div>
        <h3 className="text-lg font-semibold text-white mb-3">Basic Controls</h3>
        <div className="flex flex-wrap gap-4">
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
      </div>

      {/* Advanced Team Progression Controls */}
      <div>
        <h3 className="text-lg font-semibold text-white mb-3">Team Progression Controls</h3>
        <div className="flex flex-wrap gap-4">
          {/* Force Advance Team */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="border-green-600/40 text-green-300"
                disabled={loading}
                onClick={onForceAdvanceTeam}
              >
                <FastForward className="w-4 h-4 mr-1" />
                Force Advance Team
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              Manually advance a specific team to a target round
            </TooltipContent>
          </Tooltip>

          {/* Reverse Team Progression */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="border-orange-600/40 text-orange-300"
                disabled={loading}
                onClick={onReverseProgression}
              >
                <Rewind className="w-4 h-4 mr-1" />
                Reverse Progression
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              Undo team advancement and roll back to previous round
            </TooltipContent>
          </Tooltip>

          {/* Set Manual Winner */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="border-yellow-600/40 text-yellow-300"
                disabled={loading || !selectedMatchId}
                onClick={onSetManualWinner}
              >
                <Crown className="w-4 h-4 mr-1" />
                Set Manual Winner
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              Manually assign winner to selected match with stat updates
            </TooltipContent>
          </Tooltip>
        </div>
      </div>

      {/* Advanced State Repair */}
      <div>
        <h3 className="text-lg font-semibold text-white mb-3">State Repair & Recovery</h3>
        <div className="flex flex-wrap gap-4">
          {/* Validate and Repair */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="border-emerald-600/40 text-emerald-300"
                disabled={loading || !selectedTournamentId}
                onClick={onValidateAndRepair}
              >
                <ShieldCheck className="w-4 h-4 mr-1" />
                Validate & Repair
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              Deep bracket validation with automatic repair of inconsistencies
            </TooltipContent>
          </Tooltip>

          {/* Emergency Rollback */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="border-rose-600/40 text-rose-300"
                disabled={loading || !selectedTournamentId}
                onClick={onEmergencyRollback}
              >
                <RotateCcw className="w-4 h-4 mr-1" />
                Emergency Rollback
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              Roll back tournament to a specific round (destructive operation)
            </TooltipContent>
          </Tooltip>
        </div>
      </div>
    </div>
  );
}