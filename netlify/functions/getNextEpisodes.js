// ========================================================
// getNextEpisodes.js - Netlify serverless function to fetch next episodes for shows
// ========================================================

import fetch from "node-fetch";

const BASE_URL = "https://api.trakt.tv";

/**
 * Fetches next episode information for multiple shows from Trakt API.
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

  const { token, showIds } = body;

  if (!token) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Missing 'token' in request body." }),
    };
  }

  if (!Array.isArray(showIds) || showIds.length === 0) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Missing or empty 'showIds' array." }),
    };
  }

  try {
    // Fetch next episode for each show with limited concurrency
    const concurrency = 5;
    const results = [];

    async function fetchNextEpisode(showId) {
      try {
        const res = await fetch(`${BASE_URL}/shows/${showId}/next_episode`, {
          headers: {
            Authorization: `Bearer ${token}`,
            "trakt-api-version": "2",
            "trakt-api-key": process.env.TRAKT_CLIENT_ID,
            "Content-Type": "application/json",
            "User-Agent": "NextUp/1.0.0",
          },
        });

        if (!res.ok) {
          // If show has no next episode, return null (not an error)
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

    // Process in batches to limit concurrency
    for (let i = 0; i < showIds.length; i += concurrency) {
      const batch = showIds.slice(i, i + concurrency);
      const promises = batch.map((showId) => fetchNextEpisode(showId));
      /* eslint-disable no-await-in-loop */
      const batchResults = await Promise.all(promises);
      results.push(...batchResults);
      /* eslint-enable no-await-in-loop */
    }

    return { statusCode: 200, body: JSON.stringify(results) };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
}
