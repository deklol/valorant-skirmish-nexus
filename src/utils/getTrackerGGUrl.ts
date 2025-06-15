
/**
 * Converts a Riot ID (e.g., "PlayerName#1234") to a tracker.gg URL.
 * Riot IDs must be URL-encoded, especially the '#' as '%23'.
 */
export function getTrackerGGUrl(riotId?: string) {
  if (!riotId) return null;
  // Encode '#' as '%23' and handle other URI-unsafe chars.
  const encoded = encodeURIComponent(riotId);
  return `https://tracker.gg/valorant/profile/riot/${encoded}/overview?platform=pc&playlist=competitive`;
}
