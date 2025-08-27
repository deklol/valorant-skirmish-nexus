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

  // Get total players for spotlight rotation
  const totalPlayers = teams.reduce((total, team) => total + team.team_members.length, 0);

  // Simple scene progression function
  const nextScene = useCallback(() => {
    console.log('🎬 nextScene called:', {
      currentScene,
      currentTeamIndex,
      teamsLength: teams.length,
      teamsNames: teams.map(t => t.name)
    });

    if (currentScene === 'team-showcase') {
      if (currentTeamIndex < teams.length - 1) {
        // Still more teams to show
        console.log('➡️ Moving to next team:', currentTeamIndex + 1);
        setCurrentTeamIndex(prev => prev + 1);
      } else {
        // All teams shown, move to next scene
        console.log('🎬 All teams shown, moving to next scene');
        const enabledScenes = config.enabledScenes;
        const currentIndex = enabledScenes.indexOf(currentScene);
        const nextSceneIndex = (currentIndex + 1) % enabledScenes.length;
        setCurrentScene(enabledScenes[nextSceneIndex]);
        setCurrentTeamIndex(0); // reset for next cycle
      }
    } else if (currentScene === 'player-spotlight') {
      // Cycle through players
      const nextPlayerIndex = (currentPlayerIndex + 1) % totalPlayers;
      if (nextPlayerIndex === 0) {
        // All players shown, move to next scene
        const enabledScenes = config.enabledScenes;
        const currentIndex = enabledScenes.indexOf(currentScene);
        const nextSceneIndex = (currentIndex + 1) % enabledScenes.length;
        setCurrentScene(enabledScenes[nextSceneIndex]);
        setCurrentPlayerIndex(0);
      } else {
        setCurrentPlayerIndex(nextPlayerIndex);
      }
    } else {
      // For comparison and bracket, just move to next scene
      const enabledScenes = config.enabledScenes;
      const currentIndex = enabledScenes.indexOf(currentScene);
      const nextSceneIndex = (currentIndex + 1) % enabledScenes.length;
      setCurrentScene(enabledScenes[nextSceneIndex]);
    }

    setProgress(0);
  }, [currentScene, currentTeamIndex, currentPlayerIndex, teams.length, totalPlayers, config.enabledScenes]);

  // Auto-progression logic
  useEffect(() => {
    if (!config.autoPlay || !isPlaying || teams.length === 0) {
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

    return () => clearInterval(interval);
  }, [config.autoPlay, config.duration, isPlaying, teams.length, nextScene]);

  const prevScene = useCallback(() => {
    const enabledScenes = config.enabledScenes;
    const currentIndex = enabledScenes.indexOf(currentScene);
    
    if (currentScene === 'team-showcase' && currentTeamIndex > 0) {
      setCurrentTeamIndex(currentTeamIndex - 1);
    } else if (currentScene === 'player-spotlight' && currentPlayerIndex > 0) {
      setCurrentPlayerIndex(currentPlayerIndex - 1);
    } else {
      const prevSceneIndex = currentIndex === 0 ? enabledScenes.length - 1 : currentIndex - 1;
      setCurrentScene(enabledScenes[prevSceneIndex]);
    }
    
    setProgress(0);
  }, [currentScene, currentTeamIndex, currentPlayerIndex, config.enabledScenes]);

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

  const pauseAutoPlay = useCallback(() => {
    setIsPlaying(false);
    setProgress(0);
  }, []);

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
    prevScene,
    setScene,
    togglePlayPause,
    pauseAutoPlay,
    updateConfig,
    setTeamIndex,
    setPlayerIndex,
  };
}