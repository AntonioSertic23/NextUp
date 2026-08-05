import { getWatchlist } from "../stores/watchlistStore.js";
import { resolveActiveListId } from "../stores/listsStore.js";
import { DICE_ICON } from "../utils/icons.js";
import { formatEpisodeInfo } from "../utils/format.js";
import {
  getTonightPicks,
  generateAndSaveTonightPicks,
  mapPicksToWatchlist,
} from "../api/tonight.js";

let focusShowIds = new Set();

export function getTonightFocusShowIds() {
  return focusShowIds;
}

function escapeHtml(text) {
  return String(text ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Renders the “Tonight” focus strip above the watchlist.
 * @param {HTMLElement} main
 */
export async function renderTonightSection(main) {
  let section = main.querySelector("#tonight-section");
  if (!section) {
    section = document.createElement("section");
    section.id = "tonight-section";
    section.className = "tonight-section";
    const watchlist = main.querySelector("#watchlist-container");
    if (watchlist) {
      main.insertBefore(section, watchlist);
    } else {
      main.appendChild(section);
    }
  }

  section.innerHTML = `<p class="tonight-loading">Picking something to watch…</p>`;

  const listId = resolveActiveListId();
  const watchlist = getWatchlist();

  let picks = [];
  const saved = await getTonightPicks(listId);
  if (saved?.showIds?.length) {
    picks = mapPicksToWatchlist(watchlist, saved.showIds);
  }

  // Regenerate if empty or all picks left the active list
  if (!picks.length) {
    picks = await generateAndSaveTonightPicks(listId, watchlist, {
      shuffle: false,
    });
  }

  focusShowIds = new Set(picks.map((p) => p.shows?.id).filter(Boolean));

  if (!picks.length) {
    section.innerHTML = `
      <div class="tonight-header">
        <h2 class="tonight-title">Tonight</h2>
      </div>
      <p class="tonight-empty">Add in-progress shows to this list to get suggestions.</p>
    `;
    return;
  }

  section.innerHTML = `
    <div class="tonight-header">
      <div class="tonight-heading-block">
        <h2 class="tonight-title">Tonight</h2>
        <p class="tonight-subtitle">Three shows to focus on — shuffle anytime</p>
      </div>
      <button type="button" class="tonight-shuffle-btn" aria-label="Shuffle tonight picks" title="Shuffle">
        ${DICE_ICON}
      </button>
    </div>
    <div class="tonight-grid">
      ${picks
        .map((item) => {
          const ep = item.next_episode;
          const epLabel = ep
            ? formatEpisodeInfo(ep.season_number, ep.episode_number, ep.title)
            : "";
          return `
            <button type="button" class="tonight-card" data-slug="${escapeHtml(item.shows.slug_id)}" data-show-id="${escapeHtml(item.shows.id)}">
              <img class="tonight-poster" src="https://${escapeHtml(item.shows.image_poster)}" alt="" />
              <span class="tonight-card-meta">
                <span class="tonight-card-title">${escapeHtml(item.shows.title)}</span>
                <span class="tonight-card-ep">${escapeHtml(epLabel)}</span>
              </span>
            </button>
          `;
        })
        .join("")}
    </div>
  `;

  section.querySelector(".tonight-shuffle-btn")?.addEventListener("click", async (e) => {
    const btn = e.currentTarget;
    btn.disabled = true;
    btn.classList.add("is-busy");
    try {
      const previous = [...focusShowIds];
      picks = await generateAndSaveTonightPicks(listId, getWatchlist(), {
        shuffle: true,
        previousShowIds: previous,
      });
      focusShowIds = new Set(picks.map((p) => p.shows?.id).filter(Boolean));
      await renderTonightSection(main);
      // Re-render watchlist so focus rings update
      const { renderWatchlist } = await import("./watchlist.js");
      await renderWatchlist();
    } finally {
      btn.disabled = false;
      btn.classList.remove("is-busy");
    }
  });

  section.querySelectorAll(".tonight-card").forEach((card) => {
    card.addEventListener("click", () => {
      const slug = card.getAttribute("data-slug");
      if (slug) location.hash = `show?traktIdentifier=${slug}`;
    });
  });
}
