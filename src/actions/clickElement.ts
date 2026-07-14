export function clickElement(selector: string, text?: string): boolean {
  console.log(`Action Engine: Click request for selector: "${selector}", text: "${text || ''}"`);

  // 1. Helper to validate if an element is visible and clickable
  const isValidElement = (el: HTMLElement): boolean => {
    const rect = el.getBoundingClientRect();
    const style = window.getComputedStyle(el);
    const isVisible = rect.width > 0 && rect.height > 0 && 
                      style.display !== "none" && 
                      style.visibility !== "hidden" && 
                      style.opacity !== "0";
    return isVisible;
  };

  // 2. Find target element (First pass: using selector + text)
  let target: HTMLElement | null = null;
  const elements = Array.from(document.querySelectorAll(selector));
  target = (elements.find((el) => {
    const htmlEl = el as HTMLElement;
    const matchesText = text ? htmlEl.innerText.toLowerCase().includes(text.toLowerCase()) : true;
    return matchesText && isValidElement(htmlEl);
  }) as HTMLElement) || null;

  // 3. Action Recovery Phase 1: Retry using DOM (Text-based search for buttons/links)
  if (!target && text) {
    console.warn("Element not found by selector. Retrying using DOM text-based search...");
    const candidateSelectors = ["button", "a", "[role='button']", "input[type='button']", "input[type='submit']", ".btn", ".button"];
    for (const candSelector of candidateSelectors) {
      const candidates = Array.from(document.querySelectorAll(candSelector));
      const match = candidates.find((el) => {
        const htmlEl = el as HTMLElement;
        return htmlEl.innerText.toLowerCase().includes(text.toLowerCase()) && isValidElement(htmlEl);
      }) as HTMLElement;
      if (match) {
        target = match;
        console.log(`Recovery: Found element using candidate selector "${candSelector}" with text "${text}"`);
        break;
      }
    }
  }

  // 4. Action Recovery Phase 2: Search nearby/similar buttons
  if (!target && text) {
    console.warn("Element still not found. Searching nearby/similar buttons...");
    const allButtons = Array.from(document.querySelectorAll("button, a, [role='button']"));
    const bestMatch = allButtons.map(el => {
      const htmlEl = el as HTMLElement;
      const elText = htmlEl.innerText.toLowerCase().trim();
      const search = text.toLowerCase().trim();
      let score = 0;
      if (elText.includes(search) || search.includes(elText)) {
        score = 0.5;
      }
      return { el: htmlEl, score };
    })
    .filter(item => item.score > 0 && isValidElement(item.el))
    .sort((a, b) => b.score - a.score)[0];

    if (bestMatch) {
      target = bestMatch.el;
      console.log(`Recovery: Found nearby/similar button with text "${target.innerText}"`);
    }
  }

  // 5. Execution Phase (Scroll -> Highlight -> Click)
  if (target) {
    target.scrollIntoView({ behavior: "smooth", block: "center" });

    const originalOutline = target.style.outline;
    const originalTransition = target.style.transition;
    target.style.transition = "outline 0.2s ease-in-out";
    target.style.outline = "4px solid #ff6b35"; // Hunter orange highlight

    setTimeout(() => {
      if (target) {
        target.style.outline = originalOutline;
        target.style.transition = originalTransition;
      }
    }, 800);

    try {
      target.click();
    } catch (e) {
      const event = new MouseEvent("click", {
        bubbles: true,
        cancelable: true,
        view: window
      });
      target.dispatchEvent(event);
    }
    return true;
  }

  return false;
}
