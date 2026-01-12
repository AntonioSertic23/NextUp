// ========================================================
// pages/myShows.js - Render My Shows Page
// ========================================================

import { renderUpcomingEpisodes, renderAllCollectionShows } from "../ui.js";
import {
  setUpcomingEpisodes,
  getUpcomingEpisodes,
  setAllCollectionShows,
  getAllCollectionShows,
} from "../stores/myShowsStore.js";
import {
  getUpcomingEpisodesData,
  getAllCollectionShowsData,
} from "../database.js";

/**
 * Renders the My Shows page showing collection sorted by days until next episode.
 * @param {HTMLElement} main - Main app container for this page.
 * @returns {Promise<void>}
 */
export async function renderMyShows(main) {
  const upcomingEpisodesDiv = document.createElement("div");
  upcomingEpisodesDiv.id = "upcoming_episodes-container";
  upcomingEpisodesDiv.innerHTML = "<p class='loading-text'>Loading...</p>";

  const allCollectionShowsDiv = document.createElement("div");
  allCollectionShowsDiv.id = "all_my_shows-container";

  main.appendChild(upcomingEpisodesDiv);
  main.appendChild(allCollectionShowsDiv);

  const upcomingEpisodes = getUpcomingEpisodes();

  if (!upcomingEpisodes.length) {
    setUpcomingEpisodes(await getUpcomingEpisodesData());
  }

  renderUpcomingEpisodes();

  const allCollectionShows = getAllCollectionShows();

  if (!upcomingEpisodes.length) {
    setAllCollectionShows(await getAllCollectionShowsData());
  }

  renderAllCollectionShows(allCollectionShows);

  // Event delegation for dynamically rendered show cards
  main.addEventListener("click", (e) => {
    const card = e.target.closest(".show-card");
    if (!card) return;

    location.hash = `show?traktIdentifier=${card.dataset.id}`;
  });
}
