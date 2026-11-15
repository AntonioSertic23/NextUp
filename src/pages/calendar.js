import { getCalendarEpisodes } from "../api/watchlist.js";
import { getSupabaseClient } from "../services/supabase.js";
import { monthGridRange, shiftMonth } from "../utils/calendar.js";
import {
  renderCalendarShell,
  renderCalendarMonth,
  monthLabel,
} from "../ui/calendar.js";
import { skeletonCards } from "../ui/skeleton.js";

/** Months already loaded this session, keyed by "YYYY-M". */
const monthCache = new Map();
const CACHE_TTL_MS = 10 * 60 * 1000;

let current = null;

function todayMonth() {
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() };
}

const cacheKey = ({ year, month }) => `${year}-${month}`;

async function loadMonth(ym) {
  const key = cacheKey(ym);
  const hit = monthCache.get(key);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.episodes;

  const { from, to } = monthGridRange(ym.year, ym.month);
  const episodes = await getCalendarEpisodes(from, to);
  monthCache.set(key, { at: Date.now(), episodes });
  return episodes;
}

/**
 * Renders the episode calendar page.
 *
 * @param {HTMLElement} main
 */
export async function renderCalendar(main) {
  const container = document.createElement("div");
  container.id = "calendar-container";
  main.appendChild(container);
  renderCalendarShell(container);

  current ??= todayMonth();
  let requestId = 0;

  async function show(ym) {
    current = ym;
    const id = ++requestId;
    const body = container.querySelector(".calendar-body");
    container.querySelector(".calendar-month").textContent = monthLabel(ym);
    if (!monthCache.has(cacheKey(ym))) body.innerHTML = skeletonCards(2);

    try {
      const episodes = await loadMonth(ym);
      if (id !== requestId || !container.isConnected) return;
      renderCalendarMonth(container, ym, episodes);
    } catch (err) {
      console.error("Calendar load failed:", err);
      if (id !== requestId) return;
      body.innerHTML =
        "<p class='error-text'>Couldn't load the calendar. Check your connection and try again.</p>";
    }
  }

  container.addEventListener("click", (event) => {
    const btn = event.target.closest("[data-cal]");
    if (!btn) return;
    const action = btn.dataset.cal;
    if (action === "prev") show(shiftMonth(current, -1));
    else if (action === "next") show(shiftMonth(current, 1));
    else if (action === "today") show(todayMonth());
    else if (action === "more") {
      const more = btn.previousElementSibling;
      if (more) more.hidden = false;
      btn.remove();
    }
  });

  await getSupabaseClient();
  await show(current);
}
