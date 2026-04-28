import {
  getUpcomingEpisodes,
  getFilteredCollection,
  getCollectionFilter,
  setCollectionFilter,
  getCollectionSort,
  setCollectionSort,
  getCollectionOrder,
  setCollectionOrder,
} from "../stores/myShowsStore.js";
import { formatDate, formatEpisodeInfo, getTimeUntil } from "../utils/format.js";

function escapeHtml(text) {
  return String(text ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const COLLECTION_SORT_OPTIONS = [
  { value: "added_at", label: "Last added" },
  { value: "title", label: "Title" },
  { value: "year", label: "Year" },
];

/**
 * Renders upcoming episodes for shows in the user's collection.
 */
export function renderUpcomingEpisodes() {
  const upcomingEpisodes = getUpcomingEpisodes();
  const container = document.getElementById("upcoming_episodes-container");

  if (!upcomingEpisodes.length) {
    container.innerHTML = `<p class="no-show-message">
        No upcoming episodes found in your collection.
      </p>`;
    return;
  }

  const sorted = [...upcomingEpisodes].sort(
    (a, b) => new Date(a.first_aired) - new Date(b.first_aired)
  );

  container.innerHTML = sorted
    .map((episode) => {
      const showTitle = escapeHtml(episode.shows?.title || "Unknown show");
      const epTitle = escapeHtml(episode.title || "Untitled episode");
      const slugId = escapeHtml(episode.shows?.slug_id ?? "");
      const epCode = formatEpisodeInfo(
        episode.season_number,
        episode.episode_number,
        null
      );
      const epCodeSafe = escapeHtml(epCode);
      const airDate = formatDate(episode.first_aired);
      const airDateSafe = escapeHtml(airDate);
      const countdown = escapeHtml(getTimeUntil(episode.first_aired));
      const posterPath = episode.shows?.image_poster;
      const posterSrc = posterPath ? `https://${posterPath}` : "";

      return `
        <div class="show-card upcoming-episode-row" data-id="${slugId}">
          <div class="upcoming-row-poster">
            ${
              posterSrc
                ? `<img
              class="upcoming-row-poster-img"
              src="${posterSrc}"
              alt=""
              loading="lazy"
            />`
                : `<div class="upcoming-row-poster-placeholder"></div>`
            }
          </div>
          <div class="upcoming-row-content">
            <p class="upcoming-row-series">${showTitle}</p>
            <p class="upcoming-row-episode-name">${epTitle}</p>
            <p class="upcoming-row-episode-code">${epCodeSafe}</p>
            <div class="upcoming-row-footer">
              <span class="upcoming-row-date" title="Air date">${airDateSafe}</span>
              <span class="upcoming-row-countdown">${countdown}</span>
            </div>
          </div>
        </div>
      `;
    })
    .join("");
}

/**
 * Renders the filter bar above the collection grid.
 * Hooks events into the store and re-renders the grid on change.
 *
 * @param {HTMLElement} parent - Container element to append the bar into.
 */
export function renderCollectionFilterBar(parent) {
  const bar = document.createElement("div");
  bar.className = "my-shows-filter-bar";

  const currentSort = getCollectionSort();
  const currentOrder = getCollectionOrder();
  const currentFilter = getCollectionFilter();

  bar.innerHTML = `
    <div class="search-input-wrap">
      <input
        type="text"
        id="my-shows-filter"
        class="search-input"
        placeholder="Filter your shows…"
        value="${escapeHtml(currentFilter)}"
        autocomplete="off"
        spellcheck="false"
      />
      <button
        type="button"
        id="my-shows-filter-clear"
        class="clear-btn"
        aria-label="Clear filter"
        style="display: ${currentFilter ? "flex" : "none"};"
      >&times;</button>
    </div>

    <div class="my-shows-sort">
      <select
        id="my-shows-sort-by"
        class="sort-select"
        aria-label="Sort shows by"
        title="Sort by"
      >
        ${COLLECTION_SORT_OPTIONS.map(
          (opt) =>
            `<option value="${opt.value}"${opt.value === currentSort ? " selected" : ""}>${opt.label}</option>`,
        ).join("")}
      </select>
      <button
        type="button"
        id="my-shows-sort-order"
        class="sort-order-btn"
        data-order="${currentOrder}"
        aria-label="Toggle sort order"
        title="Toggle sort order"
      >
        <img
          src="/img/down-arrow.png"
          alt=""
          class="sort-order-icon ${currentOrder === "asc" ? "flipped" : ""}"
        />
      </button>
    </div>
  `;

  parent.appendChild(bar);

  const filterInput = bar.querySelector("#my-shows-filter");
  const clearBtn = bar.querySelector("#my-shows-filter-clear");
  const sortSelect = bar.querySelector("#my-shows-sort-by");
  const orderBtn = bar.querySelector("#my-shows-sort-order");

  filterInput.addEventListener("input", (e) => {
    const value = e.target.value;
    setCollectionFilter(value);
    clearBtn.style.display = value ? "flex" : "none";
    renderAllCollectionShows();
  });

  clearBtn.addEventListener("click", () => {
    filterInput.value = "";
    setCollectionFilter("");
    clearBtn.style.display = "none";
    filterInput.focus();
    renderAllCollectionShows();
  });

  sortSelect.addEventListener("change", (e) => {
    setCollectionSort(e.target.value);
    renderAllCollectionShows();
  });

  orderBtn.addEventListener("click", () => {
    const next = orderBtn.dataset.order === "desc" ? "asc" : "desc";
    orderBtn.dataset.order = next;
    orderBtn
      .querySelector(".sort-order-icon")
      .classList.toggle("flipped", next === "asc");
    setCollectionOrder(next);
    renderAllCollectionShows();
  });
}

/**
 * Renders all shows in the user's collection (filtered + sorted),
 * using the same card style as Discover.
 */
export function renderAllCollectionShows() {
  const shows = getFilteredCollection();
  const container = document.getElementById("all_my_shows-container");
  if (!container) return;

  if (!shows.length) {
    const filter = getCollectionFilter().trim();
    container.innerHTML = `<p class="no-show-message">
        ${
          filter
            ? `No shows match “${escapeHtml(filter)}”.`
            : "No shows found in your collection."
        }
      </p>`;
    return;
  }

  container.innerHTML = shows
    .map((item) => {
      const s = item.shows;
      const title = escapeHtml(s.title);
      const year = s.year != null && s.year !== "" ? escapeHtml(String(s.year)) : "";
      const slugId = s.slug_id != null ? String(s.slug_id) : "";
      const posterPath = s.image_poster;
      const posterSrc = posterPath ? `https://${posterPath}` : "";

      return `
        <div class="discover-card my-shows-collection-card" data-id="${escapeHtml(slugId)}">
          <div class="discover-card-poster">
            ${
              posterSrc
                ? `<img src="${posterSrc}" alt="${title || "Show"} poster" loading="lazy" />`
                : ""
            }
          </div>
          <p class="discover-card-title">${title || "Untitled"}</p>
          <p class="discover-card-year">${year}</p>
        </div>
      `;
    })
    .join("");
}
