import { getStats } from "../stores/statsStore.js";

/**
 * Renders user statistics in the statistics container.
 */
export function renderStatistics() {
  const stats = getStats();

  const container = document.getElementById("stats-container");

  if (!stats || !Object.keys(stats).length) {
    container.innerHTML = `<p class="no-show-message">
        Not enough data to display statistics.
      </p>`;
    return;
  }

  container.innerHTML = `
      <div class="stats-section">
        <h2>Statistics</h2>
        
        <div class="stat-card">
          <h3>Total Time Spent Watching TV Shows</h3>
          <p class="stat-value">${stats.totalMinutes.toLocaleString()} minutes</p>
          <p class="stat-description">... which is exactly ${
            stats.timeFormatted
          } but who's counting</p>
        </div>

        <div class="stat-card">
          <h3>Episodes Watched</h3>
          <p class="stat-value">You've seen a total of ${stats.totalEpisodes.toLocaleString()} episodes</p>
          <p class="stat-description">... in exactly ${
            stats.totalShows
          } TV shows, ${stats.totalSeasons} seasons</p>
        </div>

        <div class="stat-card">
          <h3>Top 3 Most Watched Genres</h3>
          <div class="top-list">
            ${stats.topGenres
              .map(
                (item, index) => `
              <div class="top-item">
                <span class="rank">${index + 1}.</span>
                <span class="name">${item.genre}</span>
                <span class="count">${item.episodes} episodes</span>
              </div>
            `
              )
              .join("")}
          </div>
        </div>

        <div class="stat-card">
          <h3>Top 3 Most Watched Shows</h3>
          <p class="stat-description">You've spent the most time watching:</p>
          <div class="top-list">
            ${stats.topShows
              .map(
                (item, index) => `
              <div class="top-item">
                <span class="rank">${index + 1}.</span>
                <span class="name">${item.title}</span>
                <span class="details">${item.hours} hours ${
                  item.seasons
                } seasons ${item.episodes} episodes</span>
              </div>
            `
              )
              .join("")}
          </div>
        </div>
      </div>
    `;
}
