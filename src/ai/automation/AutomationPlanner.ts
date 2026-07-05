import { planUserGoal } from "../planner";
import { ActionQueue } from "./ActionQueue";
import type { ExecutionPlan } from "../../shared/types/agent";

export class AutomationPlanner {
  static async createQueue(goal: string): Promise<{ plan: ExecutionPlan; queue: ActionQueue }> {
    const plan = await planUserGoal(goal);
    const queue = new ActionQueue(plan.actions);
    return { plan, queue };
  }
}
