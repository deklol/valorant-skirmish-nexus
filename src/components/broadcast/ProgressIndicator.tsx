import type { SceneType, BroadcastConfig } from "@/hooks/useBroadcastScene";

interface ProgressIndicatorProps {
  currentScene: SceneType;
  progress: number;
  isPlaying: boolean;
  config: BroadcastConfig;
}

export default function ProgressIndicator({
  currentScene,
  progress,
  isPlaying,
  config
}: ProgressIndicatorProps) {
  const sceneNames = {
    'team-showcase': 'Team Showcase',
    'team-comparison': 'Team Comparison',
    'player-spotlight': 'Player Spotlight',
    'bracket': 'Bracket View'
  };

  if (!config.autoPlay) return null;

  return (
    <div className="absolute top-4 left-4 bg-black/80 backdrop-blur rounded-lg border border-white/20 p-4 min-w-[200px]">
      {/* Current Scene */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-white font-medium text-sm">
          {sceneNames[currentScene]}
        </span>
        <div className="flex items-center space-x-2">
          {isPlaying && (
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          )}
          <span className="text-xs text-slate-300">
            {isPlaying ? 'LIVE' : 'PAUSED'}
          </span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-slate-700 rounded-full h-2 mb-2">
        <div 
          className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all duration-100"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Timer */}
      <div className="flex justify-between text-xs text-slate-400">
        <span>{Math.round((progress / 100) * config.duration)}s</span>
        <span>{config.duration}s</span>
      </div>

      {/* Scene Queue */}
      <div className="mt-3 pt-3 border-t border-white/10">
        <p className="text-xs text-slate-300 mb-2">Active Scenes</p>
        <div className="flex space-x-1">
          {config.enabledScenes.map((scene, index) => (
            <div
              key={scene}
              className={`w-2 h-2 rounded-full transition-all duration-300 ${
                scene === currentScene 
                  ? 'bg-white scale-125' 
                  : 'bg-white/30'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}