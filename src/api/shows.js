import { getAccessToken } from "../stores/userStore.js";

/**
 * Parses a Netlify function error body into a useful Error.
 *
 * @param {number} status
 * @param {string} text
 * @param {string} fallback
 * @returns {Error}
 */
function apiError(status, text, fallback) {
  let payload = null;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    /* non-JSON */
  }

  const message =
    payload?.error ||
    (text && text.length < 400 && !/^\s*</.test(text) ? text : null) ||
    `${fallback} (${status})`;

  const err = new Error(message);
  err.status = status;
  err.code = payload?.code || null;
  err.traktWarning = payload?.traktWarning || null;
  err.traktReconnectRequired =
    payload?.code === "TRAKT_RECONNECT_REQUIRED" ||
    /trakt account not connected|reconnect|refresh token/i.test(message);
  return err;
}

async function authHeaders() {
  const access_token = await getAccessToken();
  if (!access_token) {
    const err = new Error("Not signed in. Please refresh the page and try again.");
    err.code = "AUTH_REQUIRED";
    throw err;
  }
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${access_token}`,
  };
}

/**
 * Fetches show details from Supabase (or Trakt if not cached),
 * enriched with seasons and episodes.
 *
 * @param {string} traktIdentifier - Trakt show identifier
 * @returns {Promise<Object>} Show data
 * @throws {Error} When the request fails (includes .code / .traktReconnectRequired)
 */
export async function getShowDetails(traktIdentifier) {
  if (!traktIdentifier) {
    const err = new Error("Missing show id.");
    err.code = "SHOW_NOT_FOUND";
    throw err;
  }

  const res = await fetch("/.netlify/functions/getShowDetails", {
    method: "POST",
    headers: await authHeaders(),
    body: JSON.stringify({ traktIdentifier }),
  });

  const text = await res.text().catch(() => "");

  if (!res.ok) {
    throw apiError(res.status, text, "Failed to load show details");
  }

  try {
    return text ? JSON.parse(text) : null;
  } catch {
    throw apiError(res.status, text, "Failed to load show details");
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

  const res = await fetch("/.netlify/functions/searchShows", {
    method: "POST",
    headers: await authHeaders(),
    body: JSON.stringify({
      query: query.trim(),
      page,
      limit,
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw apiError(res.status, text, "Search failed");
  }

  return await res.json();
}

/**
 * Fetches curated show lists from Trakt (trending, popular, anticipated).
 *
 * @param {"trending"|"popular"|"anticipated"} type - List type.
 * @param {number} [page=1] - Page number for pagination.
 * @param {number} [limit=10] - Results per page.
 * @returns {Promise<Object>} Object with `shows` array and `pagination` info.
 */
export async function getTraktShows(type = "trending", page = 1, limit = 10) {
  const res = await fetch("/.netlify/functions/getTraktShows", {
    method: "POST",
    headers: await authHeaders(),
    body: JSON.stringify({ type, page, limit }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw apiError(res.status, text, "Failed to load shows");
  }

  return await res.json();
}

/**
 * Fetches Trakt “related” shows for a given show (recommendations-style).
 *
 * @param {string} traktIdentifier - Trakt slug or numeric id of the current show.
 * @param {number} [page=1] - Page number.
 * @param {number} [limit=20] - Results per page.
 * @returns {Promise<Object>} Object with `shows` array and `pagination` info.
 */
export async function getRelatedShows(
  traktIdentifier,
  page = 1,
  limit = 20
) {
  const res = await fetch("/.netlify/functions/getRelatedShows", {
    method: "POST",
    headers: await authHeaders(),
    body: JSON.stringify({ traktIdentifier, page, limit }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw apiError(res.status, text, "Failed to load related shows");
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
export async function manageCollection(showId, addToCollection, listId) {
  const payload = {
    showId,
    action: addToCollection ? "add" : "remove",
  };
  if (listId) payload.listId = listId;

  const res = await fetch("/.netlify/functions/manageCollection", {
    method: "POST",
    headers: await authHeaders(),
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw apiError(res.status, text, "Failed to update collection");
  }

  return await res.json();
}
