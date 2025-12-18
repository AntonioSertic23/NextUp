// ========================================================
// getShowDetails.js - Netlify serverless function for fetching a single show's details
// ========================================================

import fetch from "node-fetch";

const BASE_URL = "https://api.trakt.tv";

/**
 * Netlify serverless function to fetch a single show's details from Trakt API.
 *
 * @async
 * @function handler
 * @param {object} event - Netlify event object containing request details.
 * @returns {Promise<object>} - Response object with `statusCode` and `body` (JSON string).
 *
 * Notes:
 * - Only allows POST requests (returns 405 otherwise).
 * - Expects a JSON body with `token` (user's Trakt access token) and `showId` (Trakt show ID).
 * - Fetches show details, seasons with episodes, and watched status.
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

  const { token, showId } = body;

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

  try {
    // Fetch show details
    const showRes = await fetch(
      `${BASE_URL}/shows/${showId}?extended=full,images`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "trakt-api-version": "2",
          "trakt-api-key": process.env.TRAKT_CLIENT_ID,
          "Content-Type": "application/json",
          "User-Agent": "NextUp/1.0.0",
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
      `${BASE_URL}/shows/${showId}/seasons?extended=episodes,images`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "trakt-api-version": "2",
          "trakt-api-key": process.env.TRAKT_CLIENT_ID,
          "Content-Type": "application/json",
          "User-Agent": "NextUp/1.0.0",
        },
      }
    );

    let seasons = [];
    if (seasonsRes.ok) {
      seasons = await seasonsRes.json();
      // Filter out specials
      if (Array.isArray(seasons)) {
        seasons = seasons.filter((s) => {
          if (!s) return false;
          if (s.number === 0) return false;
          if (s.title && /special/i.test(s.title)) return false;
          return true;
        });
      }
    }

    // Try to fetch watched status (optional - may fail if show not in user's collection)
    let watchedData = null;
    try {
      const watchedRes = await fetch(
        `${BASE_URL}/users/me/watched/shows/${showId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "trakt-api-version": "2",
            "trakt-api-key": process.env.TRAKT_CLIENT_ID,
            "Content-Type": "application/json",
            "User-Agent": "NextUp/1.0.0",
          },
        }
      );

      if (watchedRes.ok) {
        watchedData = await watchedRes.json();
      }
    } catch (err) {
      // Watched data is optional, continue without it
      console.warn("Could not fetch watched data for show", showId);
    }

    // Merge seasons into show and annotate episodes with watched status
    if (
      Array.isArray(seasons) &&
      watchedData &&
      Array.isArray(watchedData.seasons)
    ) {
      seasons.forEach((s) => {
        if (!Array.isArray(s.episodes)) return;
        const watchedSeason = watchedData.seasons.find(
          (ws) => ws.number === s.number
        );
        if (watchedSeason && Array.isArray(watchedSeason.episodes)) {
          s.episodes.forEach((ep) => {
            const watchedEp = watchedSeason.episodes.find(
              (we) => we.number === ep.number
            );
            if (watchedEp) {
              const plays =
                watchedEp.plays != null
                  ? watchedEp.plays
                  : watchedEp.completed != null
                  ? watchedEp.completed
                    ? 1
                    : 0
                  : null;
              ep.watched =
                Boolean(plays && plays > 0) || Boolean(watchedEp.completed);
              if (plays != null) ep.plays = plays;
              if (watchedEp.last_watched_at)
                ep.last_watched = watchedEp.last_watched_at;
            } else {
              ep.watched = false;
            }
          });
        } else {
          // No watched data for this season, mark all episodes as unwatched
          s.episodes.forEach((ep) => {
            ep.watched = false;
          });
        }
      });
    } else {
      // No watched data, mark all episodes as unwatched
      seasons.forEach((s) => {
        if (Array.isArray(s.episodes)) {
          s.episodes.forEach((ep) => {
            ep.watched = false;
          });
        }
      });
    }

    // Return show with enriched seasons
    const result = {
      show: {
        ...show,
        seasons: seasons,
      },
    };

    return { statusCode: 200, body: JSON.stringify(result) };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
}
