// ========================================================
// stores/watchlistStore.js - Watchlist state & sorting logic
// ========================================================

let watchlist = [];
let sortBy = "added_at";
let sortOrder = "desc";

/**
 * Initializes the watchlist state and applies the current sort.
 *
 * @param {Array<Object>} data - Raw watchlist data from the backend.
 */
export function setWatchlist(data) {
  watchlist = data;
  sortShows();
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

/**
 * Returns the `next_episode` object along with its parent show ID
 * from the watchlist matching the given episode ID.
 *
 * Iterates through all shows in the in-memory `watchlist` array
 * and finds the show whose `next_episode.id` matches the provided `episodeId`.
 *
 * @param {string} episodeId - The unique ID of the next episode to find.
 * @returns {Object|null} The `next_episode` object with added `showId`, or `null` if not found.
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
 * Changes the active sort field and re-sorts the watchlist.
 *
 * Side effects:
 * - Mutates the internal watchlist order.
 * - Persists the sort preference to localStorage.
 *
 * @param {string} newSort
 */
export function changeSort(newSort) {
  sortBy = newSort;

  localStorage.setItem("watchlist_sort", newSort);

  sortShows();
}

/**
 * Changes the sort order (asc / desc).
 *
 * Side effects:
 * - Mutates the internal watchlist order by reversing it.
 * - Persists the order preference to localStorage.
 *
 * @param {"asc"|"desc"} newOrder
 */
export function changeOrder(newOrder) {
  sortOrder = newOrder;

  localStorage.setItem("watchlist_order", newOrder);

  watchlist.reverse();
}

/**
 * Sorts the global watchlist in place based on selected criteria.
 *
 * IMPORTANT:
 * - This function MUTATES the `watchlist` array directly.
 * - No copy of the original order is kept.
 * - Intended behavior: the watchlist order is permanently updated
 *   until another sort operation is applied.
 */
function sortShows() {
  const direction = sortOrder === "asc" ? 1 : -1;

  watchlist.sort((a, b) => {
    let aValue, bValue;

    switch (sortBy) {
      case "added_at":
        aValue = a.added_at ? new Date(a.added_at).getTime() : 0;
        bValue = b.added_at ? new Date(b.added_at).getTime() : 0;
        return (aValue - bValue) * direction;

      case "title":
        aValue = (a.shows?.title || "").toLowerCase();
        bValue = (b.shows?.title || "").toLowerCase();
        return aValue.localeCompare(bValue) * direction;

      case "year":
        aValue = a.shows?.year ?? 0;
        bValue = b.shows?.year ?? 0;
        return (aValue - bValue) * direction;

      case "rating":
        aValue = a.shows?.rating ?? 0;
        bValue = b.shows?.rating ?? 0;
        return (aValue - bValue) * direction;

      case "last_watched_at":
        aValue = a.shows?.last_watched_at
          ? new Date(a.shows.last_watched_at).getTime()
          : 0;
        bValue = b.shows?.last_watched_at
          ? new Date(b.shows.last_watched_at).getTime()
          : 0;
        return (aValue - bValue) * direction;

      case "episodes_left":
        aValue = (a.total_episodes ?? 0) - (a.watched_episodes ?? 0);
        bValue = (b.total_episodes ?? 0) - (b.watched_episodes ?? 0);
        return (aValue - bValue) * direction;

      default:
        return 0;
    }
  });
}
