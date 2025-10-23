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
 * Formats raw Trakt API watchlist data into a simplified
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
export function formatWatchlistData(data) {
  const formatted = {};

  data.forEach((item) => {
    const total = parseInt(item.progress.total);
    const watched = parseInt(item.progress.watched);
    const nextEpisodeSeason = item.progress.nextEpisode.season;
    const nextEpisodeEpisode = item.progress.nextEpisode.number;
    const nextEpisodeTitle = item.progress.nextEpisode.title;

    formatted[item.show.ids.trakt] = {
      title: item.show.title,
      ids: item.show.ids,
      year: item.show.year,
      seasons: item.progress.seasons,
      progress_text: `${watched}/${total}`,
      episodes_left: total - watched,
      progress_bar_percent: (watched / total) * 100,
      next_episode: `S${String(nextEpisodeSeason).padStart(2, "0")}E${String(
        nextEpisodeEpisode
      ).padStart(2, "0")} - ${nextEpisodeTitle}`,
      images: item.show.images,
      tagline: item.show.tagline,
      overview: item.show.overview,
      rating: item.show.rating,
      runtime: item.show.runtime,
      genres: item.show.genres,
      status: item.show.status,
      homepage: item.show.homepage,
      network: item.show.network,
    };
  });

  return formatted;
}

export function formatEpisodesData(seasons, show) {
  // Loop through each season in the fetched data
  seasons.forEach((fSeason) => {
    // Find the corresponding season in the cached show
    const cSeason = show.seasons.find((s) => s.number === fSeason.number);
    if (!cSeason) return; // skip if season doesn't exist in cache

    // Loop through episodes in the fetched season
    fSeason.episodes.forEach((fEp) => {
      // Find the corresponding episode in the cached season
      const cEp = cSeason.episodes.find((ep) => ep.number === fEp.number);
      if (cEp) {
        // Update title if missing
        if (!cEp.title && fEp.title) {
          cEp.title = fEp.title;
        }
      }
    });
  });

  return show;
}

/**
 * Fetches the user's Trakt watchlist.
 *
 * - Checks if a cached version exists in localStorage.
 * - If it exists and `forceRefresh` is false, returns the cached data immediately.
 * - Otherwise, fetches the latest data from the Netlify serverless function (`/.netlify/functions/getWatchlist`),
 *   formats it for local storage, saves it, and then returns it.
 *
 * @param {string} token - The user's Trakt OAuth token for authentication.
 * @param {boolean} [forceRefresh=false] - If true, bypasses cache and fetches the latest data from the API.
 * @returns {Promise<Array>} A list (array) of shows from the user's watchlist.
 */
export async function getWatchlist(token, forceRefresh = false) {
  const cache = loadCache();
  const hasCache = Object.keys(cache).length > 0;

  if (hasCache && !forceRefresh) {
    console.log("Using cached watchlist");

    return Object.values(cache);
  }

  clearCache();

  console.log("Fetching watchlist from Trakt API...");

  const res = await fetch("/.netlify/functions/getWatchlist", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ token }),
  });

  const data = await res.json();

  // Format and store data in cache
  const formatted = formatWatchlistData(data);
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

  // Check if at least one episode has title or aired
  const hasSomeData = show.seasons.some((season) =>
    season.episodes.some((ep) => ep.title || ep.aired != null)
  );

  if (hasSomeData) {
    console.log("Using cached episodes");

    return show;
  }

  console.log("Fetching episodes from Trakt API...");

  const res = await fetch("/.netlify/functions/getEpisodes", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ token, showId }),
  });

  const seasons = await res.json();

  // Format and store data in cache
  const formattedShow = formatEpisodesData(seasons, show);
  updateCache(showId, formattedShow);

  return formattedShow;
}
