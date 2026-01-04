// ========================================================
// api.js - Handles all API communication with Trakt and caching logic
// ========================================================

import { getToken } from "./services/authService.js";
import { getUser } from "./stores/userStore.js";
import { getShowById } from "./database.js";

/**
 * Retrieve show details using a database-first strategy.
 *
 * Behavior:
 * 1. Attempt to load the show from the database
 * 2. If not found, fetch it from Trakt
 * 3. Persist the fetched show to the database
 *
 * @param {string} showId - Internal show ID
 * @param {string} [traktIdentifier] - Trakt show identifier.
 * Can be a Trakt slug (e.g. "game-of-thrones") or a numeric Trakt ID.
 * @returns {Promise<Object|null>} Show data or null if unavailable
 */
export async function getShowDetails(showId, traktIdentifier) {
  // Try database first
  if (showId) {
    const dbShow = await getShowById(showId);
    if (dbShow) return dbShow;
    console.warn("Show not found in database:", showId);
  }

  // If not in DB, fallback to Trakt
  if (!traktIdentifier) {
    console.warn("traktIdentifier not provided, cannot fetch from Trakt.");
    return null;
  }

  const traktShow = await fetchShowFromTrakt(traktIdentifier);

  return traktShow || null;
}

/**
 * Fetches show details from Trakt via a serverless function.
 *
 * @async
 * @param {string} traktIdentifier - Trakt show identifier (slug or numeric ID)
 * @returns {Promise<Object|null>} Show data if successful, otherwise null
 */
async function fetchShowFromTrakt(traktIdentifier) {
  const token = await getToken();

  try {
    const res = await fetch("/.netlify/functions/getShowDetails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ token, traktIdentifier }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`getShowDetails failed: ${res.status} ${text}`);
    }

    const data = await res.json();

    return data;
  } catch (error) {
    console.error("Error fetching show details:", error);
    return null;
  }
}

/**
 * Searches for TV shows on Trakt API using a query string.
 *
 * @param {string} token - The user's Trakt OAuth token for authentication.
 * @param {string} query - Search query (show name).
 * @param {number} [page=1] - Page number for pagination (default: 1).
 * @param {number} [limit=10] - Number of results per page (default: 10).
 * @returns {Promise<Object>} Object with `results` array and `pagination` info.
 */
export async function searchShows(token, query, page = 1, limit = 10) {
  if (!token || !query || !query.trim()) {
    throw new Error("Token and query are required");
  }

  const res = await fetch("/.netlify/functions/searchShows", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      token,
      query: query.trim(),
      page,
      limit,
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Search failed: ${res.status} ${text}`);
  }

  const data = await res.json();
  return data;
}

/**
 * Marks or unmarks an episode as watched via a Netlify function
 * and synchronizes the change with Trakt.
 *
 * @param {string} showId - Internal show UUID.
 * @param {string} episodeId - Internal episode UUID.
 * @param {boolean} markAsWatched - true to mark as watched, false to unmark.
 * @returns {Promise<boolean>} Returns true on success, throws on failure.
 * @throws {Error} If the request fails or the server returns an error.
 */
export async function markEpisode(showId, episodeId, markAsWatched) {
  const token = await getToken();
  const { id: userId } = await getUser();

  const res = await fetch("/.netlify/functions/markEpisode", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      token,
      userId,
      action: markAsWatched ? "mark" : "unmark",
      showId,
      episodeId,
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`markEpisode failed: ${res.status} ${text}`);
  }

  return true;
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

/**
 * Add or remove a show from user's Trakt collection.
 *
 * @param {string} token - Trakt access token
 * @param {string|number} showId - Trakt show ID
 * @param {boolean} add - true to add, false to remove
 * @returns {Promise<Object>} Response from Trakt API
 */
export async function manageCollection(token, showId, add) {
  const res = await fetch("/.netlify/functions/manageCollection", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      token,
      showId,
      action: add ? "add" : "remove",
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`manageCollection failed: ${res.status} ${text}`);
  }

  const data = await res.json();
  return data;
}

/**
 * Fetches next episode information for multiple shows from Trakt API.
 *
 * @param {string} token - Trakt access token
 * @param {Array<string|number>} showIds - Array of Trakt show IDs
 * @returns {Promise<Array>} Array of objects with showId and nextEpisode
 */
export async function getNextEpisodes(token, showIds) {
  if (!token || !Array.isArray(showIds) || showIds.length === 0) {
    throw new Error("Token and non-empty showIds array are required");
  }

  const res = await fetch("/.netlify/functions/getNextEpisodes", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      token,
      showIds,
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`getNextEpisodes failed: ${res.status} ${text}`);
  }

  const data = await res.json();
  return data;
}
