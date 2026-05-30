import { getPublicUserStats } from "../api/social.js";
import {
  calculateStatistics,
  convertMinutesToTime,
  formatTimeBreakdown,
} from "../utils/stats.js";
import { renderStatistics } from "../ui/statistics.js";
import { setStats } from "../stores/statsStore.js";

/**
 * View another user's statistics (must be following them).
 */
export async function renderUserStats(main, userId) {
  const container = document.createElement("div");
  container.id = "stats-container";
  container.innerHTML = "<p class='loading-text'>Loading statistics...</p>";
  main.appendChild(container);

  if (!userId) {
    container.innerHTML =
      "<p class='no-show-message'>Missing user. Go to Profile to follow someone.</p>";
    return;
  }

  try {
    const { user, shows } = await getPublicUserStats(userId);
    const stats = calculateStatistics(shows ?? []);
    const timeBreakdown = convertMinutesToTime(stats.totalMinutes);
    const timeFormatted = formatTimeBreakdown(timeBreakdown);

    setStats({
      multiList: null,
      detail: { ...stats, timeFormatted },
      detailListId: null,
    });

    renderStatistics({
      title: `${user.displayName}'s Statistics`,
      subtitle: "Watch activity shared with followers",
      showListsSection: false,
    });
  } catch (err) {
    container.innerHTML = `<p class="no-show-message">${err.message}</p>`;
  }
}
