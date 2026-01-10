import React from 'react';

/**
 * FACEIT ELO Thresholds and Rank Configuration
 * 
 * Level 1:  100 - 500 ELO (Gray)
 * Level 2:  501 - 750 ELO (Green)
 * Level 3:  751 - 900 ELO (Light Green)
 * Level 4:  901 - 1050 ELO (Yellow-Green)
 * Level 5:  1051 - 1200 ELO (Yellow)
 * Level 6:  1201 - 1350 ELO (Light Orange)
 * Level 7:  1351 - 1530 ELO (Orange)
 * Level 8:  1531 - 1750 ELO (Dark Orange)
 * Level 9:  1751 - 2000 ELO (Red)
 * Level 10: 2001+ ELO (Red with speedometer design)
 * Challenger: Top 1,000 players (Special icon)
 */

export interface FaceitRankConfig {
  level: number;
  minElo: number;
  maxElo: number | null;
  name: string;
  primaryColor: string;
  secondaryColor: string;
  glowColor: string;
}

/**
 * FACEIT Rank Color Scheme:
 * Level 1:  Silver/Gray
 * Level 2-3: Green
 * Level 4-7: Yellow/Gold
 * Level 8-9: Orange
 * Level 10: Red
 */
export const FACEIT_RANKS: FaceitRankConfig[] = [
  { level: 1, minElo: 100, maxElo: 500, name: 'Level 1', primaryColor: '#909090', secondaryColor: '#6a6a6a', glowColor: 'rgba(144, 144, 144, 0.2)' },
  { level: 2, minElo: 501, maxElo: 750, name: 'Level 2', primaryColor: '#1ce400', secondaryColor: '#15a800', glowColor: 'rgba(28, 228, 0, 0.2)' },
  { level: 3, minElo: 751, maxElo: 900, name: 'Level 3', primaryColor: '#1ce400', secondaryColor: '#15a800', glowColor: 'rgba(28, 228, 0, 0.2)' },
  { level: 4, minElo: 901, maxElo: 1050, name: 'Level 4', primaryColor: '#ffc800', secondaryColor: '#d9a800', glowColor: 'rgba(255, 200, 0, 0.2)' },
  { level: 5, minElo: 1051, maxElo: 1200, name: 'Level 5', primaryColor: '#ffc800', secondaryColor: '#d9a800', glowColor: 'rgba(255, 200, 0, 0.2)' },
  { level: 6, minElo: 1201, maxElo: 1350, name: 'Level 6', primaryColor: '#ffc800', secondaryColor: '#d9a800', glowColor: 'rgba(255, 200, 0, 0.2)' },
  { level: 7, minElo: 1351, maxElo: 1530, name: 'Level 7', primaryColor: '#ffc800', secondaryColor: '#d9a800', glowColor: 'rgba(255, 200, 0, 0.2)' },
  { level: 8, minElo: 1531, maxElo: 1750, name: 'Level 8', primaryColor: '#ff8c00', secondaryColor: '#d97500', glowColor: 'rgba(255, 140, 0, 0.2)' },
  { level: 9, minElo: 1751, maxElo: 2000, name: 'Level 9', primaryColor: '#ff8c00', secondaryColor: '#d97500', glowColor: 'rgba(255, 140, 0, 0.2)' },
  { level: 10, minElo: 2001, maxElo: null, name: 'Level 10', primaryColor: '#ff1a00', secondaryColor: '#cc1500', glowColor: 'rgba(255, 26, 0, 0.25)' },
];

export function getSkillLevelFromElo(elo: number): number {
  if (elo >= 2001) return 10;
  if (elo >= 1751) return 9;
  if (elo >= 1531) return 8;
  if (elo >= 1351) return 7;
  if (elo >= 1201) return 6;
  if (elo >= 1051) return 5;
  if (elo >= 901) return 4;
  if (elo >= 751) return 3;
  if (elo >= 501) return 2;
  return 1;
}

export function getRankConfig(level: number): FaceitRankConfig {
  const config = FACEIT_RANKS.find(r => r.level === level);
  return config || FACEIT_RANKS[0];
}

export function getEloRange(level: number): string {
  const config = getRankConfig(level);
  if (config.maxElo === null) {
    return `${config.minElo}+`;
  }
  return `${config.minElo} - ${config.maxElo}`;
}

interface FaceitRankIconProps {
  level: number;
  elo?: number;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showElo?: boolean;
  showGlow?: boolean;
  isChallenger?: boolean;
  className?: string;
}

const sizeMap = {
  sm: 24,
  md: 32,
  lg: 48,
  xl: 64,
};

