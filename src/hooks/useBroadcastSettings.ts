import { useState, useEffect } from 'react';

export interface BroadcastDisplaySettings {
  showAdaptiveWeight: boolean;
  showCurrentRank: boolean;
  showPeakRank: boolean;
  showTournamentWins: boolean;
  showRiotId: boolean;
}

export interface BroadcastSceneSettings extends BroadcastDisplaySettings {
  // Team stats display options
  showTeamTotalWeight?: boolean;
  showTeamSeed?: boolean;
  
  // Visual customization
  backgroundImage?: string;
  backgroundColor?: string;
  textColor?: string;
  headerTextColor?: string;
  
  // Layout & Design
  borderRadius?: number;
  borderWidth?: number;
  borderColor?: string;
  shadowIntensity?: number;
  
  // Typography
  fontFamily?: string;
  fontSize?: number;
  headerFontSize?: number;
  fontWeight?: string;
  
  // Layout
  padding?: number;
  spacing?: number;
}

export interface BroadcastSettings {
  // Global settings - applied to all scenes unless overridden
  backgroundImage?: string;
  backgroundColor: string;
  headerTextColor: string;
  textColor: string;
  fontFamily?: string;
  
  // Animation settings
  animationEnabled: boolean;
  loadingTime: number; // ms
  transitionTime: number; // ms
  transitionType: 'fade' | 'slide' | 'scale' | 'none';
  
  // Per-scene settings (can override global settings)
  sceneSettings: {
    teamRoster: BroadcastSceneSettings;
    matchupPreview: BroadcastSceneSettings;
    playerSpotlight: BroadcastSceneSettings;
    tournamentStats: BroadcastSceneSettings;
    bracketOverlay: BroadcastSceneSettings;
    teamsOverview: BroadcastSceneSettings;
  };
}

const DEFAULT_SCENE_SETTINGS: BroadcastSceneSettings = {
  // Display options
  showAdaptiveWeight: true,
  showCurrentRank: true,
  showPeakRank: false,
  showTournamentWins: false,
  showRiotId: true,
  
  // Team stats display options
  showTeamTotalWeight: true,
  showTeamSeed: true,
  
  // Layout & Design
  borderRadius: 12,
  borderWidth: 1,
  borderColor: '#ffffff20',
  shadowIntensity: 3,
  
  // Typography
  fontSize: 16,
  headerFontSize: 24,
  fontWeight: 'normal',
  
  // Layout
  padding: 16,
  spacing: 8,
};

const DEFAULT_SETTINGS: BroadcastSettings = {
  // Global settings
  backgroundColor: 'transparent',
  headerTextColor: '#ffffff',
  textColor: '#ffffff',
  fontFamily: 'inherit',
  
  // Animation settings
  animationEnabled: true,
  loadingTime: 2000,
  transitionTime: 500,
  transitionType: 'fade',
  
  sceneSettings: {
    teamRoster: {
      ...DEFAULT_SCENE_SETTINGS,
      showPeakRank: false,
      showTournamentWins: false,
    },
    matchupPreview: {
      ...DEFAULT_SCENE_SETTINGS,
      showRiotId: false,
      showPeakRank: false,
    },
    playerSpotlight: {
      ...DEFAULT_SCENE_SETTINGS,
      showPeakRank: true,
      showTournamentWins: true,
    },
    tournamentStats: {
      ...DEFAULT_SCENE_SETTINGS,
      showAdaptiveWeight: true,
      showCurrentRank: true,
      showPeakRank: false,
      showTournamentWins: false,
      showRiotId: false,
    },
    bracketOverlay: {
      ...DEFAULT_SCENE_SETTINGS,
      showAdaptiveWeight: false,
      showCurrentRank: false,
      showPeakRank: false,
      showTournamentWins: false,
      showRiotId: false,
    },
    teamsOverview: {
      ...DEFAULT_SCENE_SETTINGS,
      showPeakRank: false,
      showTournamentWins: true,
      showRiotId: false,
    },
  }
};

export function useBroadcastSettings() {
  const [settings, setSettings] = useState<BroadcastSettings>(DEFAULT_SETTINGS);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Load settings from localStorage on mount
  useEffect(() => {
    const savedSettings = localStorage.getItem('broadcast-settings');
    const savedAuth = localStorage.getItem('broadcast-auth');
    
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        setSettings({ ...DEFAULT_SETTINGS, ...parsed });
      } catch (error) {
        console.error('Failed to parse saved settings:', error);
      }
    }
    
    if (savedAuth === 'authenticated') {
      setIsAuthenticated(true);
    }
  }, []);

  // Save settings to localStorage when they change
  useEffect(() => {
    localStorage.setItem('broadcast-settings', JSON.stringify(settings));
  }, [settings]);

  const updateSettings = (newSettings: Partial<BroadcastSettings>) => {
    setSettings(prev => ({
      ...prev,
      ...newSettings,
    }));
  };

  const updateSceneSettings = (scene: keyof BroadcastSettings['sceneSettings'], newSettings: Partial<BroadcastSceneSettings>) => {
    setSettings(prev => ({
      ...prev,
      sceneSettings: {
        ...prev.sceneSettings,
        [scene]: {
          ...prev.sceneSettings[scene],
          ...newSettings,
        }
      }
    }));
  };

  const authenticate = (password: string): boolean => {
    if (password === 'tlrskirmish$20@') {
      setIsAuthenticated(true);
      localStorage.setItem('broadcast-auth', 'authenticated');
      return true;
    }
    return false;
  };

  const logout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem('broadcast-auth');
  };

  const resetSettings = () => {
    setSettings(DEFAULT_SETTINGS);
    localStorage.removeItem('broadcast-settings');
  };

  return {
    settings,
    updateSettings,
    updateSceneSettings,
    isAuthenticated,
    authenticate,
    logout,
    resetSettings,
  };
}