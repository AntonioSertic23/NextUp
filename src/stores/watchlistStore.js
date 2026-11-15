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

// ————————————————————————————————————————————————————
// Snapshot: last watchlist shown, painted instantly on a cold start
// (and offline) while fresh data loads.
// ————————————————————————————————————————————————————

const SNAPSHOT_KEY = "nextup_watchlist_snapshot";
const SNAPSHOT_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Saves the current watchlist for this user and list.
 *
 * @param {string|null} userId
 * @param {string|null} listId
 */
export function saveWatchlistSnapshot(userId, listId) {
  if (!userId) return;
  try {
    localStorage.setItem(
      SNAPSHOT_KEY,
      JSON.stringify({ userId, listId, savedAt: Date.now(), data: watchlist }),
    );
  } catch {
    /* quota or storage disabled: snapshot is optional */
  }
}

/**
 * Returns the saved watchlist if it belongs to this user and list.
 *
 * @param {string|null} userId
 * @param {string|null} listId
 * @returns {Array<Object>|null}
 */
export function readWatchlistSnapshot(userId, listId) {
  if (!userId) return null;
  try {
    const snap = JSON.parse(localStorage.getItem(SNAPSHOT_KEY) || "null");
    if (!snap || snap.userId !== userId || snap.listId !== listId) return null;
    if (Date.now() - snap.savedAt > SNAPSHOT_MAX_AGE_MS) return null;
    return Array.isArray(snap.data) ? snap.data : null;
  } catch {
    return null;
  }
}

export function clearWatchlistSnapshot() {
  try {
    localStorage.removeItem(SNAPSHOT_KEY);
  } catch {
    /* ignore */
  }
}

/**
 * Sorts the global watchlist in place based on selected criteria.
 */
function sortShows() {
  watchlist.sort((a, b) => compareShows(a, b, sortBy, sortOrder));
}
