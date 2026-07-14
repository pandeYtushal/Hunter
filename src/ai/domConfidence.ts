export const DOM_CONFIDENCE_THRESHOLD = 0.50;

export function evaluateDomConfidence(pageCtx?: any): number {
  if (!pageCtx) return 0.20;

  const content = pageCtx.content || "";
  const html = pageCtx.html || "";

  // Canvas-rich visual apps check (e.g. Figma, Canva, WebGL)
  const isCanvasRich = html.includes("<canvas") && !html.includes("<button") && !html.includes("<input");
  if (isCanvasRich) {
    console.log("DOM Confidence Engine: Canvas-rich visual page detected. Confidence: 0.15");
    return 0.15;
  }

  // Obfuscated or extremely short page check
  if (content.trim().length < 200) {
    console.log(`DOM Confidence Engine: Page text content size is extremely low (${content.trim().length} chars). Confidence: 0.35`);
    return 0.35;
  }

  // Default high confidence for standard readable DOM pages
  return 0.85;
}
