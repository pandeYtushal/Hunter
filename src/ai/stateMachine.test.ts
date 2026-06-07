import { describe, expect, it } from "vitest";
import { ExecutionStateMachine } from "./stateMachine";

describe("ExecutionStateMachine", () => {
  it("allows valid production lifecycle transitions", () => {
    const machine = new ExecutionStateMachine();
    expect(machine.transition("PLANNING")).toBe("PLANNING");
    expect(machine.transition("EXECUTING")).toBe("EXECUTING");
    expect(machine.transition("COMPLETED")).toBe("COMPLETED");
  });

  it("rejects invalid transitions", () => {
    const machine = new ExecutionStateMachine();
    expect(() => machine.transition("EXECUTING")).toThrow("Invalid agent state transition");
  });
});
