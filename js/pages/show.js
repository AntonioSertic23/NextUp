// ========================================================
// pages/show.js - Render single show details page
// ========================================================

import { getShowDetails } from "../api.js";
import { renderShowDetails } from "../ui.js";

/**
 * Render the single show details page.
 *
 * - Shows a loading state
 * - Loads show data using a database-first strategy
 * - Renders show details or a fallback error message
 *
 * @param {HTMLElement} main - Main application container
 * @param {string} showId - Internal show ID
 * @returns {Promise<void>}
 */
export async function renderShow(main, showId) {
  const container = document.createElement("div");
  container.id = "show-container";
  container.innerHTML = "<p class='loading-text'>Loading...</p>";
  main.appendChild(container);

  try {
    const show = await getShowDetails(showId);

    if (!show) {
      container.innerHTML = "<p>Show not found.</p>";
      return;
    }

    renderShowDetails(show);
  } catch (err) {
    console.error("Failed to render show page:", err);
    container.innerHTML = "<p>Failed to load show details.</p>";
  }
}
