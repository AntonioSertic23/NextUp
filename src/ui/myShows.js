import {
  getUpcomingEpisodes,
  getAllCollectionShows,
} from "../stores/myShowsStore.js";
import { formatEpisodeInfo, getTimeUntil } from "../utils/format.js";

/**
 * Renders upcoming episodes for shows in the user's collection.
 */
export function renderUpcomingEpisodes() {
  const upcomingEpisodes = getUpcomingEpisodes();
  const container = document.getElementById("upcoming_episodes-container");

  if (!upcomingEpisodes.length) {
    container.innerHTML = `<p class="no-show-message">
        No upcoming episodes found in your collection.
      </p>`;
    return;
  }

  container.innerHTML = upcomingEpisodes
    .map((episode) => {
      const nextEpisodeInfo = formatEpisodeInfo(
        episode.season_number,
        episode.episode_number,
        episode.title
      );

      const timeText = getTimeUntil(episode.first_aired);

      return `
        <div class="show-card" data-id="${episode.shows.slug_id}">
          <div class="poster-container">
            <img
              class="poster"
              src="https://${episode.shows.image_poster}"
              alt="${episode.title} poster"
            />
          </div>
          <div class="info-container">
            <p class="title">${episode.title}</p>
            <p class="next_episode">${nextEpisodeInfo}</p>
            <p class="days_until_next">Next episode in: <span class="days_badge">${timeText}</span></p>
          </div>
        </div>
      `;
    })
    .join("");
}

/**
 * Renders all shows in the user's collection.
 */
export function renderAllCollectionShows() {
  const allCollectionShows = getAllCollectionShows();
  const container = document.getElementById("all_my_shows-container");

  if (!allCollectionShows.length) {
    container.innerHTML = `<p class="no-show-message">
        No shows found in your collection.
      </p>`;
    return;
  }

  allCollectionShows.forEach((show) => {
    const card = document.createElement("div");
    card.className = "show-card";
    card.dataset.id = show.shows.slug_id;

    const posterContainer = document.createElement("div");
    posterContainer.className = "poster-container";

    const img = document.createElement("img");
    img.className = "poster";
    img.src = `https://${show.shows.image_poster}`;
    img.alt = "show poster";

    posterContainer.appendChild(img);
    card.appendChild(posterContainer);

    container.appendChild(card);
  });
}
