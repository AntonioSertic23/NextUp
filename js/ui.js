// ========================================================
// ui.js - UI helper functions
// ========================================================

import {
  getWatchlist,
  changeSort,
  changeOrder,
  getNextEpisodeById,
} from "./stores/watchlistStore.js";
import { markEpisode, markSeasonWatched, manageCollection } from "./api.js";

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
 * Formats an episode string in the form `SxxExx - Title`.
 *
 * Pads season and episode numbers to 2 digits.
 *
 * @param {number|string} seasonNumber - Season number.
 * @param {number|string} episodeNumber - Episode number.
 * @param {string} [title] - Optional episode title.
 * @returns {string} Formatted episode string, e.g. `S01E05 - Pilot`.
 */
export function formatEpisodeInfo(seasonNumber, episodeNumber, title) {
  if (seasonNumber == null || episodeNumber == null) return "";

  const season = String(seasonNumber).padStart(2, "0");
  const episode = String(episodeNumber).padStart(2, "0");

  return `S${season}E${episode}${title ? ` - ${title}` : ""}`;
}

// Helper to compute progress for a show at render time
function computeShowProgress(show) {
  const nextEpisodeInfo = formatEpisodeInfo(
    show.next_episode.season_number,
    show.next_episode.episode_number,
    show.next_episode.title
  );

  const progressBarPercent = Math.round(
    (show.watched_episodes / show.total_episodes) * 100
  );

  const progressText = `${show.watched_episodes}/${show.total_episodes}`;

  const episodesLeft = show.total_episodes - show.watched_episodes;

  return { nextEpisodeInfo, progressBarPercent, progressText, episodesLeft };
}

/**
 * Attaches a click handler to an "Episode info" button that opens the episode modal.
 *
 * If the episode cannot be found, logs an error and exits gracefully.
 *
 * @param {HTMLElement} btn - The episode info button element.
 */
