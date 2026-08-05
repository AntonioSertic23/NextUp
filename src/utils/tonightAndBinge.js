/**
 * Selects up to `count` active (in-progress) shows for a “what to watch”
 * suggestion, preferring unfinished high-hype / stale shows.
 *
 * Pure function — no I/O. Used by UI and tests.
 *
 * Scoring (higher = more likely):
 * - Has next episode with aired date in the past (or unknown): +3
 * - User rating (1–5) * 2
 * - Days since last_watched_at (capped): up to +10
 * - Few episodes left (≤5): +2
 * - Random jitter so shuffle feels fresh
 *
 * @param {Array<Object>} shows - list_shows-like rows
 * @param {object} [options]
 * @param {number} [options.count=3]
 * @param {() => number} [options.random=Math.random]
 * @param {number} [options.nowMs=Date.now()]
 * @param {Set<string>|string[]} [options.excludeShowIds] - UUID show ids to skip
 * @returns {Array<Object>} up to `count` show rows
 */
export function pickTonightShows(shows, options = {}) {
  const {
    count = 3,
    random = Math.random,
    nowMs = Date.now(),
    excludeShowIds = [],
  } = options;

  const exclude = excludeShowIds instanceof Set
    ? excludeShowIds
    : new Set(excludeShowIds);

  const candidates = (shows || []).filter((item) => {
    if (!item || item.is_completed) return false;
    if (!item.next_episode) return false;
    const id = item.shows?.id || item.show_id;
    if (id && exclude.has(id)) return false;
    return true;
  });

  const scored = candidates.map((item) => {
    let score = random() * 2; // jitter

    const rating = item.user_rating ?? item.hype ?? 0;
    score += Number(rating) * 2;

    if (item.last_watched_at) {
      const days =
        (nowMs - new Date(item.last_watched_at).getTime()) /
        (1000 * 60 * 60 * 24);
      if (Number.isFinite(days) && days > 0) {
        score += Math.min(10, days / 3);
      }
    } else {
      score += 5; // never watched on this list — nudge
    }

    const left =
      (item.total_episodes ?? 0) - (item.watched_episodes ?? 0);
    if (left > 0 && left <= 5) score += 2;

    const firstAired = item.next_episode?.first_aired;
    if (!firstAired || new Date(firstAired).getTime() <= nowMs) {
      score += 3;
    }

    return { item, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, Math.max(0, count)).map((s) => s.item);
}

/**
 * Resolves which episodes to mark for binge/focus mode.
 *
 * @param {Array<{id: string, season_number: number, episode_number: number, watched_at?: string|null, first_aired?: string|null}>} episodes
 *   Chronologically ordered countable episodes for the show (or season).
 * @param {object} options
 * @param {"next"|"season"|"count"} options.mode
 * @param {number} [options.count] - when mode is "count"
 * @param {number} [options.seasonNumber] - when mode is "season"
 * @param {(ep: object) => boolean} [options.hasAired] - aired predicate
 * @returns {string[]} episode UUIDs to mark as watched
 */
export function resolveBingeEpisodeIds(episodes, options = {}) {
  const {
    mode = "next",
    count = 1,
    seasonNumber,
    hasAired = (ep) => {
      if (!ep?.first_aired) return false;
      const t = new Date(ep.first_aired).getTime();
      return Number.isFinite(t) && t <= Date.now();
    },
  } = options;

  const list = episodes || [];
  const unwatchedAired = list.filter(
    (ep) => !ep.watched_at && hasAired(ep),
  );

  if (mode === "season") {
    const season = Number(seasonNumber);
    return unwatchedAired
      .filter((ep) => Number(ep.season_number) === season)
      .map((ep) => ep.id);
  }

  if (mode === "count") {
    const n = Math.max(1, Number(count) || 1);
    return unwatchedAired.slice(0, n).map((ep) => ep.id);
  }

  // next: single next unwatched aired
  return unwatchedAired.slice(0, 1).map((ep) => ep.id);
}
