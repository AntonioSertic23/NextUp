// markEpisode.js - Netlify function to mark/unmark an episode as watched on Trakt
import fetch from "node-fetch";
import { createClient } from "@supabase/supabase-js";

const BASE_URL = "https://api.trakt.tv";

const SUPABASE = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * Saves a watched episode for a user in the database
 * and returns the Trakt episode ID.
 *
 * @param {string} userId - User UUID.
 * @param {string} episodeId - Episode UUID.
 * @returns {Promise<number>} Trakt episode ID.
 * @throws {Error} If insert or lookup fails.
 */
async function saveUserEpisode(userId, episodeId) {
  try {
    // 1. Insert watched episode
    const { error: insertError } = await SUPABASE.from("user_episodes").insert({
      user_id: userId,
      episode_id: episodeId,
    });

    if (insertError) {
      throw insertError;
    }

    // 2. Fetch trakt_id from episodes table
    const { data, error: fetchError } = await SUPABASE.from("episodes")
      .select("trakt_id")
      .eq("id", episodeId)
      .single();

    if (fetchError || !data) {
      throw new Error("Failed to fetch trakt_id for episode");
    }

    return data.trakt_id;
  } catch (err) {
    console.error("saveUserEpisode failed:", episodeId, err);
    throw err;
  }
}

/**
 * Deletes a watched episode entry for a user
 * and returns the Trakt episode ID.
 *
 * @param {string} userId - User UUID.
 * @param {string} episodeId - Episode UUID.
 * @returns {Promise<number>} Trakt episode ID.
 * @throws {Error} If delete or lookup fails.
 */
async function deleteUserEpisode(userId, episodeId) {
  try {
    // 1. Fetch trakt_id first
    const { data, error: fetchError } = await SUPABASE.from("episodes")
      .select("trakt_id")
      .eq("id", episodeId)
      .single();

    if (fetchError || !data) {
      throw new Error("Failed to fetch trakt_id for episode");
    }

    const traktId = data.trakt_id;

    // 2. Delete watched episode
    const { error: deleteError } = await SUPABASE.from("user_episodes")
      .delete()
      .eq("user_id", userId)
      .eq("episode_id", episodeId);

    if (deleteError) {
      throw deleteError;
    }

    return traktId;
  } catch (err) {
    console.error("deleteUserEpisode failed:", episodeId, err);
    throw err;
  }
}

/**
 * Marks an episode as watched on Trakt.
 *
 * Calls Trakt `/sync/history` endpoint to add the episode
 * to the user's watch history.
 *
 * @param {string} token - Trakt OAuth access token.
 * @param {number|string} traktId - Trakt episode ID.
 * @returns {Promise<boolean>} True if successful.
 * @throws {Error} If Trakt API request fails.
 */
async function markOnTrakt(token, traktId) {
  const res = await fetch(`${BASE_URL}/sync/history`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "trakt-api-version": "2",
      "trakt-api-key": process.env.TRAKT_CLIENT_ID,
      "Content-Type": "application/json",
      "User-Agent": "NextUp/1.0.0",
    },
    body: JSON.stringify({
      episodes: [{ ids: { trakt: Number(traktId) } }],
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Trakt mark failed: ${res.status} ${text}`);
  }

  return true;
}

/**
 * Unmarks (removes) an episode from watched history on Trakt.
 *
 * Calls Trakt `/sync/history/remove` endpoint to remove
 * the episode from the user's watch history.
 *
 * @param {string} token - Trakt OAuth access token.
 * @param {number|string} traktId - Trakt episode ID.
 * @returns {Promise<boolean>} True if successful.
 * @throws {Error} If Trakt API request fails.
 */
async function unmarkOnTrakt(token, traktId) {
  const res = await fetch(`${BASE_URL}/sync/history/remove`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "trakt-api-version": "2",
      "trakt-api-key": process.env.TRAKT_CLIENT_ID,
      "Content-Type": "application/json",
      "User-Agent": "NextUp/1.0.0",
    },
    body: JSON.stringify({
      episodes: [{ ids: { trakt: Number(traktId) } }],
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Trakt unmark failed: ${res.status} ${text}`);
  }

  return true;
}

