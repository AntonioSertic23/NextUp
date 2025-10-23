// ========================================================
// pages/upcoming.js - Render Upcoming Episodes Page
// ========================================================

/**
 * Renders the upcoming episodes page.
 * Fetches a list of upcoming shows (currently dummy data) and displays them.
 * Adds click events to navigate to each show's details.
 *
 * @param {HTMLElement} main - The container element where content is rendered
 * @returns {Promise<void>}
 */
export async function renderUpcoming(main) {
  // Create upcoming container
  const upcomingDiv = document.createElement("div");
  upcomingDiv.classList.add("quick-upcoming");
  upcomingDiv.innerHTML = `
    <h3>Upcoming...</h3>
  `;

  // Append to main container
  main.appendChild(upcomingDiv);
}
