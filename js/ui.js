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
        <img class="poster" src="https://external-content.duckduckgo.com/iu/?u=https%3A%2F%2Fimages-wixmp-ed30a86b8c4ca887773594c2.wixmp.com%2Ff%2F95cc4845-3bd2-4603-8780-de44e21af018%2Fdgfrspv-fc06b204-150c-429b-aae5-78659d7b7389.png%2Fv1%2Ffill%2Fw_1280%2Ch_1920%2Cq_80%2Cstrp%2Famerican_dad_poster_by_bautisworld_dgfrspv-fullview.jpg%3Ftoken%3DeyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ1cm46YXBwOjdlMGQxODg5ODIyNjQzNzNhNWYwZDQxNWVhMGQyNmUwIiwiaXNzIjoidXJuOmFwcDo3ZTBkMTg4OTgyMjY0MzczYTVmMGQ0MTVlYTBkMjZlMCIsIm9iaiI6W1t7ImhlaWdodCI6Ijw9MTkyMCIsInBhdGgiOiJcL2ZcLzk1Y2M0ODQ1LTNiZDItNDYwMy04NzgwLWRlNDRlMjFhZjAxOFwvZGdmcnNwdi1mYzA2YjIwNC0xNTBjLTQyOWItYWFlNS03ODY1OWQ3YjczODkucG5nIiwid2lkdGgiOiI8PTEyODAifV1dLCJhdWQiOlsidXJuOnNlcnZpY2U6aW1hZ2Uub3BlcmF0aW9ucyJdfQ.fN5ExDX5bFgXQSkoAea9Byvm49tbmZRFETHETAe6X6Y&f=1&nofb=1&ipt=cdcf1b2c04d441bb044a661caf34c0e00ca14b0e44629cac9045df2472412e7a"></img>
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
