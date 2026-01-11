// ========================================================
// ui.js - UI helper functions
// ========================================================

import {
  getWatchlist,
  changeSort,
  changeOrder,
  getNextEpisodeById,
  updateNextEpisode,
  removeShowFromWatchlist,
} from "./stores/watchlistStore.js";
import {
  resetDiscoverStore,
  getDiscoverState,
  setDiscoverState,
} from "./stores/discoverStore.js";
import { getUpcomingEpisodes } from "./stores/myShowsStore.js";
import { markEpisodes, manageCollection, searchShows } from "./api.js";
import { formatDate, formatEpisodeInfo, getTimeUntil } from "./utils.js";
import { getShowNextEpisode } from "./database.js";

const sortOptions = [
  { value: "added_at", label: "Last Added" },
  { value: "title", label: "Title" },
  { value: "year", label: "Year" },
  { value: "rating", label: "Top Rated" },
  { value: "last_watched_at", label: "Last Watched" },
  { value: "episodes_left", label: "Episodes Left" },
];

/**
 * Highlights the active navbar link based on the URL hash.
 * @returns {void}
 */
export function updateActiveNav() {
  const links = document.querySelectorAll(".nav-link");
  const hash = location.hash.slice(1) || "home";

  links.forEach((link) => {
    const linkHash = link.getAttribute("href").slice(1);
    if (hash.startsWith(linkHash)) {
      link.classList.add("active");
    } else {
      link.classList.remove("active");
    }
  });
}

/**
 * Compute overall progress for a show at render time.
 *
 * @param {Object} show - Show object containing watched and total episodes, and next_episode info.
 * @returns {Object} Progress info including next episode display, percent complete, progress text, and episodes left.
 */
function computeShowProgress(show) {
  const nextEpisodeInfo = formatEpisodeInfo(
    show.next_episode.season_number,
    show.next_episode.episode_number,
    show.next_episode.title
  );

  const total = show.total_episodes || 0;
  const watched = show.watched_episodes || 0;

  const progressBarPercent =
    total > 0 ? Math.round((watched / total) * 100) : 0;
  const progressText = `${watched}/${total}`;
  const episodesLeft = Math.max(0, total - watched);

  return { nextEpisodeInfo, progressBarPercent, progressText, episodesLeft };
}

/**
 * Compute progress for a set of episodes.
 *
 * @param {Array} episodes - Array of episode objects, each with optional `watched_at` date
 * @returns {Object} Progress info:
 *   - progressBarPercent {number}: percentage of episodes watched
 *   - progressText {string}: e.g., "3/10" (watched/total)
 */
function computeSeasonProgress(episodes) {
  const total = episodes.length;
  if (total === 0) return { progressBarPercent: 0, progressText: "0/0" };

  const completed = episodes.filter((ep) => Boolean(ep.watched_at)).length;

  return {
    progressBarPercent: Math.round((completed / total) * 100),
    progressText: `${completed}/${total}`,
    seasonCompleted: completed >= total,
  };
}

/**
 * Computes progress-related info for an episode.
 * @param {Object} episode - Episode object
 * @param {string|null} episode.watched_at - ISO date if watched, null if not
 * @returns {Object} - Contains formatted episode info, button class, and button text
 */
