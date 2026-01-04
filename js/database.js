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
  const SUPABASE = await getSupabaseClient();

  const { id: userId } = getUser();

  const listId = await getDefaultListId(userId);

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
 * Get the default list ID for a given user.
 *
 * @param {string} userId - User ID
 * @returns {Promise<string|null>} The default list ID, or null if not found / error
 */
export async function getDefaultListId(userId) {
  const SUPABASE = await getSupabaseClient();

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
 * Retrieve a show by its ID and check if it is in the current user's default list.
 *
 * - Fetches the show from the "shows" table
 * - Determines if it exists in the user's default list via "lists" + "list_shows"
 *
 * @param {string} showId - The ID of the show in the database
 * @param {string} [traktIdentifier] - Optional Trakt identifier
 * @returns {Promise<Object|null>} Show object with additional boolean `in_collection`.
 *                                Returns `null` if show is not found or on error.
 */
export async function getShowById(showId, traktIdentifier) {
  const SUPABASE = await getSupabaseClient();
  const { id: userId } = getUser();

  const orQueryParts = [];
  if (showId) orQueryParts.push(`id.eq.${showId}`);
  if (traktIdentifier) {
    if (!isNaN(Number(traktIdentifier))) {
      // traktIdentifier is a number, compare only against integer columns
      const idNum = Number(traktIdentifier);
      orQueryParts.push(`trakt_id.eq.${idNum}`);
      orQueryParts.push(`tvdb_id.eq.${idNum}`);
      orQueryParts.push(`tmdb_id.eq.${idNum}`);
    } else {
      // traktIdentifier is a string, compare only against string columns
      orQueryParts.push(`slug_id.eq.${traktIdentifier}`);
      orQueryParts.push(`imdb_id.eq.${traktIdentifier}`);
    }
  }

  try {
    // Fetch show from database
    const { data: show, error: showError } = await SUPABASE.from("shows")
      .select("*")
      .or(orQueryParts.join(","))
      .maybeSingle();

    if (showError) {
      console.error("Error fetching show:", showError.message);
      return null;
    }

    if (!show) return null;

    const listId = await getDefaultListId(userId);

    if (!listId) return { ...show, in_collection: false };

    // Check if show is in the default list
    const { data: listShows, error: lsError } = await SUPABASE.from(
      "list_shows"
    )
      .select("id")
      .eq("show_id", show.id)
      .eq("list_id", listId)
      .limit(1);

    if (lsError) {
      console.error(
        "Error checking if show is in collection:",
        lsError.message
      );
      return { ...show, in_collection: false };
    }

    const in_collection = listShows.length > 0;

    return { ...show, in_collection };
  } catch (err) {
    console.error("Unexpected error in getShowById:", err);
    return { show: null, in_collection: false };
  }
}
