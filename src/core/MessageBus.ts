import type { AgentType } from "../types/Agent";
import type { AgentMessage, AgentMessageType } from "./AgentMessage";

type AgentMessageHandler<TPayload = unknown> = (message: AgentMessage<TPayload>) => void | Promise<void>;

class MessageBusImpl {
  private readonly handlers = new Map<AgentType, Set<AgentMessageHandler>>();
  private readonly timeline: AgentMessage[] = [];

  on(agent: AgentType, handler: AgentMessageHandler): () => void {
    const existing = this.handlers.get(agent) ?? new Set<AgentMessageHandler>();
    existing.add(handler);
    this.handlers.set(agent, existing);
    return () => existing.delete(handler);
  }

  async send<TPayload>(
    from: AgentType,
    to: AgentType,
    type: AgentMessageType,
    payload: TPayload
  ): Promise<AgentMessage<TPayload>> {
    const message: AgentMessage<TPayload> = {
      id: crypto.randomUUID(),
      from,
      to,
      type,
      payload,
      createdAt: new Date().toISOString()
    };

    this.timeline.unshift(message);
    this.timeline.splice(100);

    const handlers = this.handlers.get(to);
    if (handlers) {
      await Promise.all(Array.from(handlers).map((handler) => Promise.resolve(handler(message))));
    }
    return message;
  }

  getTimeline(): AgentMessage[] {
    return [...this.timeline];
  }
}

export const MessageBus = new MessageBusImpl();
