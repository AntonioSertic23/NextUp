// ========================================================
// functions/getShowDetails.js
// ========================================================

import fetch from "node-fetch";
import { TRAKT_BASE_URL, getTraktHeaders } from "../lib/trakt.js";
import {
  saveShow,
  saveShowSeasonsAndEpisodes,
  getShowWithSeasonsAndEpisodes,
  resolveUserIdFromToken,
  getValidTraktToken,
} from "../lib/supabase.js";

/**
 * Netlify serverless function to fetch a show's details from Trakt API and store them in the database.
 *
 * - Only accepts POST requests; returns 405 otherwise.
 * - Expects a JSON body containing:
 *   - `traktIdentifier`: Trakt show identifier
 * - Authenticates via Supabase JWT and reads Trakt token from the database.
 * - Fetches show details and seasons with episodes from Trakt.
 * - Saves the show and its seasons/episodes to the database.
 * - Returns the nested show object with seasons and episodes.
 *
 * @async
 * @function handler
 * @param {object} event - Netlify event object containing request details.
 * @returns {Promise<{statusCode: number, body: string}>} Response object with status code and JSON body.
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

  const { traktIdentifier } = body;

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

  // If not in DB, fallback to Trakt (public show endpoints work with client id only)
  try {
    let traktToken;
    let traktWarning = null;
    try {
      traktToken = await getValidTraktToken(userId);
    } catch (err) {
      // Same pattern as getTraktShows / getRelatedShows: browsing a show does
      // not require a user OAuth token. Keep a warning so the client can nudge
      // reconnect for sync features that do need a valid token.
      traktWarning = err.message || "Trakt account needs reconnect";
      console.warn(
        "[getShowDetails] Trakt user token unavailable, using client id:",
        traktWarning,
      );
    }

    const encodedId = encodeURIComponent(String(traktIdentifier).trim());
    const headers = getTraktHeaders(traktToken);

    // Show metadata and seasons/episodes are independent Trakt calls.
    const [showRes, seasonsRes] = await Promise.all([
      fetch(`${TRAKT_BASE_URL}/shows/${encodedId}?extended=full,images`, {
        headers,
      }),
      // `extended=full,episodes,images` is needed so episodes include
      // `first_aired`, `overview`, `runtime` etc.
      fetch(
        `${TRAKT_BASE_URL}/shows/${encodedId}/seasons?extended=full,episodes,images&specials=false&count_specials=false`,
        { headers },
      ),
    ]);

    if (!showRes.ok) {
      const text = await showRes.text();
      return {
        statusCode: showRes.status,
        body: JSON.stringify({
          error: text || `Trakt show lookup failed (${showRes.status})`,
          code: showRes.status === 404 ? "SHOW_NOT_FOUND" : "TRAKT_ERROR",
          ...(traktWarning ? { traktWarning } : {}),
        }),
      };
    }

    if (!seasonsRes.ok) {
      const text = await seasonsRes.text();
      return {
        statusCode: seasonsRes.status,
        body: JSON.stringify({
          error: text || `Trakt seasons lookup failed (${seasonsRes.status})`,
          code: "TRAKT_ERROR",
          ...(traktWarning ? { traktWarning } : {}),
        }),
      };
    }

    const [show, seasons] = await Promise.all([
      showRes.json(),
      seasonsRes.json(),
    ]);

    const { showId: newShowId, traktIdentifier: newTraktIdentifier } =
      await saveShow(show);

    await saveShowSeasonsAndEpisodes(seasons, newShowId);

    const result = await getShowWithSeasonsAndEpisodes(
      userId,
      newTraktIdentifier
    );

    if (!result) {
      return {
        statusCode: 500,
        body: JSON.stringify({
          error: "Show was imported from Trakt but could not be loaded.",
          code: "SHOW_LOAD_FAILED",
        }),
      };
    }

    if (traktWarning) {
      result.traktWarning = traktWarning;
      result.traktReconnectRequired = true;
    }

    return { statusCode: 200, body: JSON.stringify(result) };
  } catch (err) {
    const message = err.message || "Failed to load show details";
    const reconnect = /trakt|reconnect|refresh token|not connected/i.test(
      message,
    );
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: message,
        code: reconnect ? "TRAKT_RECONNECT_REQUIRED" : "SHOW_LOAD_FAILED",
      }),
    };
  }
}
