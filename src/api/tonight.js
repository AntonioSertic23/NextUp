import { getSupabaseClient } from "../services/supabase.js";
import { getUser } from "../stores/userStore.js";
import { getRatingsMapForShows } from "./ratings.js";
import { pickTonightShows } from "../utils/tonightAndBinge.js";
import { hasEpisodeAired } from "../utils/aired.js";

/**
 * Load persisted tonight picks for a list.
 * @param {string} listId
 * @returns {Promise<{ showIds: string[], generatedAt: string|null }|null>}
 */
export async function getTonightPicks(listId) {
  if (!listId) return null;
  const user = getUser();
  if (!user?.id) return null;

  const SUPABASE = await getSupabaseClient();
  const { data, error } = await SUPABASE.from("tonight_picks")
    .select("show_ids, generated_at")
    .eq("user_id", user.id)
    .eq("list_id", listId)
    .maybeSingle();

  if (error) {
    console.error("getTonightPicks:", error);
    return null;
  }
  if (!data) return null;
  return {
    showIds: data.show_ids || [],
    generatedAt: data.generated_at || null,
  };
}

/**
 * Persist tonight pick show UUIDs for a list.
 * @param {string} listId
 * @param {string[]} showIds
 */
export async function saveTonightPicks(listId, showIds) {
  const user = getUser();
  if (!user?.id || !listId) return;

  const SUPABASE = await getSupabaseClient();
  const { error } = await SUPABASE.from("tonight_picks").upsert(
    {
      user_id: user.id,
      list_id: listId,
      show_ids: showIds,
      generated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,list_id" },
  );

  if (error) {
    console.error("saveTonightPicks:", error);
    throw error;
  }
}

/**
 * Build scored candidates from the in-memory watchlist + ratings, pick 3, save.
 *
 * @param {string} listId
 * @param {Array<Object>} watchlistItems
 * @param {{ shuffle?: boolean, previousShowIds?: string[] }} [options]
 * @returns {Promise<Array<Object>>} picked list_shows rows (up to 3)
 */
export async function generateAndSaveTonightPicks(
  listId,
  watchlistItems,
  options = {},
) {
  const { shuffle = false, previousShowIds = [] } = options;
  const items = watchlistItems || [];
  const showIds = items.map((i) => i.shows?.id).filter(Boolean);
  const ratings = await getRatingsMapForShows(showIds);

  const enriched = items.map((item) => ({
    ...item,
    user_rating: ratings.get(item.shows?.id) ?? null,
  }));

  const exclude = shuffle
    ? previousShowIds
    : [];

  let picked = pickTonightShows(enriched, {
    count: 3,
    excludeShowIds: exclude,
  });

  // If shuffle excluded too much, pick again without exclude
  if (shuffle && picked.length < Math.min(3, enriched.filter((i) => !i.is_completed && i.next_episode).length)) {
    picked = pickTonightShows(enriched, { count: 3 });
  }

  const ids = picked.map((p) => p.shows.id).filter(Boolean);
  try {
    await saveTonightPicks(listId, ids);
  } catch {
    /* table may not exist yet — still return picks for the session */
  }
  return picked;
}

/**
 * Resolve watchlist rows for saved show ids (order preserved).
 * @param {Array<Object>} watchlistItems
 * @param {string[]} showIds
 */
export function mapPicksToWatchlist(watchlistItems, showIds) {
  const byId = new Map(
    (watchlistItems || [])
      .filter((i) => i.shows?.id)
      .map((i) => [i.shows.id, i]),
  );
  return (showIds || []).map((id) => byId.get(id)).filter(Boolean);
}

/**
 * Episodes for binge resolution (countable seasons only), with watched_at.
 * @param {string} showId
 * @returns {Promise<Array<{id, season_number, episode_number, watched_at, first_aired}>>}
 */
export async function getEpisodesForBinge(showId) {
  if (!showId) return [];
  const SUPABASE = await getSupabaseClient();

  const { data: episodes, error } = await SUPABASE.from("episodes")
    .select(
      `
      id,
      season_number,
      episode_number,
      first_aired,
      title,
      episode_type,
      user_episodes ( watched_at )
      `,
    )
    .eq("show_id", showId)
    .gt("season_number", 0)
    .order("season_number", { ascending: true })
    .order("episode_number", { ascending: true });

  if (error) {
    console.error("getEpisodesForBinge:", error);
    return [];
  }

  return (episodes || [])
    .filter((ep) => {
      if (ep.episode_type === "special") return false;
      if (/special/i.test(String(ep.title || ""))) return false;
      return true;
    })
    .map((ep) => ({
      id: ep.id,
      season_number: ep.season_number,
      episode_number: ep.episode_number,
      first_aired: ep.first_aired,
      watched_at: ep.user_episodes?.[0]?.watched_at ?? null,
    }));
}

export { hasEpisodeAired };
