import {
  renderUpcomingEpisodes,
  renderAllCollectionShows,
  renderCollectionFilterBar,
  bindMyShowsClickHandler,
  prepareMyShowsListMenus,
} from "../ui/myShows.js";
import {
  setUpcomingEpisodes,
  getUpcomingEpisodes,
  setAllCollectionShows,
  getAllCollectionShows,
  setAvailableGenres,
  getCollectionListId,
} from "../stores/myShowsStore.js";
import {
  getAllCollectionShowsData,
  getUpcomingEpisodesForShowIds,
  extractCollectionGenres,
} from "../api/watchlist.js";
import { getSupabaseClient } from "../services/supabase.js";
import { ensureListsLoaded } from "../ui/listFilter.js";
import { resolveActiveListId } from "../stores/listsStore.js";

function collectionShowIds(collection) {
  return collection.map((item) => item.shows?.id).filter(Boolean);
}

/**
 * Loads upcoming episodes after the grid is visible (does not block first paint).
 */
function loadUpcomingEpisodesInBackground() {
  const showIds = collectionShowIds(getAllCollectionShows());
  if (!showIds.length) {
    setUpcomingEpisodes([]);
    renderUpcomingEpisodes();
    return;
  }

  getUpcomingEpisodesForShowIds(showIds)
    .then((data) => {
      setUpcomingEpisodes(data || []);
      renderUpcomingEpisodes();
    })
    .catch(() => {
      const container = document.getElementById("upcoming_episodes-container");
      if (container) {
        container.innerHTML =
          "<p class='no-show-message'>Could not load upcoming episodes.</p>";
      }
    });
}

/**
 * Renders the My Shows page with upcoming episodes and the full list grid.
 * @param {HTMLElement} main - Main app container for this page.
 */
export async function renderMyShows(main) {
  const upcomingEpisodesDiv = document.createElement("div");
  upcomingEpisodesDiv.id = "upcoming_episodes-container";
  upcomingEpisodesDiv.innerHTML = "<p class='loading-text'>Loading...</p>";

  const allCollectionShowsDiv = document.createElement("div");
  allCollectionShowsDiv.id = "all_my_shows-container";
  allCollectionShowsDiv.innerHTML = "<p class='loading-text'>Loading...</p>";

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
  await renderCollectionFilterBar(collectionSection);
  collectionSection.appendChild(allCollectionShowsDiv);

  main.appendChild(upcomingSection);
  main.appendChild(collectionSection);

  bindMyShowsClickHandler(main);
  await Promise.all([getSupabaseClient(), ensureListsLoaded()]);

  const listId = resolveActiveListId();
  const cachedCollection = getAllCollectionShows();
  const cachedUpcoming = getUpcomingEpisodes();
  const cacheValid =
    cachedCollection.length && getCollectionListId() === listId;

  if (cacheValid) {
    renderAllCollectionShows();
    prepareMyShowsListMenus(collectionShowIds(cachedCollection));
  } else {
    const collection = await getAllCollectionShowsData(listId);
    setAllCollectionShows(collection, listId);
    setAvailableGenres(extractCollectionGenres(collection));
    renderAllCollectionShows();
    prepareMyShowsListMenus(collectionShowIds(collection));
  }

  if (cachedUpcoming.length && cacheValid) {
    renderUpcomingEpisodes();
  } else {
    loadUpcomingEpisodesInBackground();
  }
}
