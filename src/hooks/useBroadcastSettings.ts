import { useState, useEffect } from 'react';

export interface BroadcastDisplaySettings {
  showAdaptiveWeight: boolean;
  showCurrentRank: boolean;
  showPeakRank: boolean;
  showTournamentWins: boolean;
  showRiotId: boolean;
}

export interface BroadcastSceneSettings extends BroadcastDisplaySettings {
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
  
  // Animations
  animationEnabled?: boolean;
  animationDuration?: number;
  
  // Layout
  padding?: number;
  spacing?: number;
}

export interface BroadcastSettings {
  // Timing settings
  loadingTime: number; // ms
  transitionTime: number; // ms
  transitionType: 'fade' | 'slide' | 'scale' | 'none';
  
  // Global fallback colors (used when scene doesn't override)
  headerTextColor: string;
  textColor: string;
  backgroundColor: string;
  
  // Per-scene settings
  sceneSettings: {
    teamRoster: BroadcastSceneSettings;
    matchupPreview: BroadcastSceneSettings;
    playerSpotlight: BroadcastSceneSettings;
  };
}

const DEFAULT_SCENE_SETTINGS: BroadcastSceneSettings = {
  // Display options
  showAdaptiveWeight: true,
  showCurrentRank: true,
  showPeakRank: false,
  showTournamentWins: false,
  showRiotId: true,
  
  // Visual customization
  backgroundImage: undefined,
  backgroundColor: 'transparent',
  textColor: '#ffffff',
  headerTextColor: '#ffffff',
  
  // Layout & Design
  borderRadius: 12,
  borderWidth: 1,
  borderColor: '#ffffff20',
  shadowIntensity: 3,
  
  // Typography
  fontFamily: 'inherit',
  fontSize: 16,
  headerFontSize: 24,
  fontWeight: 'normal',
  
  // Animations
  animationEnabled: true,
  animationDuration: 500,
  
  // Layout
  padding: 16,
  spacing: 8,
};

const DEFAULT_SETTINGS: BroadcastSettings = {
  loadingTime: 2000,
  transitionTime: 500,
  transitionType: 'fade',
  headerTextColor: '#ffffff',
  textColor: '#ffffff',
  backgroundColor: 'transparent',
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