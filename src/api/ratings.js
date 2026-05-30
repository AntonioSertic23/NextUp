import { getSupabaseClient } from "../services/supabase.js";
import { getUser } from "../stores/userStore.js";
import { isValidRatingScore } from "../utils/showRatings.js";

/**
 * @returns {Promise<number|null>} 1–5 or null if unrated
 */
export async function getShowRating(showId) {
  if (!showId) return null;
  const SUPABASE = await getSupabaseClient();
  const { data, error } = await SUPABASE.from("user_show_ratings")
    .select("score")
    .eq("show_id", showId)
    .maybeSingle();

  if (error) {
    console.error("getShowRating:", error);
    return null;
  }
  return data?.score ?? null;
}

/**
 * @param {string[]} showIds
 * @returns {Promise<Map<string, number>>} showId → score
 */
export async function getRatingsMapForShows(showIds) {
  const map = new Map();
  const ids = [...new Set((showIds || []).filter(Boolean))];
  if (!ids.length) return map;

  const SUPABASE = await getSupabaseClient();
  const { data, error } = await SUPABASE.from("user_show_ratings")
    .select("show_id, score")
    .in("show_id", ids);

  if (error) {
    console.error("getRatingsMapForShows:", error);
    return map;
  }

  for (const row of data ?? []) {
    map.set(row.show_id, row.score);
  }
  return map;
}

/**
 * All ratings for the current user (for statistics).
 */
export async function getAllUserRatings() {
  const SUPABASE = await getSupabaseClient();
  const { data, error } = await SUPABASE.from("user_show_ratings")
    .select(
      `
      score,
      updated_at,
      shows (
        id,
        title,
        slug_id,
        image_poster,
        year
      )
    `,
    )
    .order("score", { ascending: false });

  if (error) {
    console.error("getAllUserRatings:", error);
    return [];
  }
  return data ?? [];
}

export async function setShowRating(showId, score) {
  if (!showId || !isValidRatingScore(score)) {
    throw new Error("Invalid rating");
  }

  const SUPABASE = await getSupabaseClient();
  const { id: userId } = getUser();
  const { error } = await SUPABASE.from("user_show_ratings").upsert(
    {
      user_id: userId,
      show_id: showId,
      score: Number(score),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,show_id" },
  );

  if (error) throw new Error(error.message);
}

export async function clearShowRating(showId) {
  if (!showId) return;
  const SUPABASE = await getSupabaseClient();
  const { error } = await SUPABASE.from("user_show_ratings")
    .delete()
    .eq("show_id", showId);

  if (error) throw new Error(error.message);
}
