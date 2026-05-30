import { getUser } from "../stores/userStore.js";
import { getToken, logout } from "../services/auth.js";
import { getSupabaseClient } from "../services/supabase.js";
import {
  connectTraktAccount,
  syncTraktAccount,
  syncNewEpisodes,
} from "../api/sync.js";
import {
  fetchUserLists,
  createList,
  updateList,
  deleteList,
} from "../api/lists.js";
import {
  getProfileNote,
  saveProfileNote,
  listShowNotesWithTitles,
} from "../api/notes.js";
import {
  followUserByEmail,
  unfollowUser,
  getFollowing,
} from "../api/social.js";
import { THEMES, getStoredTheme, applyTheme } from "../services/theme.js";
import {
  setLists,
  invalidateListsCache,
} from "../stores/listsStore.js";

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
  const lists = await fetchUserLists();
  setLists(lists);
  const profileNote = await getProfileNote();
  const showNotes = await listShowNotesWithTitles();
  let following = [];
  try {
    following = await getFollowing();
  } catch {
    following = [];
  }

  const themeOptions = THEMES.map(
    (t) =>
      `<button type="button" class="theme-chip ${t.id === getStoredTheme() ? "active" : ""}" data-theme-id="${t.id}">
        <span class="theme-chip-label">${escapeHtml(t.label)}</span>
        <span class="theme-chip-desc">${escapeHtml(t.description)}</span>
      </button>`,
  ).join("");

  const listsHtml = lists
    .map(
      (list) => `
    <div class="profile-list-row" data-list-id="${list.id}">
      <div class="profile-list-info">
        <strong>${escapeHtml(list.name)}</strong>
        ${list.is_default ? '<span class="profile-list-badge">Default</span>' : ""}
        ${list.description ? `<p class="profile-list-desc">${escapeHtml(list.description)}</p>` : ""}
      </div>
      ${
        !list.is_default
          ? `<div class="profile-list-actions">
              <button type="button" class="btn-ghost btn-sm profile-list-edit">Edit</button>
              <button type="button" class="btn-ghost btn-sm profile-list-delete">Delete</button>
            </div>`
          : ""
      }
    </div>`,
    )
    .join("");

  const showNotesHtml = showNotes.length
    ? showNotes
        .map(
          (n) => `
      <a href="#show?traktIdentifier=${escapeHtml(n.shows.slug_id)}" class="profile-note-card">
        <img src="https://${escapeHtml(n.shows.image_poster || "")}" alt="" class="profile-note-poster" />
        <div>
          <strong>${escapeHtml(n.shows.title)}</strong>
          <p class="profile-note-preview">${escapeHtml((n.content || "").slice(0, 120))}${(n.content || "").length > 120 ? "…" : ""}</p>
        </div>
      </a>`,
        )
        .join("")
    : `<p class="profile-empty-hint">No show notes yet. Add notes on any show page.</p>`;

  const followingHtml = following.length
    ? following
        .map(
          (f) => `
      <div class="profile-follow-row" data-user-id="${f.userId}">
        <div>
          <strong>${escapeHtml(f.displayName)}</strong>
          <p class="profile-follow-email">${escapeHtml(f.email || "")}</p>
        </div>
        <div class="profile-follow-actions">
          <a href="#user?userId=${f.userId}" class="btn-secondary btn-sm">View stats</a>
          <button type="button" class="btn-ghost btn-sm profile-unfollow">Unfollow</button>
        </div>
      </div>`,
        )
        .join("")
    : `<p class="profile-empty-hint">You are not following anyone yet.</p>`;

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
      <h2 class="profile-section-title">Appearance</h2>
      <div class="theme-picker">${themeOptions}</div>
    </section>

    <section class="profile-section">
      <h2 class="profile-section-title">My Lists</h2>
      <p class="profile-section-hint">Filter your home watchlist by list. The default list is used when adding shows unless you pick another on Home.</p>
      <div class="profile-lists">${listsHtml}</div>
      <div class="profile-inline-form">
        <input type="text" id="new-list-name" class="profile-input" placeholder="New list name" maxlength="80" />
        <button type="button" class="btn-secondary" id="create-list-btn">Create list</button>
      </div>
    </section>

    <section class="profile-section">
      <h2 class="profile-section-title">Notes</h2>
      <label class="profile-label" for="profile-note-input">General note</label>
      <textarea id="profile-note-input" class="show-notes-textarea" rows="3" placeholder="Private notes about your watching…">${escapeHtml(profileNote?.content || "")}</textarea>
      <button type="button" class="btn-secondary" id="save-profile-note">Save general note</button>
      <h3 class="profile-subheading">Show notes</h3>
      <div class="profile-show-notes">${showNotesHtml}</div>
    </section>

    <section class="profile-section">
      <h2 class="profile-section-title">Following</h2>
      <p class="profile-section-hint">Follow friends by email to view their statistics.</p>
      <div class="profile-inline-form">
        <input type="email" id="follow-email" class="profile-input" placeholder="friend@email.com" />
        <button type="button" class="btn-secondary" id="follow-btn">Follow</button>
      </div>
      <div class="profile-following-list">${followingHtml}</div>
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
  setupListsSection(container);
  setupNotesSection(container);
  setupThemesSection(container);
  setupFollowingSection(container);
}

