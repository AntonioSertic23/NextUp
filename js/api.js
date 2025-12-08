// ========================================================
// api.js - Handles all API communication with Trakt and caching logic
// ========================================================

import {
  loadCache,
  saveCache,
  updateCache,
  clearCache,
} from "./local_storage.js";

/**
 * Formats raw Trakt API collection data into a simplified
 * object structure optimized for localStorage caching.
 *
 * @param {Array} data - Raw data array returned from Trakt API.
 * @returns {Object} Formatted object where each key is a show’s Trakt ID.
 *
 * Example return format:
 * {
 *   "48587": {
 *     title: "Brooklyn Nine-Nine",
 *     ids: { trakt: 48587, slug: "brooklyn-nine-nine", ... },
 *     year: 2013
 *   },
 *   ...
 * }
 */
export function formatCollectionData(data) {
  const formatted = {};

  data.forEach((item) => {
    // Use seasons from item.show if present (server may have enriched), otherwise fall back to progress.seasons
    const seasons = Array.isArray(item.show && item.show.seasons)
      ? item.show.seasons
      : Array.isArray(item.progress && item.progress.seasons)
      ? item.progress.seasons
      : [];

    formatted[item.show.ids.trakt] = {
      title: item.show.title || "",
      ids: item.show.ids || {},
      year: item.show.year || 0,
      seasons: seasons || [],
      images: item.show.images || {},
      tagline: item.show.tagline || "",
      overview: item.show.overview || "No overview available",
      rating: item.show.rating || 0,
      runtime: item.show.runtime || 0,
      genres: item.show.genres || ["No genres available"],
      status: item.show.status || "No status available",
      homepage: item.show.homepage || "No homepage available",
      network: item.show.network || "No network available",
    };
  });

  return formatted;
}

export function formatEpisodesData(seasons, show) {
  // Ensure show.seasons exists
  show.seasons = show.seasons || [];

  // Helper to find watched info in show.progress (raw watched object)
  const watchedRaw = show.progress || null;

  // Loop through each fetched season and merge into cached show
  seasons.forEach((fSeason) => {
    // Find or create the corresponding season in the cached show
    let cSeason = show.seasons.find((s) => s.number === fSeason.number);
    if (!cSeason) {
      // push a copy of fetched season
      cSeason = {
        ...fSeason,
      };
      show.seasons.push(cSeason);
    } else {
      // merge basic fields from fetched season
      cSeason.title = cSeason.title || fSeason.title;
      cSeason.episode_count = cSeason.episode_count || fSeason.episode_count;
      cSeason.episodes = cSeason.episodes || [];
    }

    // Ensure episodes array exists on fetched season
    if (!Array.isArray(fSeason.episodes)) return;

    // For each fetched episode, find or add to cached season and merge details
    fSeason.episodes.forEach((fEp) => {
      let cEp = cSeason.episodes.find((ep) => ep.number === fEp.number);
      if (!cEp) {
        cEp = { ...fEp };
        cSeason.episodes.push(cEp);
      } else {
        // Merge title and other missing fields
        cEp.title = cEp.title || fEp.title;
        cEp.first_aired = cEp.first_aired || fEp.first_aired;
        cEp.overview = cEp.overview || fEp.overview;
        cEp.images = cEp.images || fEp.images;
      }

      // Attach watched metadata from watchedRaw if available
      if (watchedRaw && Array.isArray(watchedRaw.seasons)) {
        const wSeason = watchedRaw.seasons.find(
          (ws) => ws.number === fSeason.number
        );
        if (wSeason && Array.isArray(wSeason.episodes)) {
          const wEp = wSeason.episodes.find((we) => we.number === fEp.number);
          if (wEp) {
            cEp.watched = !!(wEp.plays != null ? wEp.plays > 0 : wEp.completed);
            if (wEp.plays != null) cEp.plays = wEp.plays;
            if (wEp.last_watched) cEp.last_watched = wEp.last_watched;
          }
        }
      } else {
        // If fetched season/episode already contains 'watched' flag, preserve it
        if (typeof fEp.watched === "boolean") {
          cEp.watched = fEp.watched;
        } else if (cEp.watched == null) {
          cEp.watched = false;
        }
      }
    });
  });

  return show;
}

/**
 * Fetches the user's Trakt collection (persistent list, not auto-removed as with collection).
 *
 * - Checks if a cached version exists in localStorage.
 * - If it exists and `forceRefresh` is false, returns the cached data immediately.
 * - Otherwise, fetches the latest data from the Netlify serverless function (`/.netlify/functions/getCollection`, which now proxies /collection),
 *   formats it for local storage, saves it, and then returns it.
 *
 * @param {string} token - The user's Trakt OAuth token for authentication.
 * @param {boolean} [forceRefresh=false] - If true, bypasses cache and fetches the latest data from the API.
 * @returns {Promise<Array>} A list (array) of shows from the user's collection.
 */
