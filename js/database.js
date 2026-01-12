// ========================================================
// database.js - Supabase client and data utilities
// ========================================================

import { getToken } from "./services/authService.js";
import { getSupabaseClient } from "./services/supabaseService.js";
import { getUser } from "./stores/userStore.js";
import {
  calculateStatistics,
  convertMinutesToTime,
  formatTimeBreakdown,
} from "./utils.js";

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

/** * Fetches all shows in the user's collection from the default list.
 *
 * @returns {Promise<Array<Object>|null>} Array of all collection shows or null on error
 */
export async function getAllCollectionShowsData() {
  const SUPABASE = await getSupabaseClient();
  const listId = await getDefaultListId();

  try {
    const { data } = await SUPABASE.from("list_shows")
      .select(
        `
        is_completed,
        shows (
          id,
          slug_id,
          image_poster
        )
        `
      )
      .eq("list_id", listId);

    return data;
  } catch (err) {
    console.error("Unexpected error fetching all collection shows:", err);
    return null;
  }
}

/**
 * Fetches statistics data for the user's watched shows.
 *
 * Notes:
 * - Retrieves shows, seasons, and episodes from the user's default list.
 * - Calculates total minutes watched, episodes, shows, seasons, and genre counts.
 * - Formats total watch time into a human-readable string.
 *
 * @returns {Promise<Object|null>} Statistics object or null on error
 */
export async function getStatsData() {
  const SUPABASE = await getSupabaseClient();
  const listId = await getDefaultListId();
  const { id: userId } = getUser();

  try {
    // Fetch collection
    const { data, error } = await SUPABASE.from("list_shows")
      .select(
        `
        show:shows (
          *,
          seasons (
            *,
            episodes (
              *,
              user_episodes (
                watched_at
              )
            )
          )
        )
        `
      )
      .eq("list_id", listId)
      .eq("show.seasons.episodes.user_episodes.user_id", userId);

    if (error) {
      console.error(error);
      return null;
    }

    const normalizedShows =
      data?.map(({ show }) => ({
        ...show,
        seasons: show.seasons.map((season) => ({
          ...season,
          episodes: season.episodes.map(({ user_episodes, ...ep }) => ({
            ...ep,
            watched_at: user_episodes?.[0]?.watched_at ?? null,
            watched: !!user_episodes?.length,
          })),
        })),
      })) ?? [];

    // Calculate statistics
    const stats = calculateStatistics(normalizedShows);

    // Convert minutes to time breakdown
    const timeBreakdown = convertMinutesToTime(stats.totalMinutes);
    const timeFormatted = formatTimeBreakdown(timeBreakdown);

    return { ...stats, timeFormatted };
  } catch (error) {
    console.error("Error loading statistics:", error);
    main.innerHTML = `<p class='error-text'>Error loading statistics: ${error.message}</p>`;
  }
}
