export function scrollPage(direction: "down" | "up" | "top" | "bottom", selector?: string): boolean {
  if (selector) {
    const element = document.querySelector(selector);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "center" });
      return true;
    }
  }

  const scrollAmount = window.innerHeight * 0.6;
  if (direction === "down") {
    window.scrollBy({ top: scrollAmount, behavior: "smooth" });
    return true;
  } else if (direction === "up") {
    window.scrollBy({ top: -scrollAmount, behavior: "smooth" });
    return true;
  } else if (direction === "top") {
    window.scrollTo({ top: 0, behavior: "smooth" });
    return true;
  } else if (direction === "bottom") {
    window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
    return true;
  }

  return false;
}
