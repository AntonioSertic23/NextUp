import { getSupabaseClient } from "../services/supabase.js";
import { getUser } from "../stores/userStore.js";

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

  const { data, error } = await SUPABASE.from("lists")
    .insert({ user_id: userId, name, description, is_default: false })
    .select("id, name, description, is_default, created_at")
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function updateList(listId, { name, description }) {
  const SUPABASE = await getSupabaseClient();
  const payload = {};
  if (name !== undefined) payload.name = name;
  if (description !== undefined) payload.description = description;

  const { error } = await SUPABASE.from("lists")
    .update(payload)
    .eq("id", listId);

  if (error) throw new Error(error.message);
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
