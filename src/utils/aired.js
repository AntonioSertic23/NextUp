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

/**
 * Latest already-aired `first_aired` value per show.
 * Future and invalid dates are ignored.
 *
 * @param {Array<{show_id?: string, first_aired?: string|null}>} episodes
 * @param {number} [nowMs=Date.now()]
 * @returns {Map<string, string>}
 */
export function pickLatestAiredByShow(episodes, nowMs = Date.now()) {
  /** @type {Map<string, string>} */
  const latest = new Map();
  /** @type {Map<string, number>} */
  const times = new Map();

  for (const episode of episodes || []) {
    if (!episode?.show_id || !hasEpisodeAired(episode, nowMs)) continue;
    const airedAt = new Date(episode.first_aired).getTime();
    const prev = times.get(episode.show_id);
    if (prev == null || airedAt > prev) {
      times.set(episode.show_id, airedAt);
      latest.set(episode.show_id, episode.first_aired);
    }
  }

  return latest;
}
