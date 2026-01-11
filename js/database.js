// ========================================================
// database.js - Supabase client and data utilities
// ========================================================

import { getToken } from "./services/authService.js";
import { getSupabaseClient } from "./services/supabaseService.js";
import { getUser } from "./stores/userStore.js";

/**
 * Fetches the watchlist data for a specific user list.
 *
 * Notes:
 * - This uses a Netlify serverless function for secure data retrieval.
 * - `token` is the user's Trakt OAuth token.
 *
 * @returns {Promise<Array<Object>>} Array of watchlist items
 * @throws {Error} If the fetch fails or response is invalid
 */
export async function getWatchlistData() {
  const listId = await getDefaultListId();
  const token = await getToken();

  const res = await fetch("/.netlify/functions/getWatchlistData", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ token, listId }),
  });

  return await res.json();
}

/**
 * Fetches the next episode to watch for all shows in the user's default list.
 *
 * @param {string|number} showId - The unique identifier of the show.
 * @returns {Promise<Array<Object>|null>} Array of next episodes or null on error
 */
export async function getShowNextEpisode(showId) {
  const SUPABASE = await getSupabaseClient();
  const listId = await getDefaultListId();

  try {
    const { data } = await SUPABASE.from("list_shows")
      .select(
        `
        is_completed,
        watched_episodes,
        total_episodes,
        next_episode (
          id,
          episode_number,
          season_number,
          title,
          image_screenshot,
          overview,
          first_aired
        ),
        shows (
          id,
          slug_id,
          title,
          image_poster
        )
        `
      )
      .eq("list_id", listId)
      .eq("show_id", showId)
      .single();

    return data;
  } catch (err) {
    console.error("Unexpected error fetching next episode:", err);
    return null;
  }
}

/**
 * Get the default list ID for a given user.
 *
 * @returns {Promise<string|null>} The default list ID, or null if not found / error
 */
export async function getDefaultListId() {
  const SUPABASE = await getSupabaseClient();
  const { id: userId } = getUser();

  try {
    const { data: list, error } = await SUPABASE.from("lists")
      .select("id")
      .eq("user_id", userId)
      .eq("is_default", true)
      .single();

    if (error) {
      console.error("Error fetching default list:", error.message);
      return null;
    }

    return list?.id ?? null;
  } catch (err) {
    console.error("Unexpected error fetching default list:", err);
    return null;
  }
}

/**
 * Fetches the user's shows along with their next episodes from the default list.
 *
 * @returns {Promise<Array<Object>|null>} Array of shows with next episodes or null on error
 */
export async function getUpcomingEpisodesData() {
  const SUPABASE = await getSupabaseClient();
  const listId = await getDefaultListId();

  try {
    const { data: shows } = await SUPABASE.from("list_shows")
      .select("show_id")
      .eq("list_id", listId);

    const showIds = shows.map((s) => s.show_id);
    const currentDate = new Date().toISOString();

    const { data: episodes } = await SUPABASE.from("episodes")
      .select(
        `
        id,
        trakt_id,
        show_id,
        title,
        image_screenshot,
        episode_number,
        season_number,
        overview,
        first_aired,
        shows (
          slug_id,
          image_poster
        )
        `
      )
      .in("show_id", showIds)
      .gt("first_aired", currentDate)
      .order("first_aired");

    const nextEpisodes = Object.values(
      episodes.reduce((acc, ep) => {
        acc[ep.show_id] ??= ep;
        return acc;
      }, {})
    );

    return nextEpisodes;
  } catch (err) {
    console.error("Unexpected error fetching next episode:", err);
    return null;
  }
}
