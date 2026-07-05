export function downloadFile(text?: string): boolean {
  const queryText = text ? text.toLowerCase() : "download";
  const elements = Array.from(document.querySelectorAll("a, button, [role='button']"));
  
  const target = elements.find((el) => {
    const htmlEl = el as HTMLElement;
    const innerText = htmlEl.innerText.toLowerCase();
    
    // Check if innerText contains download, export, pdf, csv, etc.
    const matchesText = innerText.includes(queryText) || innerText.includes("export") || innerText.includes("save as");
    
    // Also check if href has download attribute
    const hasDownloadAttr = htmlEl.tagName.toLowerCase() === "a" && (htmlEl.hasAttribute("download") || /\.(pdf|docx|xlsx|csv|zip)$/i.test(htmlEl.getAttribute("href") || ""));

    const rect = htmlEl.getBoundingClientRect();
    const isVisible = rect.width > 0 && rect.height > 0 && window.getComputedStyle(htmlEl).display !== "none";

    return (matchesText || hasDownloadAttr) && isVisible;
  }) as HTMLElement;

  if (target) {
    target.scrollIntoView({ behavior: "smooth", block: "center" });
    target.click();
    return true;
  }

  return false;
}
