import { getSupabaseClient } from "../services/supabase.js";
import { getUser } from "../stores/userStore.js";

/** Soft TTL — cache is reused until explicitly invalidated. */
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function isFresh(computedAt) {
  if (!computedAt) return false;
  return Date.now() - new Date(computedAt).getTime() < CACHE_TTL_MS;
}

/**
 * @returns {Promise<Object|null>} Cached row or null
 */
export async function readStatsCache() {
  const SUPABASE = await getSupabaseClient();
  const { id: userId } = getUser();

  const { data, error } = await SUPABASE.from("user_stats_cache")
    .select("multi_list, multi_list_computed_at, detail_by_list")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.error("readStatsCache:", error);
    return null;
  }
  return data;
}

/**
 * @param {Object|null} row
 * @returns {Object|null}
 */
export function getFreshMultiListFromCache(row) {
  if (!row?.multi_list || !isFresh(row.multi_list_computed_at)) return null;
  return row.multi_list;
}

/**
 * @param {Object|null} row
 * @param {string} listId
 * @returns {Object|null}
 */
export function getFreshDetailFromCache(row, listId) {
  if (!listId || !row?.detail_by_list) return null;
  const entry = row.detail_by_list[listId];
  if (!entry?.data || !isFresh(entry.computed_at)) return null;
  return entry.data;
}

/**
 * Persist multi-list and/or per-list detail stats.
 */
export async function persistStatsCache({ multiList, detail, detailListId }) {
  const SUPABASE = await getSupabaseClient();
  const { id: userId } = getUser();

  const existing = await readStatsCache();
  const detailByList = { ...(existing?.detail_by_list ?? {}) };
  const now = new Date().toISOString();

  if (detail && detailListId) {
    detailByList[detailListId] = { data: detail, computed_at: now };
  }

  const payload = {
    user_id: userId,
    detail_by_list: detailByList,
    updated_at: now,
  };

  if (multiList != null) {
    payload.multi_list = multiList;
    payload.multi_list_computed_at = now;
  } else if (existing?.multi_list) {
    payload.multi_list = existing.multi_list;
    payload.multi_list_computed_at = existing.multi_list_computed_at;
  }

  const { error } = await SUPABASE.from("user_stats_cache").upsert(payload, {
    onConflict: "user_id",
  });

  if (error) console.error("persistStatsCache:", error);
}

/**
 * Clears persisted stats (call when watch progress or lists change).
 */
export async function clearStatsCache() {
  const SUPABASE = await getSupabaseClient();
  const { id: userId } = getUser();

  const { error } = await SUPABASE.from("user_stats_cache")
    .delete()
    .eq("user_id", userId);

  if (error) console.error("clearStatsCache:", error);
}
