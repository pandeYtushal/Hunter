import type { ActionType } from "../types/Action";
import type { AgentState, ExecutionMachineState } from "../types/Execution";
import type { ExecutionPlan } from "../types/Plan";
import type { MemorySnapshot } from "../types/Memory";

export type EventMap = {
  PLAN_CREATED: { plan: ExecutionPlan };
  ACTION_STARTED: { action: ActionType; attempt: number };
  ACTION_COMPLETED: { action: ActionType; durationMs: number };
  ACTION_FAILED: { action: ActionType; error: string; attempt: number };
  MEMORY_UPDATED: { snapshot?: MemorySnapshot };
  STATE_CHANGED: { from: ExecutionMachineState; to: ExecutionMachineState; state?: Partial<AgentState> };
};

type EventHandler<T> = (payload: T) => void | Promise<void>;

class EventBusImpl {
  private readonly handlers = new Map<keyof EventMap, Set<EventHandler<EventMap[keyof EventMap]>>>();

  on<K extends keyof EventMap>(eventName: K, handler: EventHandler<EventMap[K]>): () => void {
    const existing = this.handlers.get(eventName) ?? new Set<EventHandler<EventMap[keyof EventMap]>>();
    existing.add(handler as EventHandler<EventMap[keyof EventMap]>);
    this.handlers.set(eventName, existing);
    return () => existing.delete(handler as EventHandler<EventMap[keyof EventMap]>);
  }

  async emit<K extends keyof EventMap>(eventName: K, payload: EventMap[K]): Promise<void> {
    const handlers = this.handlers.get(eventName);
    if (!handlers) return;

    await Promise.all(
      Array.from(handlers).map((handler) =>
        Promise.resolve(handler(payload)).catch((error) => {
          console.warn(`Event handler for ${eventName} failed:`, error);
        })
      )
    );
  }
}

export const EventBus = new EventBusImpl();
