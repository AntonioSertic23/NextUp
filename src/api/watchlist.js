import { getSupabaseClient } from "../services/supabase.js";
import { getUser } from "../stores/userStore.js";

/**
 * Fetches the watchlist data for the user's default list.
 *
 * @returns {Promise<Array<Object>>} Array of watchlist items
 */
export async function getWatchlistData() {
  const listId = await getDefaultListId();

  const res = await fetch("/.netlify/functions/getWatchlistData", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ listId }),
  });

  const data = await res.json();
  return (Array.isArray(data) ? data : []).filter((item) => item.shows);
}

/**
 * Fetches the next episode to watch for a specific show.
 *
 * @param {string|number} showId - The unique identifier of the show.
 * @returns {Promise<Object|null>} Next episode data or null on error
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
        next_episode:episodes!next_episode_id (
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
          year,
          rating,
          last_watched_at,
          image_poster
        )
        `,
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
 * Fetches upcoming episodes for all shows in the user's default list.
 *
 * @returns {Promise<Array<Object>|null>} Array of upcoming episodes or null on error
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
        `,
      )
      .in("show_id", showIds)
      .gt("first_aired", currentDate)
      .order("first_aired");

    const validEpisodes = (episodes || []).filter((ep) => ep.shows);

    const nextEpisodes = Object.values(
      validEpisodes.reduce((acc, ep) => {
        acc[ep.show_id] ??= ep;
        return acc;
      }, {}),
    );

    return nextEpisodes;
  } catch (err) {
    console.error("Unexpected error fetching next episode:", err);
    return null;
  }
}

/**
 * Fetches all shows in the user's collection from the default list.
 *
 * @returns {Promise<Array<Object>|null>} Array of collection shows or null on error
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
        `,
      )
      .eq("list_id", listId);

    return (data || []).filter((item) => item.shows);
  } catch (err) {
    console.error("Unexpected error fetching all collection shows:", err);
    return null;
  }
}

/**
 * Get the default list ID for the current user.
 *
 * @returns {Promise<string|null>} The default list ID, or null if not found
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
