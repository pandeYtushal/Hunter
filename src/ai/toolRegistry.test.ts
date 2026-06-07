import { describe, expect, it } from "vitest";
import { ToolRegistry } from "./toolRegistry";

describe("ToolRegistry", () => {
  it("centralizes executable actions", () => {
    expect(ToolRegistry.get("extract_job").agent).toBe("JobAgent");
    expect(ToolRegistry.get("fill_form").requiresProfile).toBe(true);
    expect(ToolRegistry.list().map((tool) => tool.action)).toContain("save_job");
  });
});
