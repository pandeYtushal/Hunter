import { describe, expect, it } from "vitest";
import { ContextBuilder } from "./contextBuilder";

describe("ContextBuilder", () => {
  it("generates structured prompt context strings", () => {
    const context = ContextBuilder.build({
      goal: "Analyze job fit",
      pageContext: {
        title: "Frontend Engineer",
        url: "https://example.com/job",
        host: "example.com",
        selectedText: "",
        content: "React experience required.",
        description: ""
      },
      profile: {
        name: "Alice",
        email: "alice@example.com",
        phone: "123",
        skills: ["React", "TypeScript"],
        experience: "3 years"
      },
      decisionHistory: [
        {
          action: "extract_job",
          reasoning: "First extract job details",
          confidence: 0.95,
          observation: "Success",
          status: "completed",
          timestamp: "2026-06-08T12:00:00Z"
        }
      ],
      consecutiveFailures: 0
    });

    expect(context).toContain("Analyze job fit");
    expect(context).toContain("Frontend Engineer");
    expect(context).toContain("Alice");
    expect(context).toContain("extract_job");
    expect(context).toContain("React experience required.");
  });
});
