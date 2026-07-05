import React from "react";
import { Key, X } from "lucide-react";
import type { AgentSettings } from "../../shared/types/storage";

interface CredentialsFormProps {
  settings: AgentSettings;
  setSettings: (settings: AgentSettings) => void;
  decryptedKeys: {
    apiKey: string;
    openaiApiKey: string;
    anthropicApiKey: string;
    groqApiKey: string;
    openrouterApiKey: string;
    deepseekApiKey: string;
  };
  handleKeyChange: (
    field: "apiKey" | "openaiApiKey" | "anthropicApiKey" | "groqApiKey" | "openrouterApiKey" | "deepseekApiKey",
    value: string
  ) => Promise<void>;
  showKey: boolean;
  setShowKey: (show: boolean) => void;
  setShowSettings: (show: boolean) => void;
}

export const CredentialsForm: React.FC<CredentialsFormProps> = ({
  settings,
  setSettings,
  decryptedKeys,
  handleKeyChange,
  showKey,
  setShowKey,
  setShowSettings
}) => {
  return (
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
          className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition cursor-pointer"
        >
          <X size={11} />
        </button>
      </div>

      <div className="space-y-2 text-[10.5px] max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
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
              value={decryptedKeys.apiKey}
              onChange={(e) => handleKeyChange("apiKey", e.target.value)}
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
              value={decryptedKeys.openaiApiKey}
              onChange={(e) => handleKeyChange("openaiApiKey", e.target.value)}
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
              value={decryptedKeys.anthropicApiKey}
              onChange={(e) => handleKeyChange("anthropicApiKey", e.target.value)}
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
              value={decryptedKeys.groqApiKey}
              onChange={(e) => handleKeyChange("groqApiKey", e.target.value)}
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
              value={decryptedKeys.openrouterApiKey}
              onChange={(e) => handleKeyChange("openrouterApiKey", e.target.value)}
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
              value={decryptedKeys.deepseekApiKey}
              onChange={(e) => handleKeyChange("deepseekApiKey", e.target.value)}
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

        <div className="space-y-0.5">
          <label className="text-[8.5px] font-mono text-[var(--text-muted)] uppercase tracking-wide">Max Session Tokens</label>
          <input
            type="number"
            min="1000"
            max="1000000"
            step="5000"
            value={settings.maxSessionTokens !== undefined ? settings.maxSessionTokens : 50000}
            onChange={(e) => setSettings({ ...settings, maxSessionTokens: parseInt(e.target.value, 10) || 50000 })}
            className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded px-2 py-1 text-[10.5px] text-[var(--text-primary)] outline-none focus:border-[#ff6b35] transition font-mono"
          />
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
            className={`font-mono px-2 py-0.5 rounded border transition-all uppercase cursor-pointer ${
              settings.sidebarPinned
                ? "border-[#ff6b35] bg-[#ff6b35]/5 text-[#ff6b35]"
                : "border-[var(--border-color)] text-[var(--text-secondary)] hover:border-[#ff6b35] hover:text-[var(--text-primary)]"
            }`}
          >
            {settings.sidebarPinned ? "Pinned" : "Floating"}
          </button>
        </div>
      </div>
    </div>
  );
};
