// ========================================================
// pages/stats.js - Render Statistics Page
// ========================================================

/**
 * Renders quick statistics on the user's watched shows.
 * Currently uses dummy data for total shows and episodes.
 *
 * @param {HTMLElement} main - The main container element to render stats into
 * @returns {void}
 */
export async function renderStats(main) {
  // Create stats container
  const statsDiv = document.createElement("div");
  statsDiv.classList.add("quick-stats");
  statsDiv.innerHTML = `
    <h3>Quick Stats</h3>
    <p>Total shows: 3</p>
    <p>Total episodes: 30</p>
  `;

  // Append to main container
  main.appendChild(statsDiv);
}
