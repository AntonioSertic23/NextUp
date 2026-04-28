import { getStats } from "../stores/statsStore.js";

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

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

  const totalMinutes = (stats.totalMinutes ?? 0).toLocaleString();
  const timeFormatted = escapeHtml(stats.timeFormatted ?? "");
  const totalEpisodes = (stats.totalEpisodes ?? 0).toLocaleString();
  const totalShows = (stats.totalShows ?? 0).toLocaleString();
  const totalSeasons = (stats.totalSeasons ?? 0).toLocaleString();
  const topGenres = stats.topGenres ?? [];
  const topShows = stats.topShows ?? [];

  container.innerHTML = `
    <header class="stats-header">
      <h1 class="stats-page-title">Your Statistics</h1>
      <p class="stats-page-subtitle">Time invested, episodes consumed, top picks.</p>
    </header>

    <section class="stats-overview" aria-label="Overview">
      <div class="stats-hero-card">
        <span class="stats-hero-label">Total time watching TV</span>
        <span class="stats-hero-value">${timeFormatted || `${totalMinutes} min`}</span>
        <span class="stats-hero-detail">${totalMinutes} minutes &middot; that&rsquo;s a lot of TV</span>
      </div>

      <div class="stats-grid">
        <div class="stat-tile">
          <span class="stat-tile-icon" aria-hidden="true">📺</span>
          <span class="stat-tile-value">${totalEpisodes}</span>
          <span class="stat-tile-label">Episodes watched</span>
        </div>
        <div class="stat-tile">
          <span class="stat-tile-icon" aria-hidden="true">🎬</span>
          <span class="stat-tile-value">${totalShows}</span>
          <span class="stat-tile-label">Shows tracked</span>
        </div>
        <div class="stat-tile">
          <span class="stat-tile-icon" aria-hidden="true">📚</span>
          <span class="stat-tile-value">${totalSeasons}</span>
          <span class="stat-tile-label">Seasons completed</span>
        </div>
      </div>
    </section>

    <section class="stats-tops" aria-label="Top picks">
      <div class="stat-card top-card">
        <h3 class="stat-card-title">Top genres</h3>
        ${
          topGenres.length
            ? `<ol class="top-list">
                ${topGenres
                  .map(
                    (item, index) => `
                      <li class="top-item">
                        <span class="top-rank">${index + 1}</span>
                        <span class="top-name">${escapeHtml(item.genre)}</span>
                        <span class="top-meta">${(item.episodes ?? 0).toLocaleString()} episodes</span>
                      </li>
                    `,
                  )
                  .join("")}
              </ol>`
            : `<p class="top-empty">No genre data yet.</p>`
        }
      </div>

      <div class="stat-card top-card">
        <h3 class="stat-card-title">Top shows</h3>
        ${
          topShows.length
            ? `<ol class="top-list">
                ${topShows
                  .map(
                    (item, index) => `
                      <li class="top-item">
                        <span class="top-rank">${index + 1}</span>
                        <div class="top-content">
                          <span class="top-name">${escapeHtml(item.title)}</span>
                          <span class="top-meta">${item.hours} h &middot; ${item.seasons} seasons &middot; ${item.episodes} episodes</span>
                        </div>
                      </li>
                    `,
                  )
                  .join("")}
              </ol>`
            : `<p class="top-empty">No show data yet.</p>`
        }
      </div>
    </section>
  `;
}
