import { describe, expect, it, vi, beforeEach } from "vitest";
import { VisionEngine } from "./VisionEngine";
import { VisionService } from "./VisionService";
import { ElementLocator } from "./ElementLocator";

// Mock the VisionService analyzePage method
vi.mock("./VisionService", () => ({
  VisionService: {
    analyzePage: vi.fn()
  }
}));

// Mock the ElementLocator findByVision method
vi.mock("./ElementLocator", () => ({
  ElementLocator: {
    findByVision: vi.fn()
  }
}));

// Mock the chrome messaging API
const mockSendMessage = vi.fn();
global.chrome = {
  tabs: {
    sendMessage: mockSendMessage
  }
} as any;

describe("VisionEngine locator hierarchy", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("resolves from Vision tier first when VLM finds bounds", async () => {
    vi.mocked(VisionService.analyzePage).mockResolvedValue({
      elements: [{ id: "btn-1", type: "button", text: "Submit Button", confidence: 0.95, bounds: { xmin: 10, ymin: 10, xmax: 50, ymax: 50 }, importance: "high", actions: [] }],
      source: "vision",
      confidence: 0.95,
      reasoning: "Detected submit button visually"
    });
    vi.mocked(ElementLocator.findByVision).mockResolvedValue("#submit-btn");

    const res = await VisionEngine.locate(1, "button", "Submit Button");
    expect(res.selector).toBe("#submit-btn");
    expect(res.source).toBe("vision");
  });

  it("falls back to DOM tier when Vision fails", async () => {
    vi.mocked(VisionService.analyzePage).mockRejectedValue(new Error("VLM timeout"));
    mockSendMessage.mockResolvedValueOnce({ ok: true, selector: "#target-dom", source: "dom" });

    const res = await VisionEngine.locate(1, "button", "#target-dom");
    expect(res.selector).toBe("#target-dom");
    expect(res.source).toBe("dom");
    expect(mockSendMessage).toHaveBeenCalledWith(1, {
      type: "LOCATE_ELEMENT_HYBRID",
      query: { selector: "#target-dom" }
    });
  });

  it("falls back to Accessibility Tree when DOM fails", async () => {
    vi.mocked(VisionService.analyzePage).mockRejectedValue(new Error("VLM error"));
    // DOM lookup fails
    mockSendMessage.mockResolvedValueOnce({ ok: false });
    // ARIA lookup succeeds
    mockSendMessage.mockResolvedValueOnce({ ok: true, selector: "[aria-label='Apply']", source: "accessibility" });

    const res = await VisionEngine.locate(1, "button", "Apply");
    expect(res.selector).toBe("[aria-label='Apply']");
    expect(res.source).toBe("accessibility");
  });

  it("falls back to Text Search when Vision, DOM, and ARIA fail", async () => {
    vi.mocked(VisionService.analyzePage).mockRejectedValue(new Error("VLM error"));
    // DOM fails
    mockSendMessage.mockResolvedValueOnce({ ok: false });
    // ARIA fails
    mockSendMessage.mockResolvedValueOnce({ ok: false });
    // Text search succeeds
    mockSendMessage.mockResolvedValueOnce({ ok: true, selector: "button.submit-class", source: "text_search" });

    const res = await VisionEngine.locate(1, "button", "Apply Now");
    expect(res.selector).toBe("button.submit-class");
    expect(res.source).toBe("text_search");
  });

  it("throws failure error when all tiers fail", async () => {
    vi.mocked(VisionService.analyzePage).mockRejectedValue(new Error("VLM error"));
    mockSendMessage.mockResolvedValue({ ok: false });

    await expect(VisionEngine.locate(1, "button", "Unfindable element")).rejects.toThrow(
      "Failed to locate target element for \"Unfindable element\" (role: \"button\") across all hybrid vision tiers."
    );
  });
});
