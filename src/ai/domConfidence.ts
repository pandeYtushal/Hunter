export const DOM_CONFIDENCE_THRESHOLD = 0.50;

export function evaluateDomConfidence(pageCtx?: any): number {
  if (!pageCtx || !pageCtx.content || pageCtx.content.trim().length < 300) {
    return 0.42;
  }
  return 0.85;
}
