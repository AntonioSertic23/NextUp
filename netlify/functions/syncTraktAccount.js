// ========================================================
// functions/syncTraktAccount.js
//
// Full Trakt → Supabase sync for a single user.
//
// Flow:
//   1. Authenticate user (Supabase JWT → userId)
//   2. Obtain valid Trakt access token (auto-refreshed if expired)
//   3. GET /users/me/watched/shows from Trakt (full metadata + images)
//   4. For each show (parallel, max 5 concurrent):
//      a. Upsert show metadata → get DB showId
//      b. GET /shows/{id}/seasons with episodes from Trakt
//      c. Upsert seasons + episodes in batches
//      d. Upsert user watch progress (user_episodes) in batch
//      e. Upsert list_shows entry with computed progress
//   5. Return summary (synced / failed counts)
// ========================================================

import fetch from "node-fetch";
import { TRAKT_BASE_URL, getTraktHeaders } from "../lib/trakt.js";
import {
  saveShow,
  saveTraktUserEpisodes,
  saveShowSeasonsAndEpisodes,
  addShowToList,
  getDefaultListId,
  resolveUserIdFromToken,
  getValidTraktToken,
} from "../lib/supabase.js";

const CONCURRENCY = 10;

/**
 * Process a batch of promises with a concurrency limit.
 * Each task is a function that returns a promise.
 */
async function runWithConcurrency(tasks, limit) {
  const results = [];
  let idx = 0;

  async function worker() {
    while (idx < tasks.length) {
      const i = idx++;
      results[i] = await tasks[i]().then(
        (val) => ({ status: "fulfilled", value: val }),
        (err) => ({ status: "rejected", reason: err }),
      );
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(limit, tasks.length) }, worker),
  );
  return results;
}

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

  try {
    const traktToken = await getValidTraktToken(userId);

    const listId = await getDefaultListId(userId);
    if (!listId) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "Default list not found for user" }),
      };
    }

    const watchedRes = await fetch(
      `${TRAKT_BASE_URL}/users/me/watched/shows?extended=full,images`,
      { headers: getTraktHeaders(traktToken) },
    );

    if (!watchedRes.ok) {
      return {
        statusCode: watchedRes.status,
        body: JSON.stringify({ error: "Failed to fetch watched shows" }),
      };
    }

    const watchedShows = await watchedRes.json();
    const total = watchedShows.length;
    const t0 = Date.now();
    console.log(
      `[sync] Starting parallel sync for ${total} shows (concurrency: ${CONCURRENCY})`,
    );

    const tasks = watchedShows.map(
      (entry, i) => () =>
        syncSingleShow(entry, i, total, traktToken, listId, userId),
    );
    const results = await runWithConcurrency(tasks, CONCURRENCY);

    let synced = 0;
    const errors = [];

    for (const result of results) {
      if (result.status === "fulfilled") {
        synced++;
      } else {
        errors.push(result.reason.message);
      }
    }

    const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
    console.log(
      `[sync] Done in ${elapsed}s — ${synced} synced, ${errors.length} failed`,
    );

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: `Sync completed in ${elapsed}s: ${synced} synced, ${errors.length} failed`,
        synced,
        failed: errors.length,
        errors: errors.length ? errors : undefined,
      }),
    };
  } catch (err) {
    console.error("syncTraktAccount fatal error:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
}

async function syncSingleShow(entry, index, total, traktToken, listId, userId) {
  const title = entry.show?.title || "Unknown";
  const t0 = Date.now();

  try {
    const result = await saveShow(entry.show, entry.last_watched_at);
    if (!result) throw new Error("saveShow returned null");

    const { showId } = result;

    const seasonsRes = await fetch(
      `${TRAKT_BASE_URL}/shows/${entry.show.ids.trakt}/seasons?extended=episodes,images&specials=false&count_specials=false`,
      { headers: getTraktHeaders(traktToken) },
    );

    if (!seasonsRes.ok) {
      throw new Error(`Trakt seasons API ${seasonsRes.status}`);
    }

    const seasons = await seasonsRes.json();

    await saveShowSeasonsAndEpisodes(seasons, showId);

    if (entry.seasons?.length) {
      await saveTraktUserEpisodes(entry.seasons, showId, userId);
    }

    await addShowToList(showId, listId, userId);

    console.log(
      `[sync] (${index + 1}/${total}) "${title}" OK in ${Date.now() - t0}ms`,
    );
  } catch (err) {
    console.error(
      `[sync] (${index + 1}/${total}) "${title}" FAILED in ${Date.now() - t0}ms: ${err.message}`,
    );
    throw new Error(`${title}: ${err.message}`);
  }
}
