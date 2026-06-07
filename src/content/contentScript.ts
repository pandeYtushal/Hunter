import { sidebarStyles } from "./sidebarStyles";
import { defaultStorage, type StorageSchema } from "../shared/types/storage";
import type { PageSnapshot, RuntimeMessage, SidebarStatus, ThemeMode } from "../shared/types/messages";
import { extractTitle, extractMetadata, extractPageContent } from "./pageReader";
import { autofillPageForm, scanPageForm, executeAutofill, cancelAutofill } from "./formMapper";
import { clickElement } from "../actions/clickElement";
import { fillInput } from "../actions/fillInput";
import { extractText } from "../actions/extractText";
import { navigatePage } from "../actions/navigatePage";
import { uploadResume } from "../actions/uploadResume";

const rootId = "ai-job-agent-root";

console.log("HUNTERR: Content script script-tag loaded and running!");

const getSidebarFrameUrl = () => {
  try {
    if (typeof chrome === "undefined" || !chrome.runtime || !chrome.runtime.getURL) {
      console.warn("HUNTERR: chrome.runtime.getURL is not available.");
      return "";
    }
    return chrome.runtime.getURL("sidebar.html");
  } catch (e) {
    console.error("HUNTERR: Error getting sidebar URL:", e);
    return "";
  }
};

const icons = {
  chatOpen:
    '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" class="icon-open"><path d="M21 11.5c0 4.7-3.8 8.5-8.5 8.5H11L5 23l1.5-5.5C3.8 16.2 2 14 2 11.5 2 6.8 5.8 3 10.5 3s8.5 3.8 8.5 8.5z"/><circle cx="11.5" cy="11.5" r="3"/><line x1="11.5" y1="5.5" x2="11.5" y2="8.5"/><line x1="11.5" y1="14.5" x2="11.5" y2="17.5"/><line x1="5.5" y1="11.5" x2="8.5" y2="11.5"/><line x1="14.5" y1="11.5" x2="17.5" y2="11.5"/></svg>',
  chatClose:
    '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" class="icon-close"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>'
};

const getPageSnapshot = (): PageSnapshot => {
  const meta = extractMetadata();
  const description =
    meta.description ||
    (document.querySelector<HTMLMetaElement>('meta[name="description"]')?.content ??
      document.querySelector<HTMLMetaElement>('meta[property="og:description"]')?.content ??
      "");

  return {
    title: extractTitle(),
    url: window.location.href,
    host: window.location.host,
    selectedText: window.getSelection()?.toString() ?? "",
    description,
    content: extractPageContent(),
    metadata: meta
  };
};

const publishStatus = async (status: SidebarStatus) => {
  await chrome.runtime.sendMessage({ type: "SIDEBAR_STATUS_CHANGED", status }).catch(() => undefined);
};

const getStorageState = async (): Promise<StorageSchema> => {
  try {
    if (typeof chrome === "undefined" || !chrome.storage || !chrome.storage.sync) {
      console.warn("HUNTERR: chrome.storage.sync is not available. Using default storage.");
      return defaultStorage;
    }
    const result = await chrome.storage.sync.get(defaultStorage);
    return { ...defaultStorage, ...result } as StorageSchema;
  } catch (err) {
    console.error("HUNTERR: Failed to get storage state:", err);
    return defaultStorage;
  }
};

class SidebarController {
  private host: HTMLElement | null = null;
  private appRoot: HTMLElement | null = null;
  private isOpen = false;
  private theme: ThemeMode = "system";

