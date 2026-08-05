/**
 * Push when an episode’s first_aired time has just passed
 * (matches the countdown users see on My Shows → Upcoming).
 */

import webpush from "web-push";
import { createClient } from "@supabase/supabase-js";
import { isCountableEpisode } from "./episodeProgress.js";

const SUPABASE = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

const VAPID_SUBJECT =
  process.env.VAPID_SUBJECT || "mailto:hello@nextup.app";

/** How far back to look for newly aired episodes (covers missed cron ticks). */
const DEFAULT_LOOKBACK_MS = 2 * 60 * 60 * 1000; // 2 hours

function vapidConfigured() {
  return !!(
    process.env.VAPID_PUBLIC_KEY?.trim() &&
    process.env.VAPID_PRIVATE_KEY?.trim()
  );
}

function ensureVapid() {
  if (!vapidConfigured()) {
    throw new Error(
      "Push notifications are not configured (missing VAPID keys).",
    );
  }
  webpush.setVapidDetails(
    VAPID_SUBJECT,
    process.env.VAPID_PUBLIC_KEY.trim(),
    process.env.VAPID_PRIVATE_KEY.trim(),
  );
}

function formatEpCode(season, episode) {
  if (season == null || episode == null) return "";
  return `S${String(season).padStart(2, "0")}E${String(episode).padStart(2, "0")}`;
}

/**
 * Episodes whose first_aired fell in (now - lookback, now].
 *
 * @param {number} [lookbackMs]
 * @returns {Promise<Array<{id, show_id, season_number, episode_number, title, first_aired, shows: {title, slug_id}}>>}
 */
export async function getRecentlyAiredEpisodes(
  lookbackMs = DEFAULT_LOOKBACK_MS,
) {
  const now = new Date();
  const since = new Date(now.getTime() - lookbackMs);

  const { data, error } = await SUPABASE.from("episodes")
    .select(
      `
      id,
      show_id,
      season_number,
      episode_number,
      title,
      first_aired,
      episode_type,
      shows ( title, slug_id )
    `,
    )
    .gt("season_number", 0)
    .gt("first_aired", since.toISOString())
    .lte("first_aired", now.toISOString())
    .order("first_aired", { ascending: true })
    .limit(200);

  if (error) throw error;

  return (data || []).filter(isCountableEpisode);
}

/**
 * Users who have this show on at least one list + their push subscriptions.
 * @param {string} showId
 */
async function getPushTargetsForShow(showId) {
  const { data: rows, error } = await SUPABASE.from("list_shows")
    .select(`lists!inner ( user_id )`)
    .eq("show_id", showId);

  if (error) throw error;

  const userIds = [
    ...new Set((rows || []).map((r) => r.lists?.user_id).filter(Boolean)),
  ];
  if (!userIds.length) return [];

  const { data: subs, error: subErr } = await SUPABASE.from("push_subscriptions")
    .select("id, user_id, endpoint, p256dh, auth")
    .in("user_id", userIds);

  if (subErr) throw subErr;
  return subs || [];
}

async function alreadyNotified(userId, episodeId) {
  const { data, error } = await SUPABASE.from("episode_air_notifications")
    .select("user_id")
    .eq("user_id", userId)
    .eq("episode_id", episodeId)
    .maybeSingle();

  if (error) throw error;
  return !!data;
}

async function markNotified(userId, episodeId) {
  const { error } = await SUPABASE.from("episode_air_notifications").upsert(
    {
      user_id: userId,
      episode_id: episodeId,
      sent_at: new Date().toISOString(),
    },
    { onConflict: "user_id,episode_id" },
  );
  if (error) throw error;
}

async function sendOne(subscription, payload) {
  await webpush.sendNotification(
    {
      endpoint: subscription.endpoint,
      keys: {
        p256dh: subscription.p256dh,
        auth: subscription.auth,
      },
    },
    payload,
  );
}

/**
 * Send “just aired” pushes for episodes that crossed first_aired recently.
 *
 * @param {{ lookbackMs?: number }} [options]
 * @returns {Promise<{ skipped: boolean, aired: number, sent: number, failed: number, users: number }>}
 */
export async function notifyRecentlyAiredEpisodes(options = {}) {
  const lookbackMs = options.lookbackMs ?? DEFAULT_LOOKBACK_MS;

  if (!vapidConfigured()) {
    return { skipped: true, aired: 0, sent: 0, failed: 0, users: 0 };
  }

  ensureVapid();

  const episodes = await getRecentlyAiredEpisodes(lookbackMs);
  if (!episodes.length) {
    return { skipped: false, aired: 0, sent: 0, failed: 0, users: 0 };
  }

  let sent = 0;
  let failed = 0;
  const usersNotified = new Set();
  const staleIds = [];

  // Cache subscriptions per show
  const subsByShow = new Map();

  for (const ep of episodes) {
    const showId = ep.show_id;
    if (!subsByShow.has(showId)) {
      subsByShow.set(showId, await getPushTargetsForShow(showId));
    }
    const subs = subsByShow.get(showId) || [];
    if (!subs.length) continue;

    const showTitle = ep.shows?.title || "A show on your list";
    const slug = ep.shows?.slug_id;
    const epCode = formatEpCode(ep.season_number, ep.episode_number);
    const epTitle = (ep.title || "").trim();

    let detail = "New episode just aired";
    if (epCode && epTitle) detail = `New episode just aired — ${epCode} — ${epTitle}`;
    else if (epCode) detail = `New episode just aired — ${epCode}`;

    const payload = JSON.stringify({
      title: "NextUp",
      body: `${showTitle}: ${detail}`,
      url: slug
        ? `/#show?traktIdentifier=${encodeURIComponent(slug)}`
        : "/#home",
    });

    // One notification per user per episode (even if multiple devices)
    const byUser = new Map();
    for (const sub of subs) {
      if (!byUser.has(sub.user_id)) byUser.set(sub.user_id, []);
      byUser.get(sub.user_id).push(sub);
    }

    for (const [userId, userSubs] of byUser) {
      if (await alreadyNotified(userId, ep.id)) continue;

      let anySent = false;
      for (const subscription of userSubs) {
        try {
          await sendOne(subscription, payload);
          sent++;
          anySent = true;
        } catch (err) {
          failed++;
          const status = err.statusCode || err.status;
          if (status === 404 || status === 410) {
            staleIds.push(subscription.id);
          }
          console.warn("[air-push] send failed:", err.message || err);
        }
      }

      if (anySent) {
        await markNotified(userId, ep.id);
        usersNotified.add(userId);
      }
    }
  }

  if (staleIds.length) {
    await SUPABASE.from("push_subscriptions").delete().in("id", staleIds);
  }

  return {
    skipped: false,
    aired: episodes.length,
    sent,
    failed,
    users: usersNotified.size,
  };
}
