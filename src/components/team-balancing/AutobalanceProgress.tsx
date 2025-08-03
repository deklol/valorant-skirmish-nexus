
import { useState, useEffect } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Zap, Users, TrendingUp, ArrowRight, Brain, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface ProgressStep {
  step: number;
  player: {
    discord_username: string;
    points: number;
    rank: string;
    source: string;
  };
  assignedTeam: number;
  reasoning: string;
  teamStatesAfter: {
    teamIndex: number;
    totalPoints: number;
    playerCount: number;
  }[];
  round?: number;
  direction?: 'ascending' | 'descending';
}

interface AutobalanceProgressProps {
  isVisible: boolean;
  totalPlayers: number;
  currentStep: number;
  lastStep?: ProgressStep;
  phase: 'analyzing' | 'validating' | 'complete' | 'atlas_analyzing';
  onComplete?: () => void;
  atlasEnabled?: boolean;
}

export const AutobalanceProgress = ({ 
  isVisible, 
  totalPlayers, 
  currentStep, 
  lastStep,
  phase,
  onComplete,
  atlasEnabled = false
}: AutobalanceProgressProps) => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (totalPlayers > 0) {
      const newProgress = Math.round((currentStep / totalPlayers) * 100);
      setProgress(newProgress);
      
      if (currentStep >= totalPlayers && phase === 'complete' && onComplete) {
        setTimeout(() => onComplete(), 500);
      }
    }
  }, [currentStep, totalPlayers, phase, onComplete]);

  if (!isVisible || totalPlayers < 5) return null;

  const getPhaseDisplay = () => {
    switch (phase) {
      case 'analyzing':
        return {
          title: atlasEnabled ? 'ATLAS-Enhanced Snake Draft' : 'Snake Draft in Progress',
          description: atlasEnabled 
            ? 'ATLAS is intelligently distributing players with adaptive weights...' 
            : 'Distributing players using enhanced snake draft algorithm...',
          icon: atlasEnabled 
            ? <Brain className="w-5 h-5 text-purple-400" />
            : <Zap className="w-5 h-5 text-yellow-400" />
        };
      case 'atlas_analyzing':
        return {
          title: 'ATLAS Decision Processing',
          description: 'AI system is analyzing optimal team placements...',
          icon: <Sparkles className="w-5 h-5 text-purple-400 animate-pulse" />
        };
      case 'validating':
        return {
          title: atlasEnabled ? 'ATLAS Team Validation' : 'Validating Balance',
          description: atlasEnabled
            ? 'ATLAS is performing final balance validation and adjustments...'
            : 'Reviewing team balance and making final adjustments...',
          icon: <TrendingUp className="w-5 h-5 text-blue-400" />
        };
      case 'complete':
        return {
          title: 'Balance Complete',
          description: 'Team balancing completed successfully!',
          icon: <Users className="w-5 h-5 text-green-400" />
        };
    }
  };

  const phaseDisplay = getPhaseDisplay();

  return (
    <Card className="bg-slate-800 border-yellow-500/50 border-2">
      <CardContent className="p-6">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-full ${
              atlasEnabled ? 'bg-purple-600/20' : 'bg-yellow-600/20'
            }`}>
              {phaseDisplay.icon}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h3 className="text-white font-semibold">{phaseDisplay.title}</h3>
                {atlasEnabled && (
                  <Badge 
                    variant="outline" 
                    className="border-purple-500 text-purple-400 bg-purple-500/10 text-xs"
                  >
                    <Brain className="w-3 h-3 mr-1" />
                    ATLAS
                  </Badge>
                )}
              </div>
              <p className="text-slate-400 text-sm">{phaseDisplay.description}</p>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-slate-300">Progress</span>
              <span className="text-yellow-400 font-medium">
                {phase === 'analyzing' ? `${currentStep}/${totalPlayers} players assigned` : 
                 phase === 'validating' ? 'Validating balance...' : 
                 'Complete!'}
              </span>
            </div>
            <Progress value={progress} className="h-3" />
            <div className="text-center text-xs text-slate-400">
              {progress}% complete
            </div>
          </div>

          {lastStep && phase === 'analyzing' && (
            <div className="bg-slate-700/50 rounded-lg p-3 space-y-2">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-400" />
                <span className="text-sm font-medium text-white">
                  Step {lastStep.step}
                  {lastStep.round && ` • Round ${lastStep.round}`}
                  {lastStep.direction && (
                    <span className="text-slate-400 ml-1">
                      ({lastStep.direction === 'ascending' ? '↑' : '↓'})
                    </span>
                  )}
                </span>
              </div>
              <div className="text-sm text-slate-300">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-white">{lastStep.player.discord_username}</span>
                  <span className="text-slate-400">
                    ({lastStep.player.rank}, {lastStep.player.points}pts)
                  </span>
                  {lastStep.player.source !== 'current_rank' && (
                    <span className="text-amber-400 text-xs">
                      [{lastStep.player.source === 'manual_override' ? 'Override' : 
                        lastStep.player.source === 'adaptive_weight' ? 'ATLAS' : 'Peak'}]
                    </span>
                  )}
                  {atlasEnabled && lastStep.player.source === 'adaptive_weight' && (
                    <Badge className="bg-purple-600 text-white text-xs">
                      <Brain className="w-2 h-2 mr-1" />
                      AI
                    </Badge>
                  )}
                  <ArrowRight className="w-3 h-3 text-slate-400" />
                  <span className="text-blue-400 font-medium">Team {lastStep.assignedTeam + 1}</span>
                </div>
              </div>
              <div className="text-xs text-slate-400 italic">
                {lastStep.reasoning}
              </div>
              {lastStep.teamStatesAfter && (
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {lastStep.teamStatesAfter.slice(0, 4).map((team, idx) => (
                    <div key={idx} className="text-xs bg-slate-800/50 rounded p-1">
                      <span className="text-slate-300">Team {team.teamIndex + 1}: </span>
                      <span className="text-white">{team.totalPoints}pts</span>
                      <span className="text-slate-400"> ({team.playerCount}p)</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {phase === 'validating' && (
            <div className={`rounded-lg p-3 border ${
              atlasEnabled 
                ? 'bg-purple-900/20 border-purple-500/30'
                : 'bg-blue-900/20 border-blue-500/30'
            }`}>
              <div className="flex items-center gap-2">
                {atlasEnabled ? (
                  <Brain className="w-4 h-4 text-purple-400" />
                ) : (
                  <TrendingUp className="w-4 h-4 text-blue-400" />
                )}
                <span className={`text-sm font-medium ${
                  atlasEnabled ? 'text-purple-400' : 'text-blue-400'
                }`}>
                  {atlasEnabled ? 'ATLAS Final Validation' : 'Final Validation'}
                </span>
                {atlasEnabled && (
                  <Badge className="bg-purple-600/20 text-purple-300 text-xs border-purple-500/30">
                    AI Enhanced
                  </Badge>
                )}
              </div>
              <p className={`text-xs mt-1 ${
                atlasEnabled ? 'text-purple-300' : 'text-blue-300'
              }`}>
                {atlasEnabled 
                  ? 'ATLAS is analyzing team balance quality and making AI-guided adjustments...'
                  : 'Analyzing team balance quality and making final adjustments if needed...'
                }
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
