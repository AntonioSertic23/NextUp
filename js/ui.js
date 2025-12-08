// ========================================================
// ui.js - UI helper functions
// ========================================================

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
 * Renders a list of TV shows in a container.
 * @param {HTMLElement} container - The DOM element to render the shows into.
 * @param {Array} shows - Array of show objects from Trakt API or dummy data.
 * @returns {void}
 */
export function renderWatchlist(container, shows) {
  container.innerHTML = shows
    .map(
      (show) => `
    <div class="show-card" data-id="${show.ids.trakt}">
      <div class="poster-container">
        <img class="poster" src="https:\\\\${show.images.poster}"></img>
      </div>
      <div class="info-container">
      <p class="title">${show.title}</p>
      <p class="next_episode">${show.next_episode}</p>
      <div class="progress-container">
        <div class="progress-bar">
           <div class="progress-bar-fill" style="width: ${show.progress_bar_percent}%;"></div>
        </div>
        <p class="progress_text">${show.progress_text}</p>
      </div>
      <div class="next_episode_info_container">
        <button class="episode_info_btn">Episode info</button>
        <p class="episodes_left">${show.episodes_left} left</p>
      </div>

      </div>
    </div>
  `
    )
    .join("");
}

/**
 * Creates and returns a back button.
 * @returns {HTMLButtonElement}
 */
export function createBackButton() {
  const btn = document.createElement("button");
  btn.textContent = "← Back";
  btn.classList.add("back-btn");
  btn.addEventListener("click", () => {
    history.back(); // Go back to previous hash (e.g. #home)
  });
  return btn;
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
      <img class="show_banner-img" src="https:\\\\${show.images.fanart}">
    </div>
    <div class="show_poster-container">
      <img class="show_poster-img" src="https:\\\\${show.images.poster}">
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
        <p class="rating">⭐ ${parseFloat(show.rating).toFixed(1)}</p>
        -
        <p class="genres">${show.genres.join(", ")}</p>
        -
        <p class="runtime">${show.runtime} min</p>
        -
        <p class="network">${show.network}</p>
      </div>
    </div>
    <div id="seasons"></div>
  `;
  return div;
}

/**
 * Update a single episode button and its season progress in-place.
 * @param {HTMLElement} episodeDiv - The episode DOM element
 * @param {HTMLButtonElement} btn - The button element clicked
 * @param {Object} updatedShow - The updated show object returned from API
 * @param {number} seasonNumber
 * @param {boolean} mark
 */
function updateEpisodeAndSeasonUI(
  episodeDiv,
  btn,
  updatedShow,
  seasonNumber,
  mark
) {
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
          // Importing lazily to avoid circular import issues
          const api = await import("./api.js");
          const updatedShow = await api.markEpisodeWatched(
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
              btn,
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
}
