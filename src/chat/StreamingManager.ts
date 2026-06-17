export class StreamingManager {
  private activeAbortController: AbortController | null = null;
  private isGenerating = false;

  start(): AbortController {
    this.isGenerating = true;
    this.activeAbortController = new AbortController();
    return this.activeAbortController;
  }

  stop(): void {
    if (this.activeAbortController) {
      this.activeAbortController.abort();
    }
    this.isGenerating = false;
    this.activeAbortController = null;
  }

  isActive(): boolean {
    return this.isGenerating;
  }
}
