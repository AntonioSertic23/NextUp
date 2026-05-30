let lists = [];
let activeListId = localStorage.getItem("active_list_id") || null;

export function setLists(data) {
  lists = data ?? [];
  if (!activeListId && lists.length) {
    const def = lists.find((l) => l.is_default) ?? lists[0];
    setActiveListId(def.id);
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
