import { getSession } from "../stores/userStore.js";

/**
 * Fetches show details from Supabase (or Trakt if not cached),
 * enriched with seasons and episodes.
 *
 * @param {string} traktIdentifier - Trakt show identifier
 * @returns {Promise<Object|null>} Show data if successful, otherwise null
 */
export async function getShowDetails(traktIdentifier) {
  const { access_token } = getSession();

  try {
    const res = await fetch("/.netlify/functions/getShowDetails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${access_token}`,
      },
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
 * Searches for TV shows on Trakt API.
 *
 * @param {string} query - Search query (show name).
 * @param {number} [page=1] - Page number for pagination.
 * @param {number} [limit=10] - Results per page.
 * @returns {Promise<Object>} Object with `results` array and `pagination` info.
 */
export async function searchShows(query, page = 1, limit = 10) {
  if (!query || !query.trim()) {
    throw new Error("Query is required");
  }

  const { access_token } = getSession();

  const res = await fetch("/.netlify/functions/searchShows", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${access_token}`,
    },
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
 * Adds or removes a show from the user's default list.
 *
 * @param {string} showId - Internal show ID
 * @param {boolean} addToCollection - true to add, false to remove
 * @returns {Promise<Object>} API response
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

  return await res.json();
}
