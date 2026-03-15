// ========================================================
// searchShows.js - Netlify serverless function for searching shows
// ========================================================

import fetch from "node-fetch";
import { TRAKT_BASE_URL, getTraktHeaders } from "../lib/traktService.js";
import {
  resolveUserIdFromToken,
  getValidTraktToken,
} from "../lib/supabaseService.js";

/**
 * Netlify serverless function to search for TV shows on Trakt API.
 *
 * - Only allows POST requests (returns 405 otherwise).
 * - Authenticates via Supabase JWT and reads Trakt token from the database.
 * - Expects a JSON body with `query` (search term).
 * - Returns 500 with an error message if a network or API issue occurs.
 *
 * @async
 * @function handler
 * @param {object} event - Netlify event object containing request details.
 * @returns {Promise<object>} - Response object with `statusCode` and `body` (JSON string).
 */
export async function handler(event) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  let body;
  try {
    body = JSON.parse(event.body);
  } catch (err) {
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

  const { query, page = 1, limit = 10 } = body;

  if (!query || !query.trim()) {
    return {
      statusCode: 400,
      body: JSON.stringify({
        error: "Missing or empty 'query' in request body.",
      }),
    };
  }

  try {
    const traktToken = await getValidTraktToken(userId);

    const searchRes = await fetch(
      `${TRAKT_BASE_URL}/search/show?query=${encodeURIComponent(
        query.trim()
      )}&extended=full,images&page=${page}&limit=${limit}`,
      { headers: getTraktHeaders(traktToken) }
    );

    if (!searchRes.ok) {
      const text = await searchRes.text();
      return {
        statusCode: searchRes.status,
        body: JSON.stringify({ error: text }),
      };
    }

    const results = await searchRes.json();

    // Extract pagination info from headers
    const pagination = {
      page: parseInt(searchRes.headers.get("X-Pagination-Page") || "1", 10),
      limit: parseInt(searchRes.headers.get("X-Pagination-Limit") || "10", 10),
      pageCount: parseInt(
        searchRes.headers.get("X-Pagination-Page-Count") || "1",
        10
      ),
      itemCount: parseInt(
        searchRes.headers.get("X-Pagination-Item-Count") || "0",
        10
      ),
    };

    return {
      statusCode: 200,
      body: JSON.stringify({ results, pagination }),
    };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
}