function attachEpisodeInfoHandler(btn) {
  if (!btn) return;

  btn.addEventListener("click", (e) => {
    e.stopPropagation();

    const episodeId = btn.getAttribute("data-episode");
    if (!episodeId) {
      alert("Unable to show episode info: missing ID.");
      return;
    }

    const nextEpisode = getNextEpisodeById(episodeId);
    if (!nextEpisode) {
      alert("Episode information could not be retrieved.");
      return;
    }

    // Callback to update/remove the episode card after an action like marking watched
    const updateUICallback = () => {
      console.log("updateUICallback");
      // TODO: Fetch the next episode for this series and update or remove only that single series from the UI.
      /*
      const nextEpisode = getNextEpisode();
      if (nextEpisode) {
        updateShowCard(nextEpisode.show_id);
      } else {
        removeShowCard(nextEpisode.show_id);
      }
      */
    };

    showEpisodeInfoModal(nextEpisode, updateUICallback);
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
        <div class="show-card" data-id="${show.shows.id}">
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
 * Renders a list of TV shows with days until next episode information.
 * @param {HTMLElement} container - The DOM element to render the shows into.
 * @param {Array} shows - Array of show objects with daysUntilNext and nextEpisode properties.
 * @returns {void}
 */
export function renderMyShowsCollection(container, shows) {
  container.innerHTML = shows
    .map((show) => {
      const p = computeShowProgress(show);
      const daysUntilNext = show.daysUntilNext;
      const hoursUntilNext = show.hoursUntilNext;
      const nextEpisode = show.nextEpisode;

      // Format next episode info
      const nextEpInfo = formatEpisodeInfo(
        nextEpisode.seasonNumber,
        nextEpisode.episodeNumber,
        nextEpisode.title
      );

      // Format time text with days and hours
      let timeText = "";
      if (daysUntilNext === 0 && hoursUntilNext === 0) {
        timeText = "Today";
      } else if (daysUntilNext === 0) {
        timeText = hoursUntilNext === 1 ? "1 hour" : `${hoursUntilNext} hours`;
      } else if (daysUntilNext === 1) {
        if (hoursUntilNext === 0) {
          timeText = "1 day";
        } else {
          timeText =
            hoursUntilNext === 1
              ? "1 day 1 hour"
              : `1 day ${hoursUntilNext} hours`;
        }
      } else {
        if (hoursUntilNext === 0) {
          timeText = `${daysUntilNext} days`;
        } else {
          timeText =
            hoursUntilNext === 1
              ? `${daysUntilNext} days 1 hour`
              : `${daysUntilNext} days ${hoursUntilNext} hours`;
        }
      }

      return `
    <div class="show-card" data-id="${show.ids.trakt}">
      <div class="poster-container">
        <img class="poster" src="https://${show.images.poster}"></img>
      </div>
      <div class="info-container">
      <p class="title">${show.title}</p>
      <p class="next_episode">${nextEpInfo}</p>
      <p class="days_until_next">Next episode in: <span class="days_badge">${timeText}</span></p>
      <div class="next_episode_info_container">
        <button class="episode_info_btn" data-episode='${JSON.stringify({
          showId: p.nextEpObj.showId,
          seasonNumber: p.nextEpObj.seasonNumber,
          episodeNumber: p.nextEpObj.episodeNumber,
        })}'>Episode info</button>
      </div>
      </div>
    </div>
  `;
    })
    .join("");

  // Attach event listeners for modal open
  container.querySelectorAll(".episode_info_btn").forEach((btn) => {
    attachEpisodeInfoHandler(btn);
  });
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

  // TODO: Render seasons
  // renderSeasons(showContainer, show);
}

/**
 * Update a single episode button and its season progress in-place.
 * @param {HTMLElement} episodeDiv - The episode DOM element
 * @param {Object} updatedShow - The updated show object returned from API
 * @param {number} seasonNumber
 * @param {boolean} mark
 */
function updateEpisodeAndSeasonUI(episodeDiv, updatedShow, seasonNumber, mark) {
  const btn = episodeDiv.querySelector("button");

  // Update button state
  const epWatchedNow = !!mark;
  btn.textContent = epWatchedNow ? "Watched" : "Mark as watched";
  btn.classList.toggle("mark-watched", !epWatchedNow);
  btn.classList.toggle("unmark-watched", epWatchedNow);

  // Update season progress using updatedShow data
  const updatedSeason = (updatedShow.seasons || []).find(
    (s) => s.number === seasonNumber
  );
  if (!updatedSeason) return;

  const episodes = Array.isArray(updatedSeason.episodes)
    ? updatedSeason.episodes
    : [];
  const total = episodes.length;
  const completed = episodes.reduce(
    (acc, e) => acc + (e.watched || (e.plays != null && e.plays > 0) ? 1 : 0),
    0
  );
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

  const seasonDiv = episodeDiv.closest(".season");
  if (!seasonDiv) return;
  const fill = seasonDiv.querySelector(".progress-bar-fill");
  const textEl = seasonDiv.querySelector(".progress_text");
  if (fill) fill.style.width = `${percent}%`;
  if (textEl) textEl.textContent = `${completed}/${total}`;
}

/**
 * Renders seasons and episodes of a show.
 * @param {HTMLElement} container - Container element to append seasons to
 * @param {Object} show - Show object containing `show.seasons` (array of season objects with episodes)
 */
export function renderSeasons(container, show) {
  const seasonsContainer = container.querySelector("#seasons");

  const seasons = show.seasons;

  const seasonTitle = document.createElement("p");
  seasonTitle.classList.add("seasons_title");
  seasonTitle.textContent = "Seasons";
  seasonsContainer.appendChild(seasonTitle);

  seasons.forEach((season) => {
    const seasonDiv = document.createElement("div");
    seasonDiv.classList.add("season");
    // annotate season div with season number for easy lookup
    seasonDiv.dataset.season = season.number;

    // compute totals for the season
    const episodesArray = Array.isArray(season.episodes) ? season.episodes : [];
    const total =
      episodesArray.length > 0
        ? episodesArray.length
        : season.episode_count || season.aired_episodes || 0;
    let completed = 0;
    episodesArray.forEach((ep) => {
      const watched =
        !!ep.watched || (ep.plays != null && ep.plays > 0) || !!ep.completed;
      if (watched) completed += 1;
    });

    const progress_bar_percent =
      total > 0 ? Math.round((completed / total) * 100) : 0;
    const progress_text = `${completed}/${total}`;

    const episodesHTML = `
      <div class="episodes">
        ${episodesArray
          .map((ep) => {
            const epWatched =
              !!ep.watched ||
              (ep.plays != null && ep.plays > 0) ||
              !!ep.completed;
            const btnClass = epWatched ? "unmark-watched" : "mark-watched";
            const btnText = epWatched ? "Watched" : "Mark as watched";

            const firstAiredDate = new Date(ep.first_aired);
            const dd = String(firstAiredDate.getDate()).padStart(2, "0");
            const mm = String(firstAiredDate.getMonth() + 1).padStart(2, "0");
            const yyyy = firstAiredDate.getFullYear();
            const airedStr = `${dd}/${mm}/${yyyy}`;

            return `
            <div class="episode" data-season="${season.number}" data-episode="${
              ep.number
            }" data-trakt="${ep.ids && ep.ids.trakt ? ep.ids.trakt : ""}">
              <div class="episode_info-container">
                <p class="episode_title">${ep.title || "Untitled"}</p>
                <p class="episode_info">S${String(season.number).padStart(
                  2,
                  "0"
                )}E${String(ep.number).padStart(2, "0")} - ${airedStr}</p>
              </div>

              <button class="${btnClass}">${btnText}</button>
            </div>`;
          })
          .join("")}
      </div>
    `;

    seasonDiv.innerHTML = `
      <div class="season-container">
        <button class="${
          completed === total ? "unmark-season" : "mark-season"
        } season_mark_btn">${
      completed === total ? "Unmark season" : "Mark season"
    }</button>
        <p class="season_number">Season ${season.number}</p>
        <div class="progress-container">
          <div class="progress-bar">
            <div class="progress-bar-fill" style="width: ${progress_bar_percent}%;"></div>
          </div>
          <p class="progress_text">${progress_text}</p>
        </div>
        <button class="expand_btn">
          <svg class="icon" width="14" height="14" viewBox="0 0 24 24">
            <path d="M8 9l4 4 4-4" stroke="currentColor" stroke-width="2" fill="none" />
          </svg>
        </button>
      </div>
      ${episodesHTML}
    `;

    seasonsContainer.appendChild(seasonDiv);
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
    .querySelectorAll(".mark-watched, .unmark-watched")
    .forEach((btn) => {
      btn.addEventListener("click", async () => {
        // Determine metadata from DOM
        const episodeDiv = btn.closest(".episode");
        if (!episodeDiv) return;
        const seasonNumber = parseInt(episodeDiv.dataset.season, 10);
        const episodeNumber = parseInt(episodeDiv.dataset.episode, 10);
        const episodeTraktId = episodeDiv.dataset.trakt || null;

        // Find show ID from the container's show details
        const showId =
          show && show.ids && show.ids.trakt ? show.ids.trakt : null;
        const token = window.localStorage.getItem("trakt_token");
        if (!token || !showId) {
          console.warn("Missing token or showId for marking episode");
          return;
        }

        const mark = btn.classList.contains("mark-watched");

        updateMarkButton(btn, mark);

        // TODO:
        const episodeId = "";

        try {
          // call API to mark/unmark episode
          const updatedShow = markEpisode(showId, episodeId, mark);

          // Update UI in-place for this episode/button using returned updatedShow if available
          if (updatedShow) {
            updateEpisodeAndSeasonUI(
              episodeDiv,
              updatedShow,
              seasonNumber,
              mark
            );
          }
        } catch (err) {
          console.error("Failed to mark episode:", err);
        }
      });
    });

  // Add event listeners for season-level mark/unmark buttons
  seasonsContainer.querySelectorAll(".season_mark_btn").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const seasonDiv = btn.closest(".season");
      if (!seasonDiv) return;
      const seasonNumber = parseInt(seasonDiv.dataset.season, 10);
      const showId = show && show.ids && show.ids.trakt ? show.ids.trakt : null;
      const token = window.localStorage.getItem("trakt_token");
      if (!token || !showId) {
        console.warn("Missing token or showId for marking season");
        return;
      }

      const mark = btn.classList.contains("mark-season");

      // Optimistic UI: set all episode buttons in this season
      const episodeDivs = seasonDiv.querySelectorAll(".episode");
      episodeDivs.forEach((epDiv) => {
        const epBtn = epDiv.querySelector("button");
        if (!epBtn) return;
        epBtn.textContent = mark ? "Watched" : "Mark as watched";
        epBtn.classList.toggle("mark-watched", !mark);
        epBtn.classList.toggle("unmark-watched", mark);
      });

      // Update progress bar optimistically
      const fill = seasonDiv.querySelector(".progress-bar-fill");
      const textEl = seasonDiv.querySelector(".progress_text");
      const total = episodeDivs.length;
      const completed = mark ? total : 0;
      const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
      if (fill) fill.style.width = `${percent}%`;
      if (textEl) textEl.textContent = `${completed}/${total}`;
      // Update season button optimistically
      const seasonBtnOptim = seasonDiv.querySelector(".season_mark_btn");
      if (seasonBtnOptim) {
        if (mark) {
          seasonBtnOptim.textContent = "Unmark season";
          seasonBtnOptim.classList.remove("mark-season");
          seasonBtnOptim.classList.add("unmark-season");
        } else {
          seasonBtnOptim.textContent = "Mark season";
          seasonBtnOptim.classList.remove("unmark-season");
          seasonBtnOptim.classList.add("mark-season");
        }
      }

      try {
        const episodeIds = Array.from(episodeDivs)
          .map((d) => d.dataset.trakt)
          .filter(Boolean);
        const updatedShow = await markSeasonWatched(
          token,
          showId,
          seasonNumber,
          mark,
          episodeIds
        );
        if (updatedShow) {
          // apply authoritative update from server
          const updatedSeason = (updatedShow.seasons || []).find(
            (s) => s.number === seasonNumber
          );
          if (updatedSeason) {
            // update each episode button and progress based on updatedSeason
            const episodes = Array.isArray(updatedSeason.episodes)
              ? updatedSeason.episodes
              : [];
            episodeDivs.forEach((epDiv) => {
              const epNum = parseInt(epDiv.dataset.episode, 10);
              const match = episodes.find((e) => e.number === epNum);
              const epBtn = epDiv.querySelector("button");
              if (!epBtn) return;
              const epWatched = match
                ? !!match.watched || (match.plays != null && match.plays > 0)
                : !!mark;
              epBtn.textContent = epWatched ? "Watched" : "Mark as watched";
              epBtn.classList.toggle("mark-watched", !epWatched);
              epBtn.classList.toggle("unmark-watched", epWatched);
            });

            const total2 = episodes.length;
            const completed2 = episodes.reduce(
              (acc, e) =>
                acc + (e.watched || (e.plays != null && e.plays > 0) ? 1 : 0),
              0
            );
            const percent2 =
              total2 > 0 ? Math.round((completed2 / total2) * 100) : 0;
            if (fill) fill.style.width = `${percent2}%`;
            if (textEl) textEl.textContent = `${completed2}/${total2}`;
          }
        }
      } catch (err) {
        console.error("Failed to mark season:", err);
      }
    });
  });

  // Open modal on episode click (excluding the mark/unmark buttons)
  seasonsContainer.querySelectorAll(".episode").forEach((epDiv) => {
    epDiv.addEventListener("click", (e) => {
      if (e.target.tagName === "BUTTON") return; // ignore clicks on mark/unmark
      const seasonNumber = parseInt(epDiv.dataset.season, 10);
      const episodeNumber = parseInt(epDiv.dataset.episode, 10);
      const showId = show.ids?.trakt;

      const cache = loadCache();
      const cachedShow = cache[showId];
      if (!cachedShow) return;
      const season = (cachedShow.seasons || []).find(
        (s) => s.number === seasonNumber
      );
      if (!season || !Array.isArray(season.episodes)) return;
      const episode = season.episodes.find((ep) => ep.number === episodeNumber);
      if (!episode) return;

      const info = formatEpisodeInfo(
        seasonNumber,
        episodeNumber,
        episode.title
      );
      const nextEp = { ...episode, season: seasonNumber, info };

      // TODO:
      const isWatched = true;

      const callback = updateEpisodeAndSeasonUI(
        episodeDiv,
        updatedShow,
        seasonNumber,
        mark
      );

      showEpisodeInfoModal(nextEp, callback, isWatched);
    });
  });
}

