import { fetchUserLists } from "../api/lists.js";
import {
  setLists,
  getLists,
  getActiveListId,
  setActiveListId,
  resolveActiveListId,
} from "../stores/listsStore.js";
import { getWatchlistData } from "../api/watchlist.js";
import { setWatchlist } from "../stores/watchlistStore.js";
import { renderWatchlist } from "./watchlist.js";
import { invalidateWatchlistAndStats } from "../services/pageCache.js";

export async function ensureListsLoaded() {
  if (!getLists().length) {
    setLists(await fetchUserLists());
  }
}

/**
 * Renders list filter beside sort controls on the home page.
 */
export async function renderListFilter(main) {
  await ensureListsLoaded();
  const lists = getLists();
  if (!lists.length) return;

  const sortControls = main.querySelector(".sort-controls");
  if (!sortControls) return;

  const existing = sortControls.querySelector(".list-filter-group");
  if (existing) existing.remove();

  const activeId = resolveActiveListId();

  const group = document.createElement("div");
  group.className = "list-filter-group";
  group.innerHTML = `
    <label for="watchlist-list">List:</label>
    <select id="watchlist-list" aria-label="Filter by list">
      ${lists
        .map(
          (list) => `
        <option value="${escapeHtml(list.id)}"${list.id === activeId ? " selected" : ""}>
          ${escapeHtml(list.name)}
        </option>
      `,
        )
        .join("")}
    </select>
  `;

  sortControls.appendChild(group);

  const select = group.querySelector("#watchlist-list");
  select.addEventListener("change", async () => {
    const listId = select.value;
    if (listId === getActiveListId()) return;

    setActiveListId(listId);

    invalidateWatchlistAndStats();
    const container = document.getElementById("watchlist-container");
    if (container) {
      container.innerHTML = "<p class='loading-text'>Loading...</p>";
    }
    setWatchlist(await getWatchlistData(listId), listId);
    renderWatchlist();
  });
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