  async mount() {
    console.log("HUNTERR: Mount called. Checking DOM...");
    try {
      const existingRoot = document.getElementById(rootId);
      if (existingRoot && existingRoot !== this.host) {
        console.log("HUNTERR: Removing existing root from page.");
        existingRoot.remove();
      } else if (existingRoot) {
        console.log("HUNTERR: Root already exists and is owned by this controller.");
        return;
      }

      console.log("HUNTERR: Fetching storage state...");
      const state = await getStorageState();
      this.isOpen = state.sidebarOpen;
      this.theme = state.settings.theme;
      console.log("HUNTERR: Storage loaded. isOpen:", this.isOpen, "theme:", this.theme);

      this.host = document.createElement("ai-job-agent");
      this.host.id = rootId;
      this.host.dataset.theme = this.resolveTheme();

      const shadow = this.host.attachShadow({ mode: "open" });
      const style = document.createElement("style");
      style.textContent = sidebarStyles;
      this.appRoot = document.createElement("div");
      shadow.append(style, this.appRoot);

      this.appRoot.innerHTML = `
        <div class="agent-shell" style="top: 86px; right: 18px;">
          <button class="agent-toggle ${this.isOpen ? 'panel-open' : ''}" title="Open HUNTERR" type="button" data-action="toggle">
            <div class="agent-toggle-icons">
              <span class="icon-chat-open">${icons.chatOpen}</span>
              <span class="icon-chat-close">${icons.chatClose}</span>
            </div>
            <div class="agent-remove-btn" data-action="remove" title="Remove toggle from page">×</div>
          </button>
          <section class="agent-panel ${this.isOpen ? 'agent-panel-visible' : ''}" aria-label="HUNTERR sidebar">
            <div class="agent-resize-handle"></div>
            <iframe
              class="agent-frame"
              title="HUNTERR chat"
              allow="microphone; clipboard-write"
            ></iframe>
          </section>
        </div>
      `;

      console.log("HUNTERR: Appending host to document...");
      document.documentElement.appendChild(this.host);
      this.render();
      this.setupInteractions();
      console.log("HUNTERR: Mount completed successfully.");
    } catch (e) {
      console.error("HUNTERR: Critical error during mount:", e);
    }
  }

  toggle = async () => {
    if (!this.host?.isConnected) {
      await this.mount();
    }

    this.isOpen = !this.isOpen;
    this.render();
    await publishStatus(this.isOpen ? "open" : "closed");
    return { status: this.isOpen ? "open" : "closed" };
  };

  open = async () => {
    if (!this.host?.isConnected) {
      await this.mount();
    }

    this.isOpen = true;
    this.render();
    await publishStatus("open");
    return { status: "open" as const };
  };

  close = async () => {
    if (!this.host?.isConnected) {
      await this.mount();
    }

    this.isOpen = false;
    this.render();
    await publishStatus("closed");
    return { status: "closed" as const };
  };

  setTheme(theme: ThemeMode) {
    this.theme = theme;
    this.render();
  }

  private resolveTheme() {
    if (this.theme === "system") {
      return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    }

    return this.theme;
  }

  private render() {
    if (!this.appRoot || !this.host) {
      return;
    }

    this.host.dataset.theme = this.resolveTheme();
    const panel = this.appRoot.querySelector(".agent-panel") as HTMLElement;
    const frame = this.appRoot.querySelector(".agent-frame") as HTMLIFrameElement | null;
    const toggleBtn = this.appRoot.querySelector(".agent-toggle") as HTMLElement | null;

    if (panel) {
      if (this.isOpen) {
        if (frame && !frame.getAttribute("src")) {
          frame.src = getSidebarFrameUrl();
        }
        panel.classList.add("agent-panel-visible");
      } else {
        panel.classList.remove("agent-panel-visible");
        // Delay removing iframe src until transition ends
        setTimeout(() => {
          if (!this.isOpen && frame) {
            frame.removeAttribute("src");
          }
        }, 350);
      }
    }

    // Swap icon between chat and close
    if (toggleBtn) {
      if (this.isOpen) {
        toggleBtn.classList.add("panel-open");
      } else {
        toggleBtn.classList.remove("panel-open");
      }
    }
  }

  private setupInteractions() {
    if (!this.appRoot) return;

    const shell = this.appRoot.querySelector(".agent-shell") as HTMLElement;
    const toggleBtn = this.appRoot.querySelector(".agent-toggle") as HTMLElement;
    const panel = this.appRoot.querySelector(".agent-panel") as HTMLElement;
    const resizeHandle = this.appRoot.querySelector(".agent-resize-handle") as HTMLElement;
    const removeBtn = this.appRoot.querySelector('[data-action="remove"]') as HTMLElement;

    if (!shell || !toggleBtn || !panel || !resizeHandle || !removeBtn) return;

    // ─── 1. Movable Toggle Drag & Click Logic ───
    let startX = 0;
    let startY = 0;
    let startTop = 0;
    let startRight = 0;
    let isDragging = false;
    let isTouchDragging = false;

    const onMouseDown = (e: MouseEvent) => {
      if (e.button !== 0 || e.target === removeBtn || removeBtn.contains(e.target as Node)) return;
      
      startX = e.clientX;
      startY = e.clientY;
      startTop = parseInt(shell.style.top || window.getComputedStyle(shell).top) || 86;
      startRight = parseInt(shell.style.right || window.getComputedStyle(shell).right) || 18;
      isDragging = true;
      
      document.addEventListener("mousemove", onMouseMove);
      document.addEventListener("mouseup", onMouseUp);
      e.preventDefault();
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      const deltaX = e.clientX - startX;
      const deltaY = e.clientY - startY;

      if (Math.abs(deltaX) > 12 || Math.abs(deltaY) > 12) {
        toggleBtn.classList.add("dragging");
      }

      const newTop = startTop + deltaY;
      const newRight = startRight - deltaX;

      const maxTop = window.innerHeight - 60;
      const maxRight = window.innerWidth - 60;

      shell.style.top = Math.max(10, Math.min(newTop, maxTop)) + "px";
      shell.style.right = Math.max(10, Math.min(newRight, maxRight)) + "px";
    };

    const onMouseUp = (e: MouseEvent) => {
      isDragging = false;
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);

      if (toggleBtn.classList.contains("dragging")) {
        setTimeout(() => {
          toggleBtn.classList.remove("dragging");
        }, 50);
      } else {
        void this.toggle();
      }
    };

