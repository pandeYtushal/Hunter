export interface LocateQuery {
  selector?: string;
  role?: string;
  text?: string;
}

export interface LocateResponse {
  selector: string;
  source: "dom" | "accessibility" | "text_search";
}

/**
 * Recursively queries elements across all open shadow roots in the document.
 */
export function querySelectorAllShadow(selector: string, root: Document | ShadowRoot = document): HTMLElement[] {
  let elements: HTMLElement[] = Array.from(root.querySelectorAll(selector)) as HTMLElement[];
  
  const allElements = Array.from(root.querySelectorAll("*"));
  for (const el of allElements) {
    if (el.shadowRoot) {
      elements = elements.concat(querySelectorAllShadow(selector, el.shadowRoot));
    }
  }
  return elements;
}

export function locateHybrid(query: LocateQuery, excludeSelectors: string[] = []): LocateResponse | null {
  const getSelector = (el: HTMLElement): string => {
    if (el.id) return `#${el.id}`;
    if (el.className) {
      const firstClass = el.className.split(" ").filter(Boolean)[0];
      if (firstClass) return `${el.tagName.toLowerCase()}.${firstClass}`;
    }
    return el.tagName.toLowerCase();
  };

  const isVisible = (el: HTMLElement): boolean => {
    const rect = el.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0 && window.getComputedStyle(el).display !== "none";
  };

  // 1. Tier 2: Standard DOM (with Shadow DOM support)
  if (query.selector && !excludeSelectors.includes(query.selector)) {
    const matched = querySelectorAllShadow(query.selector);
    const visibleEl = matched.find(isVisible);
    if (visibleEl) {
      return { selector: query.selector, source: "dom" };
    }
  }

  // 2. Tier 3: Accessibility Tree (ARIA attributes and role classifications)
  if (query.role || query.text) {
    const roleSelector = query.role ? `[role="${query.role}"], ${query.role}` : "*";
    const candidates = querySelectorAllShadow(roleSelector);
    
    for (const cand of candidates) {
      if (!isVisible(cand)) continue;
      const sel = getSelector(cand);
      if (excludeSelectors.includes(sel)) continue;

      const label = cand.getAttribute("aria-label") || cand.getAttribute("aria-labelledby") || "";
      const matchesLabel = query.text ? label.toLowerCase().includes(query.text.toLowerCase()) : false;
      const matchesRole = query.role ? cand.getAttribute("role") === query.role || cand.tagName.toLowerCase() === query.role.toLowerCase() : true;

      if (matchesRole && (matchesLabel || !query.text)) {
        return { selector: sel, source: "accessibility" };
      }
    }
  }

  // 3. Tier 4: Text Search (scanning labels, buttons, input placeholders)
  if (query.text) {
    const interactiveElements = querySelectorAllShadow(
      "button, a, input, select, textarea, [role='button'], label, [onclick]"
    );

    for (const el of interactiveElements) {
      if (!isVisible(el)) continue;
      const sel = getSelector(el);
      if (excludeSelectors.includes(sel)) continue;

      const innerText = el.innerText.toLowerCase().trim();
      const placeHolder = (el as HTMLInputElement).placeholder?.toLowerCase() || "";
      const textToMatch = query.text.toLowerCase().trim();

      if (innerText.includes(textToMatch) || placeHolder.includes(textToMatch)) {
        return { selector: sel, source: "text_search" };
      }
    }
  }

  return null;
}
