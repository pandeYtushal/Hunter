import { sidebarStyles } from "./sidebarStyles";
import { defaultStorage, type StorageSchema } from "../shared/types/storage";
import type { PageSnapshot, RuntimeMessage, SidebarStatus, ThemeMode } from "../shared/types/messages";
import { extractTitle, extractMetadata, extractPageContent, extractStructuredPageData } from "./pageReader";
import { extractBrowserStateModel } from "./browserStateExtractor";
import { startPageReadinessObserver, waitForPageReady } from "./pageReadiness";
import { autofillPageForm, scanPageForm, executeAutofill, cancelAutofill } from "./formMapper";
import { clickElement } from "../actions/clickElement";
import { fillInput } from "../actions/fillInput";
import { extractText } from "../actions/extractText";
import { navigatePage } from "../actions/navigatePage";
import { uploadResume } from "../actions/uploadResume";
import { scrollPage } from "../actions/scrollPage";
import { handleModal } from "../actions/handleModal";
import { downloadFile } from "../actions/downloadFile";
import { handlePagination } from "../actions/handlePagination";
import { locateHybrid } from "../actions/locateHybrid";

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

startPageReadinessObserver();

const getPageSnapshot = async (): Promise<PageSnapshot> => {
  const readiness = await waitForPageReady();
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
    metadata: meta,
    readiness: {
      ready: readiness.ready,
      reason: readiness.reason,
      observedMutationCount: readiness.observedMutationCount
    },
    structuredData: extractStructuredPageData()
  };
};

const publishStatus = async (status: SidebarStatus) => {
  await chrome.runtime.sendMessage({ type: "SIDEBAR_STATUS_CHANGED", status }).catch(() => undefined);
};

const getStorageState = async (): Promise<StorageSchema> => {
  try {
    if (typeof chrome === "undefined" || !chrome.storage) {
      console.warn("HUNTERR: chrome.storage is not available. Using default storage.");
      return defaultStorage;
    }
    const [localRes, syncRes] = await Promise.all([
      chrome.storage.local.get(defaultStorage),
      chrome.storage.sync.get("settings")
    ]);
    return {
      ...defaultStorage,
      ...localRes,
      settings: {
        ...defaultStorage.settings,
        ...(syncRes?.settings || localRes?.settings)
      }
    } as StorageSchema;
  } catch (err) {
    console.error("HUNTERR: Failed to get storage state:", err);
    return defaultStorage;
  }
};

class SidebarController {
  private host: HTMLElement | null = null;
  private appRoot: HTMLElement | null = null;
  private isOpen = false;
  private isPinned = false;
  private theme: ThemeMode = "system";
  private sidebarWidth = 560;
  private sidebarHeight = 450;

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
      this.isPinned = state.settings.sidebarPinned;
      this.theme = state.settings.theme;
      this.sidebarWidth = state.settings.sidebarWidth || 560;
      this.sidebarHeight = state.settings.sidebarHeight || 450;
      console.log("HUNTERR: Storage loaded. isOpen:", this.isOpen, "isPinned:", this.isPinned, "theme:", this.theme);

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
             <div class="agent-remove-btn" data-action="remove" role="button" tabindex="0" title="Remove toggle from page">×</div>
          </button>
          <section class="agent-panel ${this.isOpen ? 'agent-panel-visible' : ''}" aria-label="HUNTERR sidebar">
            <div class="agent-resizer resizer-l" data-resize="l"></div>
            <div class="agent-resizer resizer-b" data-resize="b"></div>
            <div class="agent-resizer resizer-lb" data-resize="lb"></div>
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
      this.setupResizing();
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

  setPinned(pinned: boolean) {
    this.isPinned = pinned;
    this.render();
  }

  setExpanded(expanded: boolean) {
    if (!this.appRoot) return;
    const panel = this.appRoot.querySelector(".agent-panel") as HTMLElement;
    if (panel) {
      if (expanded) {
        panel.classList.add("expanded");
        panel.style.removeProperty("width");
        panel.style.removeProperty("height");
      } else {
        panel.classList.remove("expanded");
        panel.style.setProperty("width", `${this.sidebarWidth}px`, "important");
        if (!this.isPinned) {
          panel.style.setProperty("height", `${this.sidebarHeight}px`, "important");
        }
      }
    }
  }

