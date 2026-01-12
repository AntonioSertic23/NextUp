// ========================================================
// pages/stats.js - Render Statistics Page
// ========================================================

import { getStatsData } from "../database.js";
import { renderStatistics } from "../ui.js";
import { setStats, getStats } from "../stores/statsStore.js";

/**
 * Renders statistics on the user's watched shows.
 * @param {HTMLElement} main - The main container element to render stats into
 * @returns {Promise<void>}
 */
export async function renderStats(main) {
  const statsDiv = document.createElement("div");
  statsDiv.id = "stats-container";
  statsDiv.innerHTML = "<p class='loading-text'>Loading statistics...</p>";
  main.appendChild(statsDiv);

  const statsData = getStats();

  if (!statsData.length) {
    setStats(await getStatsData());
  }

  renderStatistics();
}
