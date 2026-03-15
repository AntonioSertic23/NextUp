// ========================================================
// functions/syncNextEpisodes.js - Scheduled Netlify function
// Runs weekly to detect new episodes for all tracked shows
// and update the database (episodes, seasons, list_shows).
// ========================================================

import fetch from "node-fetch";
import { TRAKT_BASE_URL, getTraktHeaders } from "../lib/trakt.js";
import {
  saveShowSeasonsAndEpisodes,
  getAllTrackedShows,
  updateShowMetadata,
  refreshListShowsForShow,
} from "../lib/supabase.js";

const BATCH_SIZE = 5;

/**
 * Checks a single show for new episodes and updates the database.
 *
 * Strategy:
 * 1. Fetch show summary from Trakt (lightweight) to compare aired_episodes
 * 2. If Trakt reports more aired episodes than the DB → new content exists
 * 3. Fetch full season/episode data and upsert into the database
 * 4. Refresh all list_shows entries so users see updated progress
 *
 * @param {Object} show - Show record from the database
 * @param {Object} results - Accumulator for updated/skipped/errors
 */
async function processShow(show, results) {
  try {
    const showRes = await fetch(
      `${TRAKT_BASE_URL}/shows/${show.trakt_id}?extended=full`,
      { headers: getTraktHeaders() }
    );

    if (!showRes.ok) {
      results.errors.push({
        show: show.title,
        error: `Trakt API returned ${showRes.status}`,
      });
      return;
    }

    const showData = await showRes.json();
    const traktAired = showData.aired_episodes || 0;
    const dbAired = show.aired_episodes || 0;

    if (traktAired <= dbAired) {
      results.skipped.push(show.title);
      return;
    }

    const seasonsRes = await fetch(
      `${TRAKT_BASE_URL}/shows/${show.trakt_id}/seasons?extended=episodes,images&specials=false&count_specials=false`,
      { headers: getTraktHeaders() }
    );

    if (!seasonsRes.ok) {
      results.errors.push({
        show: show.title,
        error: `Seasons fetch returned ${seasonsRes.status}`,
      });
      return;
    }

    const seasons = await seasonsRes.json();

    await saveShowSeasonsAndEpisodes(seasons, show.id);

    await updateShowMetadata(show.id, {
      aired_episodes: traktAired,
      status: showData.status,
    });

    await refreshListShowsForShow(show.id);

    results.updated.push(show.title);
  } catch (err) {
    console.error(`Error syncing "${show.title}":`, err);
    results.errors.push({ show: show.title, error: err.message });
  }
}

/**
 * Scheduled handler that syncs new episodes for all tracked shows.
 *
 * No user authentication is needed — this uses public Trakt API endpoints
 * (only trakt-api-key required) and the Supabase service role for DB writes.
 */
export const handler = async () => {
  try {
    const shows = await getAllTrackedShows();

    if (!shows?.length) {
      return {
        statusCode: 200,
        body: JSON.stringify({ message: "No shows to sync" }),
      };
    }

    const results = { updated: [], skipped: [], errors: [] };

    for (let i = 0; i < shows.length; i += BATCH_SIZE) {
      const batch = shows.slice(i, i + BATCH_SIZE);
      await Promise.all(batch.map((show) => processShow(show, results)));
    }

    console.log("Sync completed:", JSON.stringify(results));

    return {
      statusCode: 200,
      body: JSON.stringify({ message: "Sync completed", ...results }),
    };
  } catch (err) {
    console.error("syncNextEpisodes failed:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
};

export const config = {
  schedule: "0 5 * * 1",
};
