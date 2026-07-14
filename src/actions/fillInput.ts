export function fillInput(selector: string, value: string): boolean {
  console.log(`Action Engine: Fill Input request for selector: "${selector}", value: "${value}"`);

  const isValidElement = (el: HTMLElement): boolean => {
    const rect = el.getBoundingClientRect();
    const style = window.getComputedStyle(el);
    return rect.width > 0 && rect.height > 0 && style.display !== "none" && style.visibility !== "hidden";
  };

  // 1. Find input using primary selector
  let target = document.querySelector<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(selector);

  // 2. Recovery Phase 1: Search by label text or placeholder or aria-label
  if (!target || !isValidElement(target)) {
    console.warn("Input not found by selector. Retrying using placeholder/label/name search...");
    const searchVal = selector.replace(/[#.]/g, "").toLowerCase();
    
    const inputs = Array.from(document.querySelectorAll("input, textarea, select")) as Array<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>;
    target = inputs.find((el) => {
      const placeholder = el.getAttribute("placeholder")?.toLowerCase() || "";
      const name = el.getAttribute("name")?.toLowerCase() || "";
      const ariaLabel = el.getAttribute("aria-label")?.toLowerCase() || "";
      const id = el.id.toLowerCase();
      
      let labelText = "";
      if (el.id) {
        const label = document.querySelector(`label[for="${el.id}"]`);
        if (label) labelText = label.textContent?.toLowerCase() || "";
      }
      if (!labelText) {
        const parentLabel = el.closest("label");
        if (parentLabel) labelText = parentLabel.textContent?.toLowerCase() || "";
      }

      const matches = placeholder.includes(searchVal) || 
                      name.includes(searchVal) || 
                      ariaLabel.includes(searchVal) ||
                      id.includes(searchVal) ||
                      labelText.includes(searchVal);
      return matches && isValidElement(el);
    }) || null;
  }

  // 3. Execution Phase (Scroll -> Highlight -> Value setting -> Events)
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

    if (target.tagName.toLowerCase() === "select") {
      const select = target as HTMLSelectElement;
      const options = Array.from(select.options);
      const valLower = value.toLowerCase();
      
      const bestOption = options.find(
        (opt) =>
          opt.value.toLowerCase() === valLower ||
          opt.text.toLowerCase().includes(valLower)
      );

      if (bestOption) {
        select.value = bestOption.value;
      } else {
        select.value = value;
      }
    } else {
      target.value = value;
    }

    target.dispatchEvent(new Event("input", { bubbles: true }));
    target.dispatchEvent(new Event("change", { bubbles: true }));
    return true;
  }

  return false;
}