function computeEpisodeProgress(episode) {
  const epWatched = !!episode.watched_at;
  const btnClass = epWatched ? "unmark-watched" : "mark-watched";
  const btnText = epWatched ? "Unmark" : "Mark";

  const firstAiredDate = new Date(episode.first_aired);
  let airedStr;
  if (isNaN(firstAiredDate.getTime())) {
    airedStr = "Unknown";
  } else {
    airedStr = new Intl.DateTimeFormat("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(firstAiredDate);
  }

  const episodeInfo = `S${String(episode.season_number).padStart(
    2,
    "0"
  )}E${String(episode.episode_number).padStart(2, "0")} - ${airedStr}`;

  return {
    episodeInfo,
    btnClass,
    btnText,
  };
}

/**
 * Updates the watchlist show card with the next episode information.
 *
 * @param {Object} nextEpisode - The next episode object.
 */
function updateWatchlistShowCard(nextEpisode) {
  // Find the show card element with matching data-id
  const showCard = document.querySelector(
    `.show-card[data-id="${nextEpisode.shows.slug_id}"]`
  );

  if (showCard) {
    const { nextEpisodeInfo, progressBarPercent, progressText, episodesLeft } =
      computeShowProgress(nextEpisode);

    // Update DOM elements
    const nextEpisodeEl = showCard.querySelector(".next_episode");
    const progressBarFillEl = showCard.querySelector(".progress-bar-fill");
    const progressTextEl = showCard.querySelector(".progress_text");
    const episodesLeftEl = showCard.querySelector(".episodes_left");
    const episodeInfoBtn = showCard.querySelector(".episode_info_btn");

    if (nextEpisodeEl) nextEpisodeEl.textContent = nextEpisodeInfo || "";

    if (progressBarFillEl)
      progressBarFillEl.style.width = `${progressBarPercent}%`;

    if (progressTextEl) progressTextEl.textContent = progressText || "";

    if (episodesLeftEl)
      episodesLeftEl.textContent = episodesLeft ? `${episodesLeft} left` : "";

    if (episodeInfoBtn)
      episodeInfoBtn.setAttribute("data-episode", nextEpisode.next_episode.id);
  } else {
    console.warn(`No show card found with ID ${nextEpisode.shows.slug_id}.`);
  }
}

/**
 * Removes a show card from the UI based on its Trakt ID.
 * @param {string|number} traktIdentifier - The unique identifier of the show.
 */
function removeWatchlistShowCard(traktIdentifier) {
  // Find the show card element with matching data-id
  const showCard = document.querySelector(
    `.show-card[data-id="${traktIdentifier}"]`
  );

  if (showCard) {
    showCard.remove();
  } else {
    console.warn(`No show card found with ID ${traktIdentifier}.`);
  }
}

/**
 * Attaches a click handler to an episode element that opens the episode modal.
 *
 * If the episode cannot be found, logs an error and exits gracefully.
 *
 * @param {HTMLElement} element - The episode element.
 * @param {HTMLElement} episode - Episode to open in modal view
 */
function attachEpisodeInfoHandler(element, episode) {
  if (!element) return;

  element.addEventListener("click", (e) => {
    e.stopPropagation();

    let episodeData;

    if (!episode) {
      const episodeId = element.getAttribute("data-episode");
      if (!episodeId) {
        alert("Unable to show episode info: missing ID.");
        return;
      }

      episodeData = getNextEpisodeById(episodeId);
    } else {
      episodeData = episode;
    }

    if (!episodeData) {
      alert("Episode information could not be retrieved.");
      return;
    }

    // Callback to update UI after an action like marking episode as watched
    const updateUICallback = async () => {
      if (episode) {
        const markButton = element.querySelector("button");
        updateSeasonProgress(markButton, !episodeData.watched_at);
        return;
      }

      const nextEpisode = await getShowNextEpisode(episodeData.show_id);

      if (!nextEpisode.is_completed) {
        updateWatchlistShowCard(nextEpisode);
        updateNextEpisode(nextEpisode);
      } else {
        removeWatchlistShowCard(nextEpisode.shows.slug_id);
        removeShowFromWatchlist(nextEpisode.shows.slug_id);
      }
    };

    showEpisodeInfoModal(
      episodeData,
      updateUICallback,
      !!episodeData.watched_at
    );
  });
}

/**
 * Renders sorting controls and binds UI events that mutate
 * the global watchlist ordering.
 *
 * Side effects:
 * - Triggers watchlist state mutations via the watchlist store.
 * - Persists sort preferences via store logic.
 *
 * @param {HTMLElement} main - Main page container.
 */
export async function renderSortControls(main) {
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

  main.prepend(sortDiv);

  const sortBySelect = sortDiv.querySelector("#sort-by");
  const orderBtn = sortDiv.querySelector("#sort-order-btn");

  const savedSortBy = localStorage.getItem("watchlist_sort");
  if (savedSortBy) {
    sortBySelect.value = savedSortBy;
  }

  sortBySelect.addEventListener("change", (e) => {
    const newSort = e.target.value;

    changeSort(newSort);

    renderWatchlist();
  });

  orderBtn.addEventListener("click", () => {
    const currentOrder = orderBtn.dataset.order;
    const newOrder = currentOrder === "desc" ? "asc" : "desc";

    orderBtn.dataset.order = newOrder;
    orderBtn.textContent = newOrder === "desc" ? "↓" : "↑";

    changeOrder(newOrder);

    renderWatchlist();
  });
}

/** Renders the Discover page with search functionality. */
export async function renderDiscoverElments() {
  const discoverState = getDiscoverState();
  const container = document.getElementById("discover-container");

  // Create search input and button
  const searchForm = document.createElement("div");
  searchForm.className = "search-form";
  searchForm.innerHTML = `
      <input 
        type="text" 
        id="search-input" 
        class="search-input" 
        placeholder="Enter show name..."
        value="${discoverState.currentQuery}"
      />
      
      <button 
        type="button" 
        id="clear-btn" 
        class="clear-btn"
        style="
          display: ${discoverState.currentQuery ? "block" : "none"};
        "
      >X</button>

      <button id="search-btn" class="search-btn">Search</button>
    `;

  // Create results container
  const resultsDiv = document.createElement("div");
  resultsDiv.className = "search-results";
  resultsDiv.id = "search-results";

  // Create pagination container
  const paginationDiv = document.createElement("div");
  paginationDiv.className = "pagination-container";
  paginationDiv.id = "pagination-container";

  container.appendChild(searchForm);
  container.appendChild(resultsDiv);
  container.appendChild(paginationDiv);

  // Add event listener for search button
  const searchBtn = searchForm.querySelector("#search-btn");
  const searchInput = searchForm.querySelector("#search-input");
  const clearBtn = searchForm.querySelector("#clear-btn");

  searchBtn.addEventListener("click", async () => {
    const query = searchInput.value.trim();
    if (!query) {
      return;
    }

    await performSearch(query, 1, paginationDiv);

    clearBtn.style.display = "block";
  });

  // Allow Enter key to trigger search
  searchInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      searchBtn.click();
    }
  });

  clearBtn.addEventListener("click", () => {
    searchInput.value = "";
    clearBtn.style.display = "none";
    resultsDiv.innerHTML = "";
    paginationDiv.innerHTML = "";
    resetDiscoverStore();
  });

  if (discoverState.results.length > 0) {
    displaySearchResults(discoverState.results);
    renderPagination(
      paginationDiv,
      discoverState.currentQuery,
      discoverState.paginationInfo
    );
  }
}

