// ========================================================
// functions/markEpisodes.js - Netlify function to mark/unmark an episode as watched on Trakt
// ========================================================

import fetch from "node-fetch";
import {
  saveUserEpisodes,
  deleteUserEpisodes,
  updateListShows,
  resolveUserIdFromToken,
} from "../lib/supabaseService.js";

const BASE_URL = "https://api.trakt.tv";
/**
 * Marks one or more episodes as watched on Trakt.
 *
 * @param {string} token - Trakt OAuth access token
 * @param {Array<number|string>} traktIds - Array of Trakt episode IDs
 * @returns {Promise<boolean>} True if successful
 * @throws {Error} If Trakt API request fails
 */
async function markOnTrakt(token, traktIds) {
  if (!Array.isArray(traktIds) || traktIds.length === 0) return true;

  const payload = {
    episodes: traktIds.map((id) => ({ ids: { trakt: Number(id) } })),
  };

  const res = await fetch(`${BASE_URL}/sync/history`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "trakt-api-version": "2",
      "trakt-api-key": process.env.TRAKT_CLIENT_ID,
      "Content-Type": "application/json",
      "User-Agent": "NextUp/1.0.0",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Trakt mark failed: ${res.status} ${text}`);
  }

  return true;
}

/**
 * Unmarks one or more episodes as watched on Trakt.
 *
 * @param {string} token - Trakt OAuth access token
 * @param {Array<number|string>} traktIds - Array of Trakt episode IDs
 * @returns {Promise<boolean>} True if successful
 * @throws {Error} If Trakt API request fails
 */
async function unmarkOnTrakt(token, traktIds) {
  if (!Array.isArray(traktIds) || traktIds.length === 0) return true;

  const payload = {
    episodes: traktIds.map((id) => ({ ids: { trakt: Number(id) } })),
  };

  const res = await fetch(`${BASE_URL}/sync/history/remove`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "trakt-api-version": "2",
      "trakt-api-key": process.env.TRAKT_CLIENT_ID,
      "Content-Type": "application/json",
      "User-Agent": "NextUp/1.0.0",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Trakt unmark failed: ${res.status} ${text}`);
  }

  return true;
}

/**
 * Netlify function handler for marking or unmarking an episode as watched.
 *
 * Handles POST requests that:
 * - persist episode watch state in Supabase
 * - sync watch state with Trakt.tv
 *
 * @param {Object} event - Netlify function event object
 * @param {string} event.httpMethod - HTTP method used for the request
 * @param {string} event.body - JSON-encoded request body
 * @returns {Promise<{statusCode: number, body: string}>}
 */
export async function handler(event) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  let body;
  try {
    body = JSON.parse(event.body);
  } catch {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Invalid JSON body" }),
    };
  }

  let userId;

  try {
    userId = await resolveUserIdFromToken(event.headers.authorization);
  } catch (err) {
    return {
      statusCode: 401,
      body: JSON.stringify({ error: err.message }),
    };
  }

  const { token, action, showId, episodeIds } = body;

  if (
    !token ||
    !Array.isArray(episodeIds) ||
    episodeIds.length === 0 ||
    !action
  ) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Missing required fields" }),
    };
  }

  try {
    switch (action) {
      case "mark": {
        const traktIds = await saveUserEpisodes(userId, episodeIds);
        await markOnTrakt(token, traktIds);
        await updateListShows(userId, showId, "increment", traktIds.length);
        break;
      }

      case "unmark": {
        const traktIds = await deleteUserEpisodes(userId, episodeIds);
        await unmarkOnTrakt(token, traktIds);
        await updateListShows(userId, showId, "decrement", traktIds.length);
        break;
      }

      default:
        return {
          statusCode: 400,
          body: JSON.stringify({ error: "Unknown action" }),
        };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true }),
    };
  } catch (err) {
    console.error("markEpisodes handler failed:", err);

    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
}