    const onTouchStart = (e: TouchEvent) => {
      if (e.target === removeBtn || removeBtn.contains(e.target as Node)) return;
      if (e.touches.length === 0) return;
      
      const touch = e.touches[0];
      startX = touch.clientX;
      startY = touch.clientY;
      startTop = parseInt(shell.style.top || window.getComputedStyle(shell).top) || 86;
      startRight = parseInt(shell.style.right || window.getComputedStyle(shell).right) || 18;
      isTouchDragging = true;

      document.addEventListener("touchmove", onTouchMove, { passive: false });
      document.addEventListener("touchend", onTouchEnd);
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!isTouchDragging) return;
      if (e.touches.length === 0) return;
      
      const touch = e.touches[0];
      const deltaX = touch.clientX - startX;
      const deltaY = touch.clientY - startY;

      if (Math.abs(deltaX) > 12 || Math.abs(deltaY) > 12) {
        toggleBtn.classList.add("dragging");
      }

      const newTop = startTop + deltaY;
      const newRight = startRight - deltaX;

      const maxTop = window.innerHeight - 60;
      const maxRight = window.innerWidth - 60;

      shell.style.top = Math.max(10, Math.min(newTop, maxTop)) + "px";
      shell.style.right = Math.max(10, Math.min(newRight, maxRight)) + "px";
      
      e.preventDefault();
    };

    const onTouchEnd = (e: TouchEvent) => {
      isTouchDragging = false;
      document.removeEventListener("touchmove", onTouchMove);
      document.removeEventListener("touchend", onTouchEnd);

      if (toggleBtn.classList.contains("dragging")) {
        setTimeout(() => {
          toggleBtn.classList.remove("dragging");
        }, 50);
      } else {
        void this.toggle();
      }
    };

    toggleBtn.addEventListener("mousedown", onMouseDown);
    toggleBtn.addEventListener("touchstart", onTouchStart, { passive: true });

    // ─── 2. Double-Click Close Icon Trigger ───
    toggleBtn.addEventListener("dblclick", (e) => {
      e.preventDefault();
      removeBtn.classList.toggle("visible");
    });

    removeBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      this.host?.remove();
    });

    // ─── 3. Dynamic Resize Handle Logic ───
    const onStartResize = (clientX: number, isTouchEvent: boolean) => {
      const startWidth = panel.offsetWidth || 380;
      const startX = clientX;

      resizeHandle.classList.add("resizing");
      panel.classList.add("resizing");

      const onResize = (moveEvent: MouseEvent | TouchEvent) => {
        let currentX = 0;
        if (window.TouchEvent && moveEvent instanceof TouchEvent) {
          if (moveEvent.touches.length === 0) return;
          currentX = moveEvent.touches[0].clientX;
        } else {
          currentX = (moveEvent as MouseEvent).clientX;
        }

        const deltaX = startX - currentX;
        let newWidth = startWidth + deltaX;

        newWidth = Math.max(285, Math.min(newWidth, window.innerWidth - 32));
        panel.style.width = newWidth + "px";
      };

      const onStopResize = () => {
        resizeHandle.classList.remove("resizing");
        panel.classList.remove("resizing");

        if (isTouchEvent) {
          document.removeEventListener("touchmove", onResize);
          document.removeEventListener("touchend", onStopResize);
        } else {
          document.removeEventListener("mousemove", onResize);
          document.removeEventListener("mouseup", onStopResize);
        }
      };

      if (isTouchEvent) {
        document.addEventListener("touchmove", onResize, { passive: false });
        document.addEventListener("touchend", onStopResize);
      } else {
        document.addEventListener("mousemove", onResize);
        document.addEventListener("mouseup", onStopResize);
      }
    };

    resizeHandle.addEventListener("mousedown", (e) => {
      if (e.button !== 0) return;
      e.preventDefault();
      onStartResize(e.clientX, false);
    });

    resizeHandle.addEventListener("touchstart", (e) => {
      if (e.touches.length > 0) {
        onStartResize(e.touches[0].clientX, true);
      }
    }, { passive: true });

    document.addEventListener("mousedown", (e) => {
      const path = e.composedPath();
      if (!path.includes(toggleBtn)) {
        removeBtn.classList.remove("visible");
      }
    });
  }
}

