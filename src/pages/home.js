import { getWatchlistData } from "../api/watchlist.js";
import { renderWatchlist, renderSortControls } from "../ui/watchlist.js";
import { renderListFilter, ensureListsLoaded } from "../ui/listFilter.js";
import {
  setWatchlist,
  getWatchlist,
  getWatchlistListId,
} from "../stores/watchlistStore.js";
import { resolveActiveListId } from "../stores/listsStore.js";
import { consumeWatchlistStale } from "../services/pageCache.js";
import { getSupabaseClient } from "../services/supabase.js";

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

  watchlistDiv.addEventListener("click", (e) => {
    const card = e.target.closest(".show-card");
    if (!card) return;
    location.hash = `show?traktIdentifier=${card.dataset.id}`;
  });

  const clientWarm = getSupabaseClient();
  const listId = resolveActiveListId();

  await Promise.all([
    clientWarm,
    ensureListsLoaded(),
    renderSortControls(main),
    renderListFilter(main),
  ]);

  const stale = consumeWatchlistStale();
  const cacheValid =
    !stale && getWatchlist().length && getWatchlistListId() === listId;

  if (cacheValid) {
    renderWatchlist();
    return;
  }

  watchlistDiv.innerHTML = "<p class='loading-text'>Loading...</p>";
  const data = await getWatchlistData(listId, { activeOnly: true });
  setWatchlist(data, listId);
  renderWatchlist();
}