function setupThemesSection(container) {
  container.querySelectorAll(".theme-chip").forEach((chip) => {
    chip.addEventListener("click", () => {
      const id = chip.dataset.themeId;
      applyTheme(id);
      container.querySelectorAll(".theme-chip").forEach((c) => {
        c.classList.toggle("active", c.dataset.themeId === id);
      });
    });
  });
}

function setupListsSection(container) {
  container.querySelector("#create-list-btn")?.addEventListener("click", async () => {
    const input = container.querySelector("#new-list-name");
    const name = input?.value?.trim();
    if (!name) return;
    try {
      await createList(name);
      invalidateListsCache();
      await renderProfile();
    } catch (err) {
      alert(err.message);
    }
  });

  container.querySelectorAll(".profile-list-edit").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const row = btn.closest(".profile-list-row");
      const listId = row?.dataset.listId;
      const newName = prompt("List name:");
      if (!newName?.trim() || !listId) return;
      try {
        await updateList(listId, { name: newName.trim() });
        invalidateListsCache();
        await renderProfile();
      } catch (err) {
        alert(err.message);
      }
    });
  });

  container.querySelectorAll(".profile-list-delete").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const row = btn.closest(".profile-list-row");
      const listId = row?.dataset.listId;
      if (!listId || !confirm("Delete this list? Shows stay in the database.")) return;
      try {
        await deleteList(listId);
        invalidateListsCache();
        await renderProfile();
      } catch (err) {
        alert(err.message);
      }
    });
  });
}

function setupNotesSection(container) {
  container.querySelector("#save-profile-note")?.addEventListener("click", async () => {
    const input = container.querySelector("#profile-note-input");
    try {
      await saveProfileNote(input?.value ?? "");
      alert("Note saved");
    } catch (err) {
      alert(err.message);
    }
  });
}

function setupFollowingSection(container) {
  container.querySelector("#follow-btn")?.addEventListener("click", async () => {
    const input = container.querySelector("#follow-email");
    const email = input?.value?.trim();
    if (!email) return;
    try {
      await followUserByEmail(email);
      input.value = "";
      await renderProfile();
    } catch (err) {
      alert(err.message);
    }
  });

  container.querySelectorAll(".profile-unfollow").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const userId = btn.closest(".profile-follow-row")?.dataset.userId;
      if (!userId) return;
      try {
        await unfollowUser(userId);
        await renderProfile();
      } catch (err) {
        alert(err.message);
      }
    });
  });
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