/**
 * Performs a search and displays results with pagination.
 * @param {string} query - Search query
 * @param {number} page - Page number
 * @param {HTMLElement} paginationDiv - Pagination container
 */
async function performSearch(query, page, paginationDiv) {
  const resultsDiv = document.getElementById("search-results");

  // Show loading state
  resultsDiv.innerHTML = "<p class='loading-text'>Searching...</p>";
  paginationDiv.innerHTML = "";

  try {
    const data = await searchShows(query, page, 10);

    setDiscoverState({
      currentQuery: query,
      currentPage: page,
      paginationInfo: data.pagination,
      results: data.results,
    });

    displaySearchResults(data.results);

    renderPagination(paginationDiv, query, data.pagination);
  } catch (error) {
    console.error("Search error:", error);
    resultsDiv.innerHTML = `<p class='error-text'>Error searching shows: ${error.message}</p>`;
    paginationDiv.innerHTML = "";
  }
}

/**
 * Displays search results in the results container.
 * @param {Array} results - Array of show objects from search
 */
function displaySearchResults(results) {
  const container = document.getElementById("search-results");

  if (!results || results.length === 0) {
    container.innerHTML = "<p class='no-results'>No shows found.</p>";
    return;
  }

  container.innerHTML = results
    .map((show) => {
      const title = show.show?.title || "";
      const showId = show.show?.ids?.trakt || "";

      return `
        <div class="search-result-card" data-id="${showId}">
          <div class="search-result-poster">
            <img src="https://${show.show.images.poster[0]}" alt="${title}" />
          </div>
          <div class="search-result-info">
            <h3 class="search-result-title">${title} ${show.show?.year}</h3>
            <p class="search-result-overview">${show.show?.overview}</p>
          </div>
        </div>
      `;
    })
    .join("");

  // Add click event to navigate to show details
  container.querySelectorAll(".search-result-card").forEach((card) => {
    card.addEventListener("click", () => {
      const id = card.dataset.id;
      if (id) {
        location.hash = `show?traktIdentifier=${id}`;
      }
    });
  });
}

