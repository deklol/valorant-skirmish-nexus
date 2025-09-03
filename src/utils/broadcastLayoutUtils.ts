/**
 * Standardized broadcast layout utilities for consistent UI across all scenes
 */

import type { CSSProperties } from 'react';

// Broadcast-optimized defaults for OBS/vMix compatibility
export const BROADCAST_DEFAULTS = {
  // Typography - High contrast, readable
  headerFontSize: 56,
  subHeaderFontSize: 28,
  bodyFontSize: 18,
  largeFontSize: 24,
  fontFamily: '"Segoe UI", system-ui, -apple-system, sans-serif',
  fontWeight: '700',
  
  // Colors - High contrast broadcast palette
  backgroundColor: 'transparent',
  headerTextColor: '#ffffff',
  textColor: '#ffffff',
  accentColor: '#00d4ff',
  primaryColor: '#ff6b35',
  successColor: '#00ff88',
  warningColor: '#ffaa00',
  errorColor: '#ff3366',
  
  // Layout - Block-based, no curves
  padding: 24,
  borderRadius: 0,
  borderWidth: 3,
  borderColor: '#ffffff',
  spacing: 16,
  
  // Container
  maxWidth: '1920px',
  cardBackground: '#000000',
  overlayBackground: 'rgba(0, 0, 0, 0.85)',
  
  // Broadcast-specific
  blockSpacing: 8,
  stripHeight: 80,
  badgeHeight: 32,
} as const;

// Standard loading component props
export interface BroadcastLoadingProps {
  message?: string;
  textColor?: string;
  fontSize?: string;
}

// Standard container style generator
export function getBroadcastContainerStyle(
  sceneSettings: any,
  globalSettings: any
): CSSProperties {
  const isTransparent = sceneSettings.transparentBackground;
  
  return {
    backgroundColor: isTransparent 
      ? 'transparent' 
      : (sceneSettings.backgroundColor || globalSettings.backgroundColor || BROADCAST_DEFAULTS.backgroundColor),
    backgroundImage: (isTransparent || (!sceneSettings.backgroundImage && !globalSettings.backgroundImage)) 
      ? undefined
      : `url(${sceneSettings.backgroundImage || globalSettings.backgroundImage})`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    fontFamily: sceneSettings.fontFamily || globalSettings.fontFamily || BROADCAST_DEFAULTS.fontFamily,
    color: sceneSettings.textColor || globalSettings.textColor || BROADCAST_DEFAULTS.textColor,
  };
}

// Broadcast card style - optimized for streaming
export function getBroadcastCardStyle(
  sceneSettings: any,
  globalSettings?: any
): CSSProperties {
  if (sceneSettings?.broadcastFriendlyMode || sceneSettings?.transparentBackground) {
    return {
      backgroundColor: sceneSettings?.transparentBackground ? 'transparent' : BROADCAST_DEFAULTS.cardBackground,
      border: sceneSettings?.transparentBackground ? 'none' : `${BROADCAST_DEFAULTS.borderWidth}px solid ${BROADCAST_DEFAULTS.borderColor}`,
      borderRadius: '0',
      boxShadow: 'none',
      padding: `${BROADCAST_DEFAULTS.padding}px`,
    };
  }

  return {
    backgroundColor: BROADCAST_DEFAULTS.overlayBackground,
    borderColor: sceneSettings.borderColor || BROADCAST_DEFAULTS.borderColor,
    borderRadius: `${sceneSettings.borderRadius || BROADCAST_DEFAULTS.borderRadius}px`,
    borderWidth: `${sceneSettings.borderWidth || BROADCAST_DEFAULTS.borderWidth}px`,
    padding: `${sceneSettings.padding || BROADCAST_DEFAULTS.padding}px`,
    boxShadow: `0 ${(sceneSettings.shadowIntensity || 3) * 2}px ${(sceneSettings.shadowIntensity || 3) * 6}px rgba(0,0,0,0.3)`,
  };
}

// Broadcast-optimized block style
export function getBroadcastBlockStyle(
  backgroundColor = BROADCAST_DEFAULTS.cardBackground,
  borderColor = BROADCAST_DEFAULTS.borderColor
): CSSProperties {
  return {
    backgroundColor,
    border: `${BROADCAST_DEFAULTS.borderWidth}px solid ${borderColor}`,
    borderRadius: '0',
    boxShadow: 'none',
    padding: `${BROADCAST_DEFAULTS.padding}px`,
  };
}

// Team strip style for broadcast
export function getBroadcastTeamStripStyle(
  teamColor: string = BROADCAST_DEFAULTS.accentColor,
  isEliminated = false
): CSSProperties {
  return {
    backgroundColor: teamColor,
    height: `${BROADCAST_DEFAULTS.stripHeight}px`,
    border: `${BROADCAST_DEFAULTS.borderWidth}px solid ${BROADCAST_DEFAULTS.borderColor}`,
    borderRadius: '0',
    padding: `${BROADCAST_DEFAULTS.blockSpacing}px ${BROADCAST_DEFAULTS.padding}px`,
    display: 'flex',
    alignItems: 'center',
    gap: `${BROADCAST_DEFAULTS.spacing}px`,
  };
}

