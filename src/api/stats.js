import { getSupabaseClient } from "../services/supabase.js";
import { fetchUserLists } from "./lists.js";
import {
  calculateStatistics,
  convertMinutesToTime,
  formatTimeBreakdown,
} from "../utils/stats.js";
import { buildMultiListAnalytics } from "../utils/multiListStats.js";
import { getDefaultListId } from "./watchlist.js";
import { getLists } from "../stores/listsStore.js";

/**
 * Fetches and calculates statistics for the user's watched shows.
 *
 * @returns {Promise<Object|null>} Statistics object or null on error
 */
export async function getStatsData(listIdParam) {
  const SUPABASE = await getSupabaseClient();
  const listId = listIdParam ?? (await getDefaultListId());
  if (!listId) return null;

  try {
    // RLS on user_episodes already filters by auth.uid(),
    // so no explicit user_id filter is needed.
    const { data, error } = await SUPABASE.from("list_shows")
      .select(
        `
        show:shows (
          *,
          show_genres (
            genres (name, slug)
          ),
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
        `,
      )
      .eq("list_id", listId);

    if (error) {
      console.error(error);
      return null;
    }

    const normalizedShows =
      data
        ?.filter(({ show }) => show?.seasons)
        .map(({ show }) => ({
          ...show,
          seasons: show.seasons.map((season) => ({
            ...season,
            episodes: (season.episodes || []).map(
              ({ user_episodes, ...ep }) => ({
                ...ep,
                watched_at: user_episodes?.[0]?.watched_at ?? null,
                watched: !!user_episodes?.length,
              }),
            ),
          })),
        })) ?? [];

    const stats = calculateStatistics(normalizedShows);
    const timeBreakdown = convertMinutesToTime(stats.totalMinutes);
    const timeFormatted = formatTimeBreakdown(timeBreakdown);

    return { ...stats, timeFormatted };
  } catch (error) {
    console.error("Error loading statistics:", error);
    return null;
  }
}

const LIST_SHOWS_STATS_SELECT = `
  list_id,
  show_id,
  is_completed,
  watched_episodes,
  total_episodes,
  added_at,
  shows (
    id,
    title,
    runtime,
    rating,
    image_poster
  )
`;

/**
 * Lightweight stats across all user lists (from list_shows progress).
 * @returns {Promise<{ perList: Array, insights: Object }|null>}
 */
export async function getMultiListStats() {
  const SUPABASE = await getSupabaseClient();
  const lists = getLists().length ? getLists() : await fetchUserLists();
  if (!lists.length) return null;

  const listIds = lists.map((l) => l.id);

  try {
    const { data, error } = await SUPABASE.from("list_shows")
      .select(LIST_SHOWS_STATS_SELECT)
      .in("list_id", listIds);

    if (error) {
      console.error("getMultiListStats:", error);
      return null;
    }

    return buildMultiListAnalytics(lists, data ?? []);
  } catch (err) {
    console.error("getMultiListStats:", err);
    return null;
  }
}
