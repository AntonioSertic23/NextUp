import { getWatchlistData } from "../api/watchlist.js";
import { renderWatchlist, renderSortControls } from "../ui/watchlist.js";
import { renderTonightSection } from "../ui/tonight.js";
import { renderListFilter, ensureListsLoaded } from "../ui/listFilter.js";
import {
  setWatchlist,
  getWatchlist,
  getWatchlistListId,
  saveWatchlistSnapshot,
  readWatchlistSnapshot,
} from "../stores/watchlistStore.js";
import { getUserId } from "../stores/userStore.js";
import { showToast } from "../ui/toast.js";
import { resolveActiveListId } from "../stores/listsStore.js";
import { consumeWatchlistStale } from "../services/pageCache.js";
import { getSupabaseClient } from "../services/supabase.js";
import { skeletonCards } from "../ui/skeleton.js";

/**
 * Renders the Home page and initializes the watchlist state.
 *
 * @param {HTMLElement} main - Main application container.
 */
export async function renderHome(main) {
  const watchlistDiv = document.createElement("div");
  watchlistDiv.id = "watchlist-container";
  watchlistDiv.innerHTML = skeletonCards();
  main.appendChild(watchlistDiv);

  watchlistDiv.addEventListener("click", (e) => {
    const card = e.target.closest(".show-card");
    if (!card) return;
    if (e.target.closest(".episode_info_btn")) return;
    location.hash = `show?traktIdentifier=${card.dataset.id}`;
  });

  const clientWarm = getSupabaseClient();
  const listId = resolveActiveListId();

  // Cold start: paint the last saved watchlist right away, then refresh.
  const userId = getUserId();
  const snapshot = getWatchlist().length
    ? null
    : readWatchlistSnapshot(userId, listId);
  if (snapshot?.length) {
    setWatchlist(snapshot, listId);
    renderWatchlist();
  }

  await Promise.all([
    clientWarm,
    ensureListsLoaded(),
    renderSortControls(main),
    renderListFilter(main),
  ]);

  const stale = consumeWatchlistStale();
  const cacheValid =
    !stale && getWatchlist().length && getWatchlistListId() === listId;

  if (cacheValid && !snapshot) {
    await renderTonightSection(main);
    renderWatchlist();
    return;
  }

  if (!snapshot?.length) {
    watchlistDiv.innerHTML = skeletonCards();
  }

  let data;
  try {
    data = await getWatchlistData(listId, {
      activeOnly: true,
      throwOnError: true,
    });
  } catch (err) {
    console.error("Failed to load watchlist:", err);
    if (snapshot?.length) {
      showToast(
        navigator.onLine
          ? "Couldn't refresh your watchlist. Showing saved data."
          : "You're offline. Showing your saved watchlist.",
      );
      return;
    }
    watchlistDiv.innerHTML =
      "<p class='error-text'>Couldn't load your watchlist. Check your connection and try again.</p>";
    return;
  }

  setWatchlist(data, listId);
  saveWatchlistSnapshot(userId, listId);
  await renderTonightSection(main);
  renderWatchlist();
}
