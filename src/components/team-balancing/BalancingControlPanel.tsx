import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Zap, Save, Plus, HelpCircle, Brain, AlertTriangle } from "lucide-react";

interface BalancingControlPanelProps {
  enableAdaptiveWeights: boolean;
  onAdaptiveWeightsChange: (enabled: boolean) => void;
  onAutobalance: () => void;
  onSave: () => void;
  onCreateTeams: () => void;
  autobalancing: boolean;
  saving: boolean;
  creatingTeams: boolean;
  hasPlaceholderTeams: boolean;
  unassignedPlayersCount: number;
  maxTeams: number;
  balance?: {
    balanceStatus: string;
    statusColor: string;
    statusMessage: string;
    delta: number;
  };
  loadingAdaptiveSettings: boolean;
}

const BalancingControlPanel = ({
  enableAdaptiveWeights,
  onAdaptiveWeightsChange,
  onAutobalance,
  onSave,
  onCreateTeams,
  autobalancing,
  saving,
  creatingTeams,
  hasPlaceholderTeams,
  unassignedPlayersCount,
  maxTeams,
  balance,
  loadingAdaptiveSettings
}: BalancingControlPanelProps) => {
  return (
    <Card className="bg-slate-800 border-slate-700">
      <CardHeader className="pb-4">
        <CardTitle className="text-white flex items-center gap-2">
          <Zap className="w-5 h-5 text-yellow-400" />
          Team Balancing Controls
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* ATLAS Toggle */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Checkbox
                id="adaptive-weights-control"
                checked={enableAdaptiveWeights}
                onCheckedChange={onAdaptiveWeightsChange}
                disabled={loadingAdaptiveSettings || autobalancing || saving}
              />
              <label 
                htmlFor="adaptive-weights-control" 
                className="text-sm font-medium text-slate-300 cursor-pointer flex items-center gap-2"
              >
                <Brain className="w-4 h-4" />
                Enable ATLAS (AI-Enhanced Balancing)
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <HelpCircle className="w-3 h-3 text-slate-400 cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-sm">
                      <p>ATLAS analyzes rank decay, tournament history, and skill patterns to create more intelligent team assignments</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </label>
            </div>
            <Badge variant="outline" className={`text-xs ${enableAdaptiveWeights ? 'border-emerald-500 text-emerald-400' : 'border-slate-500 text-slate-400'}`}>
              {enableAdaptiveWeights ? 'ATLAS Active' : 'Standard Mode'}
            </Badge>
          </div>
          
          {enableAdaptiveWeights && (
            <div className="bg-emerald-900/20 border border-emerald-500/30 rounded-lg p-3">
              <div className="flex items-center gap-2 text-emerald-400 text-sm">
                <Brain className="w-4 h-4" />
                <span className="font-medium">ATLAS Mode Enabled</span>
              </div>
              <p className="text-xs text-emerald-300 mt-1">
                Using advanced AI analysis for skill-based weight adjustments and team distribution
              </p>
            </div>
          )}
        </div>

        {/* Balance Status */}
        {balance && (
          <div className="bg-slate-700/50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-yellow-400" />
                <span className="text-white text-sm font-medium">Current Balance</span>
              </div>
              <Badge className={`${balance.statusColor} bg-slate-600 border-slate-500`}>
                {balance.balanceStatus.toUpperCase()}
              </Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-300 text-sm">
                Point difference: {balance.delta} pts
              </span>
              <p className={`text-xs ${balance.statusColor}`}>
                {balance.statusMessage}
              </p>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-3">
          <div className="flex gap-2">
            <Button
              onClick={onAutobalance}
              disabled={autobalancing || hasPlaceholderTeams || unassignedPlayersCount === 0}
              variant="secondary"
              className="bg-yellow-600 hover:bg-yellow-700 text-white flex-1"
            >
              <Zap className="w-4 h-4 mr-2" />
              {autobalancing ? "Balancing..." : `Autobalance (${unassignedPlayersCount})`}
            </Button>
            
            {hasPlaceholderTeams && (
              <Button
                onClick={onCreateTeams}
                disabled={creatingTeams}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Plus className="w-4 h-4 mr-2" />
                {creatingTeams ? 'Creating...' : 'Create Teams'}
              </Button>
            )}
          </div>
          
          <Button
            onClick={onSave}
            disabled={saving || hasPlaceholderTeams}
            className="bg-green-600 hover:bg-green-700 text-white w-full"
          >
            <Save className="w-4 h-4 mr-2" />
            {saving ? 'Saving...' : 'Save Team Changes'}
          </Button>
        </div>

        {/* Placeholder Teams Notice */}
        {hasPlaceholderTeams && (
          <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-3">
            <p className="text-blue-400 text-sm">
              Create {maxTeams} team slots first to begin player assignments
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default BalancingControlPanel;