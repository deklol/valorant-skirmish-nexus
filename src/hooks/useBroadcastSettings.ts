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
  transparentBackground?: boolean;
  broadcastFriendlyMode?: boolean;
  
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

  // Scene-specific settings
  // Team Roster specific
  showCaptainBadges?: boolean;
  showRankEmojis?: boolean;
  playerCardLayout?: 'compact' | 'detailed';
  
  // Matchup Preview specific
  showVsHeader?: boolean;
  showWeightDifference?: boolean;
  showBalanceAssessment?: boolean;
  matchupLayout?: 'side-by-side' | 'stacked';
  
  // Teams Overview specific
  showActiveEliminated?: boolean;
  showTeamStatusBadges?: boolean;
  showTournamentStatus?: boolean;
  showMemberCount?: boolean;
  gridColumns?: 1 | 2 | 3;
  teamAccentColor?: string;
  playerAccentColor?: string;
  weightBlockColor?: string;
  
  // OBS/vMix Color Settings
  obsHeaderColor?: string;
  obsBackgroundColor?: string;
  obsTextColor?: string;
  obsAccentColor?: string;
  
  // Player Spotlight specific
  showPerformanceRating?: boolean;
  showLargeAvatar?: boolean;
  statsLayout?: 'grid' | 'stacked';
  showTournamentHistory?: boolean;
  
  // Tournament Stats specific
  showIndividualStatCards?: boolean;
  showProgressBar?: boolean;
  showTournamentStatusHeader?: boolean;
  statIconStyle?: 'filled' | 'outline';
  statCardLayout?: 'grid' | 'row';
  
  // Bracket Overlay specific
  showMatchCards?: boolean;
  showRoundIndicators?: boolean;
  showWinnerHighlight?: boolean;
  bracketStructure?: 'single' | 'double';
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
  
  // Visual customization
  transparentBackground: false,
  broadcastFriendlyMode: false,
  
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

  // Scene-specific defaults
  // Team Roster
  showCaptainBadges: true,
  showRankEmojis: true,
  playerCardLayout: 'detailed',
  
  // Matchup Preview
  showVsHeader: true,
  showWeightDifference: true,
  showBalanceAssessment: true,
  matchupLayout: 'side-by-side',
  
  // Teams Overview
  showActiveEliminated: true,
  showTeamStatusBadges: true,
  showTournamentStatus: true,
  showMemberCount: true,
  gridColumns: 2,
  
  // Player Spotlight
  showPerformanceRating: true,
  showLargeAvatar: true,
  statsLayout: 'grid',
  showTournamentHistory: true,
  
  // Tournament Stats
  showIndividualStatCards: true,
  showProgressBar: true,
  showTournamentStatusHeader: true,
  statIconStyle: 'filled',
  statCardLayout: 'grid',
  
  // Bracket Overlay
  showMatchCards: true,
  showRoundIndicators: true,
  showWinnerHighlight: true,
  bracketStructure: 'single',
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
      // Team Roster specific settings
      showCaptainBadges: true,
      showRankEmojis: true,
      playerCardLayout: 'detailed',
    },
    matchupPreview: {
      ...DEFAULT_SCENE_SETTINGS,
      showRiotId: false,
      showPeakRank: false,
      // Matchup Preview specific settings
      showVsHeader: true,
      showWeightDifference: true,
      showBalanceAssessment: true,
      matchupLayout: 'side-by-side',
    },
    playerSpotlight: {
      ...DEFAULT_SCENE_SETTINGS,
      showPeakRank: true,
      showTournamentWins: true,
      // Player Spotlight specific settings
      showPerformanceRating: true,
      showLargeAvatar: true,
      statsLayout: 'grid',
      showTournamentHistory: true,
    },
    tournamentStats: {
      ...DEFAULT_SCENE_SETTINGS,
      showAdaptiveWeight: true,
      showCurrentRank: true,
      showPeakRank: false,
      showTournamentWins: false,
      showRiotId: false,
      // Tournament Stats specific settings
      showIndividualStatCards: true,
      showProgressBar: true,
      showTournamentStatusHeader: true,
      statIconStyle: 'filled',
      statCardLayout: 'grid',
    },
    bracketOverlay: {
      ...DEFAULT_SCENE_SETTINGS,
      showAdaptiveWeight: false,
      showCurrentRank: false,
      showPeakRank: false,
      showTournamentWins: false,
      showRiotId: false,
      // Bracket Overlay specific settings
      showMatchCards: true,
      showRoundIndicators: true,
      showWinnerHighlight: true,
      bracketStructure: 'single',
    },
    teamsOverview: {
      ...DEFAULT_SCENE_SETTINGS,
      showPeakRank: false,
      showTournamentWins: true,
      showRiotId: false,
      // Teams Overview specific settings
      showActiveEliminated: true,
      showTeamStatusBadges: true,
      showTournamentStatus: true,
      showMemberCount: true,
      gridColumns: 2,
      teamAccentColor: '#ff6b35',
      playerAccentColor: '#ff6b35', 
      weightBlockColor: '#333333',
      obsHeaderColor: '#FF6B35',
      obsBackgroundColor: '#000000',
      obsTextColor: '#FFFFFF',
      obsAccentColor: '#FF6B35',
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
        // Deep merge sceneSettings to ensure new scenes have default values
        const mergedSceneSettings = {
          ...DEFAULT_SETTINGS.sceneSettings,
          ...parsed.sceneSettings,
          // Ensure each scene has all default properties
          teamRoster: { ...DEFAULT_SETTINGS.sceneSettings.teamRoster, ...parsed.sceneSettings?.teamRoster },
          matchupPreview: { ...DEFAULT_SETTINGS.sceneSettings.matchupPreview, ...parsed.sceneSettings?.matchupPreview },
          playerSpotlight: { ...DEFAULT_SETTINGS.sceneSettings.playerSpotlight, ...parsed.sceneSettings?.playerSpotlight },
          tournamentStats: { ...DEFAULT_SETTINGS.sceneSettings.tournamentStats, ...parsed.sceneSettings?.tournamentStats },
          bracketOverlay: { ...DEFAULT_SETTINGS.sceneSettings.bracketOverlay, ...parsed.sceneSettings?.bracketOverlay },
          teamsOverview: { ...DEFAULT_SETTINGS.sceneSettings.teamsOverview, ...parsed.sceneSettings?.teamsOverview },
        };
        
        setSettings({ 
          ...DEFAULT_SETTINGS, 
          ...parsed,
          sceneSettings: mergedSceneSettings
        });
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