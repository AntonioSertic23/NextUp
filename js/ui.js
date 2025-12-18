// ========================================================
// ui.js - UI helper functions
// ========================================================

import { markEpisodeWatched, markSeasonWatched } from "./api.js";
import { loadCache } from "./local_storage.js";

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

// Helper to compute progress for a show at render time
function computeShowProgress(show) {
  const seasons =
    Array.isArray(show.seasons) && show.seasons.length > 0
      ? show.seasons
      : Array.isArray(show.progress && show.progress.seasons)
      ? show.progress.seasons
      : [];

  // Exclude specials
  const effectiveSeasons = seasons.filter((s) => {
    if (!s) return false;
    if (s.number === 0) return false;
    if (s.title && /special/i.test(s.title)) return false;
    return true;
  });

  let total = 0;
  let watched = 0;
  let nextEpObj = null;

  effectiveSeasons.forEach((s) => {
    const eps = Array.isArray(s.episodes) ? s.episodes : [];
    eps.forEach((ep) => {
      total += 1;
      const isWatched =
        !!ep.watched || (ep.plays != null && ep.plays > 0) || !!ep.completed;
      if (isWatched) watched += 1;
      // Find first unwatched episode
      if (!nextEpObj && !isWatched) {
        const nextInfo =
          "S" +
          String(s.number).padStart(2, "0") +
          "E" +
          String(ep.number).padStart(2, "0") +
          " - " +
          ep.title;
        nextEpObj = {
          showId: show.ids.trakt,
          seasonNumber: s.number,
          episodeNumber: ep.number,
          info: nextInfo,
        };
      }
    });
    // if no episodes array, try to use episode_count as fallback (counts only)
    if (!Array.isArray(s.episodes) && typeof s.episode_count === "number") {
      total += s.episode_count;
    }
  });

  const progress_text =
    total > 0 ? `${watched}/${total}` : watched > 0 ? `${watched}` : null;
  const episodes_left = total > 0 ? Math.max(total - watched, 0) : null;
  const progress_bar_percent =
    total > 0 ? Math.round((watched / total) * 100) : 0;

  return { progress_text, episodes_left, progress_bar_percent, nextEpObj };
}

// Attach click handler for episode info buttons (opens modal with cached episode data)
function attachEpisodeInfoHandler(btn) {
  if (!btn) return;
  btn.addEventListener("click", (e) => {
    e.stopPropagation();
    const episodeData = JSON.parse(btn.getAttribute("data-episode")) || {};
    const { showId, seasonNumber, episodeNumber } = episodeData;
    if (!showId || seasonNumber == null || episodeNumber == null) return;

    const cache = loadCache();
    const show = cache[showId];
    if (!show || !Array.isArray(show.seasons)) return;

    const season = show.seasons.find((s) => s.number === seasonNumber);
    if (!season || !Array.isArray(season.episodes)) return;

    const episode = season.episodes.find((ep) => ep.number === episodeNumber);
    if (!episode) return;

    const nextEp = {
      ...episode,
      season: seasonNumber,
      info:
        episodeData.info ||
        `S${String(seasonNumber).padStart(2, "0")}E${String(
          episodeNumber
        ).padStart(2, "0")} - ${episode.title || ""}`,
    };

    showEpisodeInfoModal(nextEp, showId, "collection");
  });
}

/**
 * Renders a list of TV shows in a container.
 * @param {HTMLElement} container - The DOM element to render the shows into.
 * @param {Array} shows - Array of show objects from Trakt API or dummy data.
 * @returns {void}
 */
