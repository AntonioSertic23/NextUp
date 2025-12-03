// ========================================================
// getWatchlist.js - Netlify serverless function
// ========================================================

/**
 * Netlify serverless function to fetch the current user's watchlist from the Trakt API.
 *
 * @async
 * @function handler
 * @param {object} event - Netlify event object containing request details.
 * @returns {Promise<object>} - Response object with `statusCode` and `body` (JSON string).
 *
 * Notes:
 * - Only allows POST requests (returns 405 otherwise).
 * - Expects a JSON body with a `token` field (user's Trakt access token).
 * - Uses `process.env.TRAKT_CLIENT_ID` for API authentication.
 * - Returns 500 with an error message if a network or API issue occurs.
 * - Future upgrade: loop through watchlist to fetch watched progress per show.
 */

import fetch from "node-fetch";

const BASE_URL = "https://api.trakt.tv";

export async function handler(event) {
  // Only allow POST requests
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  // Parse token from request body
  const { token } = JSON.parse(event.body);

  if (!token) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Missing 'token' in request body." }),
    };
  }

  try {
    // Fetch user's watchlist
    const watchlistRes = await fetch(
      `${BASE_URL}/users/me/watchlist/shows?extended=images,full`,
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

    if (!watchlistRes.ok) {
      const text = await watchlistRes.text();
      return {
        statusCode: watchlistRes.status,
        body: JSON.stringify({ error: text }),
      };
    }

    const watchlist = await watchlistRes.json();

    // 1) Bulk watched data
    const watchedRes = await fetch(`${BASE_URL}/users/me/watched/shows`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "trakt-api-version": "2",
        "trakt-api-key": process.env.TRAKT_CLIENT_ID,
        "Content-Type": "application/json",
        "User-Agent": "NextUp/1.0.0",
      },
    });

    let watchedData = [];
    if (watchedRes.ok) {
      watchedData = await watchedRes.json();
    } else {
      // If bulk watched fails, log and continue — we'll still attempt to fetch seasons
      const txt = await watchedRes.text().catch(() => "");
      console.warn("Bulk watched fetch failed:", watchedRes.status, txt);
    }

    // Build watchedMap: showId -> raw watched object (exclude specials from watched seasons)
    const watchedMap = {};
    if (Array.isArray(watchedData)) {
      watchedData.forEach((w) => {
        const id = w.show && w.show.ids && w.show.ids.trakt;
        if (!id) return;
        // filter out specials from watched seasons
        const filteredWatched = { ...w };
        if (Array.isArray(w.seasons)) {
          filteredWatched.seasons = w.seasons.filter((s) => {
            if (!s) return false;
            if (s.number === 0) return false;
            if (s.title && /special/i.test(s.title)) return false;
            return true;
          });
        }
        filteredWatched.nextEpisode = w.next_episode || null;
        watchedMap[id] = filteredWatched;
      });
    }

    // 2) For each show, fetch seasons?extended=episodes (limited concurrency)
    const concurrency = 4;
    const results = [];
    const shows = watchlist.slice(); // array of items { show, ... }

    async function fetchSeasonsForShow(item) {
      const showId = item.show && item.show.ids && item.show.ids.trakt;
      if (!showId) return { item, seasons: null };

      try {
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

        if (!seasonsRes.ok) {
          const text = await seasonsRes.text().catch(() => "");
          console.warn(`Seasons fetch failed for show ${showId}:`, seasonsRes.status, text);
          return { item, seasons: null };
        }

        let seasons = await seasonsRes.json();
        // filter out specials from fetched seasons
        if (Array.isArray(seasons)) {
          seasons = seasons.filter((s) => {
            if (!s) return false;
            if (s.number === 0) return false;
            if (s.title && /special/i.test(s.title)) return false;
            return true;
          });
        }
        return { item, seasons };
      } catch (err) {
        console.warn("Seasons fetch error for show", showId, err.message);
        return { item, seasons: null };
      }
    }

    // Run fetches in limited concurrency batches
    for (let i = 0; i < shows.length; i += concurrency) {
      const batch = shows.slice(i, i + concurrency);
      const promises = batch.map((it) => fetchSeasonsForShow(it));
      // wait for batch to finish
      /* eslint-disable no-await-in-loop */
      // eslint comments are for style; Netlify environment may ignore eslint
      const batchResults = await Promise.all(promises);
      results.push(...batchResults);
      /* eslint-enable no-await-in-loop */
    }

    // 3) Merge seasons + watched info into enriched watchlist
    const enrichedWatchlist = results.map(({ item, seasons }) => {
      const showId = item.show && item.show.ids && item.show.ids.trakt;
      const watched = watchedMap[showId] || null;

      // If seasons fetched, annotate episodes with watched info using watchedMap
      if (Array.isArray(seasons)) {
        seasons.forEach((s) => {
          if (!Array.isArray(s.episodes)) return;
          s.episodes.forEach((ep) => {
            // Find corresponding watched season/episode in watchedMap
            let watchedFlag = false;
            let plays = null;
            let lastWatched = null;
            if (watched && Array.isArray(watched.seasons)) {
              const ws = watched.seasons.find((wsn) => wsn.number === s.number);
              if (ws && Array.isArray(ws.episodes)) {
                const wep = ws.episodes.find((we) => we.number === ep.number);
                if (wep) {
                  // Trakt's watched episode entry may have 'plays' or 'completed' boolean
                  plays = wep.plays != null ? wep.plays : wep.completed != null ? (wep.completed ? 1 : 0) : null;
                  watchedFlag = Boolean(plays && plays > 0) || Boolean(wep.completed);
                  lastWatched = wep.last_watched || null;
                }
              }
            }

            // Attach watched metadata to episode
            ep.watched = watchedFlag;
            if (plays != null) ep.plays = plays;
            if (lastWatched) ep.last_watched = lastWatched;
          });
        });
      } else {
        // No seasons fetched; try to reuse item.show.seasons if present (shallow)
        if (Array.isArray(item.show && item.show.seasons)) {
          // keep as-is; we won't annotate per-episode watched flags here
        }
      }

      // Return object shaped like original watchlist item but with enriched seasons and progress
      const enrichedItem = {
        ...item,
        // if seasons fetched, replace item.show.seasons with that data (keeping shape)
        show: {
          ...item.show,
          seasons: Array.isArray(seasons) ? seasons : item.show.seasons || [],
        },
        // attach raw watched info so frontend can compute totals if needed
        progress: watched,
      };

      return enrichedItem;
    });

    return { statusCode: 200, body: JSON.stringify(enrichedWatchlist) };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
}
