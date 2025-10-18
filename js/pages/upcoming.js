// ========================================================
// pages/upcoming.js - Render Upcoming Episodes Page
// ========================================================

import { getUpcomingShows } from "../api.js";
import { renderShowsList } from "../ui.js";

/**
 * Renders the upcoming episodes page.
 * Fetches a list of upcoming shows (currently dummy data) and displays them.
 * Adds click events to navigate to each show's details.
 *
 * @param {HTMLElement} main - The container element where content is rendered
 * @returns {Promise<void>}
 */
export async function renderUpcoming(main) {
  // Fetch shows from API (currently dummy data)
  const shows = await getUpcomingShows();

  // Render the shows list in the main container
  renderShowsList(main, shows);

  // Add click event to each show card for navigation
  main.querySelectorAll(".show-card").forEach((card) => {
    card.addEventListener("click", () => {
      const id = card.dataset.id;
      location.hash = `show/${id}`; // Update hash to trigger router
    });
  });
}
