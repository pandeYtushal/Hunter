import { useEffect, useState } from "react";
import { useChromeStorage } from "./hooks/useChromeStorage";
import { useTheme } from "./hooks/useTheme";
import { sendMessageToActiveTab } from "../shared/chromeRuntime";
import type { PageSnapshot, SidebarStatus } from "../shared/types/messages";
import { Settings, Zap, Sun, Moon } from "lucide-react";
import { Encryption } from "../shared/encryption";
import { CredentialsForm } from "./components/CredentialsForm";
import { ConnectionCard } from "./components/ConnectionCard";

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
  const { value: apiKeys, setValue: setApiKeys } = useChromeStorage("apiKeys");
  const { value: applications } = useChromeStorage("applications");

  const hasApiKey = Boolean(
    settings?.provider === "openai"
      ? apiKeys?.openaiApiKey?.trim()
      : settings?.provider === "anthropic"
        ? apiKeys?.anthropicApiKey?.trim()
        : settings?.provider === "groq"
          ? apiKeys?.groqApiKey?.trim()
          : settings?.provider === "openrouter"
            ? apiKeys?.openrouterApiKey?.trim()
            : settings?.provider === "deepseek"
              ? apiKeys?.deepseekApiKey?.trim()
              : settings?.provider === "ollama"
                ? true
                : apiKeys?.apiKey?.trim()
  );

  const [decryptedKeys, setDecryptedKeys] = useState({
    apiKey: "",
    openaiApiKey: "",
    anthropicApiKey: "",
    groqApiKey: "",
    openrouterApiKey: "",
    deepseekApiKey: ""
  });

  useEffect(() => {
    if (!apiKeys) return;
    let active = true;
    Promise.all([
      Encryption.decrypt(apiKeys.apiKey || ""),
      Encryption.decrypt(apiKeys.openaiApiKey || ""),
      Encryption.decrypt(apiKeys.anthropicApiKey || ""),
      Encryption.decrypt(apiKeys.groqApiKey || ""),
      Encryption.decrypt(apiKeys.openrouterApiKey || ""),
      Encryption.decrypt(apiKeys.deepseekApiKey || "")
    ]).then(([gemini, openai, anthropic, groq, openrouter, deepseek]) => {
      if (active) {
        setDecryptedKeys({
          apiKey: gemini,
          openaiApiKey: openai,
          anthropicApiKey: anthropic,
          groqApiKey: groq,
          openrouterApiKey: openrouter,
          deepseekApiKey: deepseek
        });
      }
    });
    return () => {
      active = false;
    };
  }, [apiKeys]);

  const handleKeyChange = async (field: keyof typeof decryptedKeys, value: string) => {
    setDecryptedKeys((prev) => ({ ...prev, [field]: value }));
    const encrypted = await Encryption.encrypt(value);
    if (apiKeys) {
      setApiKeys({
        ...apiKeys,
        [field]: encrypted
      });
    }
  };

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

    chrome.storage.local.get("sidebarOpen").then((result) => {
      setSidebarStatus(result.sidebarOpen ? "open" : "closed");
    });

    const storageListener = (changes: Record<string, chrome.storage.StorageChange>, areaName: string) => {
      if (areaName === "local" && changes.sidebarOpen) {
        setSidebarStatus(changes.sidebarOpen.newValue ? "open" : "closed");
      }
    };
    chrome.storage.onChanged.addListener(storageListener);
    return () => chrome.storage.onChanged.removeListener(storageListener);
  }, []);

  // Autofill configuration panel on missing API keys
  useEffect(() => {
    if (settings && apiKeys) {
      const activeKey =
        settings.provider === "openai"
          ? apiKeys.openaiApiKey
          : settings.provider === "anthropic"
            ? apiKeys.anthropicApiKey
            : settings.provider === "groq"
              ? apiKeys.groqApiKey
              : settings.provider === "openrouter"
                ? apiKeys.openrouterApiKey
                : settings.provider === "deepseek"
                  ? apiKeys.deepseekApiKey
                  : apiKeys.apiKey;
      if (!activeKey?.trim() && settings.provider !== "ollama") {
        setShowSettings(true);
      }
    }
  }, [settings, apiKeys]);

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
    <main className="flex h-[520px] w-[380px] flex-col bg-[var(--bg-primary)] text-[var(--text-primary)] font-sans selection:bg-[var(--accent)]/30 select-none overflow-hidden">
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
              ? "border-[var(--accent)] bg-[var(--accent)]/5 text-[var(--accent)]"
              : "border-[var(--border-color)] hover:border-[var(--border-hover)] bg-[var(--bg-secondary)]/30 text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
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
          <CredentialsForm
            settings={settings}
            setSettings={setSettings}
            decryptedKeys={decryptedKeys}
            handleKeyChange={handleKeyChange}
            showKey={showKey}
            setShowKey={setShowKey}
            setShowSettings={setShowSettings}
          />
        ) : (
          <ConnectionCard
            isConnected={isConnected}
            snapshot={snapshot}
            error={error}
            hasApiKey={hasApiKey}
          />
        )}

        {/* Action Button Section */}
        <div className="flex flex-col gap-2.5 border-t border-[var(--border-color)] pt-2.5 shrink-0">
          <button
            onClick={handleToggleSidebar}
            className="flex h-9 w-full items-center justify-center rounded-xl border border-[var(--border-color)] hover:border-[var(--accent)]/40 bg-[var(--bg-secondary)] hover:bg-[var(--accent)]/5 text-xs font-mono uppercase tracking-wider text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all active:scale-[0.98] shadow-sm cursor-pointer"
          >
            <Zap size={11} className="mr-1.5 text-[var(--accent)] fill-[var(--accent)]" />
            {sidebarStatus === "open" ? "Close AI Sidebar" : "Open AI Sidebar"}
          </button>

          <div className="flex items-center justify-between text-[8px] text-[var(--text-muted)] font-mono uppercase tracking-wider">
            <span>{applications?.length ?? 0} jobs tracked</span>
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="text-[var(--accent)] hover:text-[var(--accent-strong)] transition-all font-bold cursor-pointer"
            >
              {showSettings ? "Show Dashboard" : "Setup Keys"}
            </button>
          </div>
        </div>

      </div>
    </main>
  );
};
