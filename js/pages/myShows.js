// ========================================================
// pages/myShows.js - Render My Shows Page
// ========================================================

import { renderUpcomingEpisodes } from "../ui.js";
import {
  setUpcomingEpisodes,
  getUpcomingEpisodes,
} from "../stores/myShowsStore.js";
import { getUpcomingEpisodesData } from "../database.js";

/**
 * Renders the My Shows page showing collection sorted by days until next episode.
 * @param {HTMLElement} main - Main app container for this page.
 * @returns {Promise<void>}
 */
export async function renderMyShows(main) {
  const myShowsDiv = document.createElement("div");
  myShowsDiv.id = "my_shows-container";
  myShowsDiv.innerHTML = "<p class='loading-text'>Loading...</p>";
  main.appendChild(myShowsDiv);

  const upcomingEpisodes = getUpcomingEpisodes();

  if (!upcomingEpisodes.length) {
    setUpcomingEpisodes(await getUpcomingEpisodesData());
  }

  renderUpcomingEpisodes();

  // Event delegation for dynamically rendered show cards
  myShowsDiv.addEventListener("click", (e) => {
    const card = e.target.closest(".show-card");
    if (!card) return;

    location.hash = `show?traktIdentifier=${card.dataset.id}`;
  });
}
