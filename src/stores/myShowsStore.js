// ========================================================
// stores/myShowsStore.js - My Shows state, filtering & sorting
// ========================================================

let upcomingEpisodes = [];
let allCollectionShows = [];
let collectionListId = null;
let availableGenres = [];

let collectionFilter = "";
let collectionGenreFilter = "";
let collectionSort = localStorage.getItem("my_shows_sort") || "added_at";
let collectionOrder = localStorage.getItem("my_shows_order") || "desc";

/**
 * Sets the myShows array in the store.
 *
 * @param {Array<Object>} data - Array of show objects with upcoming episode info
 */
export function setUpcomingEpisodes(data) {
  upcomingEpisodes = data;
}

/**
 * Gets the myShows array from the store.
 *
 * @returns {Array<Object>} Array of show objects with upcoming episode info
 */
export function getUpcomingEpisodes() {
  return upcomingEpisodes;
}

/**
 * Sets the allCollectionShows array in the store.
 *
 * @param {Array<Object>} data - Array of all shows in the user's collection
 */
export function setAllCollectionShows(data, listId = null) {
  allCollectionShows = data;
  if (listId != null) collectionListId = listId;
}

export function getCollectionListId() {
  return collectionListId;
}

/**
 * Gets the allCollectionShows array from the store.
 *
 * @returns {Array<Object>} Array of all shows in the user's collection
 */
export function getAllCollectionShows() {
  return allCollectionShows;
}

/**
 * Sets the available genres for filtering.
 *
 * @param {Array<{id: string, name: string, slug: string}>} genres
 */
export function setAvailableGenres(genres) {
  availableGenres = genres;
}

/**
 * Gets available genres.
 *
 * @returns {Array<{id: string, name: string, slug: string}>}
 */
export function getAvailableGenres() {
  return availableGenres;
}

// ----- Filter / sort state for "All shows in your list" -------------

export function getCollectionFilter() {
  return collectionFilter;
}

export function setCollectionFilter(value) {
  collectionFilter = String(value ?? "");
}

export function getCollectionGenreFilter() {
  return collectionGenreFilter;
}

export function setCollectionGenreFilter(slug) {
  collectionGenreFilter = slug || "";
}

export function getCollectionSort() {
  return collectionSort;
}

export function setCollectionSort(value) {
  collectionSort = value || "added_at";
  try {
    localStorage.setItem("my_shows_sort", collectionSort);
  } catch {
    /* ignore quota / privacy mode errors */
  }
}

export function getCollectionOrder() {
  return collectionOrder;
}

export function setCollectionOrder(value) {
  collectionOrder = value === "asc" ? "asc" : "desc";
  try {
    localStorage.setItem("my_shows_order", collectionOrder);
  } catch {
    /* ignore quota / privacy mode errors */
  }
}

/**
 * Returns a copy of the collection filtered by the active text query,
 * genre filter, and sorted by the active sort field/order.
 *
 * @returns {Array<Object>}
 */
export function getFilteredCollection() {
  const query = collectionFilter.trim().toLowerCase();
  const genreSlug = collectionGenreFilter;
  const direction = collectionOrder === "asc" ? 1 : -1;

  let filtered = allCollectionShows;

  if (query) {
    filtered = filtered.filter((item) =>
      (item.shows?.title || "").toLowerCase().includes(query),
    );
  }

  if (genreSlug) {
    filtered = filtered.filter((item) => {
      const genres = item.shows?.show_genres ?? [];
      return genres.some((sg) => sg.genres?.slug === genreSlug);
    });
  }

  filtered = [...filtered];

  filtered.sort((a, b) => {
    let av, bv;
    switch (collectionSort) {
      case "title":
        av = (a.shows?.title || "").toLowerCase();
        bv = (b.shows?.title || "").toLowerCase();
        return av.localeCompare(bv) * direction;

      case "year":
        av = a.shows?.year ?? 0;
        bv = b.shows?.year ?? 0;
        return (av - bv) * direction;

      case "added_at":
      default:
        av = a.added_at ? new Date(a.added_at).getTime() : 0;
        bv = b.added_at ? new Date(b.added_at).getTime() : 0;
        return (av - bv) * direction;
    }
  });

  return filtered;
}
