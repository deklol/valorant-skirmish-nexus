import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { 
  Play, 
  Pause, 
  SkipForward, 
  SkipBack,
  Users,
  Trophy,
  Star,
  Grid3X3
} from "lucide-react";
import type { SceneType, BroadcastConfig } from "@/hooks/useBroadcastScene";
import type { Team } from "@/types/tournamentDetail";

interface SceneControlsProps {
  currentScene: SceneType;
  isPlaying: boolean;
  onNext: () => void;
  onPrev: () => void;
  onSetScene: (scene: SceneType) => void;
  onTogglePlay: () => void;
  onTeamChange: (index: number) => void;
  onPlayerChange: (index: number) => void;
  currentTeamIndex: number;
  currentPlayerIndex: number;
  teams: Team[];
  config: BroadcastConfig;
}

export default function SceneControls({
  currentScene,
  isPlaying,
  onNext,
  onPrev,
  onSetScene,
  onTogglePlay,
  onTeamChange,
  onPlayerChange,
  currentTeamIndex,
  currentPlayerIndex,
  teams,
  config
}: SceneControlsProps) {
  const sceneIcons = {
    'team-showcase': Users,
    'team-comparison': Trophy,
    'player-spotlight': Star,
    'bracket': Grid3X3
  };

  const sceneNames = {
    'team-showcase': 'Team Showcase',
    'team-comparison': 'Team Comparison',
    'player-spotlight': 'Player Spotlight',
    'bracket': 'Bracket View'
  };

  return (
    <Card className="absolute bottom-4 left-4 bg-black/80 backdrop-blur border-white/20 p-4">
      <div className="flex flex-col space-y-4">
        {/* Main Controls */}
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={onPrev}
            className="text-white hover:bg-white/20"
          >
            <SkipBack className="w-4 h-4" />
          </Button>
          
          <Button
            variant="ghost"
            size="icon"
            onClick={onTogglePlay}
            className="text-white hover:bg-white/20"
          >
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </Button>
          
          <Button
            variant="ghost"
            size="icon"
            onClick={onNext}
            className="text-white hover:bg-white/20"
          >
            <SkipForward className="w-4 h-4" />
          </Button>
        </div>

        {/* Scene Selection */}
        <div className="flex flex-col space-y-2">
          <p className="text-xs text-slate-300 font-medium">Scenes</p>
          <div className="grid grid-cols-2 gap-1">
            {config.enabledScenes.map((scene) => {
              const Icon = sceneIcons[scene];
              return (
                <Button
                  key={scene}
                  variant={currentScene === scene ? "default" : "ghost"}
                  size="sm"
                  onClick={() => onSetScene(scene)}
                  className={`text-xs ${
                    currentScene === scene 
                      ? "bg-white/20 text-white" 
                      : "text-slate-300 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  <Icon className="w-3 h-3 mr-1" />
                  {sceneNames[scene]}
                </Button>
              );
            })}
          </div>
        </div>

        {/* Scene-specific Controls */}
        {currentScene === 'team-showcase' && teams.length > 0 && (
          <div className="flex flex-col space-y-2">
            <p className="text-xs text-slate-300 font-medium">Team Control</p>
            <div className="flex space-x-1">
              {teams.map((team, index) => (
                <Button
                  key={team.id}
                  variant={currentTeamIndex === index ? "default" : "ghost"}
                  size="sm"
                  onClick={() => onTeamChange(index)}
                  className={`text-xs px-2 ${
                    currentTeamIndex === index 
                      ? "bg-white/20 text-white" 
                      : "text-slate-300 hover:bg-white/10"
                  }`}
                >
                  {index + 1}
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Current Scene Info */}
        <div className="text-xs text-slate-400">
          <p>Current: {sceneNames[currentScene]}</p>
          {currentScene === 'team-showcase' && (
            <p>Team {currentTeamIndex + 1}/{teams.length}</p>
          )}
        </div>
      </div>
    </Card>
  );
}