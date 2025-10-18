// ========================================================
// pages/show.js - Render Single Show Details Page
// ========================================================

import { getShowDetails } from "../api.js";
import { createBackButton, renderShowDetails, renderSeasons } from "../ui.js";

/**
 * Renders the details page for a single show.
 * @param {HTMLElement} main - The main container element
 * @param {string} showId - Trakt show ID
 * @returns {Promise<void>}
 */
export async function renderShow(main, showId) {
  // Fetch show details
  const show = await getShowDetails(showId);

  // Clear previous content
  main.innerHTML = "";

  // Add back button
  main.appendChild(createBackButton());

  // Render show info
  const showDiv = renderShowDetails(show);
  main.appendChild(showDiv);

  // Render seasons
  renderSeasons(showDiv, show.seasons);
}
