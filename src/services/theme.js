const STORAGE_KEY = "nextup_theme";

export const THEMES = [
  {
    id: "midnight",
    label: "Midnight",
    description: "Default purple accent on dark navy",
  },
  {
    id: "ocean",
    label: "Ocean",
    description: "Cool teal accents",
  },
  {
    id: "ember",
    label: "Ember",
    description: "Warm orange and coral",
  },
  {
    id: "forest",
    label: "Forest",
    description: "Green earth tones",
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
