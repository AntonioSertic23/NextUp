// ========================================================
// getWatchlist.js - Netlify serverless function
// ========================================================

/**
 * Netlify serverless function to fetch the current user's watchlist from the Trakt API.
 *
 * @async
 * @function handler
 * @param {object} event - Netlify event object containing request details.
 * @returns {Promise<object>} - Response object with `statusCode` and `body` (JSON string).
 *
 * Notes:
 * - Only allows POST requests (returns 405 otherwise).
 * - Expects a JSON body with a `token` field (user's Trakt access token).
 * - Uses `process.env.TRAKT_CLIENT_ID` for API authentication.
 * - Returns 500 with an error message if a network or API issue occurs.
 * - Future upgrade: loop through watchlist to fetch watched progress per show.
 */

import fetch from "node-fetch";

const BASE_URL = "https://api.trakt.tv";

export async function handler(event) {
  // Only allow POST requests
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  // Parse token from request body
  const { token } = JSON.parse(event.body);

  if (!token) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Missing 'token' in request body." }),
    };
  }

  try {
    // Fetch user's watchlist
    const watchlistRes = await fetch(`${BASE_URL}/users/me/watchlist/shows`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "trakt-api-version": "2",
        "trakt-api-key": process.env.TRAKT_CLIENT_ID,
        "Content-Type": "application/json",
        "User-Agent": "NextUp/1.0.0",
      },
    });

    if (!watchlistRes.ok) {
      const text = await watchlistRes.text();
      return {
        statusCode: watchlistRes.status,
        body: JSON.stringify({ error: text }),
      };
    }

    const watchlist = await watchlistRes.json();

    // Fetch progress for each show in parallel
    const progressPromises = watchlist.map(async (item) => {
      const showId = item.show.ids.trakt;

      try {
        const res = await fetch(
          `${BASE_URL}/shows/${showId}/progress/watched`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "trakt-api-version": "2",
              "trakt-api-key": process.env.TRAKT_CLIENT_ID,
              "Content-Type": "application/json",
              "User-Agent": "NextUp/1.0.0",
            },
          }
        );

        if (!res.ok) {
          return { showId, progress: null };
        }

        const data = await res.json();
        return {
          showId,
          progress: {
            watched: data.completed || 0,
            total: data.aired || 0,
            nextEpisode: data.next_episode || null,
            seasons: data.seasons || null,
          },
        };
      } catch (err) {
        return { showId, progress: null };
      }
    });

    const progressResults = await Promise.all(progressPromises);

    // Merge progress into watchlist
    const enrichedWatchlist = watchlist.map((item) => {
      const progressObj = progressResults.find(
        (p) => p.showId === item.show.ids.trakt
      );

      return {
        ...item,
        progress: progressObj ? progressObj.progress : null,
      };
    });

    return { statusCode: 200, body: JSON.stringify(enrichedWatchlist) };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
}
