import { fetchUserLists } from "../api/lists.js";
import {
  setLists,
  getLists,
  getActiveListId,
  setActiveListId,
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
 * Renders list filter chips on the home page (above watchlist).
 */
export async function renderListFilter(main) {
  await ensureListsLoaded();
  const lists = getLists();
  if (!lists.length) return;

  const existing = main.querySelector(".list-filter-bar");
  if (existing) existing.remove();

  const activeId = getActiveListId() || lists.find((l) => l.is_default)?.id;

  const bar = document.createElement("div");
  bar.className = "list-filter-bar";
  bar.innerHTML = `
    <span class="list-filter-label">List:</span>
    <div class="list-chips" role="group" aria-label="Filter by list">
      ${lists
        .map(
          (list) => `
        <button
          type="button"
          class="list-chip ${list.id === activeId ? "active" : ""}"
          data-list-id="${list.id}"
        >${escapeHtml(list.name)}</button>
      `,
        )
        .join("")}
    </div>
  `;

  const sortControls = main.querySelector(".sort-controls");
  if (sortControls) {
    sortControls.after(bar);
  } else {
    main.prepend(bar);
  }

  bar.querySelectorAll(".list-chip").forEach((chip) => {
    chip.addEventListener("click", async () => {
      const listId = chip.dataset.listId;
      if (listId === getActiveListId()) return;

      setActiveListId(listId);
      bar.querySelectorAll(".list-chip").forEach((c) => {
        c.classList.toggle("active", c.dataset.listId === listId);
      });

      invalidateWatchlistAndStats();
      const container = document.getElementById("watchlist-container");
      if (container) {
        container.innerHTML = "<p class='loading-text'>Loading...</p>";
      }
      setWatchlist(await getWatchlistData(listId));
      renderWatchlist();
    });
  });
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
