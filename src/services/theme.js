const STORAGE_KEY = "nextup_theme";
const DEFAULT_DARK = "midnight";
const DEFAULT_LIGHT = "daylight";

export const THEMES = [
  {
    id: "midnight",
    label: "Midnight",
    description: "Dark navy with purple & pink accents",
  },
  {
    id: "ocean",
    label: "Ocean",
    description: "Deep blue with bright teal & sky",
  },
  {
    id: "ember",
    label: "Ember",
    description: "Warm charcoal with orange & gold",
  },
  {
    id: "forest",
    label: "Forest",
    description: "Rich green with mint highlights",
  },
  {
    id: "daylight",
    label: "Daylight",
    description: "Light background with violet accents",
  },
];

const isKnown = (id) => THEMES.some((t) => t.id === id);

function readStored() {
  try {
    const id = localStorage.getItem(STORAGE_KEY);
    return isKnown(id) ? id : null;
  } catch {
    return null;
  }
}

function systemPrefersLight() {
  return window.matchMedia?.("(prefers-color-scheme: light)").matches ?? false;
}

/** Theme the user picked, or the one matching the system setting. */
export function getStoredTheme() {
  return readStored() ?? (systemPrefersLight() ? DEFAULT_LIGHT : DEFAULT_DARK);
}

function setDocumentTheme(id) {
  document.documentElement.setAttribute("data-theme", id);
  // Browser/PWA chrome colour follows the page background.
  const bg = getComputedStyle(document.documentElement)
    .getPropertyValue("--nav-bg")
    .trim();
  if (bg) {
    document
      .querySelectorAll('meta[name="theme-color"]')
      .forEach((meta) => meta.setAttribute("content", bg));
  }
}

/** Applies a theme and remembers it as the user's choice. */
export function applyTheme(themeId) {
  const id = isKnown(themeId) ? themeId : DEFAULT_DARK;
  setDocumentTheme(id);
  try {
    localStorage.setItem(STORAGE_KEY, id);
  } catch {
    /* storage unavailable: theme still applies for this visit */
  }
}

export function initTheme() {
  setDocumentTheme(getStoredTheme());

  // Follow system light/dark changes until the user picks a theme.
  window
    .matchMedia?.("(prefers-color-scheme: light)")
    .addEventListener?.("change", () => {
      if (!readStored()) setDocumentTheme(getStoredTheme());
    });
}
