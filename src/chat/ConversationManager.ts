import type { ChatConversation, ChatMessage } from "./ChatTypes";

const LIST_KEY = "hunter_conv_list_v1";

export const ConversationManager = {
  async getConversations(): Promise<ChatConversation[]> {
    try {
      const data = await chrome.storage.local.get(LIST_KEY);
      return data[LIST_KEY] || [];
    } catch (err) {
      console.error("Failed to load conversations list:", err);
      return [];
    }
  },

  async saveConversations(list: ChatConversation[]): Promise<void> {
    try {
      await chrome.storage.local.set({ [LIST_KEY]: list });
    } catch (err) {
      console.error("Failed to save conversations list:", err);
    }
  },

  async getConversation(id: string): Promise<ChatConversation | null> {
    const list = await this.getConversations();
    return list.find((c) => c.id === id) || null;
  },

  async createConversation(title = "New Conversation"): Promise<ChatConversation> {
    const list = await this.getConversations();
    const newConv: ChatConversation = {
      id: crypto.randomUUID(),
      title,
      messages: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    list.unshift(newConv);
    await this.saveConversations(list);
    return newConv;
  },

  async updateConversationMessages(id: string, messages: ChatMessage[]): Promise<void> {
    const list = await this.getConversations();
    const idx = list.findIndex((c) => c.id === id);
    if (idx !== -1) {
      list[idx].messages = messages;
      list[idx].updatedAt = new Date().toISOString();
      
      // Update title based on first user message if title is still default
      if (list[idx].title === "New Conversation" && messages.length > 0) {
        const firstUserMsg = messages.find((m) => m.role === "user");
        if (firstUserMsg) {
          const content = firstUserMsg.content.trim();
          list[idx].title = content.length > 30 ? content.substring(0, 27) + "..." : content;
        }
      }
      
      await this.saveConversations(list);
    }
  },

  async deleteConversation(id: string): Promise<ChatConversation[]> {
    let list = await this.getConversations();
    list = list.filter((c) => c.id !== id);
    await this.saveConversations(list);
    
    // Also clean up conversation memory
    await chrome.storage.local.remove(`conv_mem_${id}`).catch(() => null);
    return list;
  },

  async clearConversation(id: string): Promise<ChatConversation | null> {
    const list = await this.getConversations();
    const idx = list.findIndex((c) => c.id === id);
    if (idx !== -1) {
      list[idx].messages = [];
      list[idx].updatedAt = new Date().toISOString();
      await this.saveConversations(list);
      
      // Reset conversation memory
      await chrome.storage.local.remove(`conv_mem_${id}`).catch(() => null);
      return list[idx];
    }
    return null;
  }
};
