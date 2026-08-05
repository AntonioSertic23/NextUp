/**
 * Compare two list-show (or collection) items for sorting.
 *
 * @param {Object} a
 * @param {Object} b
 * @param {string} sortBy
 * @param {"asc"|"desc"} order
 * @returns {number}
 */
export function compareShows(a, b, sortBy, order = "desc") {
  const direction = order === "asc" ? 1 : -1;

  switch (sortBy) {
    case "title": {
      const av = (a.shows?.title || "").toLowerCase();
      const bv = (b.shows?.title || "").toLowerCase();
      return av.localeCompare(bv) * direction;
    }

    case "year": {
      const av = a.shows?.year ?? 0;
      const bv = b.shows?.year ?? 0;
      return (av - bv) * direction;
    }

    case "rating": {
      const av = a.shows?.rating ?? 0;
      const bv = b.shows?.rating ?? 0;
      return (av - bv) * direction;
    }

    case "user_rating": {
      const av = a.user_rating ?? 0;
      const bv = b.user_rating ?? 0;
      return (av - bv) * direction;
    }

    case "last_watched_at": {
      const av = a.last_watched_at
        ? new Date(a.last_watched_at).getTime()
        : 0;
      const bv = b.last_watched_at
        ? new Date(b.last_watched_at).getTime()
        : 0;
      return (av - bv) * direction;
    }

    case "episodes_left": {
      const av = (a.total_episodes ?? 0) - (a.watched_episodes ?? 0);
      const bv = (b.total_episodes ?? 0) - (b.watched_episodes ?? 0);
      return (av - bv) * direction;
    }

    case "added_at":
    default: {
      const av = a.added_at ? new Date(a.added_at).getTime() : 0;
      const bv = b.added_at ? new Date(b.added_at).getTime() : 0;
      return (av - bv) * direction;
    }
  }
}

/**
 * Returns a sorted copy of `items` (does not mutate the input).
 *
 * @param {Array<Object>} items
 * @param {string} sortBy
 * @param {"asc"|"desc"} order
 * @returns {Array<Object>}
 */
export function sortShowsCopy(items, sortBy, order = "desc") {
  return [...(items || [])].sort((a, b) => compareShows(a, b, sortBy, order));
}
