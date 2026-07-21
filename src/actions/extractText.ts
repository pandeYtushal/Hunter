export function extractText(selector?: string): string {
  const root = selector ? (document.querySelector(selector) as HTMLElement) : null;
  const target = root || document.body;
  if (!target) return "";
  
  // Clone to extract text without script/style content
  const clone = target.cloneNode(true) as HTMLElement;
  const noisy = ["script", "style", "noscript", "iframe", "svg"];
  noisy.forEach((selector) => {
    clone.querySelectorAll(selector).forEach((el) => el.remove());
  });

  return (clone.innerText || clone.textContent || "").trim();
}