/**
 * Renders pagination controls.
 * @param {HTMLElement} container - Container for pagination controls
 * @param {string} query - Current search query
 */
async function renderPagination(container, query, pagination) {
  const resultsDiv = document.getElementById("search-results");

  if (!pagination || pagination.pageCount <= 1) {
    container.innerHTML = "";
    return;
  }

  const { page, pageCount, itemCount } = pagination;
  const pages = [];

  // Previous button
  if (page > 1) {
    pages.push(
      `<button class="pagination-btn" data-page="${page - 1}">Previous</button>`
    );
  }

  // Page numbers
  const maxVisible = 5;
  let startPage = Math.max(1, page - Math.floor(maxVisible / 2));
  let endPage = Math.min(pageCount, startPage + maxVisible - 1);

  if (endPage - startPage < maxVisible - 1) {
    startPage = Math.max(1, endPage - maxVisible + 1);
  }

  if (startPage > 1) {
    pages.push(`<button class="pagination-btn" data-page="1">1</button>`);
    if (startPage > 2) {
      pages.push(`<span class="pagination-ellipsis">...</span>`);
    }
  }

  for (let i = startPage; i <= endPage; i++) {
    const activeClass = i === page ? "active" : "";
    pages.push(
      `<button class="pagination-btn ${activeClass}" data-page="${i}">${i}</button>`
    );
  }

  if (endPage < pageCount) {
    if (endPage < pageCount - 1) {
      pages.push(`<span class="pagination-ellipsis">...</span>`);
    }
    pages.push(
      `<button class="pagination-btn" data-page="${pageCount}">${pageCount}</button>`
    );
  }

  // Next button
  if (page < pageCount) {
    pages.push(
      `<button class="pagination-btn" data-page="${page + 1}">Next</button>`
    );
  }

  container.innerHTML = `
    <div class="pagination-info">
      Showing page ${page} of ${pageCount} (${itemCount} total results)
    </div>
    <div class="pagination-buttons">
      ${pages.join("")}
    </div>
  `;

  // Add event listeners to pagination buttons
  container.querySelectorAll(".pagination-btn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const newPage = parseInt(btn.dataset.page, 10);

      await performSearch(query, newPage, container);

      // Scroll to top of results
      resultsDiv.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });
}

/**
 * Renders the user's active TV show watchlist.
 *
 * @returns {void}
 */
export async function renderWatchlist() {
  const shows = getWatchlist();
  const container = document.getElementById("watchlist-container");

  if (!shows.length) {
    container.innerHTML = `<p class="no-show-message">
          You don't have any saved series in your list. Add them via the Discover page, or use Sync with Trakt if you already have some saved there.
        </p>`;

    return;
  }

  container.innerHTML = shows
    .map((show) => {
      const {
        nextEpisodeInfo,
        progressBarPercent,
        progressText,
        episodesLeft,
      } = computeShowProgress(show);

      return `
        <div class="show-card" data-id="${show.shows.slug_id}">
          <div class="poster-container">
            <img
              class="poster"
              src="https://${show.shows.image_poster}"
              alt="${show.shows.title} poster"
            />
          </div>

          <div class="info-container">
            <p class="title">${show.shows.title}</p>
            <p class="next_episode">${nextEpisodeInfo}</p>

            <div class="progress-container">
              <div class="progress-bar">
                <div
                  class="progress-bar-fill"
                  style="width: ${progressBarPercent}%;"
                ></div>
              </div>
              <p class="progress_text">${progressText}</p>
            </div>

            <div class="next_episode_info_container">
              <button
                class="episode_info_btn"
                data-episode="${show.next_episode.id}"
              >
                Episode info
              </button>
              <p class="episodes_left">${episodesLeft} left</p>
            </div>
          </div>
        </div>
      `;
    })
    .join("");

  /**
   * Re-attaches episode info handlers after DOM replacement.
   *
   * NOTE:
   * - This is required because `innerHTML` destroys existing DOM nodes.
   * - `attachEpisodeInfoHandler` is expected to be available in scope.
   */
  container.querySelectorAll(".episode_info_btn").forEach((btn) => {
    attachEpisodeInfoHandler(btn);
  });
}

/**
 * Renders the user's My Shows collection.
 *
 * @returns {void}
 */