// Badge style for broadcast
export function getBroadcastBadgeStyle(
  color: string = BROADCAST_DEFAULTS.accentColor
): CSSProperties {
  return {
    backgroundColor: color,
    color: '#000000',
    height: `${BROADCAST_DEFAULTS.badgeHeight}px`,
    padding: `0 ${BROADCAST_DEFAULTS.spacing}px`,
    border: `${BROADCAST_DEFAULTS.borderWidth}px solid ${BROADCAST_DEFAULTS.borderColor}`,
    borderRadius: '0',
    fontWeight: BROADCAST_DEFAULTS.fontWeight,
    fontSize: `${BROADCAST_DEFAULTS.bodyFontSize}px`,
    display: 'inline-flex',
    alignItems: 'center',
  };
}

// Standard text style generators
export function getBroadcastHeaderStyle(
  sceneSettings: any,
  globalSettings: any,
  size: 'xl' | 'large' | 'medium' | 'small' = 'large'
): CSSProperties {
  const sizeMap = {
    xl: 60,
    large: sceneSettings.headerFontSize || BROADCAST_DEFAULTS.headerFontSize,
    medium: BROADCAST_DEFAULTS.subHeaderFontSize,
    small: BROADCAST_DEFAULTS.largeFontSize,
  };

  return {
    color: sceneSettings.headerTextColor || globalSettings.headerTextColor || BROADCAST_DEFAULTS.headerTextColor,
    fontFamily: sceneSettings.fontFamily || globalSettings.fontFamily || BROADCAST_DEFAULTS.fontFamily,
    fontSize: `${sizeMap[size]}px`,
    fontWeight: sceneSettings.fontWeight || BROADCAST_DEFAULTS.fontWeight,
  };
}

export function getBroadcastTextStyle(
  sceneSettings: any,
  globalSettings: any,
  opacity: string = ''
): CSSProperties {
  const color = sceneSettings.textColor || globalSettings.textColor || BROADCAST_DEFAULTS.textColor;
  return {
    color: opacity ? color + opacity : color,
    fontFamily: sceneSettings.fontFamily || globalSettings.fontFamily || BROADCAST_DEFAULTS.fontFamily,
    fontSize: `${sceneSettings.fontSize || BROADCAST_DEFAULTS.bodyFontSize}px`,
  };
}

// Standard loading component styles - for use in components
export function getBroadcastLoadingStyles(
  textColor?: string,
  fontSize?: string
) {
  return {
    container: "w-screen h-screen bg-transparent flex items-center justify-center",
    text: {
      color: textColor || BROADCAST_DEFAULTS.textColor,
      fontSize: fontSize || "24px",
      fontFamily: BROADCAST_DEFAULTS.fontFamily 
    }
  };
}

// Standard background overlay styles - for use in components
export function getBroadcastOverlayStyles(opacity = 0.4) {
  return {
    container: "absolute inset-0",
    style: {
      backgroundColor: `rgba(0, 0, 0, ${opacity})`
    }
  };
}

// Standard responsive container classes
export const BROADCAST_CONTAINER_CLASSES = "w-screen h-screen overflow-hidden relative";
export const BROADCAST_CONTENT_CLASSES = "relative z-10 max-w-7xl mx-auto h-full flex flex-col";
export const BROADCAST_PADDING_CLASSES = "p-8";

// Broadcast-optimized classes
export const BROADCAST_CARD_CLASSES = "backdrop-blur-sm border shadow-lg";
export const BROADCAST_BLOCK_CLASSES = "";
export const BROADCAST_STRIP_CLASSES = "flex items-center";
export const BROADCAST_TEXT_CLASSES = "font-bold antialiased";

// Dynamic classes based on mode
export const getBroadcastCardClasses = (broadcastFriendlyMode?: boolean, transparentBackground?: boolean) => {
  if (broadcastFriendlyMode || transparentBackground) return BROADCAST_BLOCK_CLASSES;
  return BROADCAST_CARD_CLASSES;
};

// Rank color utility (consistent across all scenes)
export function getRankColor(rank?: string): string {
  if (!rank) return '#9CA3AF';
  const rankLower = rank.toLowerCase();
  if (rankLower.includes('radiant')) return '#FFF176';
  if (rankLower.includes('immortal')) return '#A52834';
  if (rankLower.includes('ascendant')) return '#84FF6F';
  if (rankLower.includes('diamond')) return '#8d64e2';
  if (rankLower.includes('platinum')) return '#5CA3E4';
  if (rankLower.includes('gold')) return '#FFD700';
  return '#9CA3AF';
}