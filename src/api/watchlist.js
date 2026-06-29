import { getSupabaseClient } from "../services/supabase.js";
import { getUser } from "../stores/userStore.js";
import { getCachedDefaultListId, resolveActiveListId } from "../stores/listsStore.js";

let cachedDefaultListId = null;
let cachedDefaultListUserId = null;

export function invalidateDefaultListIdCache() {
  cachedDefaultListId = null;
  cachedDefaultListUserId = null;
}

const COLLECTION_SHOWS_SELECT = `
  added_at,
  shows (
    id,
    slug_id,
    title,
    year,
    image_poster,
    show_genres (
      genres (
        id,
        name,
        slug
      )
    )
  )
`;

/**
 * Derive unique genre chips from a collection query result.
 * @param {Array<Object>} collectionItems
 */
export function extractCollectionGenres(collectionItems) {
  const uniqueGenres = new Map();
  for (const item of collectionItems || []) {
    for (const sg of item.shows?.show_genres ?? []) {
      if (sg.genres && !uniqueGenres.has(sg.genres.id)) {
        uniqueGenres.set(sg.genres.id, sg.genres);
      }
    }
  }
  return [...uniqueGenres.values()].sort((a, b) =>
    a.name.localeCompare(b.name),
  );
}

const WATCHLIST_SELECT = `
  added_at,
  is_completed,
  completed_at,
  watched_episodes,
  total_episodes,
  last_watched_at,
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
    image_poster
  )
`;

/**
 * Fetches watchlist rows for a list (direct Supabase — faster than Netlify hop).
 * @param {string} [listIdParam]
 * @param {{ activeOnly?: boolean }} [options] - activeOnly: hide completed (home default true)
 */
export async function getWatchlistData(listIdParam, options = {}) {
  const { activeOnly = true } = options;
  const listId = listIdParam ?? (await getDefaultListId());
  if (!listId) return [];

  const SUPABASE = await getSupabaseClient();

  try {
    let query = SUPABASE.from("list_shows")
      .select(WATCHLIST_SELECT)
      .eq("list_id", listId);

    if (activeOnly) {
      query = query.eq("is_completed", false);
    }

    let { data, error } = await query;

    if (error) throw error;
    data = (data ?? []).filter((item) => item.shows);

    if (activeOnly && !data.length) {
      const { data: allRows, error: allErr } = await SUPABASE.from("list_shows")
        .select(WATCHLIST_SELECT)
        .eq("list_id", listId);
      if (allErr) throw allErr;
      data = (allRows ?? []).filter((item) => item.shows);
    }

    return data;
  } catch (err) {
    console.error("getWatchlistData:", err);
    return [];
  }
}

/**
 * Fetches the next episode to watch for a specific show.
 *
 * @param {string|number} showId - The unique identifier of the show.
 * @returns {Promise<Object|null>} Next episode data or null on error
 */
export async function getShowNextEpisode(showId, listIdParam) {
  const SUPABASE = await getSupabaseClient();
  const listId =
    listIdParam ?? resolveActiveListId() ?? (await getDefaultListId());

  try {
    const { data } = await SUPABASE.from("list_shows")
      .select(
        `
        is_completed,
        watched_episodes,
        total_episodes,
        last_watched_at,
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
          image_poster
        )
        `,
      )
      .eq("list_id", listId)
      .eq("show_id", showId)
      .maybeSingle();

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
const UPCOMING_EPISODE_SELECT = `
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
    title,
    image_poster
  )
`;

/**
 * Next unaired episode per show (bounded query).
 * @param {Array<string>} showIds
 */
const UPCOMING_SHOW_ID_BATCH = 100;

function pickNextUpcomingPerShow(episodes) {
  const validEpisodes = (episodes || []).filter((ep) => ep.shows);
  return Object.values(
    validEpisodes.reduce((acc, ep) => {
      acc[ep.show_id] ??= ep;
      return acc;
    }, {}),
  );
}

async function fetchUpcomingEpisodeBatch(SUPABASE, showIds) {
  const currentDate = new Date().toISOString();
  const horizon = new Date();
  horizon.setDate(horizon.getDate() + 180);

  const { data: episodes, error } = await SUPABASE.from("episodes")
    .select(UPCOMING_EPISODE_SELECT)
    .in("show_id", showIds)
    .gt("first_aired", currentDate)
    .lte("first_aired", horizon.toISOString())
    .order("first_aired")
    .limit(400);

  if (error) throw error;
  return episodes ?? [];
}

/**
 * Next unaired episode per show (bounded query).
 * @param {Array<string>} showIds
 */
export async function getUpcomingEpisodesForShowIds(showIds) {
  if (!showIds?.length) return [];

  const SUPABASE = await getSupabaseClient();

  try {
    if (showIds.length <= UPCOMING_SHOW_ID_BATCH) {
      const episodes = await fetchUpcomingEpisodeBatch(SUPABASE, showIds);
      return pickNextUpcomingPerShow(episodes);
    }

    const batches = [];
    for (let i = 0; i < showIds.length; i += UPCOMING_SHOW_ID_BATCH) {
      batches.push(showIds.slice(i, i + UPCOMING_SHOW_ID_BATCH));
    }

    const results = await Promise.all(
      batches.map((ids) => fetchUpcomingEpisodeBatch(SUPABASE, ids)),
    );
    return pickNextUpcomingPerShow(results.flat());
  } catch (err) {
    console.error("getUpcomingEpisodesForShowIds:", err);
    return [];
  }
}

/**
 * Fetches upcoming episodes for all shows in the user's default list.
 */
export async function getUpcomingEpisodesData() {
  const listId = await getDefaultListId();
  if (!listId) return [];

  const SUPABASE = await getSupabaseClient();
  try {
    const { data: shows } = await SUPABASE.from("list_shows")
      .select("show_id")
      .eq("list_id", listId);

    if (!shows?.length) return [];
    return getUpcomingEpisodesForShowIds(shows.map((s) => s.show_id));
  } catch (err) {
    console.error("Unexpected error fetching upcoming episodes:", err);
    return [];
  }
}

/**
 * Fetches all shows in the user's collection from the default list,
 * including genres via the show_genres junction table.
 *
 * @returns {Promise<Array<Object>|null>} Array of collection shows or null on error
 */
export async function getAllCollectionShowsData(listIdParam) {
  const listId = listIdParam ?? (await getDefaultListId());
  if (!listId) return [];

  const SUPABASE = await getSupabaseClient();

  try {
    const { data, error } = await SUPABASE.from("list_shows")
      .select(COLLECTION_SHOWS_SELECT)
      .eq("list_id", listId);

    if (error) throw error;
    return (data || []).filter((item) => item.shows);
  } catch (err) {
    console.error("Unexpected error fetching all collection shows:", err);
    return [];
  }
}

/**
 * Get the default list ID for the current user.
 *
 * @returns {Promise<string|null>} The default list ID, or null if not found
 */
export async function getDefaultListId() {
  const { id: userId } = getUser();
  if (cachedDefaultListId && cachedDefaultListUserId === userId) {
    return cachedDefaultListId;
  }

  const fromStore = getCachedDefaultListId();
  if (fromStore) {
    cachedDefaultListId = fromStore;
    cachedDefaultListUserId = userId;
    return fromStore;
  }

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

    cachedDefaultListId = list?.id ?? null;
    cachedDefaultListUserId = userId;
    return cachedDefaultListId;
  } catch (err) {
    console.error("Unexpected error fetching default list:", err);
    return null;
  }
}
