// ========================================================
// pages/show.js - Render Single Show Details Page
// ========================================================

import { getToken } from "../auth.js";
import { getShowDetails } from "../api.js";
import { renderShowDetails, renderSeasons } from "../ui.js";

/**
 * Renders the details page for a single show.
 * @param {HTMLElement} main - The main container element
 * @param {string} showId - Trakt show ID
 * @returns {Promise<void>}
 */
export async function renderShow(main, showId) {
  const token = getToken();

  // Fetch show details
  const show = await getShowDetails(token, showId);

  // Clear previous content
  main.innerHTML = "";

  // Render show info
  const showDiv = renderShowDetails(show);
  main.appendChild(showDiv);

  // Render seasons
  renderSeasons(showDiv, show);
}