const controller = new SidebarController();
void controller.mount();

// Auto-extract and send page content to background service on script load
const sendPageContentToBackground = async () => {
  try {
    await chrome.runtime.sendMessage({
      type: "PAGE_CONTENT_UPDATED",
      payload: {
        title: extractTitle(),
        url: window.location.href,
        metadata: extractMetadata(),
        content: extractPageContent()
      }
    });
  } catch (error) {
    console.warn("Failed to send page content to background service worker:", error);
  }
};

void sendPageContentToBackground();

window.addEventListener("message", (event) => {
  if (event.source !== document.getElementById(rootId)?.shadowRoot?.querySelector("iframe")?.contentWindow) {
    return;
  }

  if ((event.data as { source?: string; type?: string })?.source !== "ai-job-agent-sidebar") {
    return;
  }

  if ((event.data as { type?: string }).type === "CLOSE_SIDEBAR") {
    void controller.close();
  }
});

chrome.runtime.onMessage.addListener((message: RuntimeMessage, _sender, sendResponse) => {
  const respond = async () => {
    switch (message.type) {
      case "GET_PAGE_SNAPSHOT":
        return { snapshot: getPageSnapshot() };
      case "AUTOFILL_FORM": {
        const state = await getStorageState();
        const profile = state.profile;
        if (!profile || (!profile.name && !profile.email && !profile.phone)) {
          throw new Error("No profile details found in storage. Upload a resume first in the profile settings.");
        }
        return await autofillPageForm(profile);
      }
      case "SCAN_FORM": {
        const state = await getStorageState();
        const profile = state.profile;
        if (!profile || (!profile.name && !profile.email && !profile.phone)) {
          throw new Error("No profile details found in storage. Upload a resume first in the profile settings.");
        }
        return await scanPageForm(profile);
      }
      case "EXECUTE_AUTOFILL": {
        const filledCount = executeAutofill(message.proposals);
        return { ok: true, filledCount };
      }
      case "CANCEL_AUTOFILL": {
        cancelAutofill();
        return { ok: true };
      }
      case "CLICK_ELEMENT": {
        const ok = clickElement(message.selector, message.text);
        if (!ok) throw new Error(`Could not find clickable element matching "${message.selector}"`);
        return { ok: true };
      }
      case "FILL_INPUT": {
        const ok = fillInput(message.selector, message.value);
        if (!ok) throw new Error(`Could not find input element matching "${message.selector}"`);
        return { ok: true };
      }
      case "EXTRACT_TEXT": {
        const text = extractText();
        return { ok: true, text };
      }
      case "NAVIGATE_PAGE": {
        navigatePage(message.url);
        return { ok: true };
      }
      case "UPLOAD_RESUME": {
        const ok = uploadResume();
        if (!ok) throw new Error("No file input fields found on this webpage.");
        return { ok: true };
      }
      case "TOGGLE_SIDEBAR":
        return controller.toggle();
      case "OPEN_SIDEBAR":
        return controller.open();
      case "CLOSE_SIDEBAR":
        return controller.close();
      case "THEME_CHANGED":
        controller.setTheme(message.theme);
        return { ok: true };
      case "PING":
        return { ok: true };
      default:
        return { ok: true };
    }
  };

  respond()
    .then(sendResponse)
    .catch((error: unknown) => {
      const messageText = error instanceof Error ? error.message : "Unknown content script error";
      sendResponse({ ok: false, error: messageText });
    });

  return true;
});
