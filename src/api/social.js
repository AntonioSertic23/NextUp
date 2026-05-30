import { getSession } from "../stores/userStore.js";

export async function followUserByEmail(email) {
  const { access_token } = getSession();
  const res = await fetch("/.netlify/functions/followUser", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${access_token}`,
    },
    body: JSON.stringify({ action: "follow", email }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Follow failed");
  return data;
}

export async function unfollowUser(userId) {
  const { access_token } = getSession();
  const res = await fetch("/.netlify/functions/followUser", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${access_token}`,
    },
    body: JSON.stringify({ action: "unfollow", userId }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Unfollow failed");
  return data;
}

export async function getFollowing() {
  const { access_token } = getSession();
  const res = await fetch("/.netlify/functions/followUser", {
    method: "GET",
    headers: { Authorization: `Bearer ${access_token}` },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Failed to load following");
  return data.following ?? [];
}

export async function getPublicUserStats(userId) {
  const { access_token } = getSession();
  const res = await fetch(
    `/.netlify/functions/getPublicUserStats?userId=${encodeURIComponent(userId)}`,
    {
      headers: { Authorization: `Bearer ${access_token}` },
    },
  );
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Failed to load stats");
  return data;
}
