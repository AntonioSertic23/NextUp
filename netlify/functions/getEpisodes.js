// ========================================================
// getEpisodes.js - Netlify serverless function
// ========================================================

/**
 * Netlify serverless function ...
 *
 * @async
 * @function handler
 * @param {object} event - Netlify event object containing request details.
 * @returns {Promise<object>} - Response object with `statusCode` and `body` (JSON string).
 */

import fetch from "node-fetch";

const BASE_URL = "https://api.trakt.tv";

export async function handler(event) {
  // Only allow POST requests
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  // Parse token from request body
  const { token, showId } = JSON.parse(event.body);

  if (!token) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Missing 'token' in request body." }),
    };
  }

  try {
    // Fetch user's watchlist
    const episodesRes = await fetch(
      `${BASE_URL}/shows/${showId}/seasons?extended=episodes`,
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

    if (!episodesRes.ok) {
      const text = await episodesRes.text();
      return {
        statusCode: episodesRes.status,
        body: JSON.stringify({ error: text }),
      };
    }

    const seasons = await episodesRes.json();

    return { statusCode: 200, body: JSON.stringify(seasons) };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
}
