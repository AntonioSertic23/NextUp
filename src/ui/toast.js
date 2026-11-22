/**
 * Short, non-blocking notifications (replaces window.alert).
 */

const DURATION_MS = { info: 3500, success: 3000, warning: 5000, error: 6000 };

let region = null;

function getRegion() {
  if (region?.isConnected) return region;
  region = document.createElement("div");
  region.className = "toast-region";
  region.setAttribute("role", "status");
  region.setAttribute("aria-live", "polite");
  document.body.appendChild(region);
  return region;
}

/**
 * @param {string} message
 * @param {{ type?: "info"|"success"|"warning"|"error", duration?: number }} [options]
 */
export function showToast(message, { type = "info", duration } = {}) {
  if (!message) return;

  const toast = document.createElement("div");
  toast.className = `toast toast--${type}`;
  if (type === "error") toast.setAttribute("role", "alert");

  const text = document.createElement("p");
  text.className = "toast__text";
  text.textContent = message;

  const close = document.createElement("button");
  close.type = "button";
  close.className = "toast__close";
  close.setAttribute("aria-label", "Dismiss");
  close.textContent = "×";

  toast.append(text, close);
  getRegion().appendChild(toast);
  requestAnimationFrame(() => toast.classList.add("toast--visible"));

  let timer = null;
  const dismiss = () => {
    clearTimeout(timer);
    toast.classList.remove("toast--visible");
    setTimeout(() => toast.remove(), 250);
  };
  close.addEventListener("click", dismiss);
  timer = setTimeout(dismiss, duration ?? DURATION_MS[type] ?? 3500);
}

export const toastError = (message) => showToast(message, { type: "error" });
export const toastSuccess = (message) => showToast(message, { type: "success" });
export const toastWarning = (message) =>
  showToast(message, { type: "warning" });
