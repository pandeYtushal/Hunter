import { storage } from "../shared/storage";

export interface ConversationMemoryData {
  uploadedImages: Array<{ id: string; name: string; url: string; timestamp: string }>;
  generatedResponses: Array<{ messageId: string; prompt: string; text: string; timestamp: string }>;
  detectedJobs: Array<{ id: string; title: string; company: string; details: any; timestamp: string }>;
  researchResults: Array<{ company: string; results: any; timestamp: string }>;
  resumeAnalysis: Array<{ resumeName: string; score: number; matchDetails: any; timestamp: string }>;
  visionResults: Array<{ id: string; elementsCount: number; confidence: number; timestamp: string }>;
}

export const ConversationMemory = {
  async getMemory(conversationId: string): Promise<ConversationMemoryData> {
    const key = `conv_mem_${conversationId}`;
    const data = await chrome.storage.local.get(key);
    return data[key] || {
      uploadedImages: [],
      generatedResponses: [],
      detectedJobs: [],
      researchResults: [],
      resumeAnalysis: [],
      visionResults: [],
    };
  },

  async saveMemory(conversationId: string, memory: ConversationMemoryData): Promise<void> {
    const key = `conv_mem_${conversationId}`;
    await chrome.storage.local.set({ [key]: memory });
  },

  async addUploadedImage(conversationId: string, id: string, name: string, url: string): Promise<void> {
    const mem = await this.getMemory(conversationId);
    mem.uploadedImages.push({ id, name, url, timestamp: new Date().toISOString() });
    await this.saveMemory(conversationId, mem);
  },

  async addGeneratedResponse(conversationId: string, messageId: string, prompt: string, text: string): Promise<void> {
    const mem = await this.getMemory(conversationId);
    mem.generatedResponses.push({ messageId, prompt, text, timestamp: new Date().toISOString() });
    await this.saveMemory(conversationId, mem);
  },

  async addDetectedJob(conversationId: string, title: string, company: string, details: any): Promise<void> {
    const mem = await this.getMemory(conversationId);
    mem.detectedJobs.push({ id: crypto.randomUUID(), title, company, details, timestamp: new Date().toISOString() });
    await this.saveMemory(conversationId, mem);
  },

  async addResearchResult(conversationId: string, company: string, results: any): Promise<void> {
    const mem = await this.getMemory(conversationId);
    mem.researchResults.push({ company, results, timestamp: new Date().toISOString() });
    await this.saveMemory(conversationId, mem);
  },

  async addResumeAnalysis(conversationId: string, resumeName: string, score: number, matchDetails: any): Promise<void> {
    const mem = await this.getMemory(conversationId);
    mem.resumeAnalysis.push({ resumeName, score, matchDetails, timestamp: new Date().toISOString() });
    await this.saveMemory(conversationId, mem);
  },

  async addVisionResult(conversationId: string, id: string, elementsCount: number, confidence: number): Promise<void> {
    const mem = await this.getMemory(conversationId);
    mem.visionResults.push({ id, elementsCount, confidence, timestamp: new Date().toISOString() });
    await this.saveMemory(conversationId, mem);
  }
};