export function renderUpcomingEpisodes() {
  const upcomingEpisodes = getUpcomingEpisodes();
  const container = document.getElementById("my_shows-container");

  if (!upcomingEpisodes.length) {
    container.innerHTML = `<p class="no-show-message">
        No shows found in your collection.
      </p>`;

    return;
  }

  container.innerHTML = upcomingEpisodes
    .map((episode) => {
      const nextEpisodeInfo = formatEpisodeInfo(
        episode.season_number,
        episode.episode_number,
        episode.title
      );

      const timeText = getTimeUntil(episode.first_aired);

      return `
        <div class="show-card" data-id="${episode.shows.slug_id}">
          <div class="poster-container">
            <img
              class="poster"
              src="https://${episode.shows.image_poster}"
              alt="${episode.title} poster"
            />
          </div>
          <div class="info-container">
            <p class="title">${episode.title}</p>
            <p class="next_episode">${nextEpisodeInfo}</p>
            <p class="days_until_next">Next episode in: <span class="days_badge">${timeText}</span></p>
          </div>
        </div>
      `;
    })
    .join("");
}

/**
 * Renders show details (title, overview, etc.)
 * @param {Object} show - Show object from API
 * @returns {HTMLElement} - The show details element
 */
export function renderShowDetails(show) {
  const showContainer = document.getElementById("show-container");

  const collectionBtnClass = show.in_collection
    ? "collection-btn in-collection"
    : "collection-btn";
  const collectionBtnText = show.in_collection
    ? "In Collection"
    : "Add to Collection";

  showContainer.innerHTML = `
    <div class="show_banner-container">
      <img class="show_banner-img" src="https://${show.image_fanart}">
    </div>
    <div class="show_poster-container">
      <img class="show_poster-img" src="https://${show.image_poster}">
      <div class="show-top-container">
        <h2>${show.title} (${show.year})</h2>
        <p class="status">Status: ${show.status}</p>
      </div>
    </div>
    <button class="${collectionBtnClass}" id="collection-btn" data-show-id="${
    show.id
  }">${collectionBtnText}</button>
    <div class="show_other_info-container">
      <p class="tagline">${show.tagline}</p>
      <br>
      <p class="overview">${show.overview}</p>
      <br>
      <div class="more_info-row">
        <p class="rating">⭐ ${parseFloat(show.rating).toFixed(1)}</p>
        -
        <p class="genres">${show.genres}</p>
        -
        <p class="runtime">${show.runtime} min</p>
        -
        <p class="network">${show.network}</p>
      </div>
    </div>
    <div id="seasons"></div>
  `;

  // Add event listener for collection button
  const collectionBtn = showContainer.querySelector("#collection-btn");
  if (collectionBtn) {
    collectionBtn.addEventListener("click", async () => {
      const showId = collectionBtn.dataset.showId;
      if (!showId) return;

      const shouldAdd = !collectionBtn.classList.contains("in-collection");

      collectionBtn.disabled = true;

      try {
        await manageCollection(showId, shouldAdd);

        collectionBtn.textContent = shouldAdd
          ? "In Collection"
          : "Add to Collection";

        collectionBtn.classList.toggle("in-collection", shouldAdd);
      } catch (error) {
        console.error("Failed to manage collection:", error);
        alert("Failed to update collection.");
      } finally {
        collectionBtn.disabled = false;
      }
    });
  }

  renderShowSeasons(showContainer, show.seasons, show.id);
}

/**
 * Generates HTML for all episodes in a season.
 * @param {Array} episodes - List of episodes
 * @returns {string} - HTML string for the episodes
 */
function renderSeasonEpisodes(episodes) {
  return `
      ${episodes
        .map((ep) => {
          const { episodeInfo, btnClass, btnText } = computeEpisodeProgress(ep);

          return `
          <div class="episode" data-episode-id="${ep.id}">
            <div class="episode_info-container">
              <p class="episode_title">${ep.title || "Untitled"}</p>
              <p class="episode_info">${episodeInfo}</p>
            </div>

            <button class="${btnClass}">${btnText}</button>
          </div>`;
        })
        .join("")}
    `;
}

/**
 * Renders a single season including its progress bar, mark/unmark button, and episode list.
 * @param {Object} season - Season object
 * @returns {HTMLElement} - A div element containing the rendered season
 */
