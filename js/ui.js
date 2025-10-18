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
export function renderShowsList(container, shows) {
  container.innerHTML = shows
    .map(
      (show) => `
    <div class="show-card" data-id="${show.show.ids.trakt}">
      <h3>${show.show.title}</h3>
      <p>${show.show.year}</p>
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
    <p>${show.overview || "No description available."}</p>
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

  seasons.forEach((season) => {
    const seasonDiv = document.createElement("div");
    seasonDiv.classList.add("season");

    const episodesHTML = season.episodes
      .map(
        (ep) => `
        <div class="episode" data-season="${season.number}" data-episode="${ep.number}">
          ${ep.number}. ${ep.title}
          <button class="mark-watched">Mark as watched</button>
        </div>`
      )
      .join("");

    seasonDiv.innerHTML = `<h3>Season ${season.number}</h3>${episodesHTML}`;
    seasonsContainer.appendChild(seasonDiv);
  });

  // Add "Mark as watched" button logic
  seasonsContainer.querySelectorAll(".mark-watched").forEach((btn) => {
    btn.addEventListener("click", () => {
      btn.textContent = "Watched";
      btn.disabled = true;
      // TODO: Save watched state (localStorage or API)
    });
  });
}
