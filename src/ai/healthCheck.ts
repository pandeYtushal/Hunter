import { storage } from "../shared/storage";

export interface HealthCheckResult {
  name: "AI connectivity" | "Storage access" | "Content script availability" | "Background worker availability";
  ok: boolean;
  message: string;
}

export const runStartupDiagnostics = async (): Promise<HealthCheckResult[]> => {
  const results: HealthCheckResult[] = [];

  try {
    await storage.get("settings");
    results.push({ name: "Storage access", ok: true, message: "Storage is readable." });
  } catch (error) {
    results.push({
      name: "Storage access",
      ok: false,
      message: error instanceof Error ? error.message : "Storage read failed."
    });
  }

  try {
    const response = await chrome.runtime.sendMessage({ type: "PING" }).catch(() => undefined);
    results.push({
      name: "Background worker availability",
      ok: Boolean(response?.ok),
      message: response?.ok ? "Background worker responded." : "Background worker did not respond."
    });
  } catch (error) {
    results.push({
      name: "Background worker availability",
      ok: false,
      message: error instanceof Error ? error.message : "Background worker check failed."
    });
  }

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const response = tab?.id ? await chrome.tabs.sendMessage(tab.id, { type: "PING" }).catch(() => undefined) : undefined;
    results.push({
      name: "Content script availability",
      ok: Boolean(response?.ok),
      message: response?.ok ? "Content script responded." : "Content script is not active on the current tab."
    });
  } catch (error) {
    results.push({
      name: "Content script availability",
      ok: false,
      message: error instanceof Error ? error.message : "Content script check failed."
    });
  }

  const [settings, apiKeys] = await Promise.all([
    storage.get("settings"),
    storage.get("apiKeys")
  ]);
  const hasKey = Boolean(
    apiKeys.apiKey?.trim() ||
    apiKeys.openaiApiKey?.trim() ||
    apiKeys.anthropicApiKey?.trim() ||
    apiKeys.groqApiKey?.trim() ||
    apiKeys.openrouterApiKey?.trim() ||
    apiKeys.deepseekApiKey?.trim() ||
    (settings.provider === "ollama" && settings.ollamaUrl?.trim())
  );

  results.push({
    name: "AI connectivity",
    ok: hasKey,
    message: hasKey
      ? "At least one AI provider key or service URL is configured."
      : "No AI provider keys or service URLs configured."
  });

  return results;
};
