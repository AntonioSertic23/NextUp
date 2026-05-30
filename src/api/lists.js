import { getSupabaseClient } from "../services/supabase.js";
import { getUser } from "../stores/userStore.js";
import { getLists } from "../stores/listsStore.js";

export async function fetchUserLists() {
  const SUPABASE = await getSupabaseClient();
  const { id: userId } = getUser();

  const { data, error } = await SUPABASE.from("lists")
    .select("id, name, description, is_default, created_at")
    .eq("user_id", userId)
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: true });

  if (error) {
    console.error("fetchUserLists:", error);
    return [];
  }
  return data ?? [];
}

export async function createList(name, description = "") {
  const SUPABASE = await getSupabaseClient();
  const { id: userId } = getUser();
  const trimmedName = name.trim();

  const { data: existing } = await SUPABASE.from("lists")
    .select("id")
    .eq("user_id", userId)
    .ilike("name", trimmedName)
    .maybeSingle();

  if (existing) {
    throw new Error("A list with this name already exists");
  }

  const { data, error } = await SUPABASE.from("lists")
    .insert({
      user_id: userId,
      name: trimmedName,
      description,
      is_default: false,
    })
    .select("id, name, description, is_default, created_at")
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function updateList(listId, { name, description }) {
  const SUPABASE = await getSupabaseClient();
  const { id: userId } = getUser();
  const payload = {};

  if (name !== undefined) {
    const trimmedName = name.trim();
    const { data: duplicate } = await SUPABASE.from("lists")
      .select("id")
      .eq("user_id", userId)
      .ilike("name", trimmedName)
      .neq("id", listId)
      .maybeSingle();

    if (duplicate) {
      throw new Error("A list with this name already exists");
    }
    payload.name = trimmedName;
  }
  if (description !== undefined) payload.description = description;

  const { error } = await SUPABASE.from("lists")
    .update(payload)
    .eq("id", listId);

  if (error) throw new Error(error.message);
}

/** @type {Map<string, Set<string>>} showId -> listIds where show is a member */
let membershipByShowId = new Map();
let membershipCacheReady = false;
let membershipLoadPromise = null;

/**
 * Preloads list membership for all shows (one query). Used for instant ⋮ menus.
 */
/**
 * @param {string[]|undefined} showIds - Limit rows to these shows (faster on large collections).
 */
export async function preloadListMembershipCache(showIds) {
  if (membershipCacheReady) return;
  if (membershipLoadPromise) {
    await membershipLoadPromise;
    return;
  }

  membershipLoadPromise = (async () => {
    const lists = getLists().length ? getLists() : await fetchUserLists();
    if (!lists.length) {
      membershipByShowId = new Map();
      membershipCacheReady = true;
      return;
    }

    const SUPABASE = await getSupabaseClient();
    const listIds = lists.map((l) => l.id);

    let query = SUPABASE.from("list_shows")
      .select("list_id, show_id")
      .in("list_id", listIds);

    if (showIds?.length) {
      query = query.in("show_id", showIds);
    }

    const { data, error } = await query;

    const map = new Map();
    if (!error && data) {
      for (const row of data) {
        const sid = String(row.show_id);
        if (!map.has(sid)) map.set(sid, new Set());
        map.get(sid).add(row.list_id);
      }
    }
    membershipByShowId = map;
    membershipCacheReady = true;
  })();

  try {
    await membershipLoadPromise;
  } finally {
    membershipLoadPromise = null;
  }
}

export function invalidateListMembershipCache() {
  membershipCacheReady = false;
  membershipByShowId = new Map();
}

function setShowListMembership(showId, listId, isMember) {
  const sid = String(showId);
  if (!membershipByShowId.has(sid)) {
    membershipByShowId.set(sid, new Set());
  }
  const set = membershipByShowId.get(sid);
  if (isMember) set.add(listId);
  else set.delete(listId);
}

/**
 * All user lists with whether the show is on each list (cache-first).
 * @param {string} showId - Show UUID
 */
export async function fetchListsWithShowMembership(showId) {
  const lists = getLists().length ? getLists() : await fetchUserLists();
  if (!lists.length || !showId) return [];

  if (!membershipCacheReady) {
    await preloadListMembershipCache();
  }

  const memberIds = membershipByShowId.get(String(showId)) ?? new Set();
  return lists.map((l) => ({ ...l, hasShow: memberIds.has(l.id) }));
}

/** Update cache after add/remove without a full reload. */
export function patchListMembershipCache(showId, listId, isMember) {
  if (!membershipCacheReady) return;
  setShowListMembership(showId, listId, isMember);
}

export async function deleteList(listId) {
  const SUPABASE = await getSupabaseClient();

  const { data: list } = await SUPABASE.from("lists")
    .select("is_default")
    .eq("id", listId)
    .single();

  if (list?.is_default) {
    throw new Error("Cannot delete the default list");
  }

  const { error } = await SUPABASE.from("lists").delete().eq("id", listId);
  if (error) throw new Error(error.message);
}
