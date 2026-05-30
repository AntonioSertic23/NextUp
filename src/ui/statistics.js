import { getStats } from "../stores/statsStore.js";

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatMonth(monthStr) {
  const [year, month] = monthStr.split("-");
  const date = new Date(Number(year), Number(month) - 1);
  return date.toLocaleString("en", { month: "short", year: "2-digit" });
}

/**
 * Renders user statistics in the statistics container.
 * @param {{ title?: string, subtitle?: string }} [options]
 */
export function renderStatistics(options = {}) {
  const stats = getStats();
  const title = options.title ?? "Your Statistics";
  const subtitle =
    options.subtitle ?? "Time invested, episodes consumed, top picks.";

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
  const completionRate = stats.completionRate ?? 0;
  const avgRating = stats.avgRating ?? 0;
  const completedShows = stats.completedShows ?? 0;
  const topGenres = stats.topGenres ?? [];
  const topShows = stats.topShows ?? [];
  const topNetworks = stats.topNetworks ?? [];
  const watchByDay = stats.watchByDay ?? [];
  const recentMonths = stats.recentMonths ?? [];

  const maxDayEpisodes = Math.max(...watchByDay.map((d) => d.episodes), 1);
  const maxMonthEpisodes = Math.max(
    ...recentMonths.map((m) => m.episodes),
    1,
  );
  const maxGenreEpisodes = topGenres.length ? topGenres[0].episodes : 1;

  container.innerHTML = `
    <header class="stats-header">
      <h1 class="stats-page-title">${escapeHtml(title)}</h1>
      <p class="stats-page-subtitle">${escapeHtml(subtitle)}</p>
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
        <div class="stat-tile">
          <span class="stat-tile-icon" aria-hidden="true">✅</span>
          <span class="stat-tile-value">${completionRate}%</span>
          <span class="stat-tile-label">Completion rate</span>
        </div>
        <div class="stat-tile">
          <span class="stat-tile-icon" aria-hidden="true">⭐</span>
          <span class="stat-tile-value">${avgRating}</span>
          <span class="stat-tile-label">Avg. show rating</span>
        </div>
        <div class="stat-tile">
          <span class="stat-tile-icon" aria-hidden="true">🏆</span>
          <span class="stat-tile-value">${completedShows}</span>
          <span class="stat-tile-label">Shows finished</span>
        </div>
      </div>
    </section>

    ${
      watchByDay.some((d) => d.episodes > 0)
        ? `<section class="stats-activity" aria-label="Watch activity">
        <div class="stat-card">
          <h3 class="stat-card-title">Watch activity by day</h3>
          <div class="day-chart">
            ${watchByDay
              .map(
                (d) => `
              <div class="day-chart-row">
                <span class="day-chart-label">${d.day}</span>
                <div class="day-chart-bar-track">
                  <div class="day-chart-bar-fill" style="width: ${(d.episodes / maxDayEpisodes) * 100}%"></div>
                </div>
                <span class="day-chart-value">${d.episodes.toLocaleString()}</span>
              </div>
            `,
              )
              .join("")}
          </div>
        </div>
      </section>`
        : ""
    }

    ${
      recentMonths.length
        ? `<section class="stats-activity" aria-label="Monthly activity">
        <div class="stat-card">
          <h3 class="stat-card-title">Recent monthly activity</h3>
          <div class="month-chart">
            ${recentMonths
              .map(
                (m) => `
              <div class="month-chart-col">
                <div class="month-chart-bar-track">
                  <div class="month-chart-bar-fill" style="height: ${(m.episodes / maxMonthEpisodes) * 100}%"></div>
                </div>
                <span class="month-chart-value">${m.episodes}</span>
                <span class="month-chart-label">${formatMonth(m.month)}</span>
              </div>
            `,
              )
              .join("")}
          </div>
        </div>
      </section>`
        : ""
    }

    <section class="stats-tops" aria-label="Top picks">
      <div class="stat-card top-card">
        <h3 class="stat-card-title">Top genres</h3>
        ${
          topGenres.length
            ? `<div class="genre-bars">
                ${topGenres
                  .map(
                    (item) => `
                      <div class="genre-bar-row">
                        <div class="genre-bar-header">
                          <span class="genre-bar-name">${escapeHtml(item.genre)}</span>
                          <span class="genre-bar-count">${item.episodes.toLocaleString()} ep</span>
                        </div>
                        <div class="genre-bar-track">
                          <div class="genre-bar-fill" style="width: ${(item.episodes / maxGenreEpisodes) * 100}%"></div>
                        </div>
                      </div>
                    `,
                  )
                  .join("")}
              </div>`
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

      ${
        topNetworks.length
          ? `<div class="stat-card top-card">
          <h3 class="stat-card-title">Top networks</h3>
          <ol class="top-list">
            ${topNetworks
              .map(
                (item, index) => `
                <li class="top-item">
                  <span class="top-rank">${index + 1}</span>
                  <div class="top-content">
                    <span class="top-name">${escapeHtml(item.network)}</span>
                    <span class="top-meta">${item.episodes.toLocaleString()} episodes</span>
                  </div>
                </li>
              `,
              )
              .join("")}
          </ol>
        </div>`
          : ""
      }
    </section>
  `;
}
