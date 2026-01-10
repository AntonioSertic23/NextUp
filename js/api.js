// ========================================================
// api.js - Handles all API communication with Trakt and caching logic
// ========================================================

import { getToken } from "./services/authService.js";
import { getSession } from "./stores/userStore.js";

/**
 * Fetches show details from Supabase and if it is not there fetches it from Trakt and saves in database.
 * In both cases it retrieves show object enriched with seasons and episodes information
 *
 * @async
 * @param {string} traktIdentifier - Trakt show identifier
 * @returns {Promise<Object|null>} Show data if successful, otherwise null
 */
export async function getShowDetails(traktIdentifier) {
  const traktToken = await getToken();
  const { access_token } = getSession();

  try {
    const res = await fetch("/.netlify/functions/getShowDetails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${access_token}`,
      },
      body: JSON.stringify({ traktToken, traktIdentifier }),
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
 * @param {string} query - Search query (show name).
 * @param {number} [page=1] - Page number for pagination (default: 1).
 * @param {number} [limit=10] - Number of results per page (default: 10).
 * @returns {Promise<Object>} Object with `results` array and `pagination` info.
 */
export async function searchShows(query, page = 1, limit = 10) {
  const token = await getToken();

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
 * @param {Array} episodeIds - List of internal episode UUIDs.
 * @param {boolean} markAsWatched - true to mark as watched, false to unmark.
 * @returns {Promise<boolean>} Returns true on success, throws on failure.
 * @throws {Error} If the request fails or the server returns an error.
 */
export async function markEpisodes(showId, episodeIds, markAsWatched) {
  const token = await getToken();
  const { access_token } = getSession();

  const res = await fetch("/.netlify/functions/markEpisodes", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${access_token}`,
    },
    body: JSON.stringify({
      token,
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
  // Call markEpisodes endpoint for each episode trakt id sequentially to avoid rate spikes
  for (const traktId of episodeIds) {
    try {
      const res = await fetch("/.netlify/functions/markEpisodes", {
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
 * Adds or removes a show from the user's default list.
 *
 * @async
 * @param {string} showId - Trakt show ID
 * @param {boolean} addToCollection - true to add, false to remove
 * @returns {Promise<Object>} Trakt API response
 * @throws {Error} If the request fails
 */
export async function manageCollection(showId, addToCollection) {
  const { access_token } = getSession();

  const res = await fetch("/.netlify/functions/manageCollection", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${access_token}`,
    },
    body: JSON.stringify({
      showId,
      action: addToCollection ? "add" : "remove",
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
