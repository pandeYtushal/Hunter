import { LongTermMemoryService, type SuccessfulPath } from "./LongTermMemoryService";
import { LocalSemanticSearch } from "./LocalSemanticSearch";

export interface RetrievedContext {
  matchedPaths: SuccessfulPath[];
  promptSuggestions: string[];
  injectedContextPrompt: string;
}

export class ContextRetrieval {
  /**
   * Searches past executions, matches active URL domain, and builds context triggers to enhance planners.
   */
  static async retrieve(goal: string, url?: string): Promise<RetrievedContext> {
    const paths = await LongTermMemoryService.getSuccessfulPaths();
    
    let domainFiltered = paths;
    if (url) {
      try {
        const activeHost = new URL(url).hostname;
        domainFiltered = paths.filter(p => {
          try {
            return new URL(p.url).hostname === activeHost;
          } catch {
            return false;
          }
        });
      } catch {
        // Skip URL domain filtering on invalid input
      }
    }

    const matchedEntries = LocalSemanticSearch.search<SuccessfulPath>(
      goal,
      domainFiltered,
      (p) => p.goal,
      0.15
    );

    const matchedPaths = matchedEntries.map(e => e.item).slice(0, 3);

    let injectedContextPrompt = "";
    if (matchedPaths.length > 0) {
      injectedContextPrompt = "\n[CONTEXT RETRIEVAL: Historical successful automation runs detected on this site/goal]\n";
      matchedPaths.forEach((p, idx) => {
        injectedContextPrompt += `- Past Goal ${idx + 1}: "${p.goal}" on ${p.url}. Executed steps: ${p.steps.join(" -> ")}\n`;
      });
    }

    const prompts = await LongTermMemoryService.getSavedPrompts();
    const matchedPrompts = LocalSemanticSearch.search(
      goal,
      prompts,
      (pr) => pr.title + " " + pr.text,
      0.1
    ).map(e => e.item.text).slice(0, 2);

    return {
      matchedPaths,
      promptSuggestions: matchedPrompts,
      injectedContextPrompt
    };
  }
}
