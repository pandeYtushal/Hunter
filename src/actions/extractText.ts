export function extractText(): string {
  const body = document.body;
  if (!body) return "";
  
  // Clone to extract text without script/style content
  const clone = body.cloneNode(true) as HTMLElement;
  const noisy = ["script", "style", "noscript", "iframe", "svg"];
  noisy.forEach((selector) => {
    clone.querySelectorAll(selector).forEach((el) => el.remove());
  });

  return (clone.innerText || clone.textContent || "").trim();
}
