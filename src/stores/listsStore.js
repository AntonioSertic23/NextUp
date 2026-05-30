let lists = [];
let activeListId = localStorage.getItem("active_list_id") || null;

export function setLists(data) {
  lists = data ?? [];
  resolveActiveListId();
}

/**
 * Returns the active list id, or the user's default list if the stored id is missing/invalid.
 * Fixes empty Home/My Shows after signup when localStorage still has another list id.
 */
export function resolveActiveListId() {
  if (!lists.length) return activeListId;

  const validIds = new Set(lists.map((l) => l.id));
  if (activeListId && validIds.has(activeListId)) {
    return activeListId;
  }

  const def = lists.find((l) => l.is_default) ?? lists[0];
  if (def) setActiveListId(def.id);
  else setActiveListId(null);
  return def?.id ?? null;
}

export function clearActiveListId() {
  activeListId = null;
  try {
    localStorage.removeItem("active_list_id");
  } catch {
    /* ignore */
  }
}

export function getLists() {
  return lists;
}

export function getActiveListId() {
  return activeListId;
}

export function setActiveListId(id) {
  activeListId = id;
  if (id) localStorage.setItem("active_list_id", id);
  else localStorage.removeItem("active_list_id");
}

export function getActiveList() {
  return lists.find((l) => l.id === activeListId) ?? null;
}

export function invalidateListsCache() {
  lists = [];
}

/** Default list id from already-loaded lists (no network). */
export function getCachedDefaultListId() {
  return lists.find((l) => l.is_default)?.id ?? null;
}
