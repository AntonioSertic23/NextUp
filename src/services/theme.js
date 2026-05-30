const STORAGE_KEY = "nextup_theme";

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
    description: "Light gray background, dark text",
  },
];

export function getStoredTheme() {
  const id = localStorage.getItem(STORAGE_KEY);
  return THEMES.some((t) => t.id === id) ? id : "midnight";
}

export function applyTheme(themeId) {
  const id = THEMES.some((t) => t.id === themeId) ? themeId : "midnight";
  document.documentElement.setAttribute("data-theme", id);
  localStorage.setItem(STORAGE_KEY, id);
}

export function initTheme() {
  applyTheme(getStoredTheme());
}
