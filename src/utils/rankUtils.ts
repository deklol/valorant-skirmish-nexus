import React from "react";
import { ShieldIcon, Target, Award, Trophy, Star, Crown, Zap, Flame } from "lucide-react";

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

export function getRankIcon(rank?: string | null): React.ReactElement {
  if (!rank) return React.createElement(ShieldIcon, { className: "w-4 h-4 text-slate-400" });
  
  const rankLower = rank.toLowerCase();
  
  if (rankLower.includes('iron')) {
    return React.createElement(ShieldIcon, { className: "w-4 h-4 text-amber-800" });
  } else if (rankLower.includes('bronze')) {
    return React.createElement(ShieldIcon, { className: "w-4 h-4 text-amber-600" });
  } else if (rankLower.includes('silver')) {
    return React.createElement(Target, { className: "w-4 h-4 text-slate-400" });
  } else if (rankLower.includes('gold')) {
    return React.createElement(Award, { className: "w-4 h-4 text-yellow-500" });
  } else if (rankLower.includes('platinum')) {
    return React.createElement(Star, { className: "w-4 h-4 text-slate-300" });
  } else if (rankLower.includes('diamond')) {
    return React.createElement(Trophy, { className: "w-4 h-4 text-blue-400" });
  } else if (rankLower.includes('ascendant')) {
    return React.createElement(Crown, { className: "w-4 h-4 text-emerald-400" });
  } else if (rankLower.includes('immortal')) {
    return React.createElement(Zap, { className: "w-4 h-4 text-purple-400" });
  } else if (rankLower.includes('radiant')) {
    return React.createElement(Flame, { className: "w-4 h-4 text-red-400" });
  }
  
  return React.createElement(ShieldIcon, { className: "w-4 h-4 text-slate-400" });
}

export function getRankColor(rank?: string | null) {
  if (!rank) return "text-slate-400";
  
  const rankLower = rank.toLowerCase();
  
  if (rankLower.includes('iron')) {
    return "text-amber-800";
  } else if (rankLower.includes('bronze')) {
    return "text-amber-600";
  } else if (rankLower.includes('silver')) {
    return "text-slate-400";
  } else if (rankLower.includes('gold')) {
    return "text-yellow-500";
  } else if (rankLower.includes('platinum')) {
    return "text-slate-300";
  } else if (rankLower.includes('diamond')) {
    return "text-blue-400";
  } else if (rankLower.includes('ascendant')) {
    return "text-emerald-400";
  } else if (rankLower.includes('immortal')) {
    return "text-purple-400";
  } else if (rankLower.includes('radiant')) {
    return "text-red-400";
  }
  
  return "text-slate-400";
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