export function renderCollection(container, shows) {
  container.innerHTML = shows
    .map((show) => {
      const p = computeShowProgress(show);

      return `
    <div class="show-card" data-id="${show.ids.trakt}">
      <div class="poster-container">
        <img class="poster" src="https://${show.images.poster}"></img>
      </div>
      <div class="info-container">
      <p class="title">${show.title}</p>
      <p class="next_episode">${p.nextEpObj?.info || ""}</p>
      <div class="progress-container">
        <div class="progress-bar">
           <div class="progress-bar-fill" style="width: ${
             p.progress_bar_percent
           }%;"></div>
        </div>
        <p class="progress_text">${p.progress_text || ""}</p>
      </div>
      <div class="next_episode_info_container">
        <button class="episode_info_btn" data-episode='${JSON.stringify(
          p.nextEpObj
        )}'>Episode info</button>
        <p class="episodes_left">${
          p.episodes_left != null ? p.episodes_left : ""
        } left</p>
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
  const div = document.createElement("div");
  div.classList.add("show-details");
  div.innerHTML = `
    <div class="show_banner-container">
      <img class="show_banner-img" src="https://${show.images.fanart}">
    </div>
    <div class="show_poster-container">
      <img class="show_poster-img" src="https://${show.images.poster}">
      <div class="show-top-container">
        <h2>${show.title} (${show.year})</h2>
        <p class="status">Status: ${show.status}</p>
      </div>
    </div>
    <div class="show_other_info-container">
      <p class="tagline">${show.tagline}</p>
      <br>
      <p class="overview">${show.overview}</p>
      <br>
      <div class="more_info-row">
        <p class="rating">⭐ ${parseFloat(show.rating || 0).toFixed(1)}</p>
        -
        <p class="genres">${(show.genres || []).join(", ")}</p>
        -
        <p class="runtime">${show.runtime || 0} min</p>
        -
        <p class="network">${show.network || ""}</p>
      </div>
    </div>
    <div id="seasons"></div>
  `;
  return div;
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
  const seasons = Array.isArray(show && show.seasons) ? show.seasons : [];

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

        // Optimistically update UI
        btn.textContent = mark ? "Watched" : "Mark as watched";
        btn.classList.toggle("mark-watched", !mark);
        btn.classList.toggle("unmark-watched", mark);

        try {
          // call API to mark/unmark episode
          const updatedShow = await markEpisodeWatched(
            token,
            showId,
            seasonNumber,
            episodeNumber,
            episodeTraktId,
            mark
          );

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

      const info = `S${String(seasonNumber).padStart(2, "0")}E${String(
        episodeNumber
      ).padStart(2, "0")} - ${episode.title || ""}`;
      const nextEp = { ...episode, season: seasonNumber, info };

      showEpisodeInfoModal(nextEp, showId, "show", epDiv);
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
 * Shows the episode info modal and fills it with the provided episode's details.
 * @param {Object} episode - Episode object with info, title, date, overview, and images.
 * @param {string|number} showId - Trakt show ID for marking episodes
 * @param {string} context
 * @param {HTMLElement} episodeDiv - The episode DOM element
 */
export function showEpisodeInfoModal(episode, showId, context, episodeDiv) {
  const overlay = document.getElementById("episode-info-modal-overlay");
  const modal = document.getElementById("episode-info-modal");

  overlay.style.display = "flex";
  modal.style.display = "flex";

  const info = modal.querySelector(".episode-info-info");
  const date = modal.querySelector(".episode-info-date");
  const overviewEl = modal.querySelector(".episode-info-overview");
  const imgTag = modal.querySelector(".modal-img-tag");
  const markBtn = modal.querySelector(".modal-mark-btn");

  info.textContent = episode.info || "";
  // Date
  const d = new Date(episode.first_aired);
  const formattedDate = `${String(d.getDate()).padStart(2, "0")}/${String(
    d.getMonth() + 1
  ).padStart(2, "0")}/${d.getFullYear()}`;
  date.textContent = `Aired on ${formattedDate}`;
  overviewEl.textContent = episode.overview || "";

  // Image
  if (episode.images?.screenshot && episode.images.screenshot[0]) {
    imgTag.src = `https://${episode.images.screenshot[0]}`;
    imgTag.style.display = "block";
  }

  updateMarkButton(markBtn, !!episode.watched);

  // Use showId directly as argument
  const seasonNumber = episode.season;
  const episodeNumber = episode.number;
  const episodeTraktId =
    episode.ids?.trakt || episode.trakt || episode.trakt_id;
  const token = window.localStorage.getItem("trakt_token");

  let mark = !episode.watched;

  markBtn.onclick = async () => {
    try {
      const updatedShow = await markEpisodeWatched(
        token,
        showId,
        seasonNumber,
        episodeNumber,
        episodeTraktId,
        mark
      );

      if (updatedShow) {
        updateMarkButton(markBtn, mark);

        if (context === "collection") {
          updateShowCard(showId);
        } else if (context === "show") {
          updateEpisodeAndSeasonUI(episodeDiv, updatedShow, seasonNumber, mark);
        }
      }

      mark = !mark;
    } catch (err) {
      console.error("Failed to mark episode:", err && err.message);
    }
  };

  overlay.onclick = (e) => {
    if (e.target === overlay) overlay.style.display = "none";
  };
}
