/**
 * @module login
 *
 * Handles the login / register page.
 *
 * - Checks if the user is already authenticated (redirect to /)
 * - Tab switching between login and register forms
 * - Form validation with inline feedback
 * - Loading states during async operations
 * - Password visibility toggle
 */

import {
  consumePasswordRecovery,
  login,
  logout,
  register,
  requestPasswordReset,
  updatePassword,
} from "./services/auth.js";
import { getSupabaseClient } from "./services/supabase.js";
import { registerServiceWorker } from "./pwa/registerServiceWorker.js";
import { initTheme } from "./services/theme.js";

initTheme();
registerServiceWorker();

// ————————————————————————————————————————————————————
// Redirect if already authenticated
// ————————————————————————————————————————————————————

(async () => {
  const recovery = await consumePasswordRecovery();
  if (recovery.active) {
    initLoginPage();
    showAuthPanel("reset");
    return;
  }

  if (recovery.error) {
    initLoginPage();
    showMessage(
      document.getElementById("login-message"),
      recovery.error,
      "error",
    );
    return;
  }

  try {
    const SUPABASE = await getSupabaseClient();
    const { data } = await SUPABASE.auth.getUser();
    if (data?.user) {
      window.location.replace("/");
      return;
    }
  } catch {
    // No session — stay on login page
  }

  initLoginPage();
})();

// ————————————————————————————————————————————————————
// Page initialization
// ————————————————————————————————————————————————————

function initLoginPage() {
  initTabs();
  initPasswordToggles();
  initLoginForm();
  initRegisterForm();
  initForgotForm();
  initResetForm();
}

// ————————————————————————————————————————————————————
// Tab switching
// ————————————————————————————————————————————————————

const AUTH_PANELS = ["login", "register", "forgot", "reset"];

function showAuthPanel(name) {
  document.querySelectorAll(".auth-tab").forEach((tab) => {
    tab.classList.toggle("active", tab.dataset.tab === name);
  });

  const tabs = document.querySelector(".auth-tabs");
  if (tabs) tabs.hidden = name === "forgot" || name === "reset";

  for (const panel of AUTH_PANELS) {
    document
      .getElementById(`${panel}-form`)
      ?.classList.toggle("active-form", panel === name);
  }

  clearMessages();
}

function initTabs() {
  document.querySelectorAll(".auth-tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      showAuthPanel(tab.dataset.tab);
    });
  });

  document.querySelectorAll("[data-auth-panel]").forEach((btn) => {
    btn.addEventListener("click", () => {
      showAuthPanel(btn.dataset.authPanel);
    });
  });
}

// ————————————————————————————————————————————————————
// Password visibility toggle
// ————————————————————————————————————————————————————

function initPasswordToggles() {
  document.querySelectorAll(".password-toggle").forEach((btn) => {
    btn.addEventListener("click", () => {
      const input = btn.parentElement.querySelector("input");
      const isPassword = input.type === "password";

      input.type = isPassword ? "text" : "password";
      btn.querySelector(".eye-icon").style.display = isPassword ? "none" : "block";
      btn.querySelector(".eye-off-icon").style.display = isPassword ? "block" : "none";
      btn.setAttribute("aria-label", isPassword ? "Hide password" : "Show password");
    });
  });
}

// ————————————————————————————————————————————————————
// Login form
// ————————————————————————————————————————————————————

function initLoginForm() {
  const form = document.getElementById("login-form");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = document.getElementById("login-email").value.trim();
    const password = document.getElementById("login-password").value;
    const messageEl = document.getElementById("login-message");

    if (!email || !password) {
      showMessage(messageEl, "Please fill in all fields.", "error");
      return;
    }

    setFormLoading(form, true);
    clearMessages();

    const result = await login(email, password);

    if (result.success) {
      showMessage(messageEl, "Login successful! Redirecting...", "success");
      window.location.replace("/");
    } else {
      setFormLoading(form, false);
      showMessage(messageEl, result.error || "Login failed. Please try again.", "error");
    }
  });
}

// ————————————————————————————————————————————————————
// Register form
// ————————————————————————————————————————————————————

