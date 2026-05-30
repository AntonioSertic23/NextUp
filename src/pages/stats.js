import { getStatsData } from "../api/stats.js";
import { renderStatistics } from "../ui/statistics.js";
import { setStats, getStats, clearStats } from "../stores/statsStore.js";
import { getActiveListId } from "../stores/listsStore.js";
import { consumeStatsStale } from "../services/pageCache.js";

/**
 * Renders statistics on the user's watched shows.
 * @param {HTMLElement} main - The main container element to render stats into
 */
export async function renderStats(main) {
  const statsDiv = document.createElement("div");
  statsDiv.id = "stats-container";
  statsDiv.innerHTML = "<p class='loading-text'>Loading statistics...</p>";
  main.appendChild(statsDiv);

  const needsFetch =
    consumeStatsStale() ||
    !getStats() ||
    !Object.keys(getStats()).length;

  if (needsFetch) {
    clearStats();
    const data = await getStatsData(getActiveListId());
    if (data) setStats(data);
  }

  renderStatistics();
}
