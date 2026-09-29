export type Theme = "vga" | "amber";

export const THEME_KEY = "fcos-theme";
export const DEFAULT_THEME: Theme = "vga";

export function getTheme(): Theme {
  const t = document.documentElement.dataset.theme;
  return t === "amber" ? "amber" : DEFAULT_THEME;
}

export function setTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch {
    // storage unavailable — theme still applies for this session
  }
}
