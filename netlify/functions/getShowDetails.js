// ========================================================
// functions/getShowDetails.js
// ========================================================

import fetch from "node-fetch";
import {
  saveShow,
  saveShowSeasonsAndEpisodes,
  getShowWithSeasonsAndEpisodes,
  resolveUserIdFromToken,
} from "../lib/supabaseService.js";

const BASE_URL = "https://api.trakt.tv";

/**
 * Netlify serverless function to fetch a show's details from Trakt API and store them in the database.
 *
 * - Only accepts POST requests; returns 405 otherwise.
 * - Expects a JSON body containing:
 *   - `traktToken`: user's Trakt access token
 *   - `traktIdentifier`: Trakt show identifier
 * - Fetches show details and seasons with episodes from Trakt.
 * - Saves the show and its seasons/episodes to the database.
 * - Returns the nested show object with seasons and episodes.
 * - Returns appropriate HTTP status codes and error messages on failure.
 *
 * @async
 * @function handler
 * @param {object} event - Netlify event object containing request details.
 * @returns {Promise<{statusCode: number, body: string}>} Response object with status code and JSON body.
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

  let userId;

  try {
    userId = await resolveUserIdFromToken(event.headers.authorization);
  } catch (err) {
    return {
      statusCode: 401,
      body: JSON.stringify({ error: err.message }),
    };
  }

  const { traktToken, traktIdentifier } = body;

  if (!traktToken) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Missing Trakt token in request body." }),
    };
  }

  if (!traktIdentifier) {
    return {
      statusCode: 400,
      body: JSON.stringify({
        error: "Missing 'traktIdentifier' in request body.",
      }),
    };
  }

  // Try database first
  try {
    const result = await getShowWithSeasonsAndEpisodes(userId, traktIdentifier);

    if (result) return { statusCode: 200, body: JSON.stringify(result) };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }

  // If not in DB, fallback to Trakt
  try {
    // Fetch show details
    const showRes = await fetch(
      `${BASE_URL}/shows/${encodeURIComponent(
        traktIdentifier.trim()
      )}?extended=full,images`,
      {
        headers: {
          Authorization: `Bearer ${traktToken}`,
          "trakt-api-version": "2",
          "trakt-api-key": process.env.TRAKT_CLIENT_ID,
          "Content-Type": "application/json",
        },
      }
    );

    if (!showRes.ok) {
      const text = await showRes.text();
      return {
        statusCode: showRes.status,
        body: JSON.stringify({ error: text }),
      };
    }

    const show = await showRes.json();

    // Fetch seasons with episodes
    const seasonsRes = await fetch(
      `${BASE_URL}/shows/${traktIdentifier}/seasons?extended=episodes,images&specials=false&count_specials=false`,
      {
        headers: {
          Authorization: `Bearer ${traktToken}`,
          "trakt-api-version": "2",
          "trakt-api-key": process.env.TRAKT_CLIENT_ID,
          "Content-Type": "application/json",
        },
      }
    );

    if (!seasonsRes.ok) {
      const text = await seasonsRes.text();
      return {
        statusCode: seasonsRes.status,
        body: JSON.stringify({ error: text }),
      };
    }

    const seasons = await seasonsRes.json();

    const { showId: newShowId, traktIdentifier: newTraktIdentifier } =
      await saveShow(show);

    await saveShowSeasonsAndEpisodes(seasons, newShowId);

    const result = await getShowWithSeasonsAndEpisodes(
      userId,
      newTraktIdentifier
    );

    return { statusCode: 200, body: JSON.stringify(result) };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
}
