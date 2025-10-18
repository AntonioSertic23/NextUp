/**
 * Fetches the Trakt Client ID from a Netlify serverless function.
 */
async function fetchClientId() {
  const res = await fetch("/.netlify/functions/getClientId");
  const data = await res.json();
  return data.clientId;
}

/**
 * Checks if user is logged in (token exists)
 * @returns {string|null} Access token or null
 */
export function getToken() {
  return localStorage.getItem("trakt_token");
}

/**
 * Starts login process by redirecting to Trakt
 */
export function login() {
  fetchClientId().then((clientId) => {
    // Automatically use current origin as redirect URI
    const redirectUri = window.location.origin;

    const AUTH_URL = `https://trakt.tv/oauth/authorize?response_type=token&client_id=${clientId}&redirect_uri=${encodeURIComponent(
      redirectUri
    )}`;

    // Redirect the user to Trakt OAuth
    window.location.href = AUTH_URL;
  });
}

/**
 * Logs user out by clearing token and reloading page
 */
export function logout() {
  localStorage.removeItem("trakt_token");
  window.location.reload();
}

/**
 * Handles redirect back from Trakt (token in URL)
 */
export function handleAuthRedirect() {
  const hash = window.location.hash;
  if (hash.includes("access_token")) {
    const params = new URLSearchParams(hash.replace("#", ""));
    const token = params.get("access_token");

    if (token) {
      localStorage.setItem("trakt_token", token);
      console.log("Logged in successfully");
    }

    // Clean up URL (remove #access_token part)
    window.history.replaceState({}, document.title, "/");
  }
}
