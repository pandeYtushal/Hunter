import { describe, it, expect, vi, beforeEach } from "vitest";
import { VisionParser } from "./VisionParser";
import { VisionService } from "./VisionService";
import { ElementLocator } from "./ElementLocator";
import { VisualActionEngine } from "./VisualActionEngine";
import { VisualOverlay } from "./VisualOverlay";
import { ScreenCapture } from "./ScreenCapture";
import { storage } from "../shared/storage";

vi.mock("../shared/storage", () => ({
  storage: {
    get: vi.fn(async () => ({})),
    set: vi.fn(async () => {})
  }
}));

vi.mock("./ScreenCapture", () => ({
  ScreenCapture: {
    captureTab: vi.fn(async () => "data:image/jpeg;base64,mockedbase64data")
  }
}));

describe("Vision Parser", () => {
  it("parses valid JSON response from Gemini Vision correctly", () => {
    const rawJson = JSON.stringify({
      reasoning: "Detected key submit button",
      confidence: 0.95,
      elements: [
        {
          id: "btn-apply",
          type: "cta",
          text: "Apply Now",
          bounds: { ymin: 100, xmin: 200, ymax: 150, xmax: 450 },
          confidence: 0.98,
          importance: "high",
          actions: ["click"]
        }
      ]
    });

    const parsed = VisionParser.parse(rawJson);
    expect(parsed.confidence).toBe(0.95);
    expect(parsed.reasoning).toBe("Detected key submit button");
    expect(parsed.elements.length).toBe(1);
    expect(parsed.elements[0].id).toBe("btn-apply");
    expect(parsed.elements[0].bounds.ymin).toBe(100);
    expect(parsed.elements[0].text).toBe("Apply Now");
  });

  it("handles malformed JSON response robustly", () => {
    const parsed = VisionParser.parse("This is invalid text and JSON { \"elements\": [] }");
    expect(parsed.elements.length).toBe(0);
    expect(parsed.confidence).toBeLessThan(0.5);
  });
});

describe("Vision Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fails when API Key is missing", async () => {
    vi.mocked(storage.get).mockResolvedValue(null);
    await expect(VisionService.analyzePage(1, "find submit")).rejects.toThrow("Gemini API key is not configured");
  });

  it("sends fetch calls and saves screenshot metadata on success", async () => {
    vi.mocked(storage.get).mockResolvedValue({ apiKey: "test-api-key" });
    
    const mockJsonReply = JSON.stringify({
      reasoning: "Found matching field",
      confidence: 0.9,
      elements: [
        {
          id: "field-email",
          type: "input",
          text: "Email Address",
          bounds: { ymin: 400, xmin: 300, ymax: 450, xmax: 600 },
          confidence: 0.92,
          importance: "medium",
          actions: ["focus", "fill"]
        }
      ]
    });

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        candidates: [
          {
            content: {
              parts: [{ text: mockJsonReply }]
            }
          }
        ]
      })
    });

    const result = await VisionService.analyzePage(1, "find email input");
    expect(result.elements.length).toBe(1);
    expect(result.elements[0].text).toBe("Email Address");
    expect(chrome.storage.local.set).toHaveBeenCalled();
  });
});

describe("Element Locator", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("finds visually detected elements of button role", async () => {
    vi.spyOn(VisionService, "analyzePage").mockResolvedValue({
      elements: [
        {
          id: "btn-sub",
          type: "cta",
          text: "Submit Application",
          bounds: { ymin: 200, xmin: 200, ymax: 250, xmax: 300 },
          confidence: 0.95,
          importance: "high",
          actions: ["click"]
        }
      ],
      source: "vision",
      confidence: 0.95,
      reasoning: "mock"
    });

    const element = await ElementLocator.findButton(1, "Submit", "submit goal");
    expect(element).not.toBeNull();
    expect(element?.id).toBe("btn-sub");
  });

  it("delegates element selection bounds to content scripts", async () => {
    vi.mocked(chrome.tabs.sendMessage).mockResolvedValue({ ok: true, selector: "button.submit-form" });
    const bounds = { ymin: 10, xmin: 10, ymax: 50, xmax: 50 };
    const selector = await ElementLocator.findByVision(1, bounds);
    expect(selector).toBe("button.submit-form");
    expect(chrome.tabs.sendMessage).toHaveBeenCalledWith(1, {
      type: "LOCATE_ELEMENT_BY_BOUNDS",
      bounds
    });
  });
});

describe("Visual Action Engine", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("triggers highlights and click message parameters on clickByVision", async () => {
    vi.mocked(chrome.tabs.sendMessage).mockResolvedValue({ ok: true, selector: "#target-btn" });
    
    const mockElement = {
      id: "el-click",
      type: "button" as const,
      text: "Next step",
      bounds: { ymin: 10, xmin: 10, ymax: 20, xmax: 20 },
      confidence: 0.9,
      importance: "high" as const,
      actions: ["click"]
    };

    await VisualActionEngine.clickByVision(1, mockElement, "https://example.com");
    
    // Verifies highlight and locate messages
    expect(chrome.tabs.sendMessage).toHaveBeenCalledWith(1, {
      type: "HIGHLIGHT_DOM_ELEMENT",
      selector: "#target-btn",
      text: undefined
    });
  });
});

describe("Visual Overlay", () => {
  it("emits SHOW_VISUAL_OVERLAY content messages", async () => {
    const mockElements = [
      {
        id: "vis-1",
        type: "input" as const,
        text: "User input",
        bounds: { ymin: 10, xmin: 10, ymax: 20, xmax: 20 },
        confidence: 0.88,
        importance: "medium" as const,
        actions: []
      }
    ];

    await VisualOverlay.show(1, mockElements);
    expect(chrome.tabs.sendMessage).toHaveBeenCalledWith(1, {
      type: "SHOW_VISUAL_OVERLAY",
      elements: mockElements
    });
  });

  it("emits HIDE_VISUAL_OVERLAY message", async () => {
    await VisualOverlay.hide(1);
    expect(chrome.tabs.sendMessage).toHaveBeenCalledWith(1, {
      type: "HIDE_VISUAL_OVERLAY"
    });
  });
});
