import { getSupabaseClient } from "../services/supabase.js";
import { getUser } from "../stores/userStore.js";

export async function getShowNote(showId) {
  const SUPABASE = await getSupabaseClient();
  const { id: userId } = getUser();

  const { data } = await SUPABASE.from("show_notes")
    .select("id, content, updated_at")
    .eq("user_id", userId)
    .eq("show_id", showId)
    .maybeSingle();

  return data;
}

export async function saveShowNote(showId, content) {
  const SUPABASE = await getSupabaseClient();
  const { id: userId } = getUser();

  const { data, error } = await SUPABASE.from("show_notes")
    .upsert(
      {
        user_id: userId,
        show_id: showId,
        content: content.trim(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,show_id" },
    )
    .select("id, content, updated_at")
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function deleteShowNote(showId) {
  const SUPABASE = await getSupabaseClient();
  const { id: userId } = getUser();

  await SUPABASE.from("show_notes")
    .delete()
    .eq("user_id", userId)
    .eq("show_id", showId);
}

export async function getProfileNote() {
  const SUPABASE = await getSupabaseClient();
  const { id: userId } = getUser();

  const { data } = await SUPABASE.from("user_notes")
    .select("id, content, updated_at")
    .eq("user_id", userId)
    .maybeSingle();

  return data;
}

export async function saveProfileNote(content) {
  const SUPABASE = await getSupabaseClient();
  const { id: userId } = getUser();

  const { data, error } = await SUPABASE.from("user_notes")
    .upsert(
      {
        user_id: userId,
        content: content.trim(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    )
    .select("id, content, updated_at")
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function listShowNotesWithTitles() {
  const SUPABASE = await getSupabaseClient();
  const { id: userId } = getUser();

  const { data, error } = await SUPABASE.from("show_notes")
    .select(
      `
      id,
      content,
      updated_at,
      shows ( id, title, slug_id, image_poster, year )
    `,
    )
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });

  if (error) {
    console.error("listShowNotesWithTitles:", error);
    return [];
  }
  return (data ?? []).filter((n) => n.shows);
}
