// ========================================================
// login.js - Login and registration page
// ========================================================

import { login, register } from "./services/authService.js";

/**
 * Initializes the login/register form event listeners
 */
function initLoginForm() {
  // Tab switching
  document.querySelectorAll(".auth-tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      document
        .querySelectorAll(".auth-tab")
        .forEach((t) => t.classList.remove("active"));
      tab.classList.add("active");

      const tabName = tab.dataset.tab;
      const loginForm = document.getElementById("login-form");
      const registerForm = document.getElementById("register-form");

      if (tabName === "login") {
        loginForm.classList.add("active-form");
        registerForm.classList.remove("active-form");
      } else {
        loginForm.classList.remove("active-form");
        registerForm.classList.add("active-form");
      }
    });
  });

  // Login form handler
  document
    .getElementById("login-form")
    .addEventListener("submit", async (e) => {
      e.preventDefault();
      const email = document.getElementById("login-email").value;
      const password = document.getElementById("login-password").value;
      const errorDiv = document.getElementById("login-error");

      errorDiv.textContent = "";
      const result = await login(email, password);
      if (result.success) {
        // Redirect to home page
        window.location.href = "/";
      } else {
        errorDiv.textContent = result.error || "Login failed";
      }
    });

  // Register form handler
  document
    .getElementById("register-form")
    .addEventListener("submit", async (e) => {
      e.preventDefault();
      const email = document.getElementById("register-email").value;
      const password = document.getElementById("register-password").value;
      const passwordConfirm = document.getElementById(
        "register-password-confirm"
      ).value;
      const errorDiv = document.getElementById("register-error");

      errorDiv.textContent = "";

      if (password !== passwordConfirm) {
        errorDiv.textContent = "Passwords do not match";
        return;
      }

      if (password.length < 6) {
        errorDiv.textContent = "Password must be at least 6 characters";
        return;
      }

      const result = await register(email, password);
      if (result.success) {
        errorDiv.textContent =
          "Registration successful! Please check your email to verify your account.";
        // Switch to login tab after successful registration
        setTimeout(() => {
          document.querySelector('[data-tab="login"]').click();
        }, 2000);
      } else {
        errorDiv.textContent = result.error || "Registration failed";
      }
    });
}

// Initialize on page load
initLoginForm();