export function FaceitRankIcon({ 
  level, 
  elo, 
  size = 'md', 
  showElo = false,
  showGlow = true,
  isChallenger = false,
  className = '' 
}: FaceitRankIconProps) {
  const config = getRankConfig(Math.min(Math.max(level, 1), 10));
  const pixelSize = sizeMap[size];
  const strokeWidth = pixelSize > 32 ? 3 : 2;
  const fontSize = pixelSize * 0.4;
  // Reduced glow intensity
  const glowSize = pixelSize * 0.08;

  // Level 10 special "speedometer" design
  if (level === 10) {
    return (
      <div className={`inline-flex flex-col items-center gap-1 ${className}`}>
        <div 
          className="relative"
          style={{
            filter: showGlow ? `drop-shadow(0 0 ${glowSize}px ${config.glowColor})` : undefined
          }}
        >
          <svg 
            width={pixelSize} 
            height={pixelSize} 
            viewBox="0 0 48 48"
          >
            {/* Outer ring gradient */}
            <defs>
              <linearGradient id="level10Gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#ff4500" />
                <stop offset="50%" stopColor="#ff1a00" />
                <stop offset="100%" stopColor="#cc0000" />
              </linearGradient>
              <linearGradient id="speedometerGradient" x1="0%" y1="100%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#00ff00" />
                <stop offset="25%" stopColor="#ffff00" />
                <stop offset="50%" stopColor="#ff9900" />
                <stop offset="75%" stopColor="#ff4400" />
                <stop offset="100%" stopColor="#ff0000" />
              </linearGradient>
            </defs>
            
            {/* Background circle */}
            <circle cx="24" cy="24" r="22" fill="#1a1a1a" stroke="url(#level10Gradient)" strokeWidth={strokeWidth} />
            
            {/* Speedometer arc (bottom arc) */}
            <path 
              d="M 8 32 A 18 18 0 0 1 40 32" 
              fill="none" 
              stroke="url(#speedometerGradient)" 
              strokeWidth="3"
              strokeLinecap="round"
            />
            
            {/* Speedometer needle pointing to max */}
            <line 
              x1="24" 
              y1="28" 
              x2="36" 
              y2="20" 
              stroke="#ff0000" 
              strokeWidth="2" 
              strokeLinecap="round"
            />
            
            {/* Center dot */}
            <circle cx="24" cy="28" r="3" fill="#ff1a00" />
            
            {/* Level text */}
            <text 
              x="24" 
              y="18" 
              textAnchor="middle" 
              dominantBaseline="middle" 
              fill="white" 
              fontSize="10" 
              fontWeight="bold"
              fontFamily="Arial, sans-serif"
            >
              10
            </text>
          </svg>
        </div>
        {showElo && elo !== undefined && (
          <span 
            className="text-xs font-bold"
            style={{ color: config.primaryColor }}
          >
            {elo} ELO
          </span>
        )}
      </div>
    );
  }

  // Challenger special icon
  if (isChallenger) {
    return (
      <div className={`inline-flex flex-col items-center gap-1 ${className}`}>
        <div 
          className="relative"
          style={{
            filter: showGlow ? `drop-shadow(0 0 ${glowSize}px rgba(255, 215, 0, 0.25))` : undefined
          }}
        >
          <svg 
            width={pixelSize} 
            height={pixelSize} 
            viewBox="0 0 48 48"
          >
            <defs>
              <linearGradient id="challengerGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#ffd700" />
                <stop offset="50%" stopColor="#ff8c00" />
                <stop offset="100%" stopColor="#ff4500" />
              </linearGradient>
            </defs>
            
            {/* Speedometer background */}
            <circle cx="24" cy="24" r="22" fill="#1a1a1a" stroke="url(#challengerGradient)" strokeWidth="3" />
            
            {/* Crown/star for challenger */}
            <path 
              d="M24 8 L27 16 L36 16 L29 22 L32 30 L24 25 L16 30 L19 22 L12 16 L21 16 Z" 
              fill="url(#challengerGradient)"
            />
            
            {/* Speedometer needle */}
            <line x1="24" y1="36" x2="24" y2="42" stroke="#ffd700" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </div>
        {showElo && elo !== undefined && (
          <span className="text-xs font-bold text-yellow-400">
            {elo} ELO
          </span>
        )}
      </div>
    );
  }

  // Standard level icons (1-9)
  return (
    <div className={`inline-flex flex-col items-center gap-1 ${className}`}>
      <div 
        className="relative"
        style={{
          filter: showGlow ? `drop-shadow(0 0 ${glowSize}px ${config.glowColor})` : undefined
        }}
      >
        <svg 
          width={pixelSize} 
          height={pixelSize} 
          viewBox="0 0 48 48"
        >
          <defs>
            <linearGradient id={`levelGradient${level}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={config.primaryColor} />
              <stop offset="100%" stopColor={config.secondaryColor} />
            </linearGradient>
          </defs>
          
          {/* Outer ring */}
          <circle 
            cx="24" 
            cy="24" 
            r="21" 
            fill="none" 
            stroke={`url(#levelGradient${level})`}
            strokeWidth={strokeWidth + 1}
          />
          
          {/* Inner dark circle */}
          <circle 
            cx="24" 
            cy="24" 
            r="17" 
            fill="#1a1a1a"
          />
          
          {/* Level number */}
          <text 
            x="24" 
            y="24" 
            textAnchor="middle" 
            dominantBaseline="central" 
            fill={config.primaryColor}
            fontSize={fontSize}
            fontWeight="bold"
            fontFamily="Arial, sans-serif"
          >
            {level}
          </text>
        </svg>
      </div>
      {showElo && elo !== undefined && (
        <span 
          className="text-xs font-bold"
          style={{ color: config.primaryColor }}
        >
          {elo} ELO
        </span>
      )}
    </div>
  );
}

interface FaceitRankBadgeProps {
  level: number;
  elo?: number;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function FaceitRankBadge({ 
  level, 
  elo, 
  showLabel = true,
  size = 'md',
  className = '' 
}: FaceitRankBadgeProps) {
  const config = getRankConfig(Math.min(Math.max(level, 1), 10));
  
  return (
    <div 
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full ${className}`}
      style={{ 
        backgroundColor: `${config.primaryColor}15`,
        border: `1px solid ${config.primaryColor}40`
      }}
    >
      <FaceitRankIcon level={level} size={size === 'lg' ? 'md' : 'sm'} showGlow={false} />
      {showLabel && (
        <div className="flex flex-col">
          <span 
            className="text-sm font-bold leading-tight"
            style={{ color: config.primaryColor }}
          >
            Level {level}
          </span>
          {elo !== undefined && (
            <span className="text-xs text-muted-foreground leading-tight">
              {elo} ELO
            </span>
          )}
        </div>
      )}
    </div>
  );
}

export default FaceitRankIcon;
