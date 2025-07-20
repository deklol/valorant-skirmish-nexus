import { useState, useEffect } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Zap, Users } from "lucide-react";

interface ProgressStep {
  step: number;
  player: {
    discord_username: string;
    points: number;
    rank: string;
  };
  assignedTeam: number;
  reasoning: string;
}

interface AutobalanceProgressProps {
  isVisible: boolean;
  totalPlayers: number;
  currentStep: number;
  lastStep?: ProgressStep;
  onComplete?: () => void;
}

export const AutobalanceProgress = ({ 
  isVisible, 
  totalPlayers, 
  currentStep, 
  lastStep,
  onComplete 
}: AutobalanceProgressProps) => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (totalPlayers > 0) {
      const newProgress = Math.round((currentStep / totalPlayers) * 100);
      setProgress(newProgress);
      
      if (currentStep >= totalPlayers && onComplete) {
        setTimeout(() => onComplete(), 500);
      }
    }
  }, [currentStep, totalPlayers, onComplete]);

  if (!isVisible || totalPlayers <= 10) return null;

  return (
    <Card className="bg-slate-800 border-yellow-500/50 border-2">
      <CardContent className="p-6">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-600/20 rounded-full">
              <Zap className="w-5 h-5 text-yellow-400" />
            </div>
            <div>
              <h3 className="text-white font-semibold">Auto-balancing in Progress</h3>
              <p className="text-slate-400 text-sm">Snake draft algorithm is distributing players...</p>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-slate-300">Progress</span>
              <span className="text-yellow-400 font-medium">{currentStep}/{totalPlayers} players assigned</span>
            </div>
            <Progress value={progress} className="h-3" />
            <div className="text-center text-xs text-slate-400">
              {progress}% complete
            </div>
          </div>

          {lastStep && (
            <div className="bg-slate-700/50 rounded-lg p-3 space-y-2">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-400" />
                <span className="text-sm font-medium text-white">Step {lastStep.step}</span>
              </div>
              <div className="text-sm text-slate-300">
                <span className="font-medium text-white">{lastStep.player.discord_username}</span>
                <span className="text-slate-400"> ({lastStep.player.rank}, {lastStep.player.points}pts)</span>
                <span className="text-slate-300"> → </span>
                <span className="text-blue-400 font-medium">Team {lastStep.assignedTeam + 1}</span>
              </div>
              <div className="text-xs text-slate-400 italic">
                {lastStep.reasoning}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};