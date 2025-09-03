/**
 * Standardized broadcast layout utilities for consistent UI across all scenes
 */

import type { CSSProperties } from 'react';

// Standard broadcast default values - consistent across all scenes
export const BROADCAST_DEFAULTS = {
  // Font sizes (in pixels)
  headerFontSize: 48,
  subHeaderFontSize: 24,
  bodyFontSize: 16,
  largeFontSize: 20,
  
  // Colors (default semantic values)
  backgroundColor: 'transparent',
  headerTextColor: '#ffffff',
  textColor: '#ffffff',
  accentColor: '#3b82f6',
  
  // Layout
  padding: 32,
  borderRadius: 16,
  borderWidth: 1,
  borderColor: '#ffffff20',
  spacing: 24,
  shadowIntensity: 3,
  
  // Container
  maxWidth: '1280px', // max-w-7xl equivalent
  backdropBlur: 'backdrop-blur-sm',
  cardBackground: 'rgba(0, 0, 0, 0.4)',
  
  // Font
  fontFamily: 'inherit',
  fontWeight: '600',
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

// Standard card style generator
export function getBroadcastCardStyle(
  sceneSettings: any,
  globalSettings?: any
): CSSProperties {
  if (sceneSettings?.broadcastFriendlyMode) {
    return {
      backgroundColor: sceneSettings?.visuals?.cardBackgroundColor || 'rgba(20, 20, 20, 0.9)',
      borderRadius: '0',
      border: 'none',
      boxShadow: 'none',
      padding: `${sceneSettings.padding || BROADCAST_DEFAULTS.padding}px`,
    };
  }

  return {
    backgroundColor: BROADCAST_DEFAULTS.cardBackground,
    borderColor: sceneSettings.borderColor || BROADCAST_DEFAULTS.borderColor,
    borderRadius: `${sceneSettings.borderRadius || BROADCAST_DEFAULTS.borderRadius}px`,
    borderWidth: `${sceneSettings.borderWidth || BROADCAST_DEFAULTS.borderWidth}px`,
    padding: `${sceneSettings.padding || BROADCAST_DEFAULTS.padding}px`,
    boxShadow: `0 ${(sceneSettings.shadowIntensity || BROADCAST_DEFAULTS.shadowIntensity) * 2}px ${(sceneSettings.shadowIntensity || BROADCAST_DEFAULTS.shadowIntensity) * 6}px rgba(0,0,0,0.3)`,
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

// Standard card classes with backdrop blur
export const BROADCAST_CARD_CLASSES = "backdrop-blur-sm border shadow-lg";

// Broadcast friendly card classes
export const getBroadcastCardClasses = (broadcastFriendlyMode?: boolean) => 
  broadcastFriendlyMode ? "" : "backdrop-blur-sm border shadow-lg";

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