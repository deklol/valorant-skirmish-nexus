// Rank point mapping matching the website system
export const RANK_POINT_MAPPING: Record<string, number> = {
  // Iron
  'Iron 1': 100,
  'Iron 2': 105,
  'Iron 3': 110,
  
  // Bronze
  'Bronze 1': 115,
  'Bronze 2': 120,
  'Bronze 3': 125,
  
  // Silver
  'Silver 1': 130,
  'Silver 2': 135,
  'Silver 3': 140,
  
  // Gold
  'Gold 1': 145,
  'Gold 2': 150,
  'Gold 3': 155,
  
  // Platinum
  'Platinum 1': 160,
  'Platinum 2': 170,
  'Platinum 3': 180,
  
  // Diamond
  'Diamond 1': 190,
  'Diamond 2': 210,
  'Diamond 3': 230,
  
  // Ascendant
  'Ascendant 1': 250,
  'Ascendant 2': 265,
  'Ascendant 3': 280,
  
  // Immortal
  'Immortal 1': 400,
  'Immortal 2': 450,
  'Immortal 3': 500,
  
  // Radiant
  'Radiant': 550,
  
  // Unranked/Default
  'Unranked': 150,
  'Unrated': 150
};

/**
 * Get rank points for a given rank
 */
export function getRankPoints(rank?: string): number {
  if (!rank) return 150;
  return RANK_POINT_MAPPING[rank] || 150;
}

/**
 * Determine if a rank is considered elite (Immortal+)
 */
export function isEliteRank(rank?: string): boolean {
  if (!rank) return false;
  const points = getRankPoints(rank);
  return points >= 400; // Immortal 1 and above
}