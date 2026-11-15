/**
 * Placeholder markup shown while a page loads. Each skeleton reuses the
 * real layout classes so content does not jump when it arrives.
 */

const line = (width, extra = "") =>
  `<span class="skeleton skeleton-line ${extra}" style="width:${width}%"></span>`;

function wrap(inner, label = "Loading") {
  return `<div class="skeleton-wrap" role="status" aria-busy="true" aria-label="${label}">${inner}</div>`;
}

/** Watchlist-style cards (Home). */
export function skeletonCards(count = 3) {
  const card = `
    <div class="show-card is-skeleton" aria-hidden="true">
      <div class="poster-container skeleton"></div>
      <div class="info-container">
        ${line(55, "skeleton-title")}
        ${line(40)}
        ${line(90)}
        ${line(80)}
        ${line(100, "skeleton-bar")}
      </div>
    </div>`;
  return wrap(card.repeat(count));
}

/** Poster cards; pass `slider` for a horizontal row (Discover). */
export function skeletonPosters(count = 8, { slider = false } = {}) {
  const card = `
    <div class="discover-card is-skeleton" aria-hidden="true">
      <div class="discover-card-poster skeleton"></div>
      ${line(80)}
      ${line(35)}
    </div>`;
  const cards = card.repeat(count);
  return slider ? `<div class="discover-slider">${cards}</div>` : cards;
}

/** Poster grid inside a status wrapper (My Shows collection). */
export function skeletonGrid(count = 8) {
  return skeletonPosters(count);
}

/** Two titled poster rows (Discover browse). */
export function skeletonSections(sections = 2) {
  const section = `
    <section class="discover-section" aria-hidden="true">
      ${line(30, "skeleton-title")}
      ${skeletonPosters(6, { slider: true })}
    </section>`;
  return wrap(section.repeat(sections));
}

/** Upcoming episode rows (My Shows). */
export function skeletonRows(count = 3) {
  const row = `
    <div class="show-card upcoming-episode-row is-skeleton" aria-hidden="true">
      <div class="upcoming-row-poster skeleton skeleton-row-poster"></div>
      <div class="upcoming-row-content">
        ${line(45, "skeleton-title")}
        ${line(65)}
        ${line(25)}
      </div>
    </div>`;
  return wrap(row.repeat(count));
}

/** Show page header + a few season rows. */
export function skeletonShowPage() {
  return wrap(`
    <div class="skeleton skeleton-banner" aria-hidden="true"></div>
    <div class="skeleton-show-head" aria-hidden="true">
      <div class="skeleton skeleton-show-poster"></div>
      <div class="skeleton-show-meta">
        ${line(60, "skeleton-title")}
        ${line(30)}
      </div>
    </div>
    <div class="skeleton-show-body" aria-hidden="true">
      ${line(95)}
      ${line(90)}
      ${line(70)}
      ${[1, 2, 3].map(() => `<div class="skeleton skeleton-block"></div>`).join("")}
    </div>`);
}

/** Stat tiles + chart blocks (Statistics). */
export function skeletonStats() {
  const tile = `<div class="skeleton skeleton-tile" aria-hidden="true"></div>`;
  return wrap(`
    <div class="skeleton-tiles">${tile.repeat(4)}</div>
    <div class="skeleton skeleton-chart" aria-hidden="true"></div>
    <div class="skeleton skeleton-chart" aria-hidden="true"></div>`);
}
