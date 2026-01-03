// ========================================================
// pages/home.js - Render Home Page
// ========================================================

import { getWatchlistData } from "../database.js";
import { renderWatchlist, renderSortControls } from "../ui.js";
import { setWatchlist } from "../stores/watchlistStore.js";

/**
 * Renders the Home page and initializes the watchlist state.
 *
 * Lifecycle notes:
 * - Fetches the user's watchlist from the backend.
 * - Initializes the watchlist store once on page load.
 * - All subsequent sorting is handled internally by the store.
 *
 * @param {HTMLElement} main - Main application container.
 */
export async function renderHome(main) {
  const watchlistDiv = document.createElement("div");
  watchlistDiv.id = "watchlist-container";
  main.appendChild(watchlistDiv);

  setWatchlist(await getWatchlistData());

  await renderSortControls(main);

  renderWatchlist();

  // Event delegation for dynamically rendered show cards
  watchlistDiv.addEventListener("click", (e) => {
    const card = e.target.closest(".show-card");
    if (!card) return;

    const showId = card.dataset.id;
    location.hash = `show/${showId}`;
  });
}
