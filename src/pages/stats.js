import { getStatsData, getMultiListStats } from "../api/stats.js";
import { getAllUserRatings } from "../api/ratings.js";
import { computePersonalRatingStats } from "../utils/showRatings.js";
import { getDefaultListId } from "../api/watchlist.js";
import {
  readStatsCache,
  getFreshMultiListFromCache,
  getFreshDetailFromCache,
  persistStatsCache,
} from "../api/statsCache.js";
import { renderStatistics } from "../ui/statistics.js";
import { setStats, getStats } from "../stores/statsStore.js";
import { consumeStatsStale } from "../services/pageCache.js";
import { ensureListsLoaded } from "../ui/listFilter.js";
import { getSupabaseClient } from "../services/supabase.js";

/**
 * Loads main-collection stats + multi-list overview (with Supabase cache).
 */
async function loadStats() {
  const listId = await getDefaultListId();
  if (!listId) return null;

  const sessionStale = consumeStatsStale();
  const inMemory = getStats();

  if (!sessionStale && inMemory?.multiList && inMemory?.detail) {
    if (!inMemory.personalHype) {
      const personalHype = computePersonalRatingStats(await getAllUserRatings());
      const merged = { ...inMemory, personalHype };
      setStats(merged);
      return merged;
    }
    return inMemory;
  }

  const cachedRow = sessionStale ? null : await readStatsCache();
  let multiList = sessionStale
    ? null
    : getFreshMultiListFromCache(cachedRow);
  let detail = sessionStale ? null : getFreshDetailFromCache(cachedRow, listId);

  if (multiList && detail) {
    const personalHype = computePersonalRatingStats(await getAllUserRatings());
    const payload = { multiList, detail, personalHype };
    setStats(payload);
    return payload;
  }

  if (multiList || detail) {
    setStats({ multiList: multiList ?? null, detail: detail ?? null });
    renderStatistics();
  }

  const needMulti = !multiList;
  const needDetail = !detail;

  const [multiResult, detailResult, ratingsRows] = await Promise.all([
    needMulti ? getMultiListStats() : Promise.resolve(multiList),
    needDetail ? getStatsData(listId) : Promise.resolve(detail),
    getAllUserRatings(),
  ]);

  multiList = multiResult ?? multiList;
  detail = detailResult ?? detail;
  const personalHype = computePersonalRatingStats(ratingsRows);

  const payload = { multiList, detail, personalHype };
  setStats(payload);
  persistStatsCache({
    multiList: needMulti ? multiList : null,
    detail: needDetail ? detail : null,
    detailListId: listId,
  }).catch(() => {});

  return payload;
}

/**
 * Renders statistics on the user's watched shows.
 * @param {HTMLElement} main - The main container element to render stats into
 */
export async function renderStats(main) {
  const statsDiv = document.createElement("div");
  statsDiv.id = "stats-container";
  statsDiv.innerHTML = "<p class='loading-text'>Loading statistics...</p>";
  main.appendChild(statsDiv);

  await Promise.all([getSupabaseClient(), ensureListsLoaded()]);
  await loadStats();
  renderStatistics();
}