function renderSeason(season) {
  const seasonDiv = document.createElement("div");
  seasonDiv.classList.add("season");
  // annotate season div with season number for easy lookup
  seasonDiv.dataset.seasonId = season.season_number;

  const { progressBarPercent, progressText, seasonCompleted } =
    computeSeasonProgress(season.episodes);

  seasonDiv.innerHTML = `
      <div class="season-container">
        <button class="${
          seasonCompleted ? "unmark-watched" : "mark-watched"
        } season_mark_btn">${seasonCompleted ? "Unmark" : "Mark"}</button>
        <p class="season_number">Season ${season.season_number}</p>
        <div class="progress-container">
          <div class="progress-bar">
            <div class="progress-bar-fill" style="width: ${progressBarPercent}%;"></div>
          </div>
          <p class="progress_text">${progressText}</p>
        </div>
        <button class="expand_btn">
          <svg class="icon" width="14" height="14" viewBox="0 0 24 24">
            <path d="M8 9l4 4 4-4" stroke="currentColor" stroke-width="2" fill="none" />
          </svg>
        </button>
      </div>
      <div class="episodes">${renderSeasonEpisodes(season.episodes)}</div>
    `;
  return seasonDiv;
}

/**
 * Updates the visual progress of a season when episodes or seasons are marked or unmarked as watched.
 *
 * @param {HTMLElement} btn - The button that triggered the action.
 * @param {boolean} markAsWatched - Whether the episode or season is marked as watched (true) or unwatched (false).
 * @param {boolean} [setAll=false] - If true, updates the entire season at once.
 */
function updateSeasonProgress(btn, markAsWatched, setAll = false) {
  const season = btn.closest(".season");
  if (!season) return;

  const progressBarFill = season.querySelector(".progress-bar-fill");
  const progressText = season.querySelector(".progress_text");

  let [watched, total] = progressText.textContent
    .split("/")
    .map((v) => parseInt(v.trim(), 10));

  // Mark/unmark entire season
  if (setAll) {
    watched = markAsWatched ? total : 0;

    const episodeDivs = season.querySelectorAll(".episode");
    episodeDivs.forEach((epDiv) => {
      const epBtn = epDiv.querySelector("button");
      updateMarkButton(epBtn, markAsWatched);
    });
  } else {
    // Single episode update
    watched = markAsWatched ? watched + 1 : watched - 1;
    updateMarkButton(btn, markAsWatched);
  }

  // Clamp values just in case
  watched = Math.max(0, Math.min(watched, total));

  const percent = Math.round((watched / total) * 100);

  progressBarFill.style.width = `${percent}%`;
  progressText.textContent = `${watched}/${total}`;
}

/**
 * Renders seasons and episodes of a show.
 * @param {HTMLElement} container - Container element to append seasons to
 * @param {Array} seasons - Show seasons
 * @param {string} showId - Internal show UUID.
 */
