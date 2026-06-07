import type { ThemeMode } from "./types/messages";

export const resolveTheme = (theme: ThemeMode): "light" | "dark" => {
  if (theme === "system") {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }

  return theme;
};

export const applyDocumentTheme = (theme: ThemeMode) => {
  const resolved = resolveTheme(theme);
  document.documentElement.classList.toggle("dark", resolved === "dark");
  document.documentElement.dataset.theme = resolved;
};
