import { useEffect } from "react";
import { sendMessageToActiveTab, sendRuntimeMessage } from "../../shared/chromeRuntime";
import { applyDocumentTheme } from "../../shared/theme";
import type { ThemeMode } from "../../shared/types/messages";
import type { AgentSettings } from "../../shared/types/storage";
import { useChromeStorage } from "./useChromeStorage";

export const useTheme = () => {
  const { value: settings, setValue: setSettings, isLoading } = useChromeStorage("settings");

  useEffect(() => {
    if (!settings) {
      return;
    }

    applyDocumentTheme(settings.theme);

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const listener = () => applyDocumentTheme(settings.theme);
    media.addEventListener("change", listener);

    return () => media.removeEventListener("change", listener);
  }, [settings]);

  const setTheme = async (theme: ThemeMode) => {
    if (!settings) {
      return;
    }

    const nextSettings: AgentSettings = { ...settings, theme };
    await setSettings(nextSettings);
    applyDocumentTheme(theme);
    await sendRuntimeMessage({ type: "THEME_CHANGED", theme }).catch(() => undefined);
    await sendMessageToActiveTab({ type: "THEME_CHANGED", theme }).catch(() => undefined);
  };

  return { theme: settings?.theme ?? "system", setTheme, settings, setSettings, isLoading };
};
