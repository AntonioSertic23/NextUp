import webpush from "web-push";
import { createClient } from "@supabase/supabase-js";

const SUPABASE = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

const VAPID_SUBJECT =
  process.env.VAPID_SUBJECT || "mailto:hello@nextup.app";

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
 * Users with this show on any list who have at least one push subscription.
 */
async function getRecipientsForShow(showId) {
  const { data: rows, error } = await SUPABASE.from("list_shows")
    .select(
      `
      lists!inner ( user_id ),
      shows ( title, slug_id ),
      next_episode:episodes!next_episode_id (
        season_number,
        episode_number,
        title
      )
    `,
    )
    .eq("show_id", showId);

  if (error) throw error;

  const byUser = new Map();
  for (const row of rows ?? []) {
    const userId = row.lists?.user_id;
    if (!userId || byUser.has(userId)) continue;
    byUser.set(userId, row);
  }

  if (!byUser.size) return [];

  const userIds = [...byUser.keys()];
  const { data: subs, error: subErr } = await SUPABASE.from("push_subscriptions")
    .select("id, user_id, endpoint, p256dh, auth")
    .in("user_id", userIds);

  if (subErr) throw subErr;

  return (subs ?? []).map((sub) => ({
    subscription: sub,
    show: byUser.get(sub.user_id)?.shows,
    nextEpisode: byUser.get(sub.user_id)?.next_episode,
  }));
}

/**
 * Send push notifications after new episodes were synced for a show.
 * @returns {Promise<{ sent: number, failed: number, skipped: boolean }>}
 */
export async function notifyUsersForNewEpisodes(showId) {
  if (!vapidConfigured()) {
    return { sent: 0, failed: 0, skipped: true };
  }

  ensureVapid();

  const recipients = await getRecipientsForShow(showId);
  if (!recipients.length) {
    return { sent: 0, failed: 0, skipped: false };
  }

  let sent = 0;
  let failed = 0;
  const staleIds = [];

  for (const { subscription, show, nextEpisode } of recipients) {
    const title = show?.title || "A show you follow";
    const epCode = formatEpCode(
      nextEpisode?.season_number,
      nextEpisode?.episode_number,
    );
    const epTitle = nextEpisode?.title?.trim();
    let body = "A new episode is available.";
    if (epCode && epTitle) body = `${epCode} — ${epTitle}`;
    else if (epCode) body = `New episode ${epCode}`;
    else if (epTitle) body = epTitle;

    const slug = show?.slug_id;
    const url = slug ? `/#show?traktIdentifier=${encodeURIComponent(slug)}` : "/#home";

    const payload = JSON.stringify({
      title: "NextUp",
      body: `${title}: ${body}`,
      url,
    });

    try {
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
      sent++;
    } catch (err) {
      failed++;
      const status = err.statusCode || err.status;
      if (status === 404 || status === 410) {
        staleIds.push(subscription.id);
      }
      console.warn("[push] send failed:", err.message || err);
    }
  }

  if (staleIds.length) {
    await SUPABASE.from("push_subscriptions").delete().in("id", staleIds);
  }

  return { sent, failed, skipped: false };
}

export function getVapidPublicKey() {
  return process.env.VAPID_PUBLIC_KEY?.trim() || null;
}

export async function upsertPushSubscription(userId, subscription, userAgent) {
  const endpoint = subscription?.endpoint;
  const keys = subscription?.keys;
  if (!endpoint || !keys?.p256dh || !keys?.auth) {
    throw new Error("Invalid push subscription payload");
  }

  const { error } = await SUPABASE.from("push_subscriptions").upsert(
    {
      user_id: userId,
      endpoint,
      p256dh: keys.p256dh,
      auth: keys.auth,
      user_agent: userAgent?.slice(0, 500) ?? null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,endpoint" },
  );

  if (error) throw error;
}

export async function deletePushSubscriptionsForUser(userId, endpoint) {
  let query = SUPABASE.from("push_subscriptions").delete().eq("user_id", userId);
  if (endpoint) query = query.eq("endpoint", endpoint);
  const { error } = await query;
  if (error) throw error;
}
