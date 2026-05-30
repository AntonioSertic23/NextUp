import { getStats } from "../stores/statsStore.js";
import { HYPE_TIERS } from "../utils/showRatings.js";

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
  return date.toLocaleString("en", { month: "long" });
}

function renderMainCollectionStats(detail) {
  if (!detail || (!detail.totalEpisodes && !detail.totalShows)) {
    return `<p class="top-empty stats-detail-empty">Mark some episodes in your main collection to unlock detailed charts.</p>`;
  }

  const totalMinutes = (detail.totalMinutes ?? 0).toLocaleString();
  const timeFormatted = escapeHtml(detail.timeFormatted ?? "");
  const totalEpisodes = (detail.totalEpisodes ?? 0).toLocaleString();
  const totalShows = (detail.totalShows ?? 0).toLocaleString();
  const totalSeasons = (detail.totalSeasons ?? 0).toLocaleString();
  const completionRate = detail.completionRate ?? 0;
  const avgRating = detail.avgRating ?? 0;
  const completedShows = detail.completedShows ?? 0;
  const topGenres = detail.topGenres ?? [];
  const topShows = detail.topShows ?? [];
  const topNetworks = detail.topNetworks ?? [];
  const watchByDay = detail.watchByDay ?? [];
  const recentMonths = detail.recentMonths ?? [];

  const maxDayEpisodes = Math.max(...watchByDay.map((d) => d.episodes), 1);
  const maxMonthEpisodes = Math.max(
    ...recentMonths.map((m) => m.episodes),
    1,
  );
  const maxGenreEpisodes = topGenres.length ? topGenres[0].episodes : 1;

  return `
    <section class="stats-overview" aria-label="Main collection overview">
      <div class="stats-hero-card">
        <span class="stats-hero-label">Total time watching TV</span>
        <span class="stats-hero-value">${timeFormatted || `${totalMinutes} min`}</span>
        <span class="stats-hero-detail">${totalMinutes} minutes &middot; main collection</span>
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
          <span class="stat-tile-label">Avg. Trakt rating</span>
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

function renderPersonalHypeSection(personalHype) {
  if (!personalHype?.totalRated) return "";

  const maxTier = Math.max(
    ...HYPE_TIERS.map((t) => personalHype.tierCounts[t.score] ?? 0),
    1,
  );

  const tierBars = HYPE_TIERS.slice()
    .reverse()
    .map((tier) => {
      const count = personalHype.tierCounts[tier.score] ?? 0;
      const pct = (count / maxTier) * 100;
      return `
        <div class="hype-stats-tier-row">
          <span class="hype-stats-tier-label">${tier.score} · ${tier.label}</span>
          <div class="hype-stats-tier-track">
            <div class="hype-stats-tier-fill hype-stats-tier-fill--${tier.score}" style="width: ${pct}%"></div>
          </div>
          <span class="hype-stats-tier-count">${count}</span>
        </div>
      `;
    })
    .join("");

  const topList = personalHype.topRated.length
    ? `<ol class="top-list hype-top-list">
        ${personalHype.topRated
          .map(
            (row, i) => `
          <li class="top-item">
            <span class="top-rank">${i + 1}</span>
            <span class="hype-stats-popcorn-count" aria-label="${row.score} of 5">${row.score}</span>
            <a href="#show?traktIdentifier=${encodeURIComponent(row.slugId || "")}" class="top-name">${escapeHtml(row.title)}</a>
          </li>
        `,
          )
          .join("")}
      </ol>`
    : "";

  return `
    <section class="stats-hype-section" aria-label="Your popcorn ratings">
      <h2 class="stats-section-heading">Your take</h2>
      <p class="stats-section-lead">
        Popcorn ratings from show pages — separate from Trakt scores.
      </p>
      <div class="stats-grid stats-hype-tiles">
        <div class="stat-tile">
          <span class="stat-tile-value">${personalHype.totalRated}</span>
          <span class="stat-tile-label">Shows rated</span>
        </div>
        <div class="stat-tile">
          <span class="stat-tile-value">${escapeHtml(String(personalHype.averageScore))}</span>
          <span class="stat-tile-label">Avg. popcorn (1–5)</span>
        </div>
        <div class="stat-tile">
          <span class="stat-tile-value">${personalHype.tierCounts[5] ?? 0}</span>
          <span class="stat-tile-label">5 popcorn (Peak)</span>
        </div>
      </div>
      <div class="stat-card">
        <h3 class="stat-card-title">Tier breakdown</h3>
        <div class="hype-stats-tiers">${tierBars}</div>
      </div>
      ${
        topList
          ? `<div class="stat-card">
        <h3 class="stat-card-title">Top of your queue</h3>
        ${topList}
      </div>`
          : ""
      }
    </section>
  `;
}

function renderMultiListSection(multi) {
  if (!multi?.perList?.length) return "";

  const { perList, insights } = multi;
  const listsWithShows = perList.filter((p) => p.showCount > 0);
  if (!listsWithShows.length && insights.listCount <= 1) return "";

  const maxShows = Math.max(...perList.map((p) => p.showCount), 1);
  const maxBacklog = Math.max(
    ...listsWithShows.map((p) => p.episodesLeft),
    1,
  );

  const insightCards = [];

  if (insights.defaultList && insights.collectionSharePct > 0) {
    insightCards.push(
      `<p class="stats-insight-line"><strong>${escapeHtml(insights.defaultList.name)}</strong> holds ${insights.collectionSharePct}% of all list entries (${insights.defaultList.showCount} shows).</p>`,
    );
  }
  if (insights.secondaryListCount > 0) {
    insightCards.push(
      `<p class="stats-insight-line">You keep <strong>${insights.secondaryShowCount}</strong> show${insights.secondaryShowCount === 1 ? "" : "s"} across ${insights.secondaryListCount} extra list${insights.secondaryListCount === 1 ? "" : "s"} (mood lists, rewatch queues, etc.).</p>`,
    );
  }
  if (insights.duplicateEntries > 0) {
    insightCards.push(
      `<p class="stats-insight-line"><strong>${insights.duplicateEntries}</strong> duplicate slot${insights.duplicateEntries === 1 ? "" : "s"} — the same show lives on more than one list.</p>`,
    );
  }
  if (insights.busiestList && !insights.busiestList.isDefault) {
    insightCards.push(
      `<p class="stats-insight-line">Largest list: <strong>${escapeHtml(insights.busiestList.name)}</strong> (${insights.busiestList.showCount} shows).</p>`,
    );
  } else if (insights.busiestList) {
    insightCards.push(
      `<p class="stats-insight-line">Your main collection is still the biggest list at ${insights.busiestList.showCount} shows.</p>`,
    );
  }
  if (insights.mostCompleteList && insights.mostCompleteList.completionPct > 0) {
    insightCards.push(
      `<p class="stats-insight-line">Highest completion: <strong>${escapeHtml(insights.mostCompleteList.name)}</strong> (${insights.mostCompleteList.completionPct}% finished).</p>`,
    );
  }
  if (insights.mostToWatchList && insights.mostToWatchList.episodesLeft > 0) {
    insightCards.push(
      `<p class="stats-insight-line">Biggest backlog: <strong>${escapeHtml(insights.mostToWatchList.name)}</strong> — ${insights.mostToWatchList.episodesLeft.toLocaleString()} episodes still to go.</p>`,
    );
  }
  if (insights.emptyListCount > 0) {
    insightCards.push(
      `<p class="stats-insight-line">${insights.emptyListCount} empty list${insights.emptyListCount === 1 ? "" : "s"} ready for your next obsession.</p>`,
    );
  }

  const backlogHtml =
    insights.backlogRanking?.length > 1
      ? `
    <div class="stats-backlog-rank">
      <h3 class="stats-subcard-title">Where your queue lives</h3>
      <ol class="stats-backlog-list">
        ${insights.backlogRanking
          .map((list, i) => {
            const pct = (list.episodesLeft / maxBacklog) * 100;
            return `
          <li class="stats-backlog-item">
            <span class="stats-backlog-rank-num">${i + 1}</span>
            <div class="stats-backlog-body">
              <span class="stats-backlog-name">${escapeHtml(list.name)}</span>
              <div class="stats-backlog-bar-track">
                <div class="stats-backlog-bar-fill" style="width: ${pct}%"></div>
              </div>
              <span class="stats-backlog-meta">${list.episodesLeft.toLocaleString()} ep left &middot; ${list.showCount} shows</span>
            </div>
          </li>
        `;
          })
          .join("")}
      </ol>
    </div>`
      : "";

  return `
    <section class="stats-lists-overview" aria-label="Lists overview">
      <h2 class="stats-section-heading">Your lists</h2>
      <p class="stats-section-lead">
        Smart overview across every list — not just your main collection.
      </p>

      ${
        insightCards.length
          ? `<div class="stats-insight-panel">${insightCards.join("")}</div>`
          : ""
      }

      ${backlogHtml}

      <div class="stats-lists-grid">
        ${perList
          .map((list) => {
            const barPct = (list.showCount / maxShows) * 100;
            return `
          <article class="stats-list-card">
            <div class="stats-list-card-header">
              <h3 class="stats-list-card-title">${escapeHtml(list.name)}</h3>
              ${list.isDefault ? '<span class="stats-list-badge">Main</span>' : ""}
            </div>
            <div class="stats-list-card-bar-track" aria-hidden="true">
              <div class="stats-list-card-bar-fill" style="width: ${barPct}%"></div>
            </div>
            <dl class="stats-list-card-metrics">
              <div><dt>Shows</dt><dd>${list.showCount}</dd></div>
              <div><dt>Finished</dt><dd>${list.completed}</dd></div>
              <div><dt>In progress</dt><dd>${list.inProgress}</dd></div>
              <div><dt>Not started</dt><dd>${list.notStarted}</dd></div>
              <div><dt>Episodes left</dt><dd>${list.episodesLeft.toLocaleString()}</dd></div>
              <div><dt>Completion</dt><dd>${list.completionPct}%</dd></div>
            </dl>
          </article>
        `;
          })
          .join("")}
      </div>
    </section>
  `;
}

/**
 * Renders user statistics in the statistics container.
 * @param {{ title?: string, subtitle?: string }} [options]
 */
export function renderStatistics(options = {}) {
  const stored = getStats();
  const container = document.getElementById("stats-container");
  if (!container) return;

  const multi = stored?.multiList ?? null;
  const personalHype = stored?.personalHype ?? null;
  const detail =
    stored?.detail ??
    (stored?.totalEpisodes != null || stored?.totalMinutes != null
      ? stored
      : null);

  const title = options.title ?? "Your Statistics";
  const subtitle =
    options.subtitle ??
    "Watch habits from your main collection, plus insights across all your lists.";

  const hasMulti =
    multi?.perList?.some((p) => p.showCount > 0) || (multi?.insights?.listCount ?? 0) > 1;
  const hasDetail = detail && (detail.totalEpisodes > 0 || detail.totalShows > 0);

  if (!hasMulti && !hasDetail) {
    container.innerHTML = `<p class="no-show-message">
        Not enough data to display statistics. Add shows to your collection and mark some episodes watched.
      </p>`;
    return;
  }

  const showListsSection = options.showListsSection !== false && hasMulti;

  container.innerHTML = `
    <header class="stats-header">
      <h1 class="stats-page-title">${escapeHtml(title)}</h1>
      <p class="stats-page-subtitle">${escapeHtml(subtitle)}</p>
    </header>

    ${renderMainCollectionStats(detail)}

    ${renderPersonalHypeSection(personalHype)}

    ${showListsSection ? renderMultiListSection(multi) : ""}
  `;
}
