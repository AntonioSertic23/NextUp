// ========================================================
// pages/home.js - Render Home Page
// ========================================================

import { getWatchedShows } from "../api.js";
import { renderShowsList } from "../ui.js";

/**
 * Renders the home page with the list of watched shows.
 * @param {HTMLElement} main - The main container element to render content into.
 * @returns {Promise<void>}
 */
export async function renderHome(main) {
  const token = localStorage.getItem("trakt_token"); // Get Trakt token from localStorage

  // Fetch watched shows from Trakt API
  const shows = await getWatchedShows(token);

  // Render the shows list in the main container
  renderShowsList(main, shows);

  // Add click event to each show card to navigate to its details page
  main.querySelectorAll(".show-card").forEach((card) => {
    card.addEventListener("click", () => {
      const id = card.dataset.id;
      location.hash = `show/${id}`; // Update hash to trigger router
    });
  });
}
