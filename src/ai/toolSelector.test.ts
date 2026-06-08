import { describe, expect, it } from "vitest";
import { ToolSelector } from "./toolSelector";

describe("ToolSelector", () => {
  it("resolves exact and case-insensitive registered tools", () => {
    const action = ToolSelector.validateAndSelect("EXTRACT_JOB", null);
    expect(action).toBe("extract_job");
  });

  it("throws error for unregistered tools", () => {
    expect(() => ToolSelector.validateAndSelect("non_existent_tool", null)).toThrow(
      'Tool "non_existent_tool" is not registered'
    );
  });

  it("throws error if tool requires profile and profile is missing", () => {
    expect(() => ToolSelector.validateAndSelect("match_resume", null)).toThrow(
      'requires a candidate profile'
    );
  });

  it("succeeds if tool requires profile and profile is populated", () => {
    const action = ToolSelector.validateAndSelect("match_resume", {
      name: "Bob",
      email: "bob@example.com",
      phone: "",
      skills: ["Vite"],
      experience: ""
    });
    expect(action).toBe("match_resume");
  });
});
