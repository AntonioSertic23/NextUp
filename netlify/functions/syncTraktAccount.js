// ========================================================
// functions/syncTraktAccount.js
// ========================================================

import fetch from "node-fetch";
import { TRAKT_BASE_URL, getTraktHeaders } from "../lib/traktService.js";
import {
  saveShow,
  saveTraktUserEpisodes,
  saveShowSeasonsAndEpisodes,
  resolveUserIdFromToken,
  getValidTraktToken,
} from "../lib/supabaseService.js";

/**
 * Serverless handler to sync user's Trakt collection
 *
 * Behavior:
 * - Authenticates the user via Supabase JWT
 * - Reads (and auto-refreshes if expired) the user's Trakt token from the database
 * - Fetches watched shows from Trakt
 * - Saves shows, seasons, episodes and user watched episodes to Supabase
 *
 * @param {import('@netlify/functions').HandlerEvent} event - Netlify function event
 * @returns {Promise<{statusCode: number, body?: string}>} HTTP response
 */
export async function handler(event) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
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

  let traktToken;
  try {
    traktToken = await getValidTraktToken(userId);
  } catch (err) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: err.message }),
    };
  }

  // Fetch watched shows
  const watchedRes = await fetch(
    `${TRAKT_BASE_URL}/users/me/watched/shows?extended=images,full`,
    { headers: getTraktHeaders(traktToken) }
  );

  if (!watchedRes.ok) {
    return {
      statusCode: watchedRes.status,
      body: JSON.stringify({ error: "Failed to fetch watched shows" }),
    };
  }

  const data = await watchedRes.json();

  for (const show of data) {
    try {
      const showId = await saveShow(show.show, show.last_watched_at);

      // Fetch seasons
      const seasonsRes = await fetch(
        `${TRAKT_BASE_URL}/shows/${show.show.ids.trakt}/seasons?extended=episodes,images&specials=false&count_specials=false`,
        { headers: getTraktHeaders(traktToken) }
      );

      if (!seasonsRes.ok) continue;

      const seasons = await seasonsRes.json();

      await saveShowSeasonsAndEpisodes(seasons, showId);

      // Safely access seasons property from Trakt response
      if (show.seasons?.length) {
        await saveTraktUserEpisodes(show.seasons, showId, userId);
      }
    } catch (err) {
      console.error("Error processing show:", show.show.title, err);
      continue; // Continue with next show
    }
  }

  return {
    statusCode: 200,
    body: JSON.stringify({ message: "Sync completed" }),
  };
}
