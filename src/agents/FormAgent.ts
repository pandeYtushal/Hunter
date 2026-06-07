import type { UserProfile } from "../shared/types/storage";

export const FormAgent = {
  async scanAndMap(tabId: number, profile: UserProfile) {
    const response = await chrome.tabs.sendMessage(tabId, {
      type: "SCAN_FORM"
    });

    if (response && response.ok) {
      return {
        proposals: response.proposals,
        highlighted: response.highlighted,
        skipped: response.skipped
      };
    } else {
      throw new Error(response?.error || "FormAgent failed to complete form scan.");
    }
  }
};
