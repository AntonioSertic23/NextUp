// ========================================================
// utils/icons.js - Shared inline SVG icons
//
// Returned as raw SVG strings so they can be dropped directly into
// `innerHTML`. Each SVG uses `currentColor` so its colour follows
// the surrounding button's text colour (CSS owns the styling).
// ========================================================

export const MARK_ICON = `
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path d="M12 5v14M5 12h14" />
  </svg>
`;

export const UNMARK_ICON = `
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path d="M5 12.5l4.5 4.5L20 7" />
  </svg>
`;

export const BOOKMARK_OUTLINE_ICON = `
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path d="M6 4h12a1 1 0 0 1 1 1v16l-7-4.5L5 21V5a1 1 0 0 1 1-1z" />
  </svg>
`;

export const BOOKMARK_FILLED_ICON = `
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M6 3h12a1 1 0 0 1 1 1v18l-7-4.5L5 22V4a1 1 0 0 1 1-1z" />
  </svg>
`;

