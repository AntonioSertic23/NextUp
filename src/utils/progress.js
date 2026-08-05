import { formatEpisodeInfo } from "./format.js";

/**
 * Computes watchlist / list-show progress display fields.
 *
 * @param {Object} show - list_shows row with next_episode / counts
 * @returns {{
 *   nextEpisodeInfo: string,
 *   progressBarPercent: number,
 *   progressText: string,
 *   episodesLeft: number,
 *   overview: string,
 *   isCompleted: boolean
 * }}
 */
export function computeListShowProgress(show) {
  const total = show?.total_episodes || 0;
  const watched = show?.watched_episodes || 0;
  const progressBarPercent =
    total > 0 ? Math.round((watched / total) * 100) : 0;
  const progressText = `${watched}/${total}`;
  const episodesLeft = Math.max(0, total - watched);

  if (!show?.next_episode || show.is_completed) {
    return {
      nextEpisodeInfo: "Completed",
      progressBarPercent,
      progressText,
      episodesLeft: 0,
      overview: "",
      isCompleted: true,
    };
  }

  return {
    nextEpisodeInfo: formatEpisodeInfo(
      show.next_episode.season_number,
      show.next_episode.episode_number,
      show.next_episode.title,
    ),
    progressBarPercent,
    progressText,
    episodesLeft,
    overview: (show.next_episode.overview || "").trim(),
    isCompleted: false,
  };
}
