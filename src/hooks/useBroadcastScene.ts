import { useState, useEffect, useCallback } from "react";
import type { Team } from "@/types/tournamentDetail";

export type SceneType = 'team-showcase' | 'team-comparison' | 'player-spotlight' | 'bracket';
export type TransitionType = 'fade' | 'slide' | 'cascade';

export interface BroadcastConfig {
  duration: number; // seconds
  transition: TransitionType;
  backgroundColor: string;
  enabledScenes: SceneType[];
  autoPlay: boolean;
}

const DEFAULT_CONFIG: BroadcastConfig = {
  duration: 8,
  transition: 'fade',
  backgroundColor: '#0f172a', // slate-900
  enabledScenes: ['team-showcase', 'team-comparison', 'player-spotlight', 'bracket'],
  autoPlay: true,
};

export function useBroadcastScene(teams: Team[]) {
  const [currentScene, setCurrentScene] = useState<SceneType>('team-showcase');
  const [currentTeamIndex, setCurrentTeamIndex] = useState(0);
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0);
  const [config, setConfig] = useState<BroadcastConfig>(DEFAULT_CONFIG);
  const [isPlaying, setIsPlaying] = useState(true);
  const [progress, setProgress] = useState(0);
  const [intervalId, setIntervalId] = useState<NodeJS.Timeout | null>(null);

  // Get total players for spotlight rotation
  const totalPlayers = teams.reduce((total, team) => total + team.team_members.length, 0);

  // Auto-progression logic
  useEffect(() => {
    if (!config.autoPlay || !isPlaying || teams.length === 0) {
      if (intervalId) {
        clearInterval(intervalId);
        setIntervalId(null);
      }
      return;
    }

    const interval = setInterval(() => {
      setProgress(prev => {
        const newProgress = prev + (100 / (config.duration * 10));
        if (newProgress >= 100) {
          nextScene();
          return 0;
        }
        return newProgress;
      });
    }, 100);

    setIntervalId(interval);

    return () => {
      clearInterval(interval);
    };
  }, [config.autoPlay, config.duration, isPlaying, teams.length]);

  const nextScene = useCallback(() => {
    const enabledScenes = config.enabledScenes;
    const currentIndex = enabledScenes.indexOf(currentScene);
  
    if (currentScene === 'team-showcase') {
      // Cycle through teams in showcase
      if (currentTeamIndex < teams.length - 1) {
        // Still more teams to show
        setCurrentTeamIndex(currentTeamIndex + 1);
      } else {
        // Finished last team → move to next scene
        const nextSceneIndex = (currentIndex + 1) % enabledScenes.length;
        setCurrentScene(enabledScenes[nextSceneIndex]);
        setCurrentTeamIndex(0);
      }
    } else if (currentScene === 'player-spotlight') {
      // Cycle through players
      if (currentPlayerIndex < totalPlayers - 1) {
        // Still more players to show
        setCurrentPlayerIndex(currentPlayerIndex + 1);
      } else {
        // Finished last player → move to next scene
        const nextSceneIndex = (currentIndex + 1) % enabledScenes.length;
        setCurrentScene(enabledScenes[nextSceneIndex]);
        setCurrentPlayerIndex(0);
      }
    } else {
      // For comparison and bracket, just move to next scene
      const nextSceneIndex = (currentIndex + 1) % enabledScenes.length;
      setCurrentScene(enabledScenes[nextSceneIndex]);
    }
  
    setProgress(0);
  }, [currentScene, currentTeamIndex, currentPlayerIndex, teams.length, totalPlayers, config.enabledScenes]);

  const setScene = useCallback((scene: SceneType) => {
    setCurrentScene(scene);
    setProgress(0);
  }, []);

  const togglePlayPause = useCallback(() => {
    setIsPlaying(prev => !prev);
    if (!isPlaying) {
      setProgress(0);
    }
  }, [isPlaying]);

  const updateConfig = useCallback((newConfig: Partial<BroadcastConfig>) => {
    setConfig(prev => ({ ...prev, ...newConfig }));
    setProgress(0);
  }, []);

  const setTeamIndex = useCallback((index: number) => {
    setCurrentTeamIndex(Math.max(0, Math.min(index, teams.length - 1)));
    setProgress(0);
  }, [teams.length]);

  const setPlayerIndex = useCallback((index: number) => {
    setCurrentPlayerIndex(Math.max(0, Math.min(index, totalPlayers - 1)));
    setProgress(0);
  }, [totalPlayers]);

  return {
    currentScene,
    currentTeamIndex,
    currentPlayerIndex,
    config,
    isPlaying,
    progress,
    nextScene,
    setScene,
    togglePlayPause,
    updateConfig,
    setTeamIndex,
    setPlayerIndex,
  };
}