import { getUser } from "../stores/userStore.js";
import { getToken, logout } from "../services/auth.js";
import {
  connectTraktAccount,
  syncTraktAccount,
  syncNewEpisodes,
} from "../api/sync.js";

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatMemberSince(dateStr) {
  if (!dateStr) return "Unknown";
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return "Unknown";
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

/**
 * Renders the profile page content.
 */
export async function renderProfile() {
  const container = document.getElementById("profile-container");
  const user = getUser();
  const traktToken = await getToken();
  const traktConnected = !!traktToken;

  const email = escapeHtml(user?.email ?? "Unknown");
  const memberSince = formatMemberSince(user?.created_at);

  container.innerHTML = `
    <header class="profile-header">
      <div class="profile-avatar">${email.charAt(0).toUpperCase()}</div>
      <div class="profile-info">
        <h1 class="profile-email">${email}</h1>
        <p class="profile-since">Member since ${escapeHtml(memberSince)}</p>
      </div>
    </header>

    <section class="profile-section">
      <h2 class="profile-section-title">Trakt Integration</h2>
      <div class="profile-trakt-status">
        <span class="trakt-status-dot ${traktConnected ? "connected" : "disconnected"}"></span>
        <span class="trakt-status-text">${traktConnected ? "Connected to Trakt" : "Not connected"}</span>
      </div>
      <div class="profile-actions-grid">
        ${
          !traktConnected
            ? `<button type="button" class="profile-action-btn" id="profile-trakt-connect">
                <span class="profile-action-icon">🔗</span>
                <div class="profile-action-content">
                  <span class="profile-action-label">Sign in to Trakt</span>
                  <span class="profile-action-desc">Connect your Trakt account to sync watch history</span>
                </div>
              </button>`
            : `<button type="button" class="profile-action-btn" id="profile-trakt-sync">
                <span class="profile-action-icon">🔄</span>
                <div class="profile-action-content">
                  <span class="profile-action-label">Sync with Trakt</span>
                  <span class="profile-action-desc">Pull your full watch history from Trakt</span>
                </div>
              </button>
              <button type="button" class="profile-action-btn" id="profile-sync-episodes">
                <span class="profile-action-icon">📺</span>
                <div class="profile-action-content">
                  <span class="profile-action-label">Sync New Episodes</span>
                  <span class="profile-action-desc">Check for newly aired episodes across all shows</span>
                </div>
              </button>`
        }
      </div>
    </section>

    <section class="profile-section">
      <h2 class="profile-section-title">App</h2>
      <div class="profile-actions-grid">
        <button type="button" class="profile-action-btn" id="profile-refresh">
          <span class="profile-action-icon">🔄</span>
          <div class="profile-action-content">
            <span class="profile-action-label">Refresh App</span>
            <span class="profile-action-desc">Reload the page to get the latest data</span>
          </div>
        </button>
      </div>
    </section>

    <section class="profile-section profile-section-danger">
      <h2 class="profile-section-title">Account</h2>
      <div class="profile-actions-grid">
        <button type="button" class="profile-action-btn danger" id="profile-logout">
          <span class="profile-action-icon">🚪</span>
          <div class="profile-action-content">
            <span class="profile-action-label">Logout</span>
            <span class="profile-action-desc">Sign out of your account</span>
          </div>
        </button>
      </div>
    </section>
  `;

  setupProfileActions(container, traktConnected);
}

function setupProfileActions(container, traktConnected) {
  container.querySelector("#profile-refresh")?.addEventListener("click", () => {
    window.location.reload();
  });

  container.querySelector("#profile-logout")?.addEventListener("click", () => {
    logout();
  });

  if (!traktConnected) {
    container
      .querySelector("#profile-trakt-connect")
      ?.addEventListener("click", () => connectTraktAccount());
  } else {
    const syncBtn = container.querySelector("#profile-trakt-sync");
    syncBtn?.addEventListener("click", async () => {
      syncBtn.disabled = true;
      const label = syncBtn.querySelector(".profile-action-label");
      const origText = label.textContent;
      label.textContent = "Syncing…";

      try {
        const result = await syncTraktAccount();
        let msg = result?.message || "Sync completed";
        if (result?.errors?.length) {
          msg += "\n\nErrors:\n" + result.errors.join("\n");
        }
        alert(msg);
      } catch (error) {
        alert(error.message);
      } finally {
        syncBtn.disabled = false;
        label.textContent = origText;
      }
    });

    const episodesBtn = container.querySelector("#profile-sync-episodes");
    episodesBtn?.addEventListener("click", async () => {
      episodesBtn.disabled = true;
      const label = episodesBtn.querySelector(".profile-action-label");
      const origText = label.textContent;
      label.textContent = "Syncing…";

      try {
        const result = await syncNewEpisodes();
        const updated = result?.updated?.length ?? 0;
        const skipped = result?.skipped?.length ?? 0;
        const errors = result?.errors ?? [];

        let msg = result?.message || "Episode sync completed";
        msg += `\n\nUpdated: ${updated}\nSkipped: ${skipped}`;
        if (errors.length) {
          msg +=
            "\n\nErrors:\n" +
            errors
              .map((e) =>
                typeof e === "string" ? e : `${e.show}: ${e.error}`,
              )
              .join("\n");
        }
        alert(msg);
      } catch (error) {
        alert(error.message);
      } finally {
        episodesBtn.disabled = false;
        label.textContent = origText;
      }
    });
  }
}
