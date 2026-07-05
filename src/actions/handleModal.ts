export function handleModal(): boolean {
  // Common selectors for modals, dialogs, cookie consent banners, and popups
  const modalSelectors = [
    "dialog",
    "[role='dialog']",
    "[class*='modal']",
    "[id*='modal']",
    "[class*='popup']",
    "[class*='banner']",
    "[class*='cookie']",
    "[id*='cookie']",
    "[class*='overlay']"
  ];

  // Common keywords on modal close/dismiss buttons
  const dismissKeywords = [
    "close", "dismiss", "accept", "agree", "allow", "decline", "reject", "got it", "ok", "okay", "understand"
  ];

  let modalDismissed = false;

  for (const selector of modalSelectors) {
    const modals = Array.from(document.querySelectorAll(selector));
    for (const modal of modals) {
      const htmlModal = modal as HTMLElement;
      const rect = htmlModal.getBoundingClientRect();
      const isVisible = rect.width > 0 && rect.height > 0 && window.getComputedStyle(htmlModal).display !== "none";

      if (isVisible) {
        // Look for buttons or small divs containing close icons or text keywords
        const buttons = Array.from(htmlModal.querySelectorAll("button, a, [role='button'], .close, .dismiss"));
        for (const btn of buttons) {
          const htmlBtn = btn as HTMLElement;
          const text = htmlBtn.innerText.toLowerCase().trim();
          
          // Match icon close button (e.g. "×" or "x")
          if (text === "×" || text === "x" || htmlBtn.classList.contains("close-btn") || htmlBtn.classList.contains("close")) {
            htmlBtn.click();
            modalDismissed = true;
            break;
          }

          // Match close keywords
          const hasKeyword = dismissKeywords.some(kw => text.includes(kw));
          if (hasKeyword) {
            htmlBtn.click();
            modalDismissed = true;
            break;
          }
        }
      }
      if (modalDismissed) break;
    }
    if (modalDismissed) break;
  }

  return modalDismissed;
}
