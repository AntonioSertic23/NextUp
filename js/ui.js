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
        <img class="poster" src="http:\\\\${show.images.poster}"></img>
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
    <h2>${show.title} (${show.year})</h2>
    <p class="tagline">${show.tagline}</p>
    <br>
    <p class="overview">${show.overview}</p>
    <br>
    <p class="rating">Rating: ${show.rating}</p>
    <p class="runtime">Runtime: ${show.runtime}</p>
    <p class="status">Status: ${show.status}</p>
    <p class="network">Network: ${show.network}</p>
    <p class="genres">Genres: ${show.genres.join(", ")}</p>
    <a class="homepage" href="${show.homepage}" target="_blank">Homepage</a>
    <div id="seasons"></div>
  `;
  return div;
}

/**
 * Renders seasons and episodes of a show.
 * @param {HTMLElement} container - Container element to append seasons to
 * @param {Array} seasons - Array of season objects with episodes
 */
export function renderSeasons(container, seasons) {
  const seasonsContainer = container.querySelector("#seasons");

  const seasonTitle = document.createElement("p");
  seasonTitle.classList.add("seasons_title");
  seasonTitle.textContent = "Seasons";
  seasonsContainer.appendChild(seasonTitle);

  seasons.forEach((season) => {
    const seasonDiv = document.createElement("div");
    seasonDiv.classList.add("season");

    const episodesHTML = `
      <div class="episodes">
        ${season.episodes
          .map(
            (ep) => `
            <div class="episode" data-season="${season.number}" data-episode="${
              ep.number
            }">
              <div class="episode_info-container">
                <p class="episode_title">${ep.title}</p>
                <p class="episode_info">S${String(season.number).padStart(
                  2,
                  "0"
                )}E${String(ep.number).padStart(2, "0")} - ${ep.aired}</p>
              </div>

              <button class="${
                ep.completed ? "unmark-watched" : "mark-watched"
              }">
                ${ep.completed ? "Watched" : "Mark as watched"}
              </button>
            </div>`
          )
          .join("")}
      </div>
    `;

    const progress_bar_percent =
      (parseInt(season.completed) / parseInt(season.aired)) * 100;
    const progress_text = `${season.completed}/${season.aired}`;

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
      btn.addEventListener("click", () => {
        // Check the current state
        if (btn.classList.contains("mark-watched")) {
          // Mark as watched
          btn.textContent = "Watched";
          btn.classList.remove("mark-watched");
          btn.classList.add("unmark-watched");

          // TODO: Save watched state (localStorage and API)
        } else {
          // Mark as not watched
          btn.textContent = "Mark as watched";
          btn.classList.remove("unmark-watched");
          btn.classList.add("mark-watched");

          // TODO: Save watched state (localStorage and API)
        }
      });
    });
}
