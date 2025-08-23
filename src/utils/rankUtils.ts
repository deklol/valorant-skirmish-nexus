import React from "react";

// Rank configuration with emojis and colors
const RANK_CONFIG = {
  'Iron 1': { emoji: '⬛', primary: '#4A4A4A', accent: '#7E7E7E' },
  'Iron 2': { emoji: '⬛', primary: '#4A4A4A', accent: '#7E7E7E' },
  'Iron 3': { emoji: '⬛', primary: '#4A4A4A', accent: '#7E7E7E' },
  'Bronze 1': { emoji: '🟫', primary: '#A97142', accent: '#C28E5C' },
  'Bronze 2': { emoji: '🟫', primary: '#A97142', accent: '#C28E5C' },
  'Bronze 3': { emoji: '🟫', primary: '#A97142', accent: '#C28E5C' },
  'Silver 1': { emoji: '⬜', primary: '#C0C0C0', accent: '#D8D8D8' },
  'Silver 2': { emoji: '⬜', primary: '#C0C0C0', accent: '#D8D8D8' },
  'Silver 3': { emoji: '⬜', primary: '#C0C0C0', accent: '#D8D8D8' },
  'Gold 1': { emoji: '🟨', primary: '#FFD700', accent: '#FFEA8A' },
  'Gold 2': { emoji: '🟨', primary: '#FFD700', accent: '#FFEA8A' },
  'Gold 3': { emoji: '🟨', primary: '#FFD700', accent: '#FFEA8A' },
  'Platinum 1': { emoji: '🟦', primary: '#5CA3E4', accent: '#B3DAFF' },
  'Platinum 2': { emoji: '🟦', primary: '#5CA3E4', accent: '#B3DAFF' },
  'Platinum 3': { emoji: '🟦', primary: '#5CA3E4', accent: '#B3DAFF' },
  'Diamond 1': { emoji: '🟪', primary: '#8d64e2', accent: '#B3DAFF' },
  'Diamond 2': { emoji: '🟪', primary: '#8d64e2', accent: '#B3DAFF' },
  'Diamond 3': { emoji: '🟪', primary: '#8d64e2', accent: '#B3DAFF' },
  'Ascendant 1': { emoji: '🟩', primary: '#84FF6F', accent: '#B6FFA8' },
  'Ascendant 2': { emoji: '🟩', primary: '#84FF6F', accent: '#B6FFA8' },
  'Ascendant 3': { emoji: '🟩', primary: '#84FF6F', accent: '#B6FFA8' },
  'Immortal 1': { emoji: '🟥', primary: '#A52834', accent: '#D24357' },
  'Immortal 2': { emoji: '🟥', primary: '#A52834', accent: '#D24357' },
  'Immortal 3': { emoji: '🟥', primary: '#A52834', accent: '#D24357' },
  'Radiant': { emoji: '✨', primary: '#FFF176', accent: '#FFFFFF' },
  'Unrated': { emoji: '❓', primary: '#9CA3AF', accent: '#D1D5DB' },
  'Unranked': { emoji: '❓', primary: '#9CA3AF', accent: '#D1D5DB' }
};

export const VALORANT_RANKS = [
  'Iron 1', 'Iron 2', 'Iron 3',
  'Bronze 1', 'Bronze 2', 'Bronze 3', 
  'Silver 1', 'Silver 2', 'Silver 3',
  'Gold 1', 'Gold 2', 'Gold 3',
  'Platinum 1', 'Platinum 2', 'Platinum 3',
  'Diamond 1', 'Diamond 2', 'Diamond 3',
  'Ascendant 1', 'Ascendant 2', 'Ascendant 3',
  'Immortal 1', 'Immortal 2', 'Immortal 3',
  'Radiant'
];

export const RANK_POINT_MAPPING: Record<string, number> = {
  'Iron 1': 10, 'Iron 2': 20, 'Iron 3': 30,
  'Bronze 1': 50, 'Bronze 2': 70, 'Bronze 3': 90,
  'Silver 1': 110, 'Silver 2': 130, 'Silver 3': 150,
  'Gold 1': 170, 'Gold 2': 190, 'Gold 3': 210,
  'Platinum 1': 230, 'Platinum 2': 250, 'Platinum 3': 270,
  'Diamond 1': 290, 'Diamond 2': 310, 'Diamond 3': 330,
  'Ascendant 1': 350, 'Ascendant 2': 370, 'Ascendant 3': 390,
  'Immortal 1': 410, 'Immortal 2': 430, 'Immortal 3': 450,
  'Radiant': 500
};

export function getRankIcon(rank?: string | null): string {
  if (!rank) return RANK_CONFIG['Unranked']?.emoji || '❓';
  
  const config = RANK_CONFIG[rank as keyof typeof RANK_CONFIG];
  return config?.emoji || RANK_CONFIG['Unranked']?.emoji || '❓';
}

export function getRankColor(rank?: string | null): string {
  if (!rank) return RANK_CONFIG['Unranked']?.primary || '#9CA3AF';
  
  const config = RANK_CONFIG[rank as keyof typeof RANK_CONFIG];
  return config?.primary || RANK_CONFIG['Unranked']?.primary || '#9CA3AF';
}

export function calculateAverageRank(ranks: Array<string | null | undefined>): string {
  const validRanks = ranks.filter(Boolean) as string[];
  if (validRanks.length === 0) return "Unranked";
  
  const points = validRanks.map(rank => RANK_POINT_MAPPING[rank] || 150);
  const avgPoints = points.reduce((sum, p) => sum + p, 0) / points.length;
  
  // Find closest rank to average points
  let closestRank = "Silver 3";
  let closestDiff = Math.abs(150 - avgPoints);
  
  for (const [rank, pts] of Object.entries(RANK_POINT_MAPPING)) {
    const diff = Math.abs(pts - avgPoints);
    if (diff < closestDiff) {
      closestDiff = diff;
      closestRank = rank;
    }
  }
  
  return closestRank;
}