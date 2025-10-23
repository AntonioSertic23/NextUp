// ========================================================
// api.js - Handles all API communication with Trakt and caching logic
// ========================================================

import { loadCache, saveCache, clearCache } from "./local_storage.js";

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
    };
  });

  return formatted;
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

  console.log("data", data);

  // Format and store data in cache
  const formatted = formatWatchlistData(data);
  saveCache(formatted);

  console.log("formatted", formatted);

  return Object.values(formatted);
}

/**
 * Dummy data fetcher for testing
 */
export async function getShowDetails(showId) {
  return {
    id: showId,
    title: "Breaking Bad",
    year: 2008,
    overview:
      "A high school chemistry teacher turns to making methamphetamine...",
    seasons: [
      {
        number: 1,
        episodes: [
          { number: 1, title: "Pilot" },
          { number: 2, title: "Cat's in the Bag..." },
        ],
      },
      {
        number: 2,
        episodes: [
          { number: 1, title: "Seven Thirty-Seven" },
          { number: 2, title: "Grilled" },
        ],
      },
    ],
  };
}
