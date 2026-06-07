import { generateAiReply } from "../ai/aiService";
import { extractJobDetails } from "../ai/jobAgent";
import { parseResumeText } from "../ai/resumeAgent";
import { analyzeJobFit } from "../ai/matchAgent";
import { generateCoverLetter } from "../ai/coverLetterAgent";
import { analyzeFormFields } from "../ai/formAgent";
import { planUserGoal } from "../ai/planner";
import { researchCompany } from "../ai/researchAgent";
import { AgentManager } from "../agents/AgentManager";
import type { ChatMessage, RuntimeMessage } from "../shared/types/messages";
import { defaultStorage, type StorageSchema } from "../shared/types/storage";


type StorageKey = keyof StorageSchema;

interface CachedPageData {
  title: string;
  url: string;
  metadata: Record<string, string>;
  content: string;
}

const pageContentCache = new Map<number, CachedPageData>();

chrome.tabs.onRemoved.addListener((tabId) => {
  pageContentCache.delete(tabId);
});

const getStorageValue = async <K extends StorageKey>(key: K): Promise<StorageSchema[K]> => {
  const result = await chrome.storage.sync.get({ [key]: defaultStorage[key] });
  return result[key] as StorageSchema[K];
};

const setStorageValue = async <K extends StorageKey>(key: K, value: StorageSchema[K]) => {
  await chrome.storage.sync.set({ [key]: value });
};

const patchSettings = async (value: Partial<StorageSchema["settings"]>) => {
  const current = await getStorageValue("settings");
  await setStorageValue("settings", { ...current, ...value });
};

const createChatMessage = (role: ChatMessage["role"], content: string): ChatMessage => ({
  id: crypto.randomUUID(),
  role,
  content,
  createdAt: new Date().toISOString()
});

const sendToTab = async (tabId: number, message: RuntimeMessage) => {
  await chrome.tabs.sendMessage(tabId, message).catch(() => undefined);
};

const addMessageListener = (
  handler: (message: RuntimeMessage, sender: chrome.runtime.MessageSender) => Promise<unknown>
) => {
  chrome.runtime.onMessage.addListener((message: RuntimeMessage, sender, sendResponse) => {
    handler(message, sender)
      .then(sendResponse)
      .catch((error: unknown) => {
        const messageText = error instanceof Error ? error.message : "Unknown runtime error";
        sendResponse({ ok: false, error: messageText });
      });

    return true;
  });
};

chrome.runtime.onInstalled.addListener(async ({ reason }) => {
  if (reason === "install") {
    await chrome.storage.sync.set(defaultStorage);
  }
});

// Auto-inject content script into existing tabs on startup/reload
const autoInjectContentScript = async () => {
  try {
    const tabs = await chrome.tabs.query({ url: ["http://*/*", "https://*/*"] });
    
    // Process tabs in parallel using map to prevent blocking
    tabs.map(async (tab) => {
      if (!tab.id || !tab.url) return;
      if (tab.url.startsWith("chrome://") || tab.url.startsWith("chrome-extension://")) return;

      try {
        // Fast 1-second timeout check to see if content script is active
        const response = await Promise.race([
          chrome.tabs.sendMessage(tab.id, { type: "PING" }).catch(() => undefined),
          new Promise<undefined>((resolve) => setTimeout(() => resolve(undefined), 1000))
        ]);

        if (response && response.ok) {
          console.log(`Tab ${tab.id} already has content script active.`);
          return;
        }

        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ["assets/content.js"]
        });
        console.log(`Injected content script into tab: ${tab.id}`);
      } catch (e) {
        // Silently ignore restricted tabs
      }
    });
  } catch (err) {
    console.error("Failed to auto-inject content script:", err);
  }
};

// Run auto-injection immediately on worker startup/reload
void autoInjectContentScript();

chrome.action.onClicked.addListener(async (tab) => {
  if (!tab.id) {
    return;
  }

  await sendToTab(tab.id, { type: "TOGGLE_SIDEBAR" });
});

addMessageListener(async (message, sender) => {
  switch (message.type) {
    case "PING":
      return { ok: true };

    case "ANALYZE_FORM_FIELDS": {
      try {
        const mappings = await analyzeFormFields(message.formHtmlExcerpt);
        return { ok: true, mappings };
      } catch (error) {
        const messageText = error instanceof Error ? error.message : "Unknown form analysis error";
        return { ok: false, error: messageText };
      }
    }

    case "PARSE_RESUME": {
      try {
        const profile = await parseResumeText(message.resumeText);
        return { ok: true, profile };
      } catch (error) {
        const messageText = error instanceof Error ? error.message : "Unknown resume parsing error";
        return { ok: false, error: messageText };
      }
    }

    case "PAGE_CONTENT_UPDATED": {
      if (sender.tab?.id) {
        pageContentCache.set(sender.tab.id, message.payload);
      }
      return { ok: true };
    }

    case "GET_CHAT_HISTORY": {
      const history = await getStorageValue("chatHistory");
      return { history };
    }

    case "CLEAR_CHAT_HISTORY":
      await setStorageValue("chatHistory", []);
      return { history: [] };

    case "SEND_CHAT_MESSAGE": {
      const prompt = message.prompt.trim();

      if (!prompt) {
        throw new Error("Message cannot be empty.");
      }

      let pageContext = message.pageContext;
      // Fallback to cache if content is missing from incoming pageContext, or if pageContext is omitted entirely
      if ((!pageContext || !pageContext.content) && sender.tab?.id) {
        const cached = pageContentCache.get(sender.tab.id);
        if (cached) {
          pageContext = {
            title: cached.title,
            url: cached.url,
            host: new URL(cached.url).host,
            selectedText: pageContext?.selectedText || "",
            description: pageContext?.description || cached.metadata.description || "",
            content: cached.content,
            metadata: cached.metadata
          };
        }
      }

      const history = await getStorageValue("chatHistory");
      const userMessage = createChatMessage("user", prompt);
      const profile = await getStorageValue("profile");
      
      let reply: string;
      try {
        const plan = await planUserGoal(prompt);
        console.log("Planner orchestrated actions:", plan);

        if (plan.goal !== "chat_fallback") {
          // Hand execution over to the AgentManager orchestrator
          const finalState = await AgentManager.runGoal(prompt, plan);
          
          if (finalState.errors.length > 0 && finalState.errors.length === finalState.steps.length) {
            reply = JSON.stringify({ error: finalState.errors.join("\n") });
          } else {
            reply = finalState.finalResult || "Application flow completed successfully!";
          }
        } else {
          // Direct fallback chat response
          reply = await generateAiReply({
            prompt,
            history,
            pageContext,
            profile
          });
        }
      } catch (err) {
        console.error("Planner intent execution error:", err);
        reply = await generateAiReply({
          prompt,
          history,
          pageContext,
          profile
        });
      }

      const assistantMessage = createChatMessage("assistant", reply);
      const nextHistory = [...history, userMessage, assistantMessage].slice(-40);

      await setStorageValue("chatHistory", nextHistory);
      return { message: assistantMessage, history: nextHistory };
    }

    case "SIDEBAR_STATUS_CHANGED":
      await setStorageValue("sidebarOpen", message.status === "open");
      return { ok: true };

    case "THEME_CHANGED":
      await patchSettings({ theme: message.theme });
      if (sender.tab?.id) {
        await sendToTab(sender.tab.id, message);
      }
      return { ok: true };

    default:
      return { ok: true };
  }
});
