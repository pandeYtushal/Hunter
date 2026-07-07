export interface PageReadinessState {
  ready: boolean;
  url: string;
  title: string;
  lastMutationAt: number;
  observedMutationCount: number;
  reason: string;
}

const QUIET_WINDOW_MS = 700;
const MAX_WAIT_MS = 8000;

let lastMutationAt = Date.now();
let observedMutationCount = 0;
let lastUrl = window.location.href;
let observer: MutationObserver | null = null;

const markMutated = () => {
  lastMutationAt = Date.now();
  observedMutationCount += 1;
};

const patchHistoryMethod = (method: "pushState" | "replaceState") => {
  const original = window.history[method];
  window.history[method] = function patchedHistoryMethod(...args) {
    const result = original.apply(this, args);
    window.dispatchEvent(new Event("hunter:urlchange"));
    return result;
  };
};

export function startPageReadinessObserver(): void {
  if (observer) return;

  observer = new MutationObserver(markMutated);
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
    characterData: true,
    attributes: true,
    attributeFilter: ["aria-busy", "aria-expanded", "class", "data-testid", "href", "role", "style"]
  });

  patchHistoryMethod("pushState");
  patchHistoryMethod("replaceState");

  window.addEventListener("popstate", markMutated);
  window.addEventListener("hashchange", markMutated);
  window.addEventListener("hunter:urlchange", () => {
    lastUrl = window.location.href;
    markMutated();
  });

  document.addEventListener("readystatechange", markMutated);
}

const hasVisibleBusyIndicator = (): boolean => {
  const selectors = [
    "[aria-busy='true']",
    "[aria-live='polite'] [role='progressbar']",
    "[role='progressbar']",
    "[data-loading='true']",
    ".loading",
    ".spinner",
    ".skeleton"
  ];

  return selectors.some((selector) =>
    Array.from(document.querySelectorAll<HTMLElement>(selector)).some((element) => {
      const rect = element.getBoundingClientRect();
      const style = window.getComputedStyle(element);
      return rect.width > 0 && rect.height > 0 && style.visibility !== "hidden" && style.display !== "none";
    })
  );
};

export async function waitForPageReady(maxWaitMs = MAX_WAIT_MS): Promise<PageReadinessState> {
  startPageReadinessObserver();

  const startedAt = Date.now();
  let reason = "DOM settled";

  while (Date.now() - startedAt < maxWaitMs) {
    const urlChanged = window.location.href !== lastUrl;
    if (urlChanged) {
      lastUrl = window.location.href;
      markMutated();
    }

    const documentReady = document.readyState === "complete" || document.readyState === "interactive";
    const quietFor = Date.now() - lastMutationAt;
    const busy = hasVisibleBusyIndicator();

    if (documentReady && quietFor >= QUIET_WINDOW_MS && !busy && document.body?.innerText?.trim()) {
      return {
        ready: true,
        url: window.location.href,
        title: document.title,
        lastMutationAt,
        observedMutationCount,
        reason
      };
    }

    reason = busy ? "Waiting for loading indicators" : "Waiting for SPA content to settle";
    await new Promise((resolve) => window.setTimeout(resolve, 120));
  }

  return {
    ready: false,
    url: window.location.href,
    title: document.title,
    lastMutationAt,
    observedMutationCount,
    reason: "Timed out while waiting for rendered page content"
  };
}
