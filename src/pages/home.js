import { getWatchlistData } from "../api/watchlist.js";
import { renderWatchlist, renderSortControls } from "../ui/watchlist.js";
import { setWatchlist, getWatchlist } from "../stores/watchlistStore.js";

/**
 * Renders the Home page and initializes the watchlist state.
 *
 * @param {HTMLElement} main - Main application container.
 */
export async function renderHome(main) {
  const watchlistDiv = document.createElement("div");
  watchlistDiv.id = "watchlist-container";
  watchlistDiv.innerHTML = "<p class='loading-text'>Loading...</p>";
  main.appendChild(watchlistDiv);

  const watchlistData = getWatchlist();

  if (!watchlistData.length) {
    setWatchlist(await getWatchlistData());
  }

  await renderSortControls(main);

  renderWatchlist();

  watchlistDiv.addEventListener("click", (e) => {
    const card = e.target.closest(".show-card");
    if (!card) return;

    location.hash = `show?traktIdentifier=${card.dataset.id}`;
  });
}
