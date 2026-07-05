export interface ResumeRecord {
  id: string;
  name: string;
  text: string;
  timestamp: string;
}

export interface CoverLetterRecord {
  id: string;
  company: string;
  letter: string;
  timestamp: string;
}

export interface VisitedSite {
  domain: string;
  visits: number;
  lastVisited: string;
}

export interface SavedPrompt {
  id: string;
  title: string;
  text: string;
}

export interface SuccessfulPath {
  id: string;
  goal: string;
  url: string;
  steps: string[];
  timestamp: string;
}

export class LongTermMemoryService {
  private static async getRaw<T>(key: string, defaultValue: T): Promise<T> {
    if (typeof chrome === "undefined" || !chrome.storage?.local) return defaultValue;
    const data = await chrome.storage.local.get(key);
    return data && data[key] !== undefined ? data[key] : defaultValue;
  }

  private static async setRaw(key: string, value: any): Promise<void> {
    if (typeof chrome === "undefined" || !chrome.storage?.local) return;
    await chrome.storage.local.set({ [key]: value });
  }

  // --- Visited Sites ---
  static async recordVisit(url: string): Promise<void> {
    try {
      const hostname = new URL(url).hostname;
      const sites = await this.getRaw<Record<string, { visits: number; lastVisited: string }>>("lt_visited_sites", {});
      const current = sites[hostname] || { visits: 0, lastVisited: "" };
      sites[hostname] = {
        visits: current.visits + 1,
        lastVisited: new Date().toISOString()
      };
      await this.setRaw("lt_visited_sites", sites);
    } catch {
      // Ignore malformed URL queries
    }
  }

  static async getVisitedSites(): Promise<VisitedSite[]> {
    const sites = await this.getRaw<Record<string, { visits: number; lastVisited: string }>>("lt_visited_sites", {});
    return Object.entries(sites).map(([domain, data]) => ({
      domain,
      visits: data.visits,
      lastVisited: data.lastVisited
    }));
  }

  // --- Resumes ---
  static async addResume(name: string, text: string): Promise<string> {
    const list = await this.getRaw<ResumeRecord[]>("lt_resumes", []);
    const id = Math.random().toString(36).substring(2, 15);
    list.push({ id, name, text, timestamp: new Date().toISOString() });
    await this.setRaw("lt_resumes", list);
    return id;
  }

  static async getResumes(): Promise<ResumeRecord[]> {
    return this.getRaw<ResumeRecord[]>("lt_resumes", []);
  }

  // --- Cover Letters ---
  static async addCoverLetter(company: string, letter: string): Promise<string> {
    const list = await this.getRaw<CoverLetterRecord[]>("lt_cover_letters", []);
    const id = Math.random().toString(36).substring(2, 15);
    list.push({ id, company, letter, timestamp: new Date().toISOString() });
    await this.setRaw("lt_cover_letters", list);
    return id;
  }

  static async getCoverLetters(): Promise<CoverLetterRecord[]> {
    return this.getRaw<CoverLetterRecord[]>("lt_cover_letters", []);
  }

  // --- Saved Prompts ---
  static async savePrompt(title: string, text: string): Promise<string> {
    const list = await this.getRaw<SavedPrompt[]>("lt_saved_prompts", []);
    const id = Math.random().toString(36).substring(2, 15);
    list.push({ id, title, text });
    await this.setRaw("lt_saved_prompts", list);
    return id;
  }

  static async getSavedPrompts(): Promise<SavedPrompt[]> {
    return this.getRaw<SavedPrompt[]>("lt_saved_prompts", []);
  }

  // --- Successful Paths ---
  static async recordSuccessfulPath(goal: string, url: string, steps: string[]): Promise<void> {
    const list = await this.getRaw<SuccessfulPath[]>("lt_successful_paths", []);
    const id = Math.random().toString(36).substring(2, 15);
    list.push({ id, goal, url, steps, timestamp: new Date().toISOString() });
    await this.setRaw("lt_successful_paths", list);
  }

  static async getSuccessfulPaths(): Promise<SuccessfulPath[]> {
    return this.getRaw<SuccessfulPath[]>("lt_successful_paths", []);
  }
}
