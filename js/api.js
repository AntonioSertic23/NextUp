// ========================================================
// api.js - Handles all API communication with Trakt and caching logic
// ========================================================

import { getSession } from "./stores/userStore.js";

/**
 * Returns standard headers with Supabase JWT for authenticated requests.
 * @returns {Object} Headers object
 */
function getAuthHeaders() {
  const { access_token } = getSession();
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${access_token}`,
  };
}

/**
 * Fetches show details from Supabase and if it is not there fetches it from Trakt and saves in database.
 * In both cases it retrieves show object enriched with seasons and episodes information
 *
 * @async
 * @param {string} traktIdentifier - Trakt show identifier
 * @returns {Promise<Object|null>} Show data if successful, otherwise null
 */
export async function getShowDetails(traktIdentifier) {
  try {
    const res = await fetch("/.netlify/functions/getShowDetails", {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify({ traktIdentifier }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`getShowDetails failed: ${res.status} ${text}`);
    }

    return await res.json();
  } catch (error) {
    console.error("Error fetching show details:", error);
    return null;
  }
}

/**
 * Searches for TV shows on Trakt API using a query string.
 *
 * @param {string} query - Search query (show name).
 * @param {number} [page=1] - Page number for pagination (default: 1).
 * @param {number} [limit=10] - Number of results per page (default: 10).
 * @returns {Promise<Object>} Object with `results` array and `pagination` info.
 */
export async function searchShows(query, page = 1, limit = 10) {
  if (!query || !query.trim()) {
    throw new Error("Query is required");
  }

  const res = await fetch("/.netlify/functions/searchShows", {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify({
      query: query.trim(),
      page,
      limit,
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Search failed: ${res.status} ${text}`);
  }

  return await res.json();
}

/**
 * Marks or unmarks an episode as watched via a Netlify function
 * and synchronizes the change with Trakt.
 *
 * @param {string} showId - Internal show UUID.
 * @param {Array} episodeIds - List of internal episode UUIDs.
 * @param {boolean} markAsWatched - true to mark as watched, false to unmark.
 * @returns {Promise<boolean>} Returns true on success, throws on failure.
 * @throws {Error} If the request fails or the server returns an error.
 */
export async function markEpisodes(showId, episodeIds, markAsWatched) {
  const res = await fetch("/.netlify/functions/markEpisodes", {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify({
      action: markAsWatched ? "mark" : "unmark",
      showId,
      episodeIds,
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`markEpisodes failed: ${res.status} ${text}`);
  }

  return true;
}

/**
 * Adds or removes a show from the user's default list.
 *
 * @async
 * @param {string} showId - Trakt show ID
 * @param {boolean} addToCollection - true to add, false to remove
 * @returns {Promise<Object>} Trakt API response
 * @throws {Error} If the request fails
 */
export async function manageCollection(showId, addToCollection) {
  const res = await fetch("/.netlify/functions/manageCollection", {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify({
      showId,
      action: addToCollection ? "add" : "remove",
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`manageCollection failed: ${res.status} ${text}`);
  }

  return await res.json();
}

/**
 * Fetches next episode information for multiple shows from Trakt API.
 *
 * @param {Array<string|number>} showIds - Array of Trakt show IDs
 * @returns {Promise<Array>} Array of objects with showId and nextEpisode
 */
export async function getNextEpisodes(showIds) {
  if (!Array.isArray(showIds) || showIds.length === 0) {
    throw new Error("Non-empty showIds array is required");
  }

  const res = await fetch("/.netlify/functions/getNextEpisodes", {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify({ showIds }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`getNextEpisodes failed: ${res.status} ${text}`);
  }

  return await res.json();
}
