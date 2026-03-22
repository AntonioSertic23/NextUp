import { getStatsData } from "../api/stats.js";
import { renderStatistics } from "../ui/statistics.js";
import { setStats, getStats } from "../stores/statsStore.js";

/**
 * Renders statistics on the user's watched shows.
 * @param {HTMLElement} main - The main container element to render stats into
 */
export async function renderStats(main) {
  const statsDiv = document.createElement("div");
  statsDiv.id = "stats-container";
  statsDiv.innerHTML = "<p class='loading-text'>Loading statistics...</p>";
  main.appendChild(statsDiv);

  if (!getStats() || !Object.keys(getStats()).length) {
    const data = await getStatsData();
    if (data) setStats(data);
  }

  renderStatistics();
}
