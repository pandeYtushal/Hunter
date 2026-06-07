import type { RuntimeMessage, RuntimeMessageType, RuntimeResponse } from "./types/messages";

const isChromeRuntimeAvailable = () =>
  typeof chrome !== "undefined" && Boolean(chrome.runtime?.sendMessage);

export const sendRuntimeMessage = async <T extends RuntimeMessage>(
  message: T
): Promise<RuntimeResponse<T["type"]>> => {
  if (!isChromeRuntimeAvailable()) {
    throw new Error("Chrome runtime is not available in this context.");
  }

  return chrome.runtime.sendMessage(message) as Promise<RuntimeResponse<T["type"]>>;
};

export const sendMessageToActiveTab = async <T extends RuntimeMessage>(
  message: T
): Promise<RuntimeResponse<T["type"]>> => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  if (!tab?.id) {
    throw new Error("No active tab is available.");
  }

  try {
    const response = await chrome.tabs.sendMessage(tab.id, message);
    return response as RuntimeResponse<T["type"]>;
  } catch (error) {
    const canInject =
      typeof chrome.scripting !== "undefined" &&
      typeof tab.url === "string" &&
      /^https?:\/\//.test(tab.url);

    if (!canInject) {
      throw error;
    }

    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ["assets/content.js"]
    });

    const response = await chrome.tabs.sendMessage(tab.id, message);
    return response as RuntimeResponse<T["type"]>;
  }
};

export const addRuntimeMessageListener = (
  handler: (
    message: RuntimeMessage,
    sender: chrome.runtime.MessageSender
  ) => Promise<unknown> | unknown
) => {
  chrome.runtime.onMessage.addListener((message: RuntimeMessage, sender, sendResponse) => {
    Promise.resolve(handler(message, sender))
      .then((response) => sendResponse(response))
      .catch((error: unknown) => {
        const messageText = error instanceof Error ? error.message : "Unknown runtime error";
        sendResponse({ error: messageText });
      });

    return true;
  });
};

export const isRuntimeMessage = (value: unknown): value is RuntimeMessage => {
  if (!value || typeof value !== "object") {
    return false;
  }

  const type = (value as { type?: unknown }).type;
  const types: RuntimeMessageType[] = [
    "PING",
    "GET_PAGE_SNAPSHOT",
    "SEND_CHAT_MESSAGE",
    "GET_CHAT_HISTORY",
    "CLEAR_CHAT_HISTORY",
    "TOGGLE_SIDEBAR",
    "OPEN_SIDEBAR",
    "CLOSE_SIDEBAR",
    "SIDEBAR_STATUS_CHANGED",
    "THEME_CHANGED",
    "PAGE_CONTENT_UPDATED",
    "PARSE_RESUME",
    "AUTOFILL_FORM",
    "ANALYZE_FORM_FIELDS",
    "SCAN_FORM",
    "EXECUTE_AUTOFILL",
    "CANCEL_AUTOFILL",
    "CLICK_ELEMENT",
    "FILL_INPUT",
    "EXTRACT_TEXT",
    "NAVIGATE_PAGE",
    "UPLOAD_RESUME"
  ];

  return typeof type === "string" && types.includes(type as RuntimeMessageType);
};
