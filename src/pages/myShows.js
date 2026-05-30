import {
  renderUpcomingEpisodes,
  renderAllCollectionShows,
  renderCollectionFilterBar,
  closeCollectionListMenu,
  toggleCollectionListMenu,
  openCollectionListMenu,
  toggleShowOnList,
} from "../ui/myShows.js";
import {
  setUpcomingEpisodes,
  getUpcomingEpisodes,
  setAllCollectionShows,
  getAllCollectionShows,
  setAvailableGenres,
} from "../stores/myShowsStore.js";
import {
  getUpcomingEpisodesData,
  getAllCollectionShowsData,
  getCollectionGenres,
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
  renderCollectionFilterBar(collectionSection);
  collectionSection.appendChild(allCollectionShowsDiv);

  main.appendChild(upcomingSection);
  main.appendChild(collectionSection);

  if (!getUpcomingEpisodes().length) {
    setUpcomingEpisodes((await getUpcomingEpisodesData()) || []);
  }

  renderUpcomingEpisodes();

  if (!getAllCollectionShows().length) {
    const [shows, genres] = await Promise.all([
      getAllCollectionShowsData(),
      getCollectionGenres(),
    ]);
    setAllCollectionShows(shows || []);
    setAvailableGenres(genres || []);
  }

  renderAllCollectionShows();

  main.addEventListener("click", async (e) => {
    const insideListMenu = e.target.closest(
      ".collection-card-list-menu, .collection-card-menu-btn",
    );
    if (!insideListMenu) closeCollectionListMenu();

    const menuItem = e.target.closest(".collection-list-menu-item");
    if (menuItem) {
      e.stopPropagation();
      const card = menuItem.closest(".my-shows-collection-card");
      const showId = card?.dataset.showId;
      const listId = menuItem.dataset.listId;
      const hasShow = menuItem.dataset.hasShow === "1";
      const isDefault = menuItem.dataset.isDefault === "1";
      if (!showId || !listId) return;

      menuItem.disabled = true;
      try {
        const { removedFromDefault } = await toggleShowOnList(
          showId,
          listId,
          hasShow,
          isDefault,
        );
        closeCollectionListMenu();
        if (removedFromDefault) {
          const shows = (await getAllCollectionShowsData()) || [];
          setAllCollectionShows(shows);
          renderAllCollectionShows();
        } else {
          await openCollectionListMenu(card);
        }
      } catch (err) {
        alert(err.message);
      } finally {
        menuItem.disabled = false;
      }
      return;
    }

    const menuBtn = e.target.closest(".collection-card-menu-btn");
    if (menuBtn) {
      e.stopPropagation();
      const card = menuBtn.closest(".my-shows-collection-card");
      if (card) await toggleCollectionListMenu(card);
      return;
    }

    if (e.target.closest(".collection-card-list-menu")) {
      e.stopPropagation();
      return;
    }

    const card = e.target.closest(".show-card, .my-shows-collection-card");
    if (!card) return;

    location.hash = `show?traktIdentifier=${card.dataset.id}`;
  });
}
