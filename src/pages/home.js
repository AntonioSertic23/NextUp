import { getWatchlistData } from "../api/watchlist.js";
import { renderWatchlist, renderSortControls } from "../ui/watchlist.js";
import { renderListFilter } from "../ui/listFilter.js";
import { setWatchlist, getWatchlist } from "../stores/watchlistStore.js";
import { getActiveListId } from "../stores/listsStore.js";
import { consumeWatchlistStale } from "../services/pageCache.js";

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

  const needsFetch = !getWatchlist().length || consumeWatchlistStale();
  if (needsFetch) {
    const listId = getActiveListId();
    setWatchlist(await getWatchlistData(listId));
  }

  await renderSortControls(main);
  await renderListFilter(main);

  renderWatchlist();

  watchlistDiv.addEventListener("click", (e) => {
    const card = e.target.closest(".show-card");
    if (!card) return;

    location.hash = `show?traktIdentifier=${card.dataset.id}`;
  });
}
