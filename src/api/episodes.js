import { getToken } from "../services/auth.js";
import { getSession } from "../stores/userStore.js";

/**
 * Marks or unmarks episodes as watched via a Netlify function
 * and synchronizes the change with Trakt.
 *
 * @param {string} showId - Internal show UUID.
 * @param {Array} episodeIds - List of internal episode UUIDs.
 * @param {boolean} markAsWatched - true to mark, false to unmark.
 * @returns {Promise<boolean>} True on success.
 */
export async function markEpisodes(showId, episodeIds, markAsWatched) {
  const token = await getToken();
  const { access_token } = getSession();

  const res = await fetch("/.netlify/functions/markEpisodes", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${access_token}`,
    },
    body: JSON.stringify({
      token,
      action: markAsWatched ? "mark" : "unmark",
      showId,
      episodeIds,
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`markEpisodes failed: ${res.status} ${text}`);
  }

  return true;
}
