export function handlePagination(direction: "next" | "prev" | number): boolean {
  const elements = Array.from(document.querySelectorAll("a, button, [role='button'], .page-link, .pagination-btn"));
  
  const target = elements.find((el) => {
    const htmlEl = el as HTMLElement;
    const innerText = htmlEl.innerText.toLowerCase().trim();
    const rect = htmlEl.getBoundingClientRect();
    const isVisible = rect.width > 0 && rect.height > 0 && window.getComputedStyle(htmlEl).display !== "none";
    if (!isVisible) return false;

    if (direction === "next") {
      return (
        innerText === "next" ||
        innerText === ">" ||
        innerText === "»" ||
        innerText.includes("next page") ||
        htmlEl.getAttribute("aria-label")?.toLowerCase().includes("next") ||
        htmlEl.classList.contains("next")
      );
    } else if (direction === "prev") {
      return (
        innerText === "prev" ||
        innerText === "previous" ||
        innerText === "<" ||
        innerText === "«" ||
        innerText.includes("prev page") ||
        htmlEl.getAttribute("aria-label")?.toLowerCase().includes("prev") ||
        htmlEl.classList.contains("prev")
      );
    } else if (typeof direction === "number") {
      return innerText === String(direction);
    }
    return false;
  }) as HTMLElement;

  if (target) {
    target.scrollIntoView({ behavior: "smooth", block: "center" });
    target.click();
    return true;
  }

  return false;
}
