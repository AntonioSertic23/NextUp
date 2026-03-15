// ========================================================
// getEpisodeDetails.js - Netlify serverless function to fetch episode details
// ========================================================

import fetch from "node-fetch";
import { TRAKT_BASE_URL, getTraktHeaders } from "../lib/traktService.js";
import {
  resolveUserIdFromToken,
  getValidTraktToken,
} from "../lib/supabaseService.js";

/**
 * Fetches detailed information for a specific episode from Trakt API.
 * Authenticates via Supabase JWT and reads Trakt token from the database.
 *
 * @param {Object} event - Netlify event object
 * @returns {Promise<Object>} Response with episode details
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

  const { showId, season, episode } = body;

  if (!showId || season == null || episode == null) {
    return {
      statusCode: 400,
      body: JSON.stringify({
        error: "Missing showId, season, or episode",
      }),
    };
  }

  try {
    const traktToken = await getValidTraktToken(userId);

    const res = await fetch(
      `${TRAKT_BASE_URL}/shows/${showId}/seasons/${season}/episodes/${episode}?extended=full,images`,
      { headers: getTraktHeaders(traktToken) }
    );

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return {
        statusCode: res.status,
        body: JSON.stringify({ error: text }),
      };
    }

    const episodeData = await res.json();
    return { statusCode: 200, body: JSON.stringify({ episode: episodeData }) };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
}
