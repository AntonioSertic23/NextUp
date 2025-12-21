// ========================================================
// manageCollection.js - Netlify serverless function for adding/removing shows from collection
// ========================================================

import fetch from "node-fetch";

const BASE_URL = "https://api.trakt.tv";

/**
 * Netlify serverless function to add or remove a show from user's Trakt collection.
 *
 * @async
 * @function handler
 * @param {object} event - Netlify event object containing request details.
 * @returns {Promise<object>} - Response object with `statusCode` and `body` (JSON string).
 *
 * Notes:
 * - Only allows POST requests (returns 405 otherwise).
 * - Expects a JSON body with `token`, `showId`, and `action` ("add" or "remove").
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

  const { token, showId, action } = body;

  if (!token) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Missing 'token' in request body." }),
    };
  }

  if (!showId) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Missing 'showId' in request body." }),
    };
  }

  if (!action || (action !== "add" && action !== "remove")) {
    return {
      statusCode: 400,
      body: JSON.stringify({
        error: "Missing or invalid 'action'. Must be 'add' or 'remove'.",
      }),
    };
  }

  try {
    if (action === "add") {
      // POST /sync/collection
      const payload = {
        shows: [{ ids: { trakt: parseInt(showId, 10) } }],
      };

      const res = await fetch(`${BASE_URL}/sync/collection`, {
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
        return {
          statusCode: res.status,
          body: JSON.stringify({ error: text }),
        };
      }

      const data = await res.json();
      return { statusCode: 200, body: JSON.stringify(data) };
    } else {
      // POST /sync/collection/remove
      const payload = {
        shows: [{ ids: { trakt: parseInt(showId, 10) } }],
      };

      const res = await fetch(`${BASE_URL}/sync/collection/remove`, {
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
        return {
          statusCode: res.status,
          body: JSON.stringify({ error: text }),
        };
      }

      const data = await res.json();
      return { statusCode: 200, body: JSON.stringify(data) };
    }
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
}
