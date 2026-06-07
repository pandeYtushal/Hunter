export function clickElement(selector: string, text?: string): boolean {
  const elements = Array.from(document.querySelectorAll(selector));
  const target = elements.find((el) => {
    const htmlEl = el as HTMLElement;
    const matchesText = text ? htmlEl.innerText.toLowerCase().includes(text.toLowerCase()) : true;
    const rect = htmlEl.getBoundingClientRect();
    const isVisible = rect.width > 0 && rect.height > 0 && window.getComputedStyle(htmlEl).display !== "none";
    return matchesText && isVisible;
  }) as HTMLElement;

  if (target) {
    target.scrollIntoView({ behavior: "smooth", block: "center" });
    target.click();
    return true;
  }
  return false;
}
