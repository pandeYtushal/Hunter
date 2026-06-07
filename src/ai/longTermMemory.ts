import { EventBus } from "../core/EventBus";
import { storage } from "../shared/storage";
import type { LongTermMemory } from "../types/Memory";

const unique = (items: string[]): string[] => Array.from(new Set(items.filter(Boolean)));

const touch = (memory: LongTermMemory): LongTermMemory => ({
  ...memory,
  favoriteCompanies: unique(memory.favoriteCompanies),
  successfulApplications: unique(memory.successfulApplications),
  savedJobs: unique(memory.savedJobs),
  generatedCoverLetters: memory.generatedCoverLetters.slice(0, 50),
  updatedAt: new Date().toISOString()
});

export const longTermMemory = {
  async retrieveMemory(): Promise<LongTermMemory> {
    return storage.get("longTermMemory");
  },

  async saveMemory(memory: LongTermMemory): Promise<LongTermMemory> {
    const next = touch(memory);
    await storage.set("longTermMemory", next);
    await EventBus.emit("MEMORY_UPDATED", {});
    return next;
  },

  async updateMemory(updater: (current: LongTermMemory) => LongTermMemory): Promise<LongTermMemory> {
    const current = await longTermMemory.retrieveMemory();
    return longTermMemory.saveMemory(updater(current));
  }
};
