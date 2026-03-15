// ========================================================
// getNextEpisodes.js - Netlify serverless function to fetch next episodes for shows
// ========================================================

import fetch from "node-fetch";
import { TRAKT_BASE_URL, getTraktHeaders } from "../lib/trakt.js";
import {
  resolveUserIdFromToken,
  getValidTraktToken,
} from "../lib/supabase.js";

/**
 * Fetches next episode information for multiple shows from Trakt API.
 * Authenticates via Supabase JWT and reads Trakt token from the database.
 *
 * @param {Object} event - Netlify event object
 * @returns {Promise<Object>} Response with next episode data for each show
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

  const { showIds } = body;

  if (!Array.isArray(showIds) || showIds.length === 0) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Missing or empty 'showIds' array." }),
    };
  }

  try {
    const traktToken = await getValidTraktToken(userId);
    const concurrency = 5;
    const results = [];

    async function fetchNextEpisode(showId) {
      try {
        const res = await fetch(
          `${TRAKT_BASE_URL}/shows/${showId}/next_episode`,
          { headers: getTraktHeaders(traktToken) }
        );

        if (!res.ok) {
          if (res.status === 404) {
            return { showId, nextEpisode: null };
          }
          const text = await res.text().catch(() => "");
          console.warn(
            `Next episode fetch failed for show ${showId}:`,
            res.status,
            text
          );
          return { showId, nextEpisode: null };
        }

        const nextEpisode = await res.json();
        return { showId, nextEpisode };
      } catch (err) {
        console.warn("Next episode fetch error for show", showId, err.message);
        return { showId, nextEpisode: null };
      }
    }

    for (let i = 0; i < showIds.length; i += concurrency) {
      const batch = showIds.slice(i, i + concurrency);
      const promises = batch.map((showId) => fetchNextEpisode(showId));
      const batchResults = await Promise.all(promises);
      results.push(...batchResults);
    }

    return { statusCode: 200, body: JSON.stringify(results) };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
}
