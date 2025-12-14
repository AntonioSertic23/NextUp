// ========================================================
// pages/home.js - Render Home Page
// ========================================================

import { getToken } from "../auth.js";
import { getCollection } from "../api.js";
import { renderCollection } from "../ui.js";

/**
 * Renders the home page with the list of watched shows.
 * @param {HTMLElement} main - The main container element to render content into.
 * @returns {Promise<void>}
 */
export async function renderHome(main) {
  const token = getToken();

  const sortBy = "title";

  // Fetch collection from Trakt API
  const shows = await getCollection(token, sortBy);

  // Render the shows list in the main container
  renderCollection(main, shows);

  // Add click event to each show card to navigate to its details page
  main.querySelectorAll(".show-card").forEach((card) => {
    card.addEventListener("click", () => {
      const id = card.dataset.id;
      location.hash = `show/${id}`; // Update hash to trigger router
    });
  });
}
