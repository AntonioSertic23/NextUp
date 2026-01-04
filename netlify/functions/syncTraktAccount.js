// ========================================================
// functions/syncTraktAccount.js
// ========================================================

import fetch from "node-fetch";
import {
  SUPABASE,
  saveShow,
  saveUserEpisodes,
  saveShowSeasonsAndEpisodes,
} from "../lib/supabaseService.js";

const BASE_URL = "https://api.trakt.tv";

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Serverless handler to sync user's Trakt collection
 *
 * Behavior:
 * - Fetches watched shows from Trakt
 * - Saves shows, seasons, episodes and user watched episodes to Supabase
 * - Processes all shows sequentially with a 300ms delay between shows
 *
 * @param {import('@netlify/functions').HandlerEvent} event - Netlify function event
 * @returns {Promise<{statusCode: number, body?: string}>} HTTP response
 */
export async function handler(event) {
  // Only allow POST requests
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  let traktToken;
  try {
    traktToken = JSON.parse(event.body)?.token;
  } catch {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Invalid JSON" }),
    };
  }

  if (!traktToken) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Missing Trakt token" }),
    };
  }

  const supabaseAccessToken = event.headers.authorization?.replace(
    "Bearer ",
    ""
  );

  if (!supabaseAccessToken) {
    return {
      statusCode: 401,
      body: "Missing supabase token in headers",
    };
  }

  const { data: userData, error } = await SUPABASE.auth.getUser(
    supabaseAccessToken
  );

  if (error || !userData?.user)
    return { statusCode: 401, body: "Invalid user" };

  const userId = userData.user.id;

  // Fetch watched shows
  const watchedRes = await fetch(
    `${BASE_URL}/users/me/watched/shows?extended=images,full`,
    {
      headers: {
        Authorization: `Bearer ${traktToken}`,
        "trakt-api-version": "2",
        "trakt-api-key": process.env.TRAKT_CLIENT_ID,
        "Content-Type": "application/json",
      },
    }
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
        `${BASE_URL}/shows/${show.show.ids.trakt}/seasons?extended=episodes,images&specials=false&count_specials=false`,
        {
          headers: {
            Authorization: `Bearer ${traktToken}`,
            "trakt-api-version": "2",
            "trakt-api-key": process.env.TRAKT_CLIENT_ID,
            "Content-Type": "application/json",
          },
        }
      );

      if (!seasonsRes.ok) continue;

      const seasons = await seasonsRes.json();

      await saveShowSeasonsAndEpisodes(seasons, showId);

      // Safely access seasons property from Trakt response
      if (show.seasons?.length) {
        await saveUserEpisodes(show.seasons, showId, userId);
      }

      await delay(300);
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
