/**
 * Non-blocking banner shown when a new service worker is ready.
 */

let bannerEl = null;

export function showUpdateBanner(onRefresh) {
  if (bannerEl) return;

  bannerEl = document.createElement("div");
  bannerEl.className = "pwa-update-banner";
  bannerEl.setAttribute("role", "status");
  bannerEl.innerHTML = `
    <p class="pwa-update-banner__text">A new version of NextUp is available.</p>
    <div class="pwa-update-banner__actions">
      <button type="button" class="pwa-update-banner__refresh btn-secondary btn-sm">Refresh</button>
      <button type="button" class="pwa-update-banner__dismiss btn-ghost btn-sm">Later</button>
    </div>
  `;

  bannerEl.querySelector(".pwa-update-banner__refresh").addEventListener("click", (event) => {
    event.currentTarget.disabled = true;
    onRefresh?.();
  });

  bannerEl.querySelector(".pwa-update-banner__dismiss").addEventListener("click", () => {
    bannerEl?.remove();
    bannerEl = null;
  });

  document.body.appendChild(bannerEl);
  requestAnimationFrame(() => bannerEl.classList.add("pwa-update-banner--visible"));
}
