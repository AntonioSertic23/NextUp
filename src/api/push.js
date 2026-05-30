import { getSession } from "../stores/userStore.js";

export async function fetchVapidPublicKey() {
  const res = await fetch("/.netlify/functions/getVapidPublicKey");
  if (!res.ok) return null;
  const data = await res.json();
  return data.publicKey ?? null;
}

export async function savePushSubscription(subscription) {
  const { access_token } = getSession();
  const res = await fetch("/.netlify/functions/savePushSubscription", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${access_token}`,
    },
    body: JSON.stringify({ subscription }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || "Failed to save push subscription");
  }
  return data;
}

export async function removePushSubscription(endpoint) {
  const { access_token } = getSession();
  const res = await fetch("/.netlify/functions/removePushSubscription", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${access_token}`,
    },
    body: JSON.stringify(endpoint ? { endpoint } : {}),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || "Failed to remove push subscription");
  }
  return data;
}
