// ========================================================
// stores/watchlistStore.js - Watchlist state & sorting logic
// ========================================================

import { compareShows } from "../utils/sortShows.js";

let watchlist = [];
let watchlistListId = null;
let sortBy = localStorage.getItem("watchlist_sort") || "added_at";
let sortOrder = localStorage.getItem("watchlist_order") || "desc";

/**
 * Initializes the watchlist state and applies the current sort.
 *
 * @param {Array<Object>} data - Raw watchlist data from the backend.
 * @param {string|null} [listId] - List the data was fetched for.
 */
export function setWatchlist(data, listId = null) {
  watchlist = data;
  if (listId != null) watchlistListId = listId;
  sortShows();
}

export function getWatchlistListId() {
  return watchlistListId;
}

/**
 * Returns the current watchlist in its sorted order.
 *
 * IMPORTANT:
 * - The returned array is the internal store reference.
 * - Consumers MUST NOT mutate it directly.
 *
 * @returns {Array<Object>}
 */
export function getWatchlist() {
  return watchlist;
}

export function getWatchlistSortBy() {
  return sortBy;
}

export function getWatchlistSortOrder() {
  return sortOrder;
}

/**
 * Returns the `next_episode` object along with its parent show ID
 * from the watchlist matching the given episode ID.
 *
 * @param {string} episodeId - The unique ID of the next episode to find.
 * @returns {Object|null}
 */
export function getNextEpisodeById(episodeId) {
  if (!episodeId) return null;

  const show = watchlist.find((show) => show.next_episode?.id === episodeId);

  if (!show?.next_episode) return null;

  return {
    ...show.next_episode,
    show_id: show.shows.id,
  };
}

/**
 * Updates the watchlist store with new next episode data for a specific show.
 *
 * @param {Object} nextEpisode - Object containing updated next episode data and show identifier.
 */
export function updateNextEpisode(nextEpisode) {
  const showIndex = watchlist.findIndex(
    (item) => item.shows.slug_id === nextEpisode.shows.slug_id
  );
  if (showIndex === -1) return;

  watchlist[showIndex].next_episode = nextEpisode.next_episode;
  watchlist[showIndex].is_completed = nextEpisode.is_completed;
  watchlist[showIndex].watched_episodes = nextEpisode.watched_episodes;
  watchlist[showIndex].total_episodes = nextEpisode.total_episodes;

  if (nextEpisode.last_watched_at != null) {
    watchlist[showIndex].last_watched_at = nextEpisode.last_watched_at;
  }
}

/**
 * Re-applies the active sort after in-place field updates (e.g. mark watched).
 */
export function resortWatchlist() {
  sortShows();
}

/**
 * Removes a show from the watchlist store based on its trakt identifier.
 *
 * @param {string} traktIdentifier - The trakt ID of the show to remove.
 */
export function removeShowFromWatchlist(traktIdentifier) {
  const showIndex = watchlist.findIndex(
    (item) => item.shows.slug_id === traktIdentifier
  );
  if (showIndex === -1) return;
  watchlist.splice(showIndex, 1);
}

/**
 * Changes the active sort field and re-sorts the watchlist.
 *
 * @param {string} newSort
 */
export function changeSort(newSort) {
  sortBy = newSort;
  localStorage.setItem("watchlist_sort", newSort);
  sortShows();
}

/**
 * Changes the sort order (asc / desc) and re-sorts (not reverse-only).
 *
 * @param {"asc"|"desc"} newOrder
 */
export function changeOrder(newOrder) {
  sortOrder = newOrder;
  localStorage.setItem("watchlist_order", newOrder);
  sortShows();
}

/**
 * Sorts the global watchlist in place based on selected criteria.
 */
function sortShows() {
  watchlist.sort((a, b) => compareShows(a, b, sortBy, sortOrder));
}