export async function getCollection(token, forceRefresh = false) {
  const cache = loadCache();
  const hasCache = Object.keys(cache).length > 0;

  if (hasCache && !forceRefresh) {
    console.log("Using cached collection");

    return Object.values(cache);
  }

  clearCache();

  console.log("Fetching collection from Trakt API...");

  const res = await fetch("/.netlify/functions/getCollection", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ token }),
  });

  const raw = await res.json();

  // Normalize Netlify function envelope { statusCode, body } -> array
  let data = raw;
  if (!Array.isArray(data)) {
    if (data && typeof data.body === "string") {
      try {
        data = JSON.parse(data.body);
      } catch (err) {
        console.error("Failed to parse function body as JSON:", err, data.body);
        data = [];
      }
    } else {
      data = Array.isArray(data) ? data : [];
    }
  }

  // Format and store data in cache
  const formatted = formatCollectionData(data);
  saveCache(formatted);

  return Object.values(formatted);
}

/**
 * Retrieves show details from the local cache based on the provided show ID.
 * @param {string} showId - The unique identifier of the show.
 * @returns {Object} The cached show details.
 */
export async function getShowDetails(token, showId) {
  const cache = loadCache();
  const show = cache[showId];

  if (!show) {
    console.warn(`Show ${showId} not found in cache`);
    return null;
  }

  // Ensure seasons and episodes arrays exist and normalize watched flags
  show.seasons = show.seasons || [];
  show.seasons.forEach((season) => {
    season.episodes = season.episodes || [];
    season.episodes.forEach((ep) => {
      if (ep.watched == null) ep.watched = false;
    });
  });

  return show;
}

/**
 * Mark or unmark an episode as watched via Netlify function + Trakt sync.
 * Updates local cache on success and returns the updated show object.
 *
 * @param {string} token - Trakt access token
 * @param {number|string} showId - Trakt show id
 * @param {number} seasonNumber - season number
 * @param {number} episodeNumber - episode number within season
 * @param {number|string} episodeTraktId - Trakt episode id
 * @param {boolean} mark - true = mark watched, false = unmark
 * @returns {Object|null} updated show object or null on failure
 */
export async function markEpisodeWatched(
  token,
  showId,
  seasonNumber,
  episodeNumber,
  episodeTraktId,
  mark
) {
  const res = await fetch("/.netlify/functions/markEpisode", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      token,
      action: mark ? "mark" : "unmark",
      traktId: episodeTraktId,
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`markEpisode failed: ${res.status} ${text}`);
  }

  // Update local cache: prefer direct update by showId + seasonNumber + episodeNumber
  const cache = loadCache();
  const show = cache[showId];
  const season = show.seasons.find((s) => s.number === seasonNumber);
  const ep = season.episodes.find((e) => e.number === episodeNumber);

  ep.watched = !!mark;
  if (mark) {
    ep.plays = (ep.plays ?? 0) + 1;
    ep.last_watched = new Date().toISOString();
  } else {
    ep.plays = 0;
    delete ep.last_watched;
  }

  updateCache(showId, show);
  return show;
}

/**
 * Mark/unmark all episodes in a season.
 * @param {string} token
 * @param {string|number} showId
 * @param {number} seasonNumber
 * @param {boolean} mark
 * @param {Array} episodeIds array of trakt episode ids
 * @returns {Object|null} updated show or null
 */
export async function markSeasonWatched(
  token,
  showId,
  seasonNumber,
  mark,
  episodeIds
) {
  // Call markEpisode endpoint for each episode trakt id sequentially to avoid rate spikes
  for (const traktId of episodeIds) {
    try {
      const res = await fetch("/.netlify/functions/markEpisode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          action: mark ? "mark" : "unmark",
          traktId,
        }),
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        console.warn(
          `markSeasonWatched: episode ${traktId} failed: ${res.status} ${text}`
        );
      } else {
        // consume body to avoid connection leaks
        await res.json().catch(() => null);
      }
    } catch (err) {
      console.warn(
        "markSeasonWatched: network error for episode",
        traktId,
        err.message
      );
    }
  }

  // Update cache locally by matching episode trakt ids
  const cache = loadCache();
  const show = cache[showId];
  if (!show) return null;

  const season = (show.seasons || []).find((s) => s.number === seasonNumber);
  if (!season) return null;

  const idsSet = new Set(episodeIds.map((id) => String(id)));
  for (const ep of season.episodes || []) {
    if (ep.ids && idsSet.has(String(ep.ids.trakt))) {
      ep.watched = !!mark;
      if (mark) {
        ep.plays = (ep.plays ?? 0) + 1;
        ep.last_watched = new Date().toISOString();
      } else {
        ep.plays = 0;
        delete ep.last_watched;
      }
    }
  }

  updateCache(showId, show);
  return show;
}
