/**
 * Reads a Supabase auth redirect.
 * Recovery uses the implicit hash (`type=recovery`). A `code` query param is
 * only treated as recovery on the login page so Trakt's `?code=` is left alone.
 *
 * @param {string} href
 * @returns {{ kind: "recovery"|"code"|"none", accessToken?: string, refreshToken?: string, code?: string }}
 */
export function parseAuthCallback(href) {
  let url;
  try {
    url = new URL(href);
  } catch {
    return { kind: "none" };
  }

  const hash = new URLSearchParams(url.hash.replace(/^#/, ""));
  const type = hash.get("type") || url.searchParams.get("type");
  const accessToken = hash.get("access_token");
  const refreshToken = hash.get("refresh_token");

  if (type === "recovery" && accessToken && refreshToken) {
    return { kind: "recovery", accessToken, refreshToken };
  }

  const code = url.searchParams.get("code");
  if (code && url.pathname.endsWith("/login.html")) {
    return { kind: "code", code };
  }

  return { kind: "none" };
}
