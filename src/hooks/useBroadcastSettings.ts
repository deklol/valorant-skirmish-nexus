import { useState, useEffect } from 'react';

export interface BroadcastDisplaySettings {
  showAdaptiveWeight: boolean;
  showCurrentRank: boolean;
  showPeakRank: boolean;
  showTournamentWins: boolean;
  showRiotId: boolean;
}

export interface BroadcastSettings {
  // Timing settings
  loadingTime: number; // ms
  transitionTime: number; // ms
  transitionType: 'fade' | 'slide' | 'scale' | 'none';
  
  // Colors
  headerTextColor: string;
  textColor: string;
  backgroundColor: string;
  
  // Global display settings
  displaySettings: BroadcastDisplaySettings;
  
  // Per-scene settings
  sceneSettings: {
    teamRoster: BroadcastDisplaySettings;
    matchupPreview: BroadcastDisplaySettings;
    playerSpotlight: BroadcastDisplaySettings;
  };
}

const DEFAULT_SETTINGS: BroadcastSettings = {
  loadingTime: 2000,
  transitionTime: 500,
  transitionType: 'fade',
  headerTextColor: '#ffffff',
  textColor: '#ffffff',
  backgroundColor: 'transparent',
  displaySettings: {
    showAdaptiveWeight: true,
    showCurrentRank: true,
    showPeakRank: false,
    showTournamentWins: false,
    showRiotId: true,
  },
  sceneSettings: {
    teamRoster: {
      showAdaptiveWeight: true,
      showCurrentRank: true,
      showPeakRank: false,
      showTournamentWins: false,
      showRiotId: true,
    },
    matchupPreview: {
      showAdaptiveWeight: true,
      showCurrentRank: true,
      showPeakRank: false,
      showTournamentWins: false,
      showRiotId: false,
    },
    playerSpotlight: {
      showAdaptiveWeight: true,
      showCurrentRank: true,
      showPeakRank: true,
      showTournamentWins: true,
      showRiotId: true,
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

  const updateSceneSettings = (scene: keyof BroadcastSettings['sceneSettings'], newSettings: Partial<BroadcastDisplaySettings>) => {
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