import { getSupabaseClient } from "../services/supabase.js";
import { getUser } from "../stores/userStore.js";
import {
  calculateStatistics,
  convertMinutesToTime,
  formatTimeBreakdown,
} from "../utils/stats.js";
import { getDefaultListId } from "./watchlist.js";

/**
 * Fetches and calculates statistics for the user's watched shows.
 *
 * @returns {Promise<Object|null>} Statistics object or null on error
 */
export async function getStatsData() {
  const SUPABASE = await getSupabaseClient();
  const listId = await getDefaultListId();
  const { id: userId } = getUser();

  try {
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

    const stats = calculateStatistics(normalizedShows);
    const timeBreakdown = convertMinutesToTime(stats.totalMinutes);
    const timeFormatted = formatTimeBreakdown(timeBreakdown);

    return { ...stats, timeFormatted };
  } catch (error) {
    console.error("Error loading statistics:", error);
    return null;
  }
}
