import { renderUpcomingEpisodes, renderAllCollectionShows } from "../ui/myShows.js";
import {
  setUpcomingEpisodes,
  getUpcomingEpisodes,
  setAllCollectionShows,
  getAllCollectionShows,
} from "../stores/myShowsStore.js";
import {
  getUpcomingEpisodesData,
  getAllCollectionShowsData,
} from "../api/watchlist.js";

/**
 * Renders the My Shows page with upcoming episodes and the full default-list grid.
 * @param {HTMLElement} main - Main app container for this page.
 */
export async function renderMyShows(main) {
  const upcomingEpisodesDiv = document.createElement("div");
  upcomingEpisodesDiv.id = "upcoming_episodes-container";
  upcomingEpisodesDiv.innerHTML = "<p class='loading-text'>Loading...</p>";

  const allCollectionShowsDiv = document.createElement("div");
  allCollectionShowsDiv.id = "all_my_shows-container";

  const upcomingSection = document.createElement("section");
  upcomingSection.className = "my-shows-section";
  const upcomingTitle = document.createElement("h2");
  upcomingTitle.className = "my-shows-section-title";
  upcomingTitle.textContent = "Upcoming episodes";
  upcomingSection.appendChild(upcomingTitle);
  upcomingSection.appendChild(upcomingEpisodesDiv);

  const collectionSection = document.createElement("section");
  collectionSection.className = "my-shows-section";
  const collectionTitle = document.createElement("h2");
  collectionTitle.className = "my-shows-section-title";
  collectionTitle.textContent = "All shows in your list";
  collectionSection.appendChild(collectionTitle);
  collectionSection.appendChild(allCollectionShowsDiv);

  main.appendChild(upcomingSection);
  main.appendChild(collectionSection);

  if (!getUpcomingEpisodes().length) {
    setUpcomingEpisodes((await getUpcomingEpisodesData()) || []);
  }

  renderUpcomingEpisodes();

  if (!getAllCollectionShows().length) {
    setAllCollectionShows((await getAllCollectionShowsData()) || []);
  }

  renderAllCollectionShows();

  main.addEventListener("click", (e) => {
    const card = e.target.closest(".show-card, .my-shows-collection-card");
    if (!card) return;

    location.hash = `show?traktIdentifier=${card.dataset.id}`;
  });
}
