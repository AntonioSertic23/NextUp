// ========================================================
// searchShows.js - Netlify serverless function for searching shows
// ========================================================

import fetch from "node-fetch";

const BASE_URL = "https://api.trakt.tv";

/**
 * Netlify serverless function to search for TV shows on Trakt API.
 *
 * @async
 * @function handler
 * @param {object} event - Netlify event object containing request details.
 * @returns {Promise<object>} - Response object with `statusCode` and `body` (JSON string).
 *
 * Notes:
 * - Only allows POST requests (returns 405 otherwise).
 * - Expects a JSON body with `token` (user's Trakt access token) and `query` (search term).
 * - Uses `process.env.TRAKT_CLIENT_ID` for API authentication.
 * - Returns 500 with an error message if a network or API issue occurs.
 */
export async function handler(event) {
  // Only allow POST requests
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  // Parse request body
  let body;
  try {
    body = JSON.parse(event.body);
  } catch (err) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Invalid JSON body" }),
    };
  }

  const { token, query } = body;

  if (!token) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Missing 'token' in request body." }),
    };
  }

  if (!query || !query.trim()) {
    return {
      statusCode: 400,
      body: JSON.stringify({
        error: "Missing or empty 'query' in request body.",
      }),
    };
  }

  try {
    // Search for shows on Trakt
    const searchRes = await fetch(
      `${BASE_URL}/search/show?query=${encodeURIComponent(
        query.trim()
      )}&extended=full,images`,
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

    if (!searchRes.ok) {
      const text = await searchRes.text();
      return {
        statusCode: searchRes.status,
        body: JSON.stringify({ error: text }),
      };
    }

    const results = await searchRes.json();

    return { statusCode: 200, body: JSON.stringify(results) };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
}
