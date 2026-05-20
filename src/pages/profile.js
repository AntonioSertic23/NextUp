import { renderProfile } from "../ui/profile.js";

/**
 * Renders the Profile page.
 * @param {HTMLElement} main - Main app container.
 */
export async function renderProfilePage(main) {
  const profileDiv = document.createElement("div");
  profileDiv.id = "profile-container";
  profileDiv.innerHTML = "<p class='loading-text'>Loading profile...</p>";
  main.appendChild(profileDiv);

  await renderProfile();
}
