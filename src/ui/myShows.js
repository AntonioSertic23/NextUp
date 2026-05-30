import {
  getUpcomingEpisodes,
  getFilteredCollection,
  getCollectionFilter,
  setCollectionFilter,
  getCollectionSort,
  setCollectionSort,
  getCollectionOrder,
  setCollectionOrder,
  getAvailableGenres,
  getCollectionGenreFilter,
  setCollectionGenreFilter,
  getCollectionRatingFilter,
  setCollectionRatingFilter,
} from "../stores/myShowsStore.js";
import { renderHypeBadgeHtml } from "./showRating.js";
import { formatDate, formatEpisodeInfo, getTimeUntil } from "../utils/format.js";
import {
  fetchListsWithShowMembership,
  preloadListMembershipCache,
  patchListMembershipCache,
} from "../api/lists.js";
import { manageCollection } from "../api/shows.js";
import {
  getAllCollectionShowsData,
  getUpcomingEpisodesForShowIds,
  extractCollectionGenres,
} from "../api/watchlist.js";
import { ensureListsLoaded } from "../ui/listFilter.js";
import {
  getLists,
  getActiveListId,
  setActiveListId,
  resolveActiveListId,
} from "../stores/listsStore.js";
import {
  setAllCollectionShows,
  setAvailableGenres,
  setUpcomingEpisodes,
  getCollectionListId,
  setShowRatingsMap,
} from "../stores/myShowsStore.js";
import { getRatingsMapForShows } from "../api/ratings.js";
import { invalidateWatchlistAndStats } from "../services/pageCache.js";

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
  { value: "user_rating", label: "My rating" },
];

