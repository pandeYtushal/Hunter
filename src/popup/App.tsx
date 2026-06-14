import { useEffect, useState } from "react";
import { useChromeStorage } from "./hooks/useChromeStorage";
import { useTheme } from "./hooks/useTheme";
import { sendMessageToActiveTab } from "../shared/chromeRuntime";
import type { PageSnapshot, SidebarStatus } from "../shared/types/messages";
import { Settings, Key, X, Bot, AlertCircle, Zap, Sun, Moon } from "lucide-react";
import { Encryption } from "../shared/encryption";

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
  const { settings, setSettings } = useTheme();
  const { value: applications } = useChromeStorage("applications");

  const hasApiKey = Boolean(
    settings?.provider === "openai"
      ? settings.openaiApiKey?.trim()
      : settings?.provider === "anthropic"
        ? settings.anthropicApiKey?.trim()
        : settings?.provider === "groq"
          ? settings.groqApiKey?.trim()
          : settings?.provider === "openrouter"
            ? settings.openrouterApiKey?.trim()
            : settings?.provider === "deepseek"
              ? settings.deepseekApiKey?.trim()
              : settings?.provider === "ollama"
                ? true
                : settings?.apiKey?.trim()
  );

  const decryptedApiKey = Encryption.decrypt(settings?.apiKey || "");
  const decryptedOpenaiApiKey = Encryption.decrypt(settings?.openaiApiKey || "");
  const decryptedAnthropicApiKey = Encryption.decrypt(settings?.anthropicApiKey || "");
  const decryptedGroqApiKey = Encryption.decrypt(settings?.groqApiKey || "");
  const decryptedOpenrouterApiKey = Encryption.decrypt(settings?.openrouterApiKey || "");
  const decryptedDeepseekApiKey = Encryption.decrypt(settings?.deepseekApiKey || "");

  // Fetch active tab snapshot & read current sidebar status
  useEffect(() => {
    sendMessageToActiveTab({ type: "GET_PAGE_SNAPSHOT" })
      .then((response) => {
        if (response && response.snapshot) {
          setSnapshot(response.snapshot);
          setError("");
        } else {
          setError("Navigate to a webpage to connect the assistant.");
        }
      })
      .catch(() => {
        setError("Navigate to a webpage to connect the assistant.");
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

  // Autofill configuration panel on missing API keys
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

  const isConnected = !!(snapshot?.url && !snapshot.url.startsWith("chrome://") && !snapshot.url.startsWith("about:"));

  return (
    <main className="flex h-[360px] w-[350px] flex-col bg-[var(--bg-primary)] text-[var(--text-primary)] font-sans selection:bg-[#ff6b35]/30 select-none overflow-hidden">
      {/* Header */}
      <header className="flex h-11 items-center justify-between border-b border-[var(--border-color)] bg-[var(--bg-primary)] px-3 shrink-0">
        <div className="flex items-center gap-2">
          <div className="flex flex-col">
            <span className="text-[10px] font-bold tracking-widest text-[var(--text-primary)] font-mono leading-none">HUNTER</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 bg-[var(--bg-secondary)]/50 border border-[var(--border-color)] rounded-full px-2 py-0.5 text-[8.5px] font-mono text-[var(--text-secondary)]">
            <span className={`h-1.5 w-1.5 rounded-full ${isConnected ? "bg-emerald-500 animate-pulse" : "bg-zinc-550"}`} />
            <span className={`${isConnected ? "text-emerald-500" : "text-[var(--text-muted)]"} uppercase tracking-wider font-semibold`}>
              {isConnected ? "Active" : "Idle"}
            </span>
          </div>
          <button
            onClick={() => setSettings({ ...settings!, theme: settings?.theme === "dark" ? "light" : "dark" })}
            aria-label="Toggle Theme"
            className="flex h-7 w-7 items-center justify-center rounded border border-[var(--border-color)] hover:border-zinc-400 bg-[var(--bg-secondary)]/30 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all duration-200 cursor-pointer"
          >
            {settings?.theme === "dark" ? <Sun size={12} /> : <Moon size={12} />}
          </button>
          <button
            onClick={() => setShowSettings(!showSettings)}
            aria-label="Settings"
            className={`flex h-7 w-7 items-center justify-center rounded border transition-all duration-200 cursor-pointer ${showSettings
              ? "border-[#ff6b35] bg-[#ff6b35]/5 text-[#ff6b35]"
              : "border-[var(--border-color)] hover:border-zinc-400 bg-[var(--bg-secondary)]/30 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              }`}
          >
            <Settings size={12} />
          </button>
        </div>
      </header>

      {/* Main Panel Content */}
      <div className="flex flex-1 flex-col justify-between p-3.5 gap-3 overflow-hidden">

        {/* Settings view */}
        {showSettings && settings ? (
          <div className="border border-[var(--border-color)] bg-[var(--bg-secondary)]/90 backdrop-blur-md rounded-xl p-3 animate-slide-down space-y-2.5 shadow-[0_4px_20px_rgba(0,0,0,0.1)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.4)]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Key size={11} className="text-[#ff6b35]" />
                <span className="text-[9px] font-mono uppercase tracking-wider text-[var(--text-secondary)] font-bold">
                  AI Credentials Setup
                </span>
              </div>
              <button
                onClick={() => setShowSettings(false)}
                className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition cursor-pointer">
                <X size={11} />
              </button>
            </div>

            <div className="space-y-2 text-[10.5px] max-h-[175px] overflow-y-auto pr-1 custom-scrollbar">
              <div className="space-y-0.5">
                <label className="text-[8.5px] font-mono text-[var(--text-muted)] uppercase tracking-wide">Model Provider</label>
                <select
                  value={settings.provider || "gemini"}
                  onChange={(e) => setSettings({ ...settings, provider: e.target.value as any })}
                  className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded px-2 py-1 text-[10.5px] text-[var(--text-primary)] outline-none focus:border-[#ff6b35] transition cursor-pointer"
                >
                  <option value="gemini">Google Gemini</option>
                  <option value="openai">OpenAI (ChatGPT)</option>
                  <option value="anthropic">Anthropic Claude</option>
                  <option value="groq">Groq (Llama 3)</option>
                  <option value="openrouter">OpenRouter</option>
                  <option value="deepseek">DeepSeek</option>
                  <option value="ollama">Ollama (Local)</option>
                </select>
              </div>

              {settings.provider === "gemini" && (
                <div className="space-y-0.5">
                  <div className="flex justify-between items-center">
                    <label className="text-[8.5px] font-mono text-[var(--text-muted)] uppercase tracking-wide">Gemini Key</label>
                    <button
                      type="button"
                      onClick={() => setShowKey(!showKey)}
                      className="text-[8px] font-mono text-[var(--text-muted)] hover:text-[var(--text-secondary)] cursor-pointer"
                    >
                      {showKey ? "Hide" : "Show"}
                    </button>
                  </div>
                  <input
                    type={showKey ? "text" : "password"}
                    value={decryptedApiKey}
                    onChange={(e) => setSettings({ ...settings, apiKey: Encryption.encrypt(e.target.value) })}
                    placeholder="AI Studio API Key"
                    className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded px-2 py-1 text-[10.5px] text-[var(--text-primary)] outline-none focus:border-[#ff6b35] transition font-mono"
                  />
                </div>
              )}

              {settings.provider === "openai" && (
                <div className="space-y-0.5">
                  <div className="flex justify-between items-center">
                    <label className="text-[8.5px] font-mono text-[var(--text-muted)] uppercase tracking-wide">OpenAI Key</label>
                    <button
                      type="button"
                      onClick={() => setShowKey(!showKey)}
                      className="text-[8px] font-mono text-[var(--text-muted)] hover:text-[var(--text-secondary)] cursor-pointer"
                    >
                      {showKey ? "Hide" : "Show"}
                    </button>
                  </div>
                  <input
                    type={showKey ? "text" : "password"}
                    value={decryptedOpenaiApiKey}
                    onChange={(e) => setSettings({ ...settings, openaiApiKey: Encryption.encrypt(e.target.value) })}
                    placeholder="sk-..."
                    className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded px-2 py-1 text-[10.5px] text-[var(--text-primary)] outline-none focus:border-[#ff6b35] transition font-mono"
                  />
                </div>
              )}

              {settings.provider === "anthropic" && (
                <div className="space-y-0.5">
                  <div className="flex justify-between items-center">
                    <label className="text-[8.5px] font-mono text-[var(--text-muted)] uppercase tracking-wide">Anthropic Key</label>
                    <button
                      type="button"
                      onClick={() => setShowKey(!showKey)}
                      className="text-[8px] font-mono text-[var(--text-muted)] hover:text-[var(--text-secondary)] cursor-pointer"
                    >
                      {showKey ? "Hide" : "Show"}
                    </button>
                  </div>
                  <input
                    type={showKey ? "text" : "password"}
                    value={decryptedAnthropicApiKey}
                    onChange={(e) => setSettings({ ...settings, anthropicApiKey: Encryption.encrypt(e.target.value) })}
                    placeholder="sk-ant-..."
                    className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded px-2 py-1 text-[10.5px] text-[var(--text-primary)] outline-none focus:border-[#ff6b35] transition font-mono"
                  />
                </div>
              )}

              {settings.provider === "groq" && (
                <div className="space-y-0.5">
                  <div className="flex justify-between items-center">
                    <label className="text-[8.5px] font-mono text-[var(--text-muted)] uppercase tracking-wide">Groq Key</label>
                    <button
                      type="button"
                      onClick={() => setShowKey(!showKey)}
                      className="text-[8px] font-mono text-[var(--text-muted)] hover:text-[var(--text-secondary)] cursor-pointer"
                    >
                      {showKey ? "Hide" : "Show"}
                    </button>
                  </div>
                  <input
                    type={showKey ? "text" : "password"}
                    value={decryptedGroqApiKey}
                    onChange={(e) => setSettings({ ...settings, groqApiKey: Encryption.encrypt(e.target.value) })}
                    placeholder="gsk_..."
                    className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded px-2 py-1 text-[10.5px] text-[var(--text-primary)] outline-none focus:border-[#ff6b35] transition font-mono"
                  />
                </div>
              )}

              {settings.provider === "openrouter" && (
                <div className="space-y-0.5">
                  <div className="flex justify-between items-center">
                    <label className="text-[8.5px] font-mono text-[var(--text-muted)] uppercase tracking-wide">OpenRouter Key</label>
                    <button
                      type="button"
                      onClick={() => setShowKey(!showKey)}
                      className="text-[8px] font-mono text-[var(--text-muted)] hover:text-[var(--text-secondary)] cursor-pointer"
                    >
                      {showKey ? "Hide" : "Show"}
                    </button>
                  </div>
                  <input
                    type={showKey ? "text" : "password"}
                    value={decryptedOpenrouterApiKey}
                    onChange={(e) => setSettings({ ...settings, openrouterApiKey: Encryption.encrypt(e.target.value) })}
                    placeholder="sk-or-..."
                    className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded px-2 py-1 text-[10.5px] text-[var(--text-primary)] outline-none focus:border-[#ff6b35] transition font-mono"
                  />
                </div>
              )}

              {settings.provider === "deepseek" && (
                <div className="space-y-0.5">
                  <div className="flex justify-between items-center">
                    <label className="text-[8.5px] font-mono text-[var(--text-muted)] uppercase tracking-wide">DeepSeek Key</label>
                    <button
                      type="button"
                      onClick={() => setShowKey(!showKey)}
                      className="text-[8px] font-mono text-[var(--text-muted)] hover:text-[var(--text-secondary)] cursor-pointer"
                    >
                      {showKey ? "Hide" : "Show"}
                    </button>
                  </div>
                  <input
                    type={showKey ? "text" : "password"}
                    value={decryptedDeepseekApiKey}
                    onChange={(e) => setSettings({ ...settings, deepseekApiKey: Encryption.encrypt(e.target.value) })}
                    placeholder="sk-..."
                    className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded px-2 py-1 text-[10.5px] text-[var(--text-primary)] outline-none focus:border-[#ff6b35] transition font-mono"
                  />
                </div>
              )}

              {settings.provider === "ollama" && (
                <div className="space-y-0.5">
                  <label className="text-[8.5px] font-mono text-[var(--text-muted)] uppercase tracking-wide">Ollama API URL</label>
                  <input
                    type="text"
                    value={settings.ollamaUrl || ""}
                    onChange={(e) => setSettings({ ...settings, ollamaUrl: e.target.value })}
                    placeholder="http://localhost:11434"
                    className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded px-2 py-1 text-[10.5px] text-[var(--text-primary)] outline-none focus:border-[#ff6b35] transition font-mono"
                  />
                </div>
              )}

              <div className="space-y-0.5">
                <label className="text-[8.5px] font-mono text-[var(--text-muted)] uppercase tracking-wide">Custom Model Name</label>
                <input
                  type="text"
                  value={settings.model || ""}
                  onChange={(e) => setSettings({ ...settings, model: e.target.value })}
                  placeholder="Default Model"
                  className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded px-2 py-1 text-[10.5px] text-[var(--text-primary)] outline-none focus:border-[#ff6b35] transition font-mono"
                />
              </div>

              <div className="flex gap-2">
                <div className="w-1/2 space-y-0.5">
                  <label className="text-[8.5px] font-mono text-[var(--text-muted)] uppercase tracking-wide">Temp</label>
                  <input
                    type="number"
                    min="0"
                    max="1"
                    step="0.1"
                    value={settings.temperature !== undefined ? settings.temperature : 0.6}
                    onChange={(e) => setSettings({ ...settings, temperature: parseFloat(e.target.value) })}
                    className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded px-2 py-1 text-[10.5px] text-[var(--text-primary)] outline-none focus:border-[#ff6b35] transition"
                  />
                </div>
                <div className="w-1/2 space-y-0.5">
                  <label className="text-[8.5px] font-mono text-[var(--text-muted)] uppercase tracking-wide">Max Tokens</label>
                  <input
                    type="number"
                    min="1"
                    max="8192"
                    value={settings.maxTokens !== undefined ? settings.maxTokens : 1024}
                    onChange={(e) => setSettings({ ...settings, maxTokens: parseInt(e.target.value, 10) })}
                    className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded px-2 py-1 text-[10.5px] text-[var(--text-primary)] outline-none focus:border-[#ff6b35] transition"
                  />
                </div>
              </div>

              <div className="space-y-0.5">
                <label className="text-[8.5px] font-mono text-[var(--text-muted)] uppercase tracking-wide">Fallback Provider</label>
                <select
                  value={settings.fallbackProvider || "none"}
                  onChange={(e) => setSettings({ ...settings, fallbackProvider: e.target.value as any })}
                  className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded px-2 py-1 text-[10.5px] text-[var(--text-primary)] outline-none focus:border-[#ff6b35] transition cursor-pointer"
                >
                  <option value="none">None</option>
                  <option value="gemini">Google Gemini</option>
                  <option value="openai">OpenAI</option>
                  <option value="anthropic">Claude</option>
                  <option value="groq">Groq</option>
                  <option value="openrouter">OpenRouter</option>
                  <option value="deepseek">DeepSeek</option>
                  <option value="ollama">Ollama</option>
                </select>
              </div>

              <div className="space-y-0.5">
                <label className="text-[8.5px] font-mono text-[var(--text-muted)] uppercase tracking-wide">Vision Provider</label>
                <select
                  value={settings.visionProvider || "none"}
                  onChange={(e) => setSettings({ ...settings, visionProvider: e.target.value as any })}
                  className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded px-2 py-1 text-[10.5px] text-[var(--text-primary)] outline-none focus:border-[#ff6b35] transition cursor-pointer"
                >
                  <option value="none">Use Chat Provider</option>
                  <option value="gemini">Google Gemini</option>
                  <option value="openai">OpenAI</option>
                  <option value="anthropic">Claude</option>
                  <option value="openrouter">OpenRouter</option>
                  <option value="ollama">Ollama</option>
                </select>
              </div>

              <div className="space-y-0.5">
                <label className="text-[8.5px] font-mono text-[var(--text-muted)] uppercase tracking-wide">Embedding Provider</label>
                <select
                  value={settings.embeddingProvider || "none"}
                  onChange={(e) => setSettings({ ...settings, embeddingProvider: e.target.value as any })}
                  className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded px-2 py-1 text-[10.5px] text-[var(--text-primary)] outline-none focus:border-[#ff6b35] transition cursor-pointer"
                >
                  <option value="none">Use Chat Provider</option>
                  <option value="gemini">Google Gemini</option>
                  <option value="openai">OpenAI</option>
                  <option value="openrouter">OpenRouter</option>
                  <option value="ollama">Ollama</option>
                </select>
              </div>

              <div className="flex items-center justify-between py-1 text-[9.5px]">
                <span className="font-mono text-[var(--text-muted)] uppercase tracking-wider">Enable Chat Streaming</span>
                <input
                  type="checkbox"
                  checked={settings.streaming || false}
                  onChange={(e) => setSettings({ ...settings, streaming: e.target.checked })}
                  className="accent-[#ff6b35] cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between border-t border-[var(--border-color)] pt-2 text-[9.5px]">
                <span className="font-mono text-[var(--text-muted)] uppercase tracking-wider">Sidebar Layout</span>
                <button
                  type="button"
                  onClick={() => setSettings({ ...settings, sidebarPinned: !settings.sidebarPinned })}
                  className={`font-mono px-2 py-0.5 rounded border transition-all uppercase cursor-pointer ${settings.sidebarPinned
                    ? "border-[#ff6b35] bg-[#ff6b35]/5 text-[#ff6b35]"
                    : "border-[var(--border-color)] text-[var(--text-secondary)] hover:border-[#ff6b35] hover:text-[var(--text-primary)]"
                    }`}
                >
                  {settings.sidebarPinned ? "Pinned" : "Floating"}
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* Normal Connection Info */
          <div className="flex flex-col gap-2.5">
            {isConnected ? (
              <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] p-3 flex flex-col gap-1 shadow-sm transition hover:border-[#ff6b35]/20">
                <div className="flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <p className="font-mono text-[8px] uppercase tracking-wider text-[var(--text-muted)] font-bold">
                    Connected Active Tab
                  </p>
                </div>
                <h2 className="text-[11px] font-bold text-[var(--text-primary)] truncate" title={snapshot.title}>
                  {snapshot.title}
                </h2>
                <p className="font-mono text-[8.5px] text-[var(--text-muted)] truncate mt-0.5">{snapshot.url}</p>
              </div>
            ) : (
              <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)]/40 p-3.5 text-center transition hover:border-zinc-400 dark:hover:border-zinc-800">
                <p className="font-mono text-[8px] uppercase tracking-widest text-[var(--text-muted)] mb-1 font-bold">
                  Connection Standby
                </p>
                <p className="text-[10px] leading-relaxed text-[var(--text-secondary)]">
                  Open Hunter on any webpage to activate the browser AI copilot.
                </p>
              </div>
            )}

            {!hasApiKey && (
              <p className="font-mono text-[8.5px] text-[#ff6b35] leading-normal bg-[#ff6b35]/5 py-1.5 px-2 rounded border border-[#ff6b35]/10 flex items-center gap-1.5 animate-pulse-glow">
                <AlertCircle size={9} className="shrink-0" />
                Configure your API credentials to enable autonomous AI goals.
              </p>
            )}

            {error && !isConnected && (
              <p className="font-mono text-[8.5px] text-[var(--text-secondary)] leading-normal bg-[var(--bg-tertiary)]/40 py-1.5 px-2 rounded border border-[var(--border-color)]">
                {error}
              </p>
            )}
          </div>
        )}

        {/* Action Button Section */}
        <div className="flex flex-col gap-2.5 border-t border-[var(--border-color)] pt-2.5 shrink-0">
          <button
            onClick={handleToggleSidebar}
            className="flex h-9 w-full items-center justify-center rounded-xl border border-[var(--border-color)] hover:border-[#ff6b35]/40 bg-[var(--bg-secondary)] hover:bg-[#ff6b35]/5 text-xs font-mono uppercase tracking-wider text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all active:scale-[0.98] shadow-[0_1px_2px_rgba(0,0,0,0.05)] dark:shadow-[0_1px_2px_rgba(0,0,0,0.2)] cursor-pointer"
          >
            <Zap size={11} className="mr-1.5 text-[#ff6b35] fill-[#ff6b35]" />
            {sidebarStatus === "open" ? "Close AI Sidebar" : "Open AI Sidebar"}
          </button>

          <div className="flex items-center justify-between text-[8px] text-[var(--text-muted)] font-mono uppercase tracking-wider">
            <span>{applications?.length ?? 0} jobs tracked</span>
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="text-[#ff6b35] hover:text-[#ff8255] transition-all font-bold cursor-pointer"
            >
              {showSettings ? "Show Dashboard" : "Setup Keys"}
            </button>
          </div>
        </div>

      </div>
    </main>
  );
};
