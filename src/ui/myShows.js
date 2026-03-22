import {
  getUpcomingEpisodes,
  getAllCollectionShows,
} from "../stores/myShowsStore.js";
import { formatDate, formatEpisodeInfo, getTimeUntil } from "../utils/format.js";

function escapeHtml(text) {
  return String(text ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

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

  const sorted = [...upcomingEpisodes].sort(
    (a, b) => new Date(a.first_aired) - new Date(b.first_aired)
  );

  container.innerHTML = sorted
    .map((episode) => {
      const showTitle = escapeHtml(episode.shows?.title || "Unknown show");
      const epTitle = escapeHtml(episode.title || "Untitled episode");
      const slugId = escapeHtml(episode.shows?.slug_id ?? "");
      const epCode = formatEpisodeInfo(
        episode.season_number,
        episode.episode_number,
        null
      );
      const epCodeSafe = escapeHtml(epCode);
      const airDate = formatDate(episode.first_aired);
      const airDateSafe = escapeHtml(airDate);
      const countdown = escapeHtml(getTimeUntil(episode.first_aired));
      const posterPath = episode.shows?.image_poster;
      const posterSrc = posterPath ? `https://${posterPath}` : "";

      return `
        <div class="show-card upcoming-episode-row" data-id="${slugId}">
          <div class="upcoming-row-poster">
            ${
              posterSrc
                ? `<img
              class="upcoming-row-poster-img"
              src="${posterSrc}"
              alt=""
              loading="lazy"
            />`
                : `<div class="upcoming-row-poster-placeholder"></div>`
            }
          </div>
          <div class="upcoming-row-content">
            <p class="upcoming-row-series">${showTitle}</p>
            <p class="upcoming-row-episode-name">${epTitle}</p>
            <p class="upcoming-row-episode-code">${epCodeSafe}</p>
            <div class="upcoming-row-footer">
              <span class="upcoming-row-date" title="Air date">${airDateSafe}</span>
              <span class="upcoming-row-countdown">${countdown}</span>
            </div>
          </div>
        </div>
      `;
    })
    .join("");
}

/**
 * Renders all shows in the user's collection (poster + title + year, same card style as Discover).
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

  container.innerHTML = allCollectionShows
    .map((item) => {
      const s = item.shows;
      const title = escapeHtml(s.title);
      const year = s.year != null && s.year !== "" ? escapeHtml(String(s.year)) : "";
      const slugId = s.slug_id != null ? String(s.slug_id) : "";
      const posterPath = s.image_poster;
      const posterSrc = posterPath ? `https://${posterPath}` : "";

      return `
        <div class="discover-card my-shows-collection-card" data-id="${escapeHtml(slugId)}">
          <div class="discover-card-poster">
            ${
              posterSrc
                ? `<img src="${posterSrc}" alt="${title || "Show"} poster" loading="lazy" />`
                : ""
            }
          </div>
          <p class="discover-card-title">${title || "Untitled"}</p>
          <p class="discover-card-year">${year}</p>
        </div>
      `;
    })
    .join("");
}
