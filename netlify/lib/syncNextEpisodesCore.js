// Shared logic for manual HTTP sync and the scheduled background job.

import fetch from "node-fetch";
import { TRAKT_BASE_URL, getTraktHeaders } from "./trakt.js";
import {
  saveShowSeasonsAndEpisodes,
  saveShowGenres,
  getAllTrackedShows,
  updateShowMetadata,
  refreshListShowsForShow,
} from "./supabase.js";

const BATCH_SIZE = 5;

function traktShowPath(show) {
  return encodeURIComponent(String(show.slug_id || show.trakt_id));
}

async function fetchTraktJson(url) {
  const res = await fetch(url, { headers: getTraktHeaders() });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Trakt API ${res.status}: ${text.slice(0, 200)}`);
  }
  return res.json();
}

/**
 * Checks a single show for new episodes and updates the database.
 */
async function processShow(show, results) {
  const path = traktShowPath(show);

  try {
    let showData;
    try {
      showData = await fetchTraktJson(
        `${TRAKT_BASE_URL}/shows/${path}?extended=full`,
      );
    } catch (err) {
      if (show.slug_id && String(show.trakt_id) !== String(show.slug_id)) {
        showData = await fetchTraktJson(
          `${TRAKT_BASE_URL}/shows/${encodeURIComponent(show.slug_id)}?extended=full`,
        );
      } else {
        throw err;
      }
    }

    const traktAired = showData.aired_episodes || 0;
    const dbAired = show.aired_episodes || 0;

    if (traktAired <= dbAired) {
      results.skipped.push(show.title);
      return;
    }

    let seasons;
    try {
      seasons = await fetchTraktJson(
        `${TRAKT_BASE_URL}/shows/${path}/seasons?extended=full,episodes,images&specials=false&count_specials=false`,
      );
    } catch (err) {
      if (show.slug_id) {
        seasons = await fetchTraktJson(
          `${TRAKT_BASE_URL}/shows/${encodeURIComponent(show.slug_id)}/seasons?extended=full,episodes,images&specials=false&count_specials=false`,
        );
      } else {
        throw err;
      }
    }

    if (Array.isArray(seasons) && seasons.length) {
      await saveShowSeasonsAndEpisodes(seasons, show.id);
    } else {
      console.warn(
        `[syncNextEpisodes] No seasons returned for "${show.title}" — updating metadata only`,
      );
    }

    await updateShowMetadata(show.id, {
      aired_episodes: traktAired,
      status: showData.status,
    });

    if (showData.genres?.length) {
      await saveShowGenres(show.id, showData.genres);
    }

    await refreshListShowsForShow(show.id);

    // Push for “just aired” is handled by notifyAiredEpisodes-background
    // using episodes.first_aired (same countdown as My Shows → Upcoming).
    results.updated.push(show.title);
  } catch (err) {
    console.error(`Error syncing "${show.title}":`, err);
    results.errors.push({ show: show.title, error: err.message });
  }
}

/**
 * Walks all tracked shows and syncs newly aired episodes from Trakt.
 *
 * @returns {Promise<{message: string, updated: string[], skipped: string[], errors: Array, notificationsSent: number}>}
 */
export async function runSyncNextEpisodes() {
  const shows = await getAllTrackedShows();

  if (!shows?.length) {
    return { message: "No shows to sync", updated: [], skipped: [], errors: [] };
  }

  const results = {
    updated: [],
    skipped: [],
    errors: [],
  };

  for (let i = 0; i < shows.length; i += BATCH_SIZE) {
    const batch = shows.slice(i, i + BATCH_SIZE);
    await Promise.all(batch.map((show) => processShow(show, results)));
  }

  console.log("Sync completed:", JSON.stringify(results));

  return { message: "Sync completed", ...results };
}
