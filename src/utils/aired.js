/**
 * Whether an episode has aired and may be marked watched.
 * Missing or invalid `first_aired` → not aired (cannot mark).
 *
 * @param {{ first_aired?: string|null }} episode
 * @param {number} [nowMs=Date.now()]
 * @returns {boolean}
 */
export function hasEpisodeAired(episode, nowMs = Date.now()) {
  if (!episode?.first_aired) return false;
  const airDate = new Date(episode.first_aired);
  if (Number.isNaN(airDate.getTime())) return false;
  return airDate.getTime() <= nowMs;
}