  setSize(width: number, height: number) {
    this.sidebarWidth = width;
    this.sidebarHeight = height;
    if (!this.appRoot) return;
    const panel = this.appRoot.querySelector(".agent-panel") as HTMLElement;
    if (panel) {
      panel.style.setProperty("width", `${width}px`, "important");
      if (!this.isPinned) {
        panel.style.setProperty("height", `${height}px`, "important");
      }
    }
  }

  setupResizing() {
    if (!this.appRoot) return;
    const panel = this.appRoot.querySelector(".agent-panel") as HTMLElement;
    const resizers = this.appRoot.querySelectorAll(".agent-resizer");
    if (!panel || resizers.length === 0) return;

    resizers.forEach((resizer) => {
      resizer.addEventListener("mousedown", (e: Event) => {
        const mouseEvent = e as MouseEvent;
        if (mouseEvent.button !== 0) return;
        mouseEvent.preventDefault();
        mouseEvent.stopPropagation();

        const type = (resizer as HTMLElement).dataset.resize;
        const startX = mouseEvent.clientX;
        const startY = mouseEvent.clientY;
        const startWidth = panel.offsetWidth;
        const startHeight = panel.offsetHeight;

        if (panel.classList.contains("expanded")) {
          panel.classList.remove("expanded");
        }
        panel.classList.add("resizing");

        const onMouseMove = (moveEvent: MouseEvent) => {
          const deltaX = moveEvent.clientX - startX;
          const deltaY = moveEvent.clientY - startY;

          let newWidth = startWidth;
          let newHeight = startHeight;

          if (type === "l" || type === "lb") {
            newWidth = startWidth - deltaX;
          }
          if (type === "b" || type === "lb") {
            newHeight = startHeight + deltaY;
          }

          const minWidth = 280;
          const minHeight = 280;
          const maxWidth = window.innerWidth - 24;
          const maxHeight = window.innerHeight - 24;

          const finalWidth = Math.max(minWidth, Math.min(newWidth, maxWidth));
          const finalHeight = Math.max(minHeight, Math.min(newHeight, maxHeight));

          this.sidebarWidth = finalWidth;
          if (!this.isPinned) {
            this.sidebarHeight = finalHeight;
          }

          panel.style.setProperty("width", `${finalWidth}px`, "important");
          if (!this.isPinned) {
            panel.style.setProperty("height", `${finalHeight}px`, "important");
          }
        };

        const onMouseUp = async () => {
          panel.classList.remove("resizing");
          document.removeEventListener("mousemove", onMouseMove);
          document.removeEventListener("mouseup", onMouseUp);

          try {
            const state = await getStorageState();
            const updatedSettings = {
              ...state.settings,
              sidebarWidth: this.sidebarWidth,
              sidebarHeight: this.sidebarHeight
            };
            if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.sync) {
              await chrome.storage.sync.set({ settings: updatedSettings });
            } else if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
              await chrome.storage.local.set({ settings: updatedSettings });
            }
          } catch (err) {
            console.error("HUNTERR: Failed to save resized dimensions:", err);
          }
        };

        document.addEventListener("mousemove", onMouseMove);
        document.addEventListener("mouseup", onMouseUp);
      });
    });
  }

  startDragging(iframeClientX: number, iframeClientY: number) {
    if (!this.appRoot || !this.host || this.isPinned) return;

    const shell = this.appRoot.querySelector(".agent-shell") as HTMLElement;
    if (!shell) return;

    const startTop = parseInt(shell.style.top || window.getComputedStyle(shell).top) || 86;
    const startRight = parseInt(shell.style.right || window.getComputedStyle(shell).right) || 18;

    const overlay = document.createElement("div");
    overlay.id = "hunter-drag-overlay";
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      z-index: 2147483647;
      cursor: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='%23ffffff' stroke='%23000000' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M18 11V9a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v2'/%3E%3Cpath d='M14 10V8a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v4'/%3E%3Cpath d='M10 10.5V9a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v3.5'/%3E%3Cpath d='M6 10a2 2 0 0 0-2 2v2a8 8 0 0 0 16 0v-5a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v5'/%3E%3C/svg%3E") 12 12, grabbing;
      background: transparent;
      pointer-events: auto !important;
    `;

    const shadow = this.host.shadowRoot;
    if (shadow) {
      shadow.appendChild(overlay);
    } else {
      document.body.appendChild(overlay);
    }

    let isFirst = true;
    let startX = 0;
    let startY = 0;

    const onMouseMove = (e: MouseEvent) => {
      if (isFirst) {
        startX = e.clientX;
        startY = e.clientY;
        isFirst = false;
        return;
      }
      const deltaX = e.clientX - startX;
      const deltaY = e.clientY - startY;

      const newTop = startTop + deltaY;
      const newRight = startRight - deltaX;

      const maxTop = window.innerHeight - 100;
      const maxRight = window.innerWidth - 100;

      shell.style.top = Math.max(10, Math.min(newTop, maxTop)) + "px";
      shell.style.right = Math.max(10, Math.min(newRight, maxRight)) + "px";
    };

    const onMouseUp = () => {
      overlay.remove();
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    };

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
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

    const shell = this.appRoot.querySelector(".agent-shell") as HTMLElement | null;

    if (frame) {
      frame.setAttribute("allowtransparency", "true");
      frame.style.background = "transparent";
      frame.style.border = "none";
      frame.style.boxShadow = "none";
    }

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

      if (this.isPinned) {
        shell?.classList.add("pinned");
        panel.classList.add("pinned");
        if (!panel.classList.contains("expanded")) {
          panel.style.setProperty("width", `${this.sidebarWidth}px`, "important");
        } else {
          panel.style.removeProperty("width");
        }
        panel.style.setProperty("height", "", "important");
      } else {
        shell?.classList.remove("pinned");
        panel.classList.remove("pinned");
        if (!panel.classList.contains("expanded")) {
          panel.style.setProperty("width", `${this.sidebarWidth}px`, "important");
          panel.style.setProperty("height", `${this.sidebarHeight}px`, "important");
        } else {
          panel.style.removeProperty("width");
          panel.style.removeProperty("height");
        }
      }
    }

    // Handle body margin pushing
    if (this.isOpen && this.isPinned) {
      const panelWidth = panel ? panel.offsetWidth : this.sidebarWidth;
      document.body.style.marginRight = `${panelWidth}px`;
      document.body.style.transition = "margin-right 350ms cubic-bezier(0.16, 1, 0.3, 1)";
    } else {
      document.body.style.marginRight = "";
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
    const removeBtn = this.appRoot.querySelector('[data-action="remove"]') as HTMLElement;

    if (!shell || !toggleBtn || !panel || !removeBtn) return;

    // ─── 1. Movable Toggle Drag & Click Logic ───
    let startX = 0;
    let startY = 0;
    let startTop = 0;
    let startRight = 0;
    let isDragging = false;
    let isTouchDragging = false;
    let hoverTimer: any = null;

    const hideRemoveBtn = (e: MouseEvent) => {
      const path = e.composedPath();
      if (path.includes(toggleBtn) || path.includes(removeBtn)) {
        return;
      }
      removeBtn.classList.remove("visible");
      document.removeEventListener("mousedown", hideRemoveBtn);
    };

    const onMouseDown = (e: MouseEvent) => {
      if (e.button !== 0 || e.target === removeBtn || removeBtn.contains(e.target as Node) || this.isPinned) return;
      
      if (hoverTimer) {
        window.clearTimeout(hoverTimer);
        hoverTimer = null;
      }
      removeBtn.classList.remove("visible");
      document.removeEventListener("mousedown", hideRemoveBtn);
      
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
      if (e.target === removeBtn || removeBtn.contains(e.target as Node) || this.isPinned) return;
      if (e.touches.length === 0) return;
      
      if (hoverTimer) {
        window.clearTimeout(hoverTimer);
        hoverTimer = null;
      }
      removeBtn.classList.remove("visible");
      document.removeEventListener("mousedown", hideRemoveBtn);
      
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

    // ─── 2. Hover 1.5s Close Icon Trigger ───
    toggleBtn.addEventListener("mouseenter", () => {
      if (hoverTimer) window.clearTimeout(hoverTimer);
      hoverTimer = window.setTimeout(() => {
        removeBtn.classList.add("visible");
        document.addEventListener("mousedown", hideRemoveBtn);
        hoverTimer = null;
      }, 1500);
    });

    toggleBtn.addEventListener("mouseleave", () => {
      if (hoverTimer) {
        window.clearTimeout(hoverTimer);
        hoverTimer = null;
      }
    });

    removeBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      document.removeEventListener("mousedown", hideRemoveBtn);
      this.host?.remove();
    });

    removeBtn.addEventListener("keydown", (e: Event) => {
      const keyboardEvent = e as KeyboardEvent;
      if (keyboardEvent.key === "Enter" || keyboardEvent.key === " ") {
        keyboardEvent.preventDefault();
        keyboardEvent.stopPropagation();
        document.removeEventListener("mousedown", hideRemoveBtn);
        this.host?.remove();
      }
    });

    // Panel sizing is handled by responsive CSS clamps and native resize.

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

// Listen for storage changes to instantly apply pinning or size changes
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === "sync" && changes.settings) {
    const newSettings = changes.settings.newValue;
    if (newSettings) {
      if (typeof newSettings.sidebarPinned === "boolean") {
        controller.setPinned(newSettings.sidebarPinned);
      }
      if (typeof newSettings.sidebarWidth === "number" && typeof newSettings.sidebarHeight === "number") {
        controller.setSize(newSettings.sidebarWidth, newSettings.sidebarHeight);
      }
    }
  }
});

window.addEventListener("message", (event) => {
  const expectedOrigin = chrome.runtime.getURL("").slice(0, -1);
  if (event.origin !== expectedOrigin) {
    return;
  }

  if (event.source !== document.getElementById(rootId)?.shadowRoot?.querySelector("iframe")?.contentWindow) {
    return;
  }

  const data = event.data;
  if (data?.source !== "ai-job-agent-sidebar") {
    return;
  }

  switch (data.type) {
    case "CLOSE_SIDEBAR":
      void controller.close();
      break;
    case "START_DRAGGING":
      controller.startDragging(data.clientX, data.clientY);
      break;
    case "SET_EXPANDED":
      controller.setExpanded(data.expanded);
      break;
  }
});

chrome.runtime.onMessage.addListener((message: RuntimeMessage, _sender, sendResponse) => {
  const respond = async () => {
    switch (message.type) {
      case "GET_PAGE_SNAPSHOT":
        return { snapshot: await getPageSnapshot() };
      case "GET_BROWSER_STATE_MODEL":
        return { model: extractBrowserStateModel() };
      case "WAIT_FOR_PAGE_READY": {
        const readiness = await waitForPageReady();
        return {
          ready: readiness.ready,
          reason: readiness.reason,
          observedMutationCount: readiness.observedMutationCount
        };
      }
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
      case "HIGHLIGHT_DOM_ELEMENT": {
        const target = document.querySelector(message.selector);
        if (!target) throw new Error(`Could not find element matching "${message.selector}" to highlight.`);
        
        target.scrollIntoView({ behavior: "smooth", block: "center" });
        const htmlEl = target as HTMLElement;
        const origOutline = htmlEl.style.outline;
        const origTransition = htmlEl.style.transition;
        
        htmlEl.style.transition = "outline 0.3s ease";
        htmlEl.style.outline = "3px solid #2563eb";
        
        setTimeout(() => {
          htmlEl.style.outline = origOutline;
          htmlEl.style.transition = origTransition;
        }, 2500);
        return { ok: true };
      }
      case "SCROLL_TO_ELEMENT": {
        const target = document.querySelector(message.selector);
        if (!target) throw new Error(`Could not find element matching "${message.selector}" to scroll to.`);
        target.scrollIntoView({ behavior: "smooth", block: "center" });
        return { ok: true };
      }
      case "SCROLL_PAGE": {
        const ok = scrollPage(message.direction, message.selector);
        return { ok };
      }
      case "HANDLE_MODAL": {
        const ok = handleModal();
        return { ok };
      }
      case "DOWNLOAD_FILE": {
        const ok = downloadFile(message.text);
        return { ok };
      }
      case "HANDLE_PAGINATION": {
        const ok = handlePagination(message.direction);
        return { ok };
      }
      case "LOCATE_ELEMENT_HYBRID": {
        const res = locateHybrid(message.query, message.excludeSelectors || []);
        if (res) {
          return { ok: true, selector: res.selector, source: res.source };
        }
        return { ok: false, error: "Element not found" };
      }
      case "SHOW_TOAST": {
        showToast(message.title, message.message, message.duration);
        return { ok: true };
      }
      case "HOVER_ELEMENT": {
        const target = document.querySelector(message.selector);
        if (!target) throw new Error(`Could not find element matching "${message.selector}" to hover.`);
        const event = new MouseEvent("mouseover", { bubbles: true, cancelable: true, view: window });
        target.dispatchEvent(event);
        return { ok: true };
      }
      case "FOCUS_INPUT": {
        const target = document.querySelector(message.selector);
        if (!target) throw new Error(`Could not find input element matching "${message.selector}" to focus.`);
        const htmlEl = target as HTMLElement;
        htmlEl.focus();
        htmlEl.click();
        return { ok: true };
      }
      case "LOCATE_ELEMENT_BY_BOUNDS": {
        const { bounds } = message;
        if (!bounds) throw new Error("Missing bounds object parameters.");

        const vw = window.innerWidth;
        const vh = window.innerHeight;
        
        const targetLeft = (bounds.xmin / 1000) * vw;
        const targetTop = (bounds.ymin / 1000) * vh;
        const targetWidth = ((bounds.xmax - bounds.xmin) / 1000) * vw;
        const targetHeight = ((bounds.ymax - bounds.ymin) / 1000) * vh;
        
        const centerX = targetLeft + targetWidth / 2;
        const centerY = targetTop + targetHeight / 2;

        let pointedEl = document.elementFromPoint(centerX, centerY) as HTMLElement | null;
        while (pointedEl && pointedEl !== document.body && pointedEl !== document.documentElement) {
          if (["BUTTON", "A", "INPUT", "SELECT", "TEXTAREA"].includes(pointedEl.tagName) || pointedEl.getAttribute("role") === "button" || pointedEl.onclick) {
            break;
          }
          pointedEl = pointedEl.parentElement;
        }

        const getSelectorForElement = (el: HTMLElement): string => {
          if (el.id) return `#${el.id}`;
          if (el.className) {
            const firstClass = el.className.split(" ").filter(Boolean)[0];
            if (firstClass) return `${el.tagName.toLowerCase()}.${firstClass}`;
          }
          return el.tagName.toLowerCase();
        };

        if (pointedEl) {
          return { ok: true, selector: getSelectorForElement(pointedEl) };
        }

        const candidates = Array.from(
          document.querySelectorAll("button, a, input, select, textarea, [role=button], [onclick], label")
        );
        let bestSelector = "";
        let bestScore = -1;

        for (const cand of candidates) {
          const el = cand as HTMLElement;
          const rect = el.getBoundingClientRect();
          if (rect.width === 0 || rect.height === 0) continue;

          const candLeft = (rect.left / vw) * 1000;
          const candTop = (rect.top / vh) * 1000;
          const candRight = (rect.right / vw) * 1000;
          const candBottom = (rect.bottom / vh) * 1000;

          const interLeft = Math.max(bounds.xmin, candLeft);
          const interTop = Math.max(bounds.ymin, candTop);
          const interRight = Math.min(bounds.xmax, candRight);
          const interBottom = Math.min(bounds.ymax, candBottom);

          const interWidth = Math.max(0, interRight - interLeft);
          const interHeight = Math.max(0, interBottom - interTop);
          const interArea = interWidth * interHeight;

          const unionArea =
            (bounds.xmax - bounds.xmin) * (bounds.ymax - bounds.ymin) +
            (candRight - candLeft) * (candBottom - candTop) -
            interArea;

          const iou = unionArea > 0 ? interArea / unionArea : 0;

          const candCenterX = candLeft + (candRight - candLeft) / 2;
          const candCenterY = candTop + (candBottom - candTop) / 2;
          const targetCenterX = bounds.xmin + (bounds.xmax - bounds.xmin) / 2;
          const targetCenterY = bounds.ymin + (bounds.ymax - bounds.ymin) / 2;
          const distance = Math.hypot(candCenterX - targetCenterX, candCenterY - targetCenterY);

          const score = iou * 1000 - distance;
          if (score > bestScore) {
            bestScore = score;
            bestSelector = getSelectorForElement(el);
          }
        }

        if (bestSelector) {
          return { ok: true, selector: bestSelector };
        }
        
        throw new Error("Could not resolve any visual bounding box DOM selector targets.");
      }
      case "SHOW_VISUAL_OVERLAY": {
        const { elements } = message;
        if (!elements) throw new Error("Missing overlay elements list.");

        const old = document.getElementById("hunter-vision-overlay");
        if (old) old.remove();

        const overlay = document.createElement("div");
        overlay.id = "hunter-vision-overlay";
        overlay.style.position = "fixed";
        overlay.style.top = "0";
        overlay.style.left = "0";
        overlay.style.width = "100vw";
        overlay.style.height = "100vh";
        overlay.style.zIndex = "999999";
        overlay.style.pointerEvents = "none";

        elements.forEach((el: any) => {
          const leftPercent = el.bounds.xmin / 10;
          const topPercent = el.bounds.ymin / 10;
          const widthPercent = (el.bounds.xmax - el.bounds.xmin) / 10;
          const heightPercent = (el.bounds.ymax - el.bounds.ymin) / 10;

          const box = document.createElement("div");
          box.style.position = "absolute";
          box.style.left = `${leftPercent}vw`;
          box.style.top = `${topPercent}vh`;
          box.style.width = `${widthPercent}vw`;
          box.style.height = `${heightPercent}vh`;
          box.style.border = "2px dashed #2563eb";
          box.style.backgroundColor = "rgba(37, 99, 235, 0.1)";

          const label = document.createElement("div");
          label.textContent = `${el.text || el.type} (${Math.round(el.confidence * 100)}%)`;
          label.style.position = "absolute";
          label.style.top = "-16px";
          label.style.left = "0";
          label.style.backgroundColor = "#2563eb";
          label.style.color = "white";
          label.style.fontSize = "8px";
          label.style.fontWeight = "bold";
          label.style.padding = "1px 3px";
          label.style.borderRadius = "2px";
          label.style.whiteSpace = "nowrap";

          box.appendChild(label);
          overlay.appendChild(box);
        });

        document.body.appendChild(overlay);
        return { ok: true };
      }
      case "HIDE_VISUAL_OVERLAY": {
        const overlay = document.getElementById("hunter-vision-overlay");
        if (overlay) overlay.remove();
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

function showToast(title: string, message: string, duration = 3500) {
  let container = document.getElementById("hunter-toast-container");
  if (!container) {
    container = document.createElement("div");
    container.id = "hunter-toast-container";
    container.style.position = "fixed";
    container.style.bottom = "20px";
    container.style.left = "20px";
    container.style.zIndex = "9999999";
    container.style.display = "flex";
    container.style.flexDirection = "column";
    container.style.gap = "10px";
    document.body.appendChild(container);
  }

  const toast = document.createElement("div");
  toast.style.background = "#18181b";
  toast.style.color = "#f4f4f5";
  toast.style.border = "1px solid #ff6b35";
  toast.style.padding = "10px 14px";
  toast.style.borderRadius = "8px";
  toast.style.boxShadow = "0 4px 12px rgba(0, 0, 0, 0.15)";
  toast.style.fontFamily = "system-ui, -apple-system, sans-serif";
  toast.style.fontSize = "11px";
  toast.style.minWidth = "220px";
  toast.style.maxWidth = "300px";
  toast.style.transform = "translateX(-120%)";
  toast.style.transition = "transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)";
  
  toast.innerHTML = `
    <div style="font-weight: bold; color: #ff6b35; margin-bottom: 2px; text-transform: uppercase; font-size: 9px; letter-spacing: 0.5px;">\${title}</div>
    <div style="line-height: 1.4; color: #a1a1aa;">\${message}</div>
  `;

  container.appendChild(toast);
  
  requestAnimationFrame(() => {
    toast.style.transform = "translateX(0)";
  });

  setTimeout(() => {
    toast.style.transform = "translateX(-120%)";
    setTimeout(() => {
      toast.remove();
      if (container && container.childElementCount === 0) {
        container.remove();
      }
    }, 300);
  }, duration);
}
