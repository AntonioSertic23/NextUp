// ========================================================
// pages/stats.js - Render Statistics Page
// ========================================================

import { getWatchedShows } from "../api.js";
import { getToken } from "../auth.js";

/**
 * Renders quick statistics on the user's watched shows.
 * Currently uses dummy data for total shows and episodes.
 *
 * @param {HTMLElement} main - The main container element to render stats into
 * @returns {void}
 */
export async function renderStats(main) {
  const token = getToken();

  // Fetch watched shows from Trakt API
  const shows = await getWatchedShows(token);

  // Create stats container
  const statsDiv = document.createElement("div");
  statsDiv.classList.add("quick-stats");
  statsDiv.innerHTML = `
    <h3>Quick Stats</h3>
    <p>Total shows: ${shows.length}</p>
    <p>Total episodes: ${shows.length * 10}</p> <!-- dummy episode count -->
  `;

  // Append to main container
  main.appendChild(statsDiv);
}
