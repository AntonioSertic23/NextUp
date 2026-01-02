// ========================================================
// pages/home.js - Render Home Page
// ========================================================

import { getToken } from "../auth.js";
import { getSupabaseClient, getWatchlistData } from "../database.js";
import { renderWatchlist } from "../ui.js";

const SUPABASE = await getSupabaseClient();

const {
  data: { user: USER },
} = await SUPABASE.auth.getUser();

if (!USER) {
  location.hash = "login";
}

/**
 * Mutable in-memory watchlist for the current user.
 *
 * IMPORTANT:
 * - This array is intentionally mutated (sorted / reversed in place).
 * - It represents the single source of truth for watchlist ordering.
 * - No original ordering is preserved or restored.
 *
 * @type {Array<Object>}
 */
let watchlist_shows = [];

const sortOptions = [
  { value: "added_at", label: "Last Added" },
  { value: "title", label: "Title" },
  { value: "year", label: "Year" },
  { value: "rating", label: "Top Rated" },
  { value: "last_watched_at", label: "Last Watched" },
  { value: "episodes_left", label: "Episodes Left" },
];

/**
 * Sorts the global watchlist in place based on selected criteria.
 *
 * IMPORTANT:
 * - This function MUTATES the `watchlist_shows` array directly.
 * - No copy of the original order is kept.
 * - Intended behavior: the watchlist order is permanently updated
 *   until another sort operation is applied.
 *
 * @param {string} sortBy - Sort field:
 *   'added_at' | 'title' | 'year' | 'rating' | 'last_watched_at' | 'episodes_left'
 * @param {string} order - Sort direction: 'asc' or 'desc'
 * @returns {Array<Object>} The same `watchlist_shows` array, sorted in place.
 */
function sortShows(sortBy, order) {
  const direction = order === "asc" ? 1 : -1;

  return watchlist_shows.sort((a, b) => {
    let aValue, bValue;

    switch (sortBy) {
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

      case "added_at":
        aValue = a.added_at ? new Date(a.added_at).getTime() : 0;
        bValue = b.added_at ? new Date(b.added_at).getTime() : 0;
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

/**
 * Renders sorting controls and binds UI events that mutate
 * the global watchlist ordering.
 *
 * Side effects:
 * - Mutates `watchlist_shows` via sort and reverse operations.
 * - Persists sort preferences to localStorage.
 *
 * @param {HTMLElement} main - Main page container.
 * @param {HTMLElement} collectionDiv - Watchlist container.
 * @returns {HTMLElement} The created sort controls container.
 */
async function renderSortControls(main, collectionDiv) {
  const savedSortBy = localStorage.getItem("watchlist_sortBy");
  const savedOrder = localStorage.getItem("watchlist_order") || "desc";

  const sortDiv = document.createElement("div");
  sortDiv.className = "sort-controls";
  sortDiv.innerHTML = `
    <label for="sort-by">Sort by:
      <select id="sort-by">
        ${sortOptions
          .map((opt) => `<option value="${opt.value}">${opt.label}</option>`)
          .join("")}
      </select>
    </label>
    <button
      id="sort-order-btn"
      class="sort-order-btn"
      data-order="${savedOrder}"
      aria-label="Toggle sort order"
      title="Toggle sort order"
    >${savedOrder === "desc" ? "↓" : "↑"}</button>
  `;

  main.appendChild(sortDiv);

  const sortBySelect = sortDiv.querySelector("#sort-by");
  const orderBtn = sortDiv.querySelector("#sort-order-btn");

  if (savedSortBy) {
    sortBySelect.value = savedSortBy;
  }

  sortBySelect.addEventListener("change", (e) => {
    const sortBy = e.target.value;
    renderWatchlist(collectionDiv, sortShows(sortBy, orderBtn.dataset.order));
    localStorage.setItem("watchlist_sortBy", sortBy);
  });

  /**
   * Toggles sort order by reversing the existing watchlist.
   *
   * NOTE:
   * - Uses Array.prototype.reverse() intentionally to mutate state.
   * - Assumes the list is already sorted by the selected field.
   * - This avoids a full re-sort and preserves current grouping.
   */
  orderBtn.addEventListener("click", (e) => {
    const currentOrder = orderBtn.dataset.order;
    const newOrder = currentOrder === "desc" ? "asc" : "desc";

    orderBtn.dataset.order = newOrder;
    orderBtn.textContent = newOrder === "desc" ? "↓" : "↑";

    renderWatchlist(collectionDiv, watchlist_shows.reverse());
    localStorage.setItem("watchlist_order", newOrder);
  });

  return sortDiv;
}

/**
 * Renders the Home page and initializes the watchlist state.
 *
 * Lifecycle notes:
 * - Fetches the user's default list from the database.
 * - Populates `watchlist_shows` once on page load.
 * - Subsequent sorting operations only reorder the in-memory list.
 *
 * @param {HTMLElement} main - Main application container.
 */
export async function renderHome(main) {
  const token = await getToken();

  const collectionDiv = document.createElement("div");
  collectionDiv.className = "collection-container";

  const sortDiv = await renderSortControls(main, collectionDiv);

  main.appendChild(collectionDiv);

  const {
    data: { id: listId },
  } = await SUPABASE.from("lists")
    .select("id")
    .eq("user_id", USER.id)
    .eq("is_default", true)
    .single();

  watchlist_shows = await getWatchlistData(token, listId);

  if (!watchlist_shows.length) {
    collectionDiv.innerHTML = `<p class="no-show-message">
        You don't have any saved series in your list. Add them via the Discover page, or use Sync with Trakt if you already have some saved there.
      </p>`;

    return;
  }

  const sortBy = sortDiv.querySelector("#sort-by").value;
  const order = sortDiv.querySelector("#sort-order-btn").dataset.order;

  renderWatchlist(collectionDiv, sortShows(sortBy, order));

  // Event delegation for dynamically rendered show cards
  collectionDiv.addEventListener("click", (e) => {
    const card = e.target.closest(".show-card");
    if (!card) return;

    const id = card.dataset.id;
    location.hash = `show/${id}`;
  });
}
