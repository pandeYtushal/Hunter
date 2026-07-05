export interface PlaywrightAction {
  type: "navigate" | "click" | "fill" | "extract" | "wait";
  selector?: string;
  value?: string;
  url?: string;
  duration?: number;
}

export class PlaywrightExporter {
  /**
   * Compiles an array of browser steps into a standard NodeJS Playwright test code block.
   */
  static exportToScript(actions: PlaywrightAction[]): string {
    let script = `import { test, expect } from '@playwright/test';\n\n`;
    script += `test('Hunter Auto-Generated Web Workflow', async ({ page }) => {\n`;
    
    actions.forEach(action => {
      switch (action.type) {
        case "navigate":
          script += `  await page.goto('${action.url || "https://example.com"}');\n`;
          break;
        case "click":
          script += `  await page.locator('${action.selector || "button"}').click();\n`;
          break;
        case "fill":
          script += `  await page.locator('${action.selector || "input"}').fill('${action.value || ""}');\n`;
          break;
        case "extract":
          script += `  const text = await page.locator('${action.selector || "body"}').textContent();\n`;
          script += `  console.log('Extracted Value:', text);\n`;
          break;
        case "wait":
          script += `  await page.waitForTimeout(${action.duration || 1000});\n`;
          break;
      }
    });

    script += `});\n`;
    return script;
  }
}