export function renderShowSeasons(container, seasons, showId) {
  const seasonsContainer = container.querySelector("#seasons");
  const seasonsTitle = document.createElement("p");
  seasonsTitle.classList.add("seasons_title");
  seasonsTitle.textContent = "Seasons";
  seasonsContainer.appendChild(seasonsTitle);

  seasons.forEach((season) => {
    seasonsContainer.appendChild(renderSeason(season));
  });

  // Expand/collapse seasons
  seasonsContainer.querySelectorAll(".expand_btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const seasonDiv = btn.closest(".season");
      const episodesDiv = seasonDiv.querySelector(".episodes");

      episodesDiv.classList.toggle("open");
      btn.classList.toggle("open");
    });
  });

  // Add event listeners to all buttons (both watched and not watched)
  seasonsContainer
    .querySelectorAll(".episode .mark-watched, .episode .unmark-watched")
    .forEach((btn) => {
      btn.addEventListener("click", async (event) => {
        event.stopPropagation();

        btn.disabled = true;

        const episodeDiv = btn.closest(".episode");
        const episodeId = episodeDiv.dataset.episodeId;
        const markAsWatched = btn.classList.contains("mark-watched");

        try {
          const showUpdated = await markEpisodes(
            showId,
            [episodeId],
            markAsWatched
          );

          if (showUpdated) {
            updateMarkButton(btn, markAsWatched);
            updateSeasonProgress(btn, markAsWatched);
          }
        } catch (err) {
          console.log("err", err);
          alert("Failed to mark episode as watched.");
        } finally {
          btn.disabled = false;
        }
      });
    });

  seasonsContainer.querySelectorAll(".episode").forEach((element) => {
    const episodeId = element.getAttribute("data-episode-id");

    const episodeData = seasons
      .flatMap((season) => season.episodes)
      .find((episode) => episode.id === episodeId);

    if (!episodeData) return;

    attachEpisodeInfoHandler(element, { ...episodeData, show_id: showId });
  });

  // Add event listeners for season-level mark/unmark buttons
  seasonsContainer.querySelectorAll(".season_mark_btn").forEach((btn) => {
    btn.addEventListener("click", async (event) => {
      event.stopPropagation();

      btn.disabled = true;
      const seasonDiv = btn.closest(".season");
      const markAsWatched = btn.classList.contains("mark-watched");
      const episodeElements = seasonDiv.querySelectorAll(`.episode`);

      const episodeIds = Array.from(episodeElements)
        .filter((epEl) => {
          const btn = epEl.querySelector("button");
          if (!btn) return false;
          return markAsWatched ? btn.classList.contains("mark-watched") : true;
        })
        .map((epEl) => epEl.dataset.episodeId);

      try {
        const showUpdated = await markEpisodes(
          showId,
          episodeIds,
          markAsWatched
        );

        if (showUpdated) {
          updateMarkButton(btn, markAsWatched);
          updateSeasonProgress(btn, markAsWatched, true);
        }
      } catch (err) {
        console.log("err", err);
        alert("Failed to mark episode as watched.");
      } finally {
        btn.disabled = false;
      }
    });
  });
}

/**
 * Updates the mark/unmark button text and classes based on watched status.
 * @param {HTMLElement} markBtn - The button element to update.
 * @param {boolean} watched - Whether the episode is marked as watched.
 */
function updateMarkButton(markBtn, watched) {
  if (watched) {
    markBtn.classList.remove("mark-watched");
    markBtn.classList.add("unmark-watched");
    markBtn.textContent = "Unmark";
  } else {
    markBtn.classList.remove("unmark-watched");
    markBtn.classList.add("mark-watched");
    markBtn.textContent = "Mark";
  }
}

/**
 * Shows the episode info modal and populates it with the given episode's details.
 *
 * @param {Object} episode - The episode object to display.
 * @param {Function} updateUICallback - Callback to invoke when the UI should be updated
 *                                      (e.g., marking episode watched).
 * @param {boolean} [isWatched=false] - Indicates whether the episode is already marked as watched.
 */
function showEpisodeInfoModal(episode, updateUICallback, isWatched = false) {
  const overlay = document.getElementById("episode-info-modal-overlay");
  const modal = document.getElementById("episode-info-modal");

  overlay.style.display = "flex";
  modal.style.display = "flex";

  overlay.onclick = (e) => {
    if (e.target === overlay) overlay.style.display = "none";
  };

  // Episode info
  const info = modal.querySelector(".episode-info-info");
  info.textContent =
    formatEpisodeInfo(
      episode.season_number,
      episode.episode_number,
      episode.title
    ) || "";

  // Air date
  const date = modal.querySelector(".episode-info-date");
  date.textContent = `Aired on ${formatDate(episode.first_aired)}`;

  // Overview
  const overviewEl = modal.querySelector(".episode-info-overview");
  overviewEl.textContent = episode.overview || "";

  // Episode image with fallback
  const imgTag = modal.querySelector(".modal-img-tag");
  if (episode.image_screenshot) {
    imgTag.src = `https://${episode.image_screenshot}`;
  } else {
    imgTag.style.display = "none";
  }

  // Mark button
  const markBtn = modal.querySelector(".modal-mark-btn");
  updateMarkButton(markBtn, isWatched);

  let mark = isWatched;

  markBtn.onclick = async () => {
    try {
      const showUpdated = await markEpisodes(
        episode.show_id,
        [episode.id],
        !mark
      );

      if (showUpdated) {
        mark = !mark;
        updateMarkButton(markBtn, mark);

        if (typeof updateUICallback === "function") {
          updateUICallback();

          // Close modal after action
          overlay.style.display = "none";
        }
      }
    } catch (err) {
      alert("Failed to mark episode as watched. Please try again.");
    }
  };
}
