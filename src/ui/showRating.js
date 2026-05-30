import { setShowRating, clearShowRating } from "../api/ratings.js";
import { invalidateWatchlistAndStats } from "../services/pageCache.js";
import { patchShowUserRating } from "../stores/myShowsStore.js";
import { HYPE_TIERS, getTierByScore } from "../utils/showRatings.js";

/** Unicode popcorn — filled state; empty slots use CSS grayscale on the same glyph. */
const POPCORN_EMOJI = "🍿";

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function popcornEmojiHtml() {
  return `<span class="popcorn-emoji" aria-hidden="true">${POPCORN_EMOJI}</span>`;
}

/**
 * Five popcorn buttons only (no labels). Place next to the show title.
 * @param {number|null} currentScore
 */
export function renderPopcornRatingHtml(currentScore) {
  const slots = HYPE_TIERS.map(
    (tier) => `
      <button
        type="button"
        class="popcorn-btn"
        data-score="${tier.score}"
        aria-label="Rate ${tier.score} of 5"
      >
        ${popcornEmojiHtml()}
      </button>
    `,
  ).join("");

  return `
    <div
      class="popcorn-rating show-popcorn-rating"
      id="show-popcorn-rating"
      role="group"
      aria-label="Rate this show"
      data-initial-score="${currentScore ?? ""}"
    >
      ${slots}
    </div>
  `;
}

/** @deprecated alias */
export const renderHypeMeterHtml = renderPopcornRatingHtml;

/**
 * @param {string} showId
 * @param {number|null} initialScore
 * @param {(score: number|null) => void} [onChange]
 */
export function bindPopcornRating(showId, initialScore, onChange) {
  const root = document.getElementById("show-popcorn-rating");
  if (!root || !showId) return;

  let current = initialScore != null ? Number(initialScore) : null;

  function refreshUi() {
    root.querySelectorAll(".popcorn-btn").forEach((btn) => {
      const score = Number(btn.dataset.score);
      const filled = current != null && score <= current;
      btn.classList.toggle("is-full", filled);
      btn.setAttribute("aria-pressed", filled ? "true" : "false");
    });
  }

  async function onPick(score) {
    const next = Number(score);

    if (current === next) {
      root.querySelectorAll(".popcorn-btn").forEach((b) => {
        b.disabled = true;
      });
      try {
        await clearShowRating(showId);
        current = null;
        patchShowUserRating(showId, null);
        invalidateWatchlistAndStats();
        refreshUi();
        onChange?.(null);
      } catch (err) {
        alert(err.message || "Could not clear rating");
      } finally {
        root.querySelectorAll(".popcorn-btn").forEach((b) => {
          b.disabled = false;
        });
      }
      return;
    }

    root.querySelectorAll(".popcorn-btn").forEach((b) => {
      b.disabled = true;
    });

    try {
      await setShowRating(showId, next);
      current = next;
      patchShowUserRating(showId, next);
      invalidateWatchlistAndStats();
      refreshUi();
      onChange?.(current);
    } catch (err) {
      alert(err.message || "Could not save rating");
    } finally {
      root.querySelectorAll(".popcorn-btn").forEach((b) => {
        b.disabled = false;
      });
    }
  }

  root.querySelectorAll(".popcorn-btn").forEach((btn) => {
    btn.addEventListener("click", () => onPick(btn.dataset.score));
  });

  refreshUi();
}

/** @deprecated alias */
export const bindHypeMeter = bindPopcornRating;

/**
 * @param {number|null} score
 */
export function renderHypeBadgeHtml(score) {
  const n = Number(score);
  if (!Number.isInteger(n) || n < 1 || n > 5) return "";
  const tier = getTierByScore(n);
  const emojis = POPCORN_EMOJI.repeat(n);
  return `<span class="popcorn-badge" title="${escapeHtml(tier?.label ?? "")}">${emojis}</span>`;
}