/**
 * Updates a single show card on the UI with fresh data from cache.
 * @param {string|number} showId - Trakt show ID to update.
 */
export function updateShowCard(showId) {
  const showCard = document.querySelector(`.show-card[data-id="${showId}"]`);
  if (!showCard) return;

  const cache = loadCache();
  const show = cache[showId];
  if (!show) return;

  // Recompute progress
  const p = computeShowProgress(show);

  // Update DOM elements
  const nextEpisodeEl = showCard.querySelector(".next_episode");
  const progressBarFill = showCard.querySelector(".progress-bar-fill");
  const progressText = showCard.querySelector(".progress_text");
  const episodesLeft = showCard.querySelector(".episodes_left");
  const episodeInfoBtn = showCard.querySelector(".episode_info_btn");

  if (nextEpisodeEl) nextEpisodeEl.textContent = p.nextEpObj?.info || "";
  if (progressBarFill)
    progressBarFill.style.width = `${p.progress_bar_percent}%`;
  if (progressText) progressText.textContent = p.progress_text || "";
  if (episodesLeft)
    episodesLeft.textContent =
      p.episodes_left != null ? `${p.episodes_left} left` : "";

  // Update episode info button data and reattach listener
  if (episodeInfoBtn) {
    episodeInfoBtn.setAttribute(
      "data-episode",
      JSON.stringify(p.nextEpObj || {})
    );
    // Remove old listener and add new one
    const newBtn = episodeInfoBtn.cloneNode(true);
    episodeInfoBtn.parentNode.replaceChild(newBtn, episodeInfoBtn);
    attachEpisodeInfoHandler(newBtn);
  }
}

