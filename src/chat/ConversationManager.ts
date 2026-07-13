import type { ChatConversation, ChatMessage } from "./ChatTypes";

export const LIST_KEY = "hunter_conv_list_v1";

const hasChromeStorage = typeof chrome !== "undefined" && chrome.storage?.local;

// Simple Promise-based queue to serialize storage operations
class StorageQueue {
  private queue: Promise<any> = Promise.resolve();

  async enqueue<T>(task: () => Promise<T>): Promise<T> {
    const next = this.queue.then(task);
    this.queue = next.catch(() => {});
    return next;
  }
}

const globalQueue = new StorageQueue();
const idQueues = new Map<string, StorageQueue>();

const getIdQueue = (id: string): StorageQueue => {
  let q = idQueues.get(id);
  if (!q) {
    q = new StorageQueue();
    idQueues.set(id, q);
  }
  return q;
};

export const ConversationManager = {
  async getConversations(): Promise<ChatConversation[]> {
    try {
      if (hasChromeStorage) {
        const data = await chrome.storage.local.get(LIST_KEY);
        return data[LIST_KEY] || [];
      } else {
        const val = localStorage.getItem(LIST_KEY);
        return val ? JSON.parse(val) : [];
      }
    } catch (err) {
      console.error("Failed to load conversations list:", err);
      return [];
    }
  },

  async saveConversations(list: ChatConversation[]): Promise<void> {
    try {
      if (hasChromeStorage) {
        await chrome.storage.local.set({ [LIST_KEY]: list });
      } else {
        localStorage.setItem(LIST_KEY, JSON.stringify(list));
      }
    } catch (err) {
      console.error("Failed to save conversations list:", err);
      throw err;
    }
  },

  async getConversation(id: string): Promise<ChatConversation | null> {
    const list = await ConversationManager.getConversations();
    return list.find((c) => c.id === id) || null;
  },

  async createConversation(title = "New Conversation"): Promise<ChatConversation> {
    return globalQueue.enqueue(async () => {
      try {
        const list = await ConversationManager.getConversations();
        const newConv: ChatConversation = {
          id: crypto.randomUUID(),
          title,
          messages: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        list.unshift(newConv);
        await ConversationManager.saveConversations(list);
        return newConv;
      } catch (err) {
        console.error("Failed to create conversation:", err);
        throw err;
      }
    });
  },

  async updateConversationMessages(id: string, messages: ChatMessage[]): Promise<ChatConversation | null> {
    const idQueue = getIdQueue(id);
    return idQueue.enqueue(async () => {
      return globalQueue.enqueue(async () => {
        try {
          const list = await ConversationManager.getConversations();
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
            
            await ConversationManager.saveConversations(list);
            return list[idx];
          }
          return null;
        } catch (err) {
          console.error(`Failed to update conversation messages for ID ${id}:`, err);
          throw err;
        }
      });
    });
  },

  async deleteConversation(id: string): Promise<ChatConversation[]> {
    return globalQueue.enqueue(async () => {
      try {
        let list = await ConversationManager.getConversations();
        list = list.filter((c) => c.id !== id);
        await ConversationManager.saveConversations(list);
        
        // Also clean up conversation memory
        if (hasChromeStorage) {
          await chrome.storage.local.remove(`conv_mem_${id}`).catch(() => null);
        } else {
          localStorage.removeItem(`conv_mem_${id}`);
        }
        
        // Clean up ID-specific queue
        idQueues.delete(id);
        
        return list;
      } catch (err) {
        console.error(`Failed to delete conversation for ID ${id}:`, err);
        throw err;
      }
    });
  },

  async clearConversation(id: string): Promise<ChatConversation | null> {
    const idQueue = getIdQueue(id);
    return idQueue.enqueue(async () => {
      return globalQueue.enqueue(async () => {
        try {
          const list = await ConversationManager.getConversations();
          const idx = list.findIndex((c) => c.id === id);
          if (idx !== -1) {
            list[idx].messages = [];
            list[idx].updatedAt = new Date().toISOString();
            await ConversationManager.saveConversations(list);
            
            // Reset conversation memory
            if (hasChromeStorage) {
              await chrome.storage.local.remove(`conv_mem_${id}`).catch(() => null);
            } else {
              localStorage.removeItem(`conv_mem_${id}`);
            }
            return list[idx];
          }
          return null;
        } catch (err) {
          console.error(`Failed to clear conversation for ID ${id}:`, err);
          throw err;
        }
      });
    });
  },

  async togglePinConversation(id: string): Promise<ChatConversation[]> {
    return globalQueue.enqueue(async () => {
      try {
        const list = await ConversationManager.getConversations();
        const idx = list.findIndex((c) => c.id === id);
        if (idx !== -1) {
          list[idx].pinned = !list[idx].pinned;
          await ConversationManager.saveConversations(list);
        }
        return list;
      } catch (err) {
        console.error(`Failed to toggle pin for ID ${id}:`, err);
        throw err;
      }
    });
  }
};