function initRegisterForm() {
  const form = document.getElementById("register-form");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = document.getElementById("register-email").value.trim();
    const password = document.getElementById("register-password").value;
    const passwordConfirm = document.getElementById("register-password-confirm").value;
    const messageEl = document.getElementById("register-message");

    if (!email || !password || !passwordConfirm) {
      showMessage(messageEl, "Please fill in all fields.", "error");
      return;
    }

    if (password.length < 6) {
      showMessage(messageEl, "Password must be at least 6 characters.", "error");
      return;
    }

    if (password !== passwordConfirm) {
      showMessage(messageEl, "Passwords do not match.", "error");
      return;
    }

    setFormLoading(form, true);
    clearMessages();

    const result = await register(email, password);

    setFormLoading(form, false);

    if (result.success) {
      showMessage(
        messageEl,
        "Account created! Check your email to verify, then log in.",
        "success"
      );

      setTimeout(() => {
        document.querySelector('[data-tab="login"]').click();
      }, 3000);
    } else {
      showMessage(messageEl, result.error || "Registration failed. Please try again.", "error");
    }
  });
}

// ————————————————————————————————————————————————————
// Forgot password
// ————————————————————————————————————————————————————

function initForgotForm() {
  document.getElementById("forgot-password-btn").addEventListener("click", () => {
    const email = document.getElementById("login-email").value.trim();
    if (email) document.getElementById("forgot-email").value = email;
    showAuthPanel("forgot");
  });

  const form = document.getElementById("forgot-form");
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = document.getElementById("forgot-email").value.trim();
    const messageEl = document.getElementById("forgot-message");

    if (!email) {
      showMessage(messageEl, "Please enter your email.", "error");
      return;
    }

    setFormLoading(form, true);
    clearMessages();

    const result = await requestPasswordReset(email);
    setFormLoading(form, false);

    const unknownUser = /user not found|unable to find user/i.test(result.error || "");
    if (result.success || unknownUser) {
      showMessage(
        messageEl,
        "If an account exists for that email, we sent a reset link.",
        "success",
      );
      return;
    }

    showMessage(messageEl, result.error || "Could not send reset email.", "error");
  });
}

// ————————————————————————————————————————————————————
// New password (opened from the email link)
// ————————————————————————————————————————————————————

function initResetForm() {
  document.getElementById("reset-cancel").addEventListener("click", () => {
    logout();
  });

  const form = document.getElementById("reset-form");
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const password = document.getElementById("reset-password").value;
    const passwordConfirm = document.getElementById("reset-password-confirm").value;
    const messageEl = document.getElementById("reset-message");

    if (!password || !passwordConfirm) {
      showMessage(messageEl, "Please fill in all fields.", "error");
      return;
    }

    if (password.length < 6) {
      showMessage(messageEl, "Password must be at least 6 characters.", "error");
      return;
    }

    if (password !== passwordConfirm) {
      showMessage(messageEl, "Passwords do not match.", "error");
      return;
    }

    setFormLoading(form, true);
    clearMessages();

    const result = await updatePassword(password);
    if (result.success) {
      showMessage(messageEl, "Password updated. Redirecting...", "success");
      window.location.replace("/");
      return;
    }

    setFormLoading(form, false);
    showMessage(messageEl, result.error || "Could not update password.", "error");
  });
}

// ————————————————————————————————————————————————————
// UI helpers
// ————————————————————————————————————————————————————

function setFormLoading(form, loading) {
  const btn = form.querySelector(".auth-submit-btn");
  const btnText = btn.querySelector(".btn-text");
  const btnSpinner = btn.querySelector(".btn-spinner");
  const inputs = form.querySelectorAll("input, button");

  if (loading) {
    btn.disabled = true;
    btnText.style.display = "none";
    btnSpinner.style.display = "inline-block";
    inputs.forEach((el) => (el.disabled = true));
  } else {
    btn.disabled = false;
    btnText.style.display = "inline";
    btnSpinner.style.display = "none";
    inputs.forEach((el) => (el.disabled = false));
  }
}

function showMessage(el, text, type) {
  el.textContent = text;
  el.className = `auth-message ${type}`;
}

function clearMessages() {
  document.querySelectorAll(".auth-message").forEach((el) => {
    el.textContent = "";
    el.className = "auth-message";
  });
}
