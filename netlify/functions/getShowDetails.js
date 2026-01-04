// ========================================================
// functions/getShowDetails.js
// ========================================================

import fetch from "node-fetch";
import {
  saveShow,
  saveShowSeasonsAndEpisodes,
  getShowWithSeasonsAndEpisodes,
} from "../lib/supabaseService.js";

const BASE_URL = "https://api.trakt.tv";

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Netlify serverless function to fetch a show's details from Trakt API and store them in the database.
 *
 * - Only accepts POST requests; returns 405 otherwise.
 * - Expects a JSON body containing:
 *   - `token`: user's Trakt access token
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

  const { token, traktIdentifier } = body;

  if (!token) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Missing 'token' in request body." }),
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

  try {
    // Fetch show details
    const showRes = await fetch(
      `${BASE_URL}/shows/${encodeURIComponent(
        traktIdentifier.trim()
      )}?extended=full,images`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
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
          Authorization: `Bearer ${token}`,
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

    const showId = await saveShow(show);

    await saveShowSeasonsAndEpisodes(seasons, showId);

    await delay(300);

    const result = await getShowWithSeasonsAndEpisodes(showId);

    return { statusCode: 200, body: JSON.stringify(result) };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
}
