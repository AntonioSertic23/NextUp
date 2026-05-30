import {
  fetchVapidPublicKey,
  savePushSubscription,
  removePushSubscription,
} from "../api/push.js";

const PUSH_PREF_KEY = "nextup_push_enabled";

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) {
    output[i] = raw.charCodeAt(i);
  }
  return output;
}

export function isPushSupported() {
  return (
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

export function getPushPreferenceEnabled() {
  return localStorage.getItem(PUSH_PREF_KEY) === "1";
}

function setPushPreferenceEnabled(enabled) {
  if (enabled) localStorage.setItem(PUSH_PREF_KEY, "1");
  else localStorage.removeItem(PUSH_PREF_KEY);
}

/**
 * Subscribe this device to Web Push (asks for permission if needed).
 */
export async function subscribeToPushNotifications() {
  if (!isPushSupported()) {
    throw new Error("Push notifications are not supported on this device or browser.");
  }

  const publicKey = await fetchVapidPublicKey();
  if (!publicKey) {
    throw new Error(
      "Push is not configured on the server. Add VAPID keys to enable notifications.",
    );
  }

  let permission = Notification.permission;
  if (permission === "default") {
    permission = await Notification.requestPermission();
  }
  if (permission !== "granted") {
    throw new Error("Notification permission was denied.");
  }

  const registration = await navigator.serviceWorker.ready;
  let subscription = await registration.pushManager.getSubscription();

  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    });
  }

  await savePushSubscription(subscription.toJSON());
  setPushPreferenceEnabled(true);
  return subscription;
}

/**
 * Unsubscribe this device and remove it from the server.
 */
export async function unsubscribeFromPushNotifications() {
  if (!isPushSupported()) {
    setPushPreferenceEnabled(false);
    return;
  }

  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();

  if (subscription) {
    await removePushSubscription(subscription.endpoint).catch(() => {});
    await subscription.unsubscribe();
  } else {
    await removePushSubscription().catch(() => {});
  }

  setPushPreferenceEnabled(false);
}

/**
 * Re-sync subscription after login if user had notifications enabled before.
 */
export async function syncPushSubscriptionIfEnabled() {
  if (!getPushPreferenceEnabled() || !isPushSupported()) return;
  if (Notification.permission !== "granted") return;

  try {
    await subscribeToPushNotifications();
  } catch {
    setPushPreferenceEnabled(false);
  }
}