/**
 * Updates the mark/unmark button text and classes based on watched status.
 * @param {HTMLElement} markBtn - The button element to update.
 * @param {boolean} watched - Whether the episode is marked as watched.
 */
function updateMarkButton(markBtn, watched) {
  markBtn.textContent = watched ? "Watched" : "Mark as watched";
  markBtn.classList.toggle("mark-watched", !watched);
  markBtn.classList.toggle("unmark-watched", watched);
}

/**
 * Formats a date string or Date object into `DD/MM/YYYY` format.
 *
 * @param {string|Date} input - The date to format.
 * @returns {string} Formatted date string in `DD/MM/YYYY` format.
 */
export function formatDate(input) {
  if (!input) return "";

  const d = input instanceof Date ? input : new Date(input);
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();

  return `${day}/${month}/${year}`;
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

  markBtn.onclick = () => {
    try {
      const showUpdated = markEpisode(episode.show_id, episode.id, !mark);

      if (showUpdated) {
        mark = !mark;
        updateMarkButton(markBtn, mark);

        if (typeof updateUICallback === "function") {
          updateUICallback();
        }
      }
    } catch (err) {
      alert("Failed to mark episode as watched. Please try again.");
    }
  };

  overlay.onclick = (e) => {
    if (e.target === overlay) overlay.style.display = "none";
  };
}