/**
 * Updates the list_shows entry after marking or unmarking an episode.
 *
 * - Increments or decrements watched_episodes
 * - Recomputes next_episode
 * - Updates completion state only when incrementing
 *
 * @param {string} userId - User UUID.
 * @param {string} showId - Show UUID.
 * @param {"increment" | "decrement"} direction - Update direction.
 * @throws {Error} If database operations fail.
 */
async function updateListShows(userId, showId, direction) {
  try {
    const {
      data: { id: listId },
      error: listError,
    } = await SUPABASE.from("lists")
      .select("id")
      .eq("user_id", userId)
      .eq("is_default", true)
      .single();

    if (listError || !listId) {
      throw new Error("Default list not found for user");
    }

    // Fetch current list_shows row
    const { data: listShow, error: fetchError } = await SUPABASE.from(
      "list_shows"
    )
      .select("id, watched_episodes, total_episodes")
      .eq("list_id", listId)
      .eq("show_id", showId)
      .single();

    if (fetchError || !listShow) {
      throw new Error("Failed to fetch list_shows entry");
    }

    // Compute new watched count
    const delta = direction === "increment" ? 1 : -1;
    const newWatchedCount = Math.max(0, listShow.watched_episodes + delta);

    const isCompleted =
      direction === "increment" && newWatchedCount >= listShow.total_episodes;

    // Fetch all episodes already watched by the user
    const { data: watchedEpisodes, error: watchedError } = await SUPABASE.from(
      "user_episodes"
    )
      .select("episode_id")
      .eq("user_id", userId);

    if (watchedError) throw watchedError;

    // Convert the result to a simple array of IDs
    const watchedIds = watchedEpisodes.map((ep) => ep.episode_id);

    // Fetch next unwatched episode
    const { data: nextEpisode, error: nextEpisodeError } = await SUPABASE.from(
      "episodes"
    )
      .select("id")
      .eq("show_id", showId)
      .not("id", "in", `(${watchedIds})`)
      .order("season_number", { ascending: true })
      .order("episode_number", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (nextEpisodeError) {
      throw nextEpisodeError;
    }

    // Build update payload
    const updatePayload = {
      watched_episodes: newWatchedCount,
      next_episode: nextEpisode?.id ?? null,
    };

    if (direction === "increment") {
      updatePayload.is_completed = isCompleted;
      updatePayload.completed_at = isCompleted
        ? new Date().toISOString()
        : null;
    }

    // Update by primary key
    const { error: updateError } = await SUPABASE.from("list_shows")
      .update(updatePayload)
      .eq("id", listShow.id);

    if (updateError) {
      throw updateError;
    }
  } catch (err) {
    console.error("updateListShows failed:", err);
    throw err;
  }
}

/**
 * Netlify function handler for marking or unmarking an episode as watched.
 *
 * Handles POST requests that:
 * - persist episode watch state in Supabase
 * - sync watch state with Trakt.tv
 *
 * @param {Object} event - Netlify function event object
 * @param {string} event.httpMethod - HTTP method used for the request
 * @param {string} event.body - JSON-encoded request body
 * @returns {Promise<{statusCode: number, body: string}>}
 */
export async function handler(event) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  let body;
  try {
    body = JSON.parse(event.body);
  } catch {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Invalid JSON body" }),
    };
  }

  const { token, userId, action, showId, episodeId } = body;

  if (!token || !userId || !episodeId || !action) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Missing required fields" }),
    };
  }

  try {
    switch (action) {
      case "mark": {
        const traktId = await saveUserEpisode(userId, episodeId);
        await markOnTrakt(token, traktId);
        await updateListShows(userId, showId, "increment");
        break;
      }

      case "unmark": {
        const traktId = await deleteUserEpisode(userId, episodeId);
        await unmarkOnTrakt(token, traktId);
        await updateListShows(userId, showId, "decrement");
        break;
      }

      default:
        return {
          statusCode: 400,
          body: JSON.stringify({ error: "Unknown action" }),
        };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true }),
    };
  } catch (err) {
    console.error("markEpisode handler failed:", err);

    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
}
