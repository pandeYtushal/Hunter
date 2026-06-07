import { useEffect, useState } from "react";
import { Header } from "./components/Header";
import { useChromeStorage } from "./hooks/useChromeStorage";
import { useTheme } from "./hooks/useTheme";
import { sendMessageToActiveTab } from "../shared/chromeRuntime";
import type { PageSnapshot, SidebarStatus } from "../shared/types/messages";

const emptySnapshot: PageSnapshot = {
  title: "No page connected",
  url: "",
  host: "Active tab",
  selectedText: "",
  description: ""
};

export const App = () => {
  const [snapshot, setSnapshot] = useState<PageSnapshot>(emptySnapshot);
  const [sidebarStatus, setSidebarStatus] = useState<SidebarStatus>("closed");
  const [error, setError] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const { theme, setTheme, settings, setSettings } = useTheme();
  const { value: applications } = useChromeStorage("applications");
  
  const hasApiKey = Boolean(
    settings?.provider === "openai"
      ? settings.openaiApiKey?.trim()
      : settings?.provider === "anthropic"
      ? settings.anthropicApiKey?.trim()
      : settings?.provider === "groq"
      ? settings.groqApiKey?.trim()
      : settings?.apiKey?.trim()
  );

  // Fetch active tab snapshot & read current sidebar status
  useEffect(() => {
    sendMessageToActiveTab({ type: "GET_PAGE_SNAPSHOT" })
      .then((response) => {
        if (response && response.snapshot) {
          setSnapshot(response.snapshot);
          setError("");
        } else {
          setError("Refresh the tab or navigate to a job post to enable the assistant.");
        }
      })
      .catch(() => {
        setError("Refresh the tab or navigate to a job post to enable the assistant.");
      });

    chrome.storage.sync.get("sidebarOpen").then((result) => {
      setSidebarStatus(result.sidebarOpen ? "open" : "closed");
    });

    const storageListener = (changes: Record<string, chrome.storage.StorageChange>, areaName: string) => {
      if (areaName === "sync" && changes.sidebarOpen) {
        setSidebarStatus(changes.sidebarOpen.newValue ? "open" : "closed");
      }
    };
    chrome.storage.onChanged.addListener(storageListener);
    return () => chrome.storage.onChanged.removeListener(storageListener);
  }, []);

  useEffect(() => {
    if (settings) {
      const activeKey =
        settings.provider === "openai"
          ? settings.openaiApiKey
          : settings.provider === "anthropic"
          ? settings.anthropicApiKey
          : settings.provider === "groq"
          ? settings.groqApiKey
          : settings.apiKey;
      if (!activeKey?.trim()) {
        setShowSettings(true);
      }
    }
  }, [settings]);

  const handleToggleSidebar = async () => {
    try {
      const type = sidebarStatus === "open" ? "CLOSE_SIDEBAR" : "OPEN_SIDEBAR";
      const response = await sendMessageToActiveTab({ type });
      setSidebarStatus(response.status);
      setError("");
    } catch {
      setError("Please refresh this tab, then try toggling the sidebar.");
    }
  };

  const isConnected = !!(snapshot?.url && !snapshot.url.startsWith("chrome://"));

  return (
    <main className="flex min-h-[380px] w-[340px] flex-col bg-white text-slate-800 select-none font-sans dark:bg-zinc-950 dark:text-zinc-100">
      <Header theme={theme} onThemeChange={setTheme} />

      <div className="flex flex-1 flex-col justify-between p-4 gap-4">
        {/* Status Area */}
        {isConnected ? (
          <div className="rounded-lg border border-slate-100 bg-slate-50/50 p-3 shadow-[0_1px_2px_rgba(0,0,0,0.01)] dark:border-zinc-800 dark:bg-black/40">
            <div className="flex items-center gap-2 mb-1">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <p className="font-mono text-[9px] uppercase tracking-widest text-slate-400">
                Connected Tab
              </p>
            </div>
            <h2 className="truncate text-xs font-semibold text-slate-850 dark:text-zinc-100" title={snapshot.title}>
              {snapshot.title}
            </h2>
            <p className="font-mono text-[9px] text-slate-400 mt-0.5 dark:text-zinc-500">{snapshot.host}</p>
          </div>
        ) : (
          <div className="rounded-lg border border-slate-100 bg-slate-50/50 p-4 text-center dark:border-zinc-800 dark:bg-black/40">
            <p className="font-mono text-[9px] uppercase tracking-widest text-slate-400 mb-1">
              Connection Idle
            </p>
            <p className="text-xs leading-relaxed text-slate-500 dark:text-zinc-400">
              Open the AI chat on any normal webpage.
            </p>
          </div>
        )}

        {/* Action button */}
        <div className="flex flex-col gap-2">
          {!hasApiKey && (
            <p className="text-center font-mono text-[9px] text-amber-700 leading-normal bg-amber-500/10 py-1.5 px-2.5 rounded border border-amber-500/20 dark:text-amber-300 dark:bg-amber-400/10 dark:border-amber-400/20">
              Add your Gemini API key before using AI chat.
            </p>
          )}

          <button
            onClick={handleToggleSidebar}
            className="flex h-10 w-full items-center justify-center rounded-lg bg-slate-900 text-white hover:bg-slate-850 transition active:scale-[0.98] text-xs font-semibold uppercase tracking-wider font-sans shadow-sm dark:bg-white dark:text-black dark:hover:bg-zinc-200"
          >
            {sidebarStatus === "open" ? "Close AI Chat" : "Open AI Chat"}
          </button>

          {error && !isConnected && (
            <p className="text-center font-mono text-[9px] text-indigo-600 leading-normal bg-indigo-500/5 py-1.5 px-2.5 rounded border border-indigo-500/10 dark:text-indigo-400 dark:bg-indigo-400/10 dark:border-indigo-400/20">
              Use this on a normal website. Chrome blocks sidebars on internal pages like chrome://extensions.
            </p>
          )}
        </div>

        {/* Stats and status row */}
        <div className="flex items-center justify-between border-t border-slate-100 pt-3 text-[10px] text-slate-450 dark:border-zinc-800 dark:text-zinc-500">
          <span className="font-mono uppercase tracking-wider text-slate-400">
            {applications?.length ?? 0} jobs saved
          </span>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="font-mono uppercase tracking-wider text-indigo-600 hover:text-indigo-700 transition dark:text-indigo-400 dark:hover:text-indigo-300"
          >
            {showSettings ? "Close Setup" : "API Config"}
          </button>
        </div>

        {/* Collapsible config panel */}
        {showSettings && settings && (
          <div className="space-y-3.5 border-t border-slate-100 pt-3 animate-fade-in dark:border-zinc-800">
            <div className="space-y-1.5">
              <label className="font-mono text-[9px] uppercase tracking-wider text-slate-400">
                AI Provider
              </label>
              <select
                value={settings.provider || "gemini"}
                onChange={(e) => setSettings({ ...settings, provider: e.target.value as any })}
                className="hunter-input h-8 w-full rounded border border-slate-200 bg-white px-2.5 text-xs outline-none dark:border-zinc-800 dark:bg-black"
              >
                <option value="gemini">Google Gemini</option>
                <option value="openai">OpenAI (ChatGPT)</option>
                <option value="anthropic">Anthropic Claude</option>
                <option value="groq">Groq (Llama 3)</option>
              </select>
            </div>

            {/* Gemini Key Input */}
            {(settings.provider === "gemini" || !settings.provider) && (
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="font-mono text-[9px] uppercase tracking-wider text-slate-400">
                    Gemini API Key
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowKey(!showKey)}
                    className="font-mono text-[8px] uppercase tracking-wider text-slate-400 hover:text-slate-900"
                  >
                    {showKey ? "Hide" : "Show"}
                  </button>
                </div>
                <input
                  type={showKey ? "text" : "password"}
                  value={settings.apiKey || ""}
                  onChange={(e) => setSettings({ ...settings, apiKey: e.target.value })}
                  placeholder="AI Studio API Key"
                  className="hunter-input h-8 w-full rounded border border-slate-200 bg-white px-2.5 text-xs outline-none dark:border-zinc-800 dark:bg-black"
                />
                <p className="font-sans text-[10px] text-slate-400 leading-normal">
                  Keys can be generated for free at{" "}
                  <a
                    href="https://aistudio.google.com/"
                    target="_blank"
                    rel="noreferrer"
                    className="text-indigo-600 font-semibold underline hover:text-indigo-700"
                  >
                    AI Studio
                  </a>.
                </p>
              </div>
            )}

            {/* OpenAI Key Input */}
            {settings.provider === "openai" && (
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="font-mono text-[9px] uppercase tracking-wider text-slate-400">
                    OpenAI API Key
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowKey(!showKey)}
                    className="font-mono text-[8px] uppercase tracking-wider text-slate-400 hover:text-slate-900"
                  >
                    {showKey ? "Hide" : "Show"}
                  </button>
                </div>
                <input
                  type={showKey ? "text" : "password"}
                  value={settings.openaiApiKey || ""}
                  onChange={(e) => setSettings({ ...settings, openaiApiKey: e.target.value })}
                  placeholder="sk-..."
                  className="hunter-input h-8 w-full rounded border border-slate-200 bg-white px-2.5 text-xs outline-none dark:border-zinc-800 dark:bg-black"
                />
                <p className="font-sans text-[10px] text-slate-400 leading-normal">
                  Keys can be managed at{" "}
                  <a
                    href="https://platform.openai.com/api-keys"
                    target="_blank"
                    rel="noreferrer"
                    className="text-indigo-600 font-semibold underline hover:text-indigo-700"
                  >
                    OpenAI API Keys
                  </a>.
                </p>
              </div>
            )}

            {/* Anthropic Key Input */}
            {settings.provider === "anthropic" && (
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="font-mono text-[9px] uppercase tracking-wider text-slate-400">
                    Anthropic API Key
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowKey(!showKey)}
                    className="font-mono text-[8px] uppercase tracking-wider text-slate-400 hover:text-slate-900"
                  >
                    {showKey ? "Hide" : "Show"}
                  </button>
                </div>
                <input
                  type={showKey ? "text" : "password"}
                  value={settings.anthropicApiKey || ""}
                  onChange={(e) => setSettings({ ...settings, anthropicApiKey: e.target.value })}
                  placeholder="sk-ant-..."
                  className="hunter-input h-8 w-full rounded border border-slate-200 bg-white px-2.5 text-xs outline-none dark:border-zinc-800 dark:bg-black"
                />
                <p className="font-sans text-[10px] text-slate-400 leading-normal">
                  Keys can be managed at{" "}
                  <a
                    href="https://console.anthropic.com/"
                    target="_blank"
                    rel="noreferrer"
                    className="text-indigo-600 font-semibold underline hover:text-indigo-700"
                  >
                    Anthropic Console
                  </a>.
                </p>
              </div>
            )}

            {/* Groq Key Input */}
            {settings.provider === "groq" && (
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="font-mono text-[9px] uppercase tracking-wider text-slate-400">
                    Groq API Key
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowKey(!showKey)}
                    className="font-mono text-[8px] uppercase tracking-wider text-slate-400 hover:text-slate-900"
                  >
                    {showKey ? "Hide" : "Show"}
                  </button>
                </div>
                <input
                  type={showKey ? "text" : "password"}
                  value={settings.groqApiKey || ""}
                  onChange={(e) => setSettings({ ...settings, groqApiKey: e.target.value })}
                  placeholder="gsk_..."
                  className="hunter-input h-8 w-full rounded border border-slate-200 bg-white px-2.5 text-xs outline-none dark:border-zinc-800 dark:bg-black"
                />
                <p className="font-sans text-[10px] text-slate-400 leading-normal">
                  Keys can be managed at{" "}
                  <a
                    href="https://console.groq.com/"
                    target="_blank"
                    rel="noreferrer"
                    className="text-indigo-600 font-semibold underline hover:text-indigo-700"
                  >
                    Groq Console
                  </a>.
                </p>
              </div>
            )}

            <div className="flex items-center justify-between">
              <span className="font-mono text-[9px] uppercase tracking-wider text-slate-400">
                Sidebar Layout Mode
              </span>
              <button
                onClick={() => setSettings({ ...settings, sidebarPinned: !settings.sidebarPinned })}
                className={`font-mono text-[9px] uppercase tracking-wider rounded border px-2 py-0.5 transition ${
                  settings.sidebarPinned
                    ? "border-indigo-600 bg-indigo-600/5 text-indigo-600 font-semibold"
                    : "border-slate-200 text-slate-450 hover:border-slate-800 hover:text-slate-800 dark:border-zinc-800 dark:text-zinc-500 dark:hover:border-zinc-500 dark:hover:text-zinc-200"
                }`}
              >
                {settings.sidebarPinned ? "Pinned" : "Floating"}
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
};
