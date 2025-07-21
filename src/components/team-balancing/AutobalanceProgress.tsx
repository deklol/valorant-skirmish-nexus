
import { useState, useEffect } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Zap, Users, TrendingUp, ArrowRight } from "lucide-react";

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
  phase: 'analyzing' | 'validating' | 'complete';
  onComplete?: () => void;
}

export const AutobalanceProgress = ({ 
  isVisible, 
  totalPlayers, 
  currentStep, 
  lastStep,
  phase,
  onComplete 
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
          title: 'Snake Draft in Progress',
          description: 'Distributing players using enhanced snake draft algorithm...',
          icon: <Zap className="w-5 h-5 text-yellow-400" />
        };
      case 'validating':
        return {
          title: 'Validating Balance',
          description: 'Reviewing team balance and making final adjustments...',
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
            <div className="p-2 bg-yellow-600/20 rounded-full">
              {phaseDisplay.icon}
            </div>
            <div>
              <h3 className="text-white font-semibold">{phaseDisplay.title}</h3>
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
                      [{lastStep.player.source === 'manual_override' ? 'Override' : 'Peak'}]
                    </span>
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
            <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-3">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-blue-400" />
                <span className="text-sm font-medium text-blue-400">Final Validation</span>
              </div>
              <p className="text-xs text-blue-300 mt-1">
                Analyzing team balance quality and making final adjustments if needed...
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