const RATING_FILTER_OPTIONS = [
  { value: "", label: "All ratings" },
  { value: "top", label: "5–4 popcorn" },
  { value: "5", label: "5 popcorn" },
  { value: "4", label: "4 popcorn" },
  { value: "3", label: "3 popcorn" },
  { value: "2", label: "2 popcorn" },
  { value: "1", label: "1 popcorn" },
  { value: "rated", label: "Rated" },
  { value: "unrated", label: "Unrated" },
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
function collectionShowIds(collection) {
  return collection.map((item) => item.shows?.id).filter(Boolean);
}

/**
 * Reload grid + upcoming when the active list changes.
 * @param {string} listId
 */
export async function reloadMyShowsForList(listId) {
  const grid = document.getElementById("all_my_shows-container");
  const upcoming = document.getElementById("upcoming_episodes-container");

  if (grid) grid.innerHTML = "<p class='loading-text'>Loading...</p>";
  if (upcoming) upcoming.innerHTML = "<p class='loading-text'>Loading...</p>";

  setCollectionGenreFilter("");

  const collection = await getAllCollectionShowsData(listId);
  setAllCollectionShows(collection, listId);
  setAvailableGenres(extractCollectionGenres(collection));
  setShowRatingsMap(await getRatingsMapForShows(collectionShowIds(collection)));
  renderAllCollectionShows();
  prepareMyShowsListMenus(collectionShowIds(collection));

  const ids = collectionShowIds(collection);
  if (!ids.length) {
    setUpcomingEpisodes([]);
    renderUpcomingEpisodes();
    return;
  }

  try {
    const data = await getUpcomingEpisodesForShowIds(ids);
    setUpcomingEpisodes(data || []);
    renderUpcomingEpisodes();
  } catch {
    if (upcoming) {
      upcoming.innerHTML =
        "<p class='no-show-message'>Could not load upcoming episodes.</p>";
    }
  }
}

export async function renderCollectionFilterBar(parent) {
  await ensureListsLoaded();
  const lists = getLists();
  const activeListId = resolveActiveListId() || "";

  const bar = document.createElement("div");
  bar.className = "my-shows-filter-bar";

  const currentSort = getCollectionSort();
  const currentOrder = getCollectionOrder();
  const currentFilter = getCollectionFilter();
  const currentRatingFilter = getCollectionRatingFilter();

  const listOptions = lists.length
    ? lists
        .map(
          (list) => `
        <option value="${escapeHtml(list.id)}"${list.id === activeListId ? " selected" : ""}>
          ${escapeHtml(list.name)}
        </option>
      `,
        )
        .join("")
    : "";

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
      ${
        lists.length
          ? `
      <div class="my-shows-list-filter">
        <label for="my-shows-list">List:</label>
        <select id="my-shows-list" class="sort-select" aria-label="Filter by list">
          ${listOptions}
        </select>
      </div>`
          : ""
      }
      <div class="my-shows-rating-filter">
        <label for="my-shows-rating">Rating:</label>
        <select id="my-shows-rating" class="sort-select" aria-label="Filter by popcorn rating">
          ${RATING_FILTER_OPTIONS.map(
            (opt) =>
              `<option value="${opt.value}"${opt.value === currentRatingFilter ? " selected" : ""}>${opt.label}</option>`,
          ).join("")}
        </select>
      </div>
    </div>

    <div id="genre-chips-container" class="genre-chips"></div>
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

  const ratingSelect = bar.querySelector("#my-shows-rating");
  ratingSelect?.addEventListener("change", (e) => {
    setCollectionRatingFilter(e.target.value);
    renderAllCollectionShows();
  });

  const listSelect = bar.querySelector("#my-shows-list");
  listSelect?.addEventListener("change", async () => {
    const listId = listSelect.value;
    if (!listId || listId === getCollectionListId()) return;
    setActiveListId(listId);
    await reloadMyShowsForList(listId);
  });
}

/**
 * Renders genre filter chips below the filter bar.
 * Called after genres are loaded.
 */
export function renderGenreChips() {
  const container = document.getElementById("genre-chips-container");
  if (!container) return;

  const genres = getAvailableGenres();
  const activeSlug = getCollectionGenreFilter();

  if (!genres.length) {
    container.innerHTML = "";
    return;
  }

  container.innerHTML = `
    <button
      type="button"
      class="genre-chip ${!activeSlug ? "active" : ""}"
      data-slug=""
    >All</button>
    ${genres
      .map(
        (g) => `
      <button
        type="button"
        class="genre-chip ${activeSlug === g.slug ? "active" : ""}"
        data-slug="${escapeHtml(g.slug)}"
      >${escapeHtml(g.name)}</button>
    `,
      )
      .join("")}
  `;

  container.addEventListener("click", (e) => {
    const chip = e.target.closest(".genre-chip");
    if (!chip) return;

    const slug = chip.dataset.slug;
    setCollectionGenreFilter(slug);

    container.querySelectorAll(".genre-chip").forEach((c) => {
      c.classList.toggle("active", c.dataset.slug === slug);
    });

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

  renderGenreChips();

  if (!shows.length) {
    const filter = getCollectionFilter().trim();
    const genre = getCollectionGenreFilter();
    const hype = getCollectionRatingFilter();
    container.innerHTML = `<p class="no-show-message">
        ${
          filter || genre || hype
            ? `No shows match your current filters.`
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

      const showId = s.id != null ? String(s.id) : "";
      const hypeBadge = renderHypeBadgeHtml(item.user_rating);

      return `
        <div
          class="discover-card my-shows-collection-card"
          data-id="${escapeHtml(slugId)}"
          data-show-id="${escapeHtml(showId)}"
        >
          <button
            type="button"
            class="collection-card-menu-btn"
            aria-label="Add to list"
            title="Lists"
          >⋮</button>
          ${hypeBadge ? `<div class="collection-card-hype">${hypeBadge}</div>` : ""}
          <div class="discover-card-poster">
            ${
              posterSrc
                ? `<img src="${posterSrc}" alt="${title || "Show"} poster" loading="lazy" />`
                : ""
            }
          </div>
          <p class="discover-card-title">${title || "Untitled"}</p>
          <p class="discover-card-year">${year}</p>
          <div class="collection-card-list-menu" hidden></div>
        </div>
      `;
    })
    .join("");
}

let openListMenuCard = null;
let listMenuRequestId = 0;

function renderListMenuHtml(lists) {
  return `
    <p class="collection-list-menu-title">Add to list</p>
    ${lists
      .map(
        (list) => `
        <button
          type="button"
          class="collection-list-menu-item ${list.hasShow ? "is-member" : ""}"
          data-list-id="${escapeHtml(list.id)}"
          data-has-show="${list.hasShow ? "1" : "0"}"
          data-is-default="${list.is_default ? "1" : "0"}"
        >
          <span class="collection-list-menu-check">${list.hasShow ? "✓" : ""}</span>
          <span>${escapeHtml(list.name)}</span>
        </button>
      `,
      )
      .join("")}
  `;
}

/**
 * Closes any open list picker dropdown on collection cards.
 */
export function closeCollectionListMenu() {
  if (openListMenuCard) {
    const menu = openListMenuCard.querySelector(".collection-card-list-menu");
    if (menu) menu.hidden = true;
    openListMenuCard = null;
  }
}

/**
 * Opens list membership menu for a collection card.
 * @param {HTMLElement} card - .my-shows-collection-card element
 */
export async function toggleCollectionListMenu(card) {
  if (openListMenuCard === card) {
    closeCollectionListMenu();
    return;
  }
  await openCollectionListMenu(card);
}

export async function openCollectionListMenu(card) {
  const showId = card.dataset.showId;
  if (!showId) return;

  closeCollectionListMenu();

  const menu = card.querySelector(".collection-card-list-menu");
  if (!menu) return;

  menu.hidden = false;
  openListMenuCard = card;

  const requestId = ++listMenuRequestId;

  try {
    const lists = await fetchListsWithShowMembership(showId);
    if (requestId !== listMenuRequestId || openListMenuCard !== card) return;
    menu.innerHTML = renderListMenuHtml(lists);
  } catch (err) {
    if (requestId !== listMenuRequestId || openListMenuCard !== card) return;
    menu.innerHTML = `<p class="collection-list-menu-error">${escapeHtml(err.message)}</p>`;
  }
}

/**
 * Toggle show on a list from the collection card menu.
 */
export async function toggleShowOnList(showId, listId, currentlyMember, isDefault) {
  if (currentlyMember && isDefault) {
    const ok = confirm(
      "Remove from your main collection? The show will disappear from this page.",
    );
    if (!ok) return { removedFromDefault: false };
  }

  await manageCollection(showId, !currentlyMember, listId);
  patchListMembershipCache(showId, listId, !currentlyMember);
  invalidateWatchlistAndStats();

  return { removedFromDefault: currentlyMember && isDefault };
}

let myShowsClickBound = false;

/**
 * Registers a single delegated click handler for My Shows (safe across revisits).
 * @param {HTMLElement} main
 */
export function bindMyShowsClickHandler(main) {
  if (myShowsClickBound) return;
  myShowsClickBound = true;

  main.addEventListener("click", async (e) => {
    const menuBtn = e.target.closest(".collection-card-menu-btn");
    if (menuBtn) {
      e.preventDefault();
      e.stopPropagation();
      const card = menuBtn.closest(".my-shows-collection-card");
      if (card) await toggleCollectionListMenu(card);
      return;
    }

    const menuItem = e.target.closest(".collection-list-menu-item");
    if (menuItem) {
      e.preventDefault();
      e.stopPropagation();
      const card = menuItem.closest(".my-shows-collection-card");
      const showId = card?.dataset.showId;
      const listId = menuItem.dataset.listId;
      const hasShow = menuItem.dataset.hasShow === "1";
      const isDefault = menuItem.dataset.isDefault === "1";
      if (!showId || !listId) return;

      menuItem.disabled = true;
      try {
        const { removedFromDefault } = await toggleShowOnList(
          showId,
          listId,
          hasShow,
          isDefault,
        );
        closeCollectionListMenu();
        if (removedFromDefault) {
          const listId = getCollectionListId() || getActiveListId();
          const shows = (await getAllCollectionShowsData(listId)) || [];
          setAllCollectionShows(shows, listId);
          setAvailableGenres(extractCollectionGenres(shows));
          renderAllCollectionShows();
        } else if (card) {
          await openCollectionListMenu(card);
        }
      } catch (err) {
        alert(err.message);
      } finally {
        menuItem.disabled = false;
      }
      return;
    }

    if (e.target.closest(".collection-card-list-menu")) {
      e.stopPropagation();
      return;
    }

    const insideListMenu = e.target.closest(
      ".collection-card-list-menu, .collection-card-menu-btn",
    );
    if (!insideListMenu) closeCollectionListMenu();

    const card = e.target.closest(".show-card, .my-shows-collection-card");
    if (!card) return;

    location.hash = `show?traktIdentifier=${card.dataset.id}`;
  });
}

/**
 * Warms list-membership cache in the background (for ⋮ menus).
 * @param {string[]} [showIds]
 */
export function prepareMyShowsListMenus(showIds) {
  preloadListMembershipCache(showIds);
}
