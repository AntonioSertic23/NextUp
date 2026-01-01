// ========================================================
// pages/home.js - Render Home Page
// ========================================================

import { getToken } from "../auth.js";
import { getWatchlistData } from "../database.js";
import { renderSortControls, renderWatchlist } from "../ui.js";

/**
 * Renders the home page: sorting controls and the collection list.
 * @param {HTMLElement} main - Main app container for this page.
 * @returns {Promise<void>}
 */
export async function renderHome(main) {
  const token = await getToken();

  const collectionDiv = document.createElement("div");
  collectionDiv.className = "collection-container";

  renderSortControls(main, collectionDiv, token);

  main.appendChild(collectionDiv);

  const sortDiv = document.querySelector(".sort-controls");
  const sortBy = sortDiv.querySelector("#sort-by").value;
  const order = sortDiv.querySelector("#sort-order-btn")?.dataset.order;

  // TODO: Commented out until the retrieval and storage of series is moved to Supabase instead of localStorage.
  // const shows = await getWatchlistData(token, sortBy, order);
  const shows = [];

  if (!shows.length) {
    collectionDiv.innerHTML = `<p class="no-show-message">
        Nemaš spremljenih serija, dodaj ih preko Discover stranice ili se syncaj sa Traktom
      </p>`;

    return;
  }

  renderWatchlist(collectionDiv, shows);

  // Add click event to each show card to navigate to its details page
  collectionDiv.querySelectorAll(".show-card").forEach((card) => {
    card.addEventListener("click", () => {
      const id = card.dataset.id;
      location.hash = `show/${id}`; // Update hash to trigger router
    });
  });
}